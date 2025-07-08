class SpeedTest {
  constructor(options = {}) {
    this.options = {
      pingIterations: 5,
      downloadSize: 10, // MB
      uploadSize: 5,    // MB
      serverUrl: window.location.origin,
      ...options
    };
    
    this.results = {
      ping: 0,
      jitter: 0,
      download: 0,
      upload: 0,
      packetLoss: 0,
      isp: '',
      ip: ''
    };
    
    this.testInProgress = false;
    this.abortController = null;
  }

  async getServerInfo() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      this.results.ip = data.ip;
      
      // Opcional: Obtener información del ISP (requiere servicio externo)
      // const ispResponse = await fetch(`https://ipapi.co/${data.ip}/json/`);
      // const ispData = await ispResponse.json();
      // this.results.isp = ispData.org || 'Desconocido';
    } catch (error) {
      console.error('Error obteniendo información del servidor:', error);
    }
  }

  async measurePing() {
    const pingResults = [];
    let successfulPings = 0;
    
    for (let i = 0; i < this.options.pingIterations; i++) {
      if (this.abortController?.signal.aborted) break;
      
      try {
        const start = performance.now();
        const response = await fetch(`${this.options.serverUrl}/api/ping?t=${Date.now()}`, {
          signal: this.abortController?.signal
        });
        
        if (!response.ok) throw new Error('Error en ping');
        
        const duration = performance.now() - start;
        pingResults.push(duration);
        successfulPings++;
        
        // Actualizar progreso
        if (this.onupdate) {
          this.onupdate({
            testState: 'ping',
            ping: duration.toFixed(2),
            progress: (i + 1) / this.options.pingIterations * 100
          });
        }
        
        // Pequeña pausa entre pings
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Error en ping ${i + 1}:`, error);
      }
    }
    
    // Calcular resultados
    if (pingResults.length > 0) {
      const sum = pingResults.reduce((a, b) => a + b, 0);
      this.results.ping = sum / pingResults.length;
      
      // Calcular jitter (variación entre pings)
      let jitterSum = 0;
      for (let i = 1; i < pingResults.length; i++) {
        jitterSum += Math.abs(pingResults[i] - pingResults[i - 1]);
      }
      this.results.jitter = jitterSum / (pingResults.length - 1);
    }
    
    // Calcular pérdida de paquetes
    this.results.packetLoss = ((this.options.pingIterations - successfulPings) / this.options.pingIterations) * 100;
    
    return this.results;
  }

  async measureDownload() {
    try {
      const sizeMB = this.options.downloadSize;
      const start = performance.now();
      
      // Usamos AbortController para permitir cancelación
      this.abortController = new AbortController();
      
      const response = await fetch(`${this.options.serverUrl}/api/download?size=${sizeMB}&t=${Date.now()}`, {
        signal: this.abortController.signal
      });
      
      if (!response.ok) throw new Error('Error en descarga');
      
      // Leemos los datos en chunks para medir progreso
      const reader = response.body.getReader();
      let receivedLength = 0;
      const chunks = [];
      
      while (true) {
        if (this.abortController?.signal.aborted) break;
        
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        // Actualizar progreso
        if (this.onupdate) {
          const elapsed = (performance.now() - start) / 1000; // segundos
          const speed = (receivedLength / (1024 * 1024) * 8) / elapsed; // Mbps
          
          this.onupdate({
            testState: 'download',
            download: speed.toFixed(2),
            progress: (receivedLength / (sizeMB * 1024 * 1024)) * 100
          });
        }
      }
      
      const duration = (performance.now() - start) / 1000; // segundos
      this.results.download = (sizeMB * 8) / duration; // Mbps
      
      return this.results;
    } catch (error) {
      console.error('Error en prueba de descarga:', error);
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  async measureUpload() {
    try {
      const sizeMB = this.options.uploadSize;
      const chunkSize = 512 * 1024; // 512KB chunks
      const totalSize = sizeMB * 1024 * 1024;
      const chunks = Math.ceil(totalSize / chunkSize);
      
      // Creamos datos de prueba (mejor que new Blob para grandes tamaños)
      const createUploadData = () => {
        return new ReadableStream({
          start(controller) {
            let sent = 0;
            const pushChunk = () => {
              if (sent >= totalSize || this.abortController?.signal.aborted) {
                controller.close();
                return;
              }
              
              const currentChunkSize = Math.min(chunkSize, totalSize - sent);
              const chunk = new Uint8Array(currentChunkSize);
              for (let i = 0; i < currentChunkSize; i++) {
                chunk[i] = Math.floor(Math.random() * 256);
              }
              
              controller.enqueue(chunk);
              sent += currentChunkSize;
              
              // Actualizar progreso
              if (this.onupdate) {
                const progress = (sent / totalSize) * 100;
                this.onupdate({
                  testState: 'upload',
                  progress
                });
              }
              
              // Siguiente chunk en el siguiente tick del event loop
              setTimeout(pushChunk, 0);
            };
            
            pushChunk();
          }
        });
      };
      
      this.abortController = new AbortController();
      const start = performance.now();
      
      const response = await fetch(`${this.options.serverUrl}/api/upload?startTime=${start}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': totalSize.toString()
        },
        body: createUploadData(),
        signal: this.abortController.signal
      });
      
      if (!response.ok) throw new Error('Error en subida');
      
      const data = await response.json();
      const duration = (data.duration || (performance.now() - start) / 1000);
      this.results.upload = (sizeMB * 8) / duration; // Mbps
      
      return this.results;
    } catch (error) {
      console.error('Error en prueba de subida:', error);
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  async runFullTest() {
    if (this.testInProgress) {
      throw new Error('Ya hay una prueba en progreso');
    }
    
    this.testInProgress = true;
    this.results = {
      ping: 0,
      jitter: 0,
      download: 0,
      upload: 0,
      packetLoss: 0,
      isp: '',
      ip: '',
      timestamp: new Date().toISOString()
    };
    
    try {
      await this.getServerInfo();
      
      // 1. Prueba de Ping y Jitter
      if (this.onbegin) this.onbegin({ test: 'ping' });
      await this.measurePing();
      
      // 2. Prueba de Descarga
      if (this.onbegin) this.onbegin({ test: 'download' });
      await this.measureDownload();
      
      // 3. Prueba de Subida
      if (this.onbegin) this.onbegin({ test: 'upload' });
      await this.measureUpload();
      
      return this.results;
    } finally {
      this.testInProgress = false;
      if (this.onend) this.onend(this.results);
    }
  }

  abortTest() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.testInProgress = false;
  }
}