const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  const contentLength = req.headers['content-length'];
  const startTime = req.query.startTime || Date.now();
  
  // Simulamos procesamiento de los datos
  req.on('data', (chunk) => {
    // Podríamos procesar los chunks aquí si fuera necesario
  });
  
  req.on('end', () => {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // segundos
    
    res.json({
      success: true,
      size: contentLength,
      startTime,
      endTime,
      duration
    });
  });
});

module.exports = router;