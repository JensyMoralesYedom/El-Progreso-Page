const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/publico/estadisticas - Indicadores públicos para la landing (sin autenticación)
router.get('/estadisticas', async (req, res) => {
  try {
    const [ganado, empleados] = await Promise.all([
      pool.query(`
        SELECT COUNT(*)::int AS total_activo
        FROM ganado
        WHERE estado = 'Activo'
      `),
      pool.query(`
        SELECT COUNT(*)::int AS activos
        FROM empleados
        WHERE estado = 'Activo'
      `)
    ]);

    res.json({
      success: true,
      data: {
        ganado_activo: ganado.rows[0].total_activo,
        empleados_activos: empleados.rows[0].activos,
        anio_fundacion: 1985
      }
    });
  } catch (err) {
    console.error('Error al obtener estadísticas públicas:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

module.exports = router;
