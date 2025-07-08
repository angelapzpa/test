require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pingRouter = require('./routes/ping');
const downloadRouter = require('./routes/download');
const uploadRouter = require('./routes/upload');

const app = express();

// Configuración
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Rutas API
app.use('/api/ping', pingRouter);
app.use('/api/download', downloadRouter);
app.use('/api/upload', uploadRouter);

// Servir frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error en el servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de speedtest corriendo en puerto ${PORT}`);
});