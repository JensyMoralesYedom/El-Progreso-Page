const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken } = require('../middleware/auth');

// GET /api/dashboard/resumen - Indicadores del panel (autenticado)
router.get('/resumen', verificarToken, async (req, res) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const inicioMes = hoy.slice(0, 8) + '01';

    const [ganado, leche, finanzas, tareas, criticos, partos, stock, potreros, empleados] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE estado = 'Activo')::int AS total_activo,
          COUNT(*) FILTER (WHERE estado = 'Activo' AND sexo = 'Hembra')::int AS hembras,
          COUNT(*) FILTER (WHERE estado = 'Activo' AND sexo = 'Macho')::int AS machos,
          COUNT(*) FILTER (WHERE estado = 'Vendido')::int AS vendidos,
          COUNT(*) FILTER (WHERE estado = 'Muerto')::int AS muertos,
          COUNT(*)::int AS total_historico
        FROM ganado
      `),
      pool.query(`
        SELECT COALESCE(SUM(litros), 0)::numeric AS litros_dia
        FROM produccion_leche
        WHERE fecha = $1
      `, [hoy]),
      pool.query(`
        SELECT
          COALESCE(SUM(monto) FILTER (WHERE tipo = 'Ingreso'), 0)::numeric AS ingresos_mes,
          COALESCE(SUM(monto) FILTER (WHERE tipo = 'Egreso'), 0)::numeric AS egresos_mes
        FROM movimientos_financieros
        WHERE fecha BETWEEN $1 AND $2
      `, [inicioMes, hoy]),
      pool.query(`
        SELECT COUNT(*)::int AS tareas_pendientes
        FROM tareas
        WHERE estado IN ('Pendiente', 'En progreso')
      `),
      pool.query(`
        SELECT COUNT(*)::int AS animales_criticos
        FROM ganado
        WHERE estado = 'Activo' AND estado_sanitario = 'Crítico'
      `),
      pool.query(`
        SELECT g.id, g.arete, g.nombre, g2.nombre AS hembra_nombre,
          g2.arete AS hembra_arete, gest.fecha_parto_estimada, gest.fecha_inicio
        FROM gestaciones gest
        JOIN ganado g2 ON gest.hembra_id = g2.id
        LEFT JOIN ganado g ON gest.cria_id = g.id
        WHERE gest.estado = 'En curso' AND gest.fecha_parto_estimada IS NOT NULL
        ORDER BY gest.fecha_parto_estimada ASC
        LIMIT 5
      `),
      pool.query(`
        SELECT id, nombre, categoria, unidad_medida, stock_actual, stock_minimo
        FROM productos
        WHERE stock_actual < stock_minimo
        ORDER BY (stock_minimo - stock_actual) DESC
      `),
      pool.query(`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE estado = 'En uso')::int AS en_uso
        FROM potreros
      `),
      pool.query(`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE estado = 'Activo')::int AS activos
        FROM empleados
      `)
    ]);

    const finanzasRow = finanzas.rows[0];

    res.json({
      success: true,
      data: {
        ganado: ganado.rows[0],
        litros_dia: parseFloat(leche.rows[0].litros_dia),
        finanzas_mes: {
          ingresos: parseFloat(finanzasRow.ingresos_mes),
          egresos: parseFloat(finanzasRow.egresos_mes),
          saldo: parseFloat((finanzasRow.ingresos_mes - finanzasRow.egresos_mes).toFixed(2))
        },
        tareas_pendientes: tareas.rows[0].tareas_pendientes,
        animales_criticos: criticos.rows[0].animales_criticos,
        proximos_partos: partos.rows,
        alertas_stock: stock.rows,
        potreros: potreros.rows[0],
        empleados: empleados.rows[0]
      }
    });
  } catch (err) {
    console.error('Error al obtener resumen del dashboard:', err);
    res.status(500).json({ success: false, error: 'Error al consultar la base de datos' });
  }
});

module.exports = router;
