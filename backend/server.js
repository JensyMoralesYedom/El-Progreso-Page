const express = require('express');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./server/routes/auth');
const ganadoRoutes = require('./server/routes/ganado');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// Servir archivos estáticos desde la carpeta frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/ganado', ganadoRoutes);

// Ruta para servir index.html como fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
