const express = require('express');
const router = express.Router();
const crypto = require('crypto');

router.get('/', (req, res) => {
  const size = Math.min(parseInt(req.query.size) || 10, 50); // MB, máximo 50MB
  const chunkSize = 1024 * 1024; // 1MB chunks
  
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', size * 1024 * 1024);
  
  // Generar datos en chunks para no sobrecargar la memoria
  const sendChunk = (remaining) => {
    if (remaining <= 0) return res.end();
    
    const currentChunk = Math.min(chunkSize, remaining);
    const buffer = crypto.randomBytes(currentChunk);
    
    res.write(buffer, () => {
      sendChunk(remaining - currentChunk);
    });
  };
  
  sendChunk(size * 1024 * 1024);
});

module.exports = router;