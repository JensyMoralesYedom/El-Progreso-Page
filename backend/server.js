const express = require('express');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./server/routes/auth');
const ganadoRoutes = require('./server/routes/ganado');
const potrerosRoutes = require('./server/routes/potreros');
const dashboardRoutes = require('./server/routes/dashboard');
const saludRoutes = require('./server/routes/salud');
const reproduccionRoutes = require('./server/routes/reproduccion');
const produccionRoutes = require('./server/routes/produccion');
const alimentacionRoutes = require('./server/routes/alimentacion');
const finanzasRoutes = require('./server/routes/finanzas');
const empleadosRoutes = require('./server/routes/empleados');
const inventarioRoutes = require('./server/routes/inventario');
const publicoRoutes = require('./server/routes/publico');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// Servir archivos estáticos desde la carpeta frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/ganado', ganadoRoutes);
app.use('/api/potreros', potrerosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/salud', saludRoutes);
app.use('/api/reproduccion', reproduccionRoutes);
app.use('/api/produccion', produccionRoutes);
app.use('/api/alimentacion', alimentacionRoutes);
app.use('/api/finanzas', finanzasRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/publico', publicoRoutes);

// Ruta para servir index.html como fallback
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
