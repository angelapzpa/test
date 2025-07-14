document.addEventListener('DOMContentLoaded', function() {
  // Elementos de la interfaz
  const startBtn = document.getElementById('startBtn');
  const dlSpeedEl = document.getElementById('dlSpeed');
  const ulSpeedEl = document.getElementById('ulSpeed');
  const pingTextEl = document.getElementById('pingText');
  const jitterTextEl = document.getElementById('jitterText');
  const avgSpeedEl = document.getElementById('avgSpeed');
  const detailedStatusEl = document.getElementById('detailedStatus');
  const speedNeedle = document.getElementById('speedNeedle');
  const gaugeMask = document.querySelector('.gauge-mask');
  
  // Crear instancia del speedtest
  const speedTest = new SpeedTest({
    serverUrl: 'http://192.168.1.154:3000',
    pingIterations: 5,
    downloadSize: 20, // MB
    uploadSize: 10    // MB
  });
  
  // Animación de valores
  function animateValue(element, target, suffix = '') {
    const current = parseFloat(element.textContent) || 0;
    const duration = 800;
    const startTime = performance.now();
    
    const update = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const value = current + (target - current) * progress;
      
      element.textContent = value.toFixed(1) + suffix;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };
    
    update();
  }
  
  // Actualizar velocímetro
  function updateSpeedometer(speed) {
    const maxSpeed = 500; // Velocidad máxima del velocímetro (500 Mbps)
    const progress = Math.min(speed, maxSpeed) / maxSpeed * 100;
    gaugeMask.style.setProperty('--progress', progress);
    
    // Calcular rotación de la aguja (-135° a +135°)
    const degrees = (Math.min(speed, maxSpeed) * 0.54) - 135;
    speedNeedle.style.transform = `rotate(${degrees}deg)`;
    
    // Actualizar velocidad promedio
    animateValue(avgSpeedEl, speed, ' Mbps');
  }
  
  // Manejadores de eventos del speedtest
  speedTest.onbegin = ({ test }) => {
    let message = '';
    let icon = 'fa-info-circle';
    
    switch (test) {
      case 'ping':
        message = 'Probando ping y jitter...';
        icon = 'fa-bullseye';
        break;
      case 'download':
        message = 'Probando velocidad de descarga...';
        icon = 'fa-download';
        break;
      case 'upload':
        message = 'Probando velocidad de subida...';
        icon = 'fa-upload';
        break;
    }
    
    detailedStatusEl.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
  };
  
  speedTest.onupdate = ({ testState, ping, download, upload, progress }) => {
    switch (testState) {
      case 'ping':
        animateValue(pingTextEl, ping, ' ms');
        break;
      case 'download':
        animateValue(dlSpeedEl, download, ' Mbps');
        updateSpeedometer(download);
        break;
      case 'upload':
        animateValue(ulSpeedEl, upload, ' Mbps');
        // Actualizar promedio entre descarga y subida
        const currentDownload = parseFloat(dlSpeedEl.textContent) || 0;
        const avg = (currentDownload + upload) / 2;
        updateSpeedometer(avg);
        break;
    }
    
    // Opcional: Actualizar barra de progreso si la tienes en tu interfaz
    // progressBar.style.width = `${progress}%`;
  };
  
  speedTest.onend = (results) => {
    // Mostrar jitter al finalizar
    animateValue(jitterTextEl, results.jitter, ' ms');
    
    // Actualizar estado
    detailedStatusEl.innerHTML = `
      <i class="fas fa-check-circle"></i> 
      Prueba completada - Ping: ${results.ping.toFixed(1)} ms | 
      Jitter: ${results.jitter.toFixed(1)} ms
    `;
    
    // Guardar resultados en localStorage
    localStorage.setItem('lastSpeedTest', JSON.stringify(results));
    
    // Habilitar botón
    startBtn.disabled = false;
    startBtn.innerHTML = '<i class="fas fa-sync-alt"></i> REPETIR PRUEBA';
    
    // Mostrar notificación
    showNotification(
      'success', 
      `Prueba completada: ${(parseFloat(results.download) + parseFloat(results.upload)) / 2} Mbps promedio)`
    );
  };
  
  // Manejador del botón de inicio
  startBtn.addEventListener('click', async function() {
    if (speedTest.testInProgress) {
      speedTest.abortTest();
      return;
    }
    
    // Deshabilitar botón y cambiar texto
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> DETENER PRUEBA';
    
    // Resetear valores
    dlSpeedEl.textContent = '0';
    ulSpeedEl.textContent = '0';
    pingTextEl.textContent = '0';
    jitterTextEl.textContent = '0';
    avgSpeedEl.textContent = '0';
    gaugeMask.style.setProperty('--progress', '0');
    speedNeedle.style.transform = 'rotate(-135deg)';
    
    try {
      await speedTest.runFullTest();
    } catch (error) {
      console.error('Error en la prueba:', error);
      detailedStatusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error en la prueba';
      showNotification('error', 'Error durante la prueba de velocidad');
      startBtn.disabled = false;
      startBtn.innerHTML = '<i class="fas fa-sync-alt"></i> REINTENTAR';
    }
  });
  
  // Cargar resultados previos
  const lastTest = localStorage.getItem('lastSpeedTest');
  if (lastTest) {
    try {
      const results = JSON.parse(lastTest);
      
      dlSpeedEl.textContent = results.download.toFixed(1);
      ulSpeedEl.textContent = results.upload.toFixed(1);
      pingTextEl.textContent = results.ping.toFixed(1);
      jitterTextEl.textContent = results.jitter.toFixed(1);
      
      const avgSpeed = (parseFloat(results.download) + parseFloat(results.upload)) / 2;
      avgSpeedEl.textContent = avgSpeed.toFixed(1);
      updateSpeedometer(avgSpeed);
      
      detailedStatusEl.innerHTML = `
        <i class="fas fa-history"></i> 
        Última prueba: ${new Date(results.timestamp).toLocaleString()}
      `;
    } catch (e) {
      console.log('No se pudieron cargar resultados previos:', e);
    }
  }
  
  // Función de notificación (usar la que ya tienes)
  function showNotification(type, message, duration = 3000) {
    // Implementación de tu función de notificación existente
  }
});