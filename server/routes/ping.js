const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => {
  // Simulamos un pequeño procesamiento para medir latencia real
  const start = process.hrtime.bigint();
  
  // Pequeña operación para consumir tiempo
  let result = 0;
  for (let i = 0; i < 1000; i++) {
    result += Math.sqrt(i);
  }
  
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1e6; // Convertir a milisegundos
  
  res.json({
    success: true,
    timestamp: Date.now(),
    processingTime: duration
  });
});

module.exports = router;