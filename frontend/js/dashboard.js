/* ========================================
   DASHBOARD.JS - Panel de indicadores
   ======================================== */

document.addEventListener('DOMContentLoaded', async function () {
  const user = await Shell.init('dashboard');
  if (!user) return;

  await cargarResumen();

  async function cargarResumen() {
    try {
      const response = await fetch('/api/dashboard/resumen', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });

      if (response.status === 401) {
        Auth.logout();
        return;
      }

      const result = await response.json();

      if (result.success) {
        renderKPIs(result.data);
        renderPartos(result.data.proximos_partos || []);
        renderStock(result.data.alertas_stock || []);
      } else {
        Shell.showNotification(result.error || 'Error al cargar el resumen', 'error');
      }
    } catch (err) {
      console.error('Error al cargar resumen:', err);
      Shell.showNotification('Error de conexión al cargar el dashboard', 'error');
    }
  }

  function renderKPIs(d) {
    const g = d.ganado || {};
    const f = d.finanzas_mes || {};
    const p = d.potreros || {};
    const e = d.empleados || {};
    const activo = g.total_activo || 0;

    const tarjetas = [
      { icono: 'cow', valor: activo, etiqueta: 'Ganado activo', sub: (g.hembras || 0) + ' hembras · ' + (g.machos || 0) + ' machos', tipo: 'kpi-forest' },
      { icono: 'tint', valor: formatearNumero(d.litros_dia), etiqueta: 'Litros hoy', sub: 'Producción diaria', tipo: 'kpi-blue' },
      { icono: 'coins', valor: moneda(f.saldo), etiqueta: 'Saldo del mes', sub: '+ ' + moneda(f.ingresos) + ' / - ' + moneda(f.egresos), tipo: 'kpi-wheat' },
      { icono: 'check-square', valor: d.tareas_pendientes, etiqueta: 'Tareas pendientes', sub: 'Pendientes y en progreso', tipo: 'kpi-blue' },
      { icono: 'heartbeat', valor: d.animales_criticos, etiqueta: 'Animales críticos', sub: 'Estado sanitario crítico', tipo: 'kpi-red' },
      { icono: 'warehouse', valor: (p.en_uso || 0) + ' / ' + (p.total || 0), etiqueta: 'Potreros en uso', sub: 'Potreros y establos', tipo: 'kpi-forest' },
      { icono: 'users', valor: e.activos + ' / ' + e.total, etiqueta: 'Empleados activos', sub: 'Personal de la finca', tipo: 'kpi-forest' },
      { icono: 'history', valor: g.total_historico, etiqueta: 'Registro histórico', sub: (g.vendidos || 0) + ' vendidos · ' + (g.muertos || 0) + ' muertos', tipo: 'kpi-wheat' }
    ];

    const grid = document.getElementById('kpiGrid');
    grid.innerHTML = '';

    tarjetas.forEach(function (t) {
      const card = document.createElement('div');
      card.className = 'kpi-card ' + t.tipo;
      card.innerHTML =
        '<div class="kpi-icon"><i class="fas fa-' + t.icono + '"></i></div>' +
        '<div class="kpi-info">' +
          '<span class="kpi-value">' + t.valor + '</span>' +
          '<span class="kpi-label">' + t.etiqueta + '</span>' +
          (t.sub ? '<span class="kpi-sub">' + t.sub + '</span>' : '') +
        '</div>';
      grid.appendChild(card);
    });
  }

  function renderPartos(partos) {
    const container = document.getElementById('panelPartos');

    if (!partos.length) {
      container.innerHTML = '<div class="panel-empty"><i class="fas fa-baby"></i><p>No hay partos programados</p></div>';
      return;
    }

    const list = document.createElement('ul');
    list.className = 'panel-list';

    partos.forEach(function (p) {
      const li = document.createElement('li');
      li.innerHTML =
        '<div class="item-main">' +
          '<div class="item-icon"><i class="fas fa-cow"></i></div>' +
          '<div>' +
            '<div class="item-title">' + Shell.escapeHtml(p.hembra_nombre) + '</div>' +
            '<div class="item-sub">' + Shell.escapeHtml(p.hembra_arete) + ' · Fecha estimada</div>' +
          '</div>' +
        '</div>' +
        '<span class="badge badge-parto">' + formatearFecha(p.fecha_parto_estimada) + '</span>';
      list.appendChild(li);
    });

    container.innerHTML = '';
    container.appendChild(list);
  }

  function renderStock(alertas) {
    const container = document.getElementById('panelStock');

    if (!alertas.length) {
      container.innerHTML = '<div class="panel-empty"><i class="fas fa-box-open"></i><p>Sin alertas de stock</p></div>';
      return;
    }

    const list = document.createElement('ul');
    list.className = 'panel-list';

    alertas.forEach(function (a) {
      const li = document.createElement('li');
      li.innerHTML =
        '<div class="item-main">' +
          '<div class="item-icon"><i class="fas fa-box"></i></div>' +
          '<div>' +
            '<div class="item-title">' + Shell.escapeHtml(a.nombre) + '</div>' +
            '<div class="item-sub">Stock mínimo: ' + a.stock_minimo + ' ' + Shell.escapeHtml(a.unidad_medida || '') + '</div>' +
          '</div>' +
        '</div>' +
        '<span class="badge badge-alert">' + a.stock_actual + ' restante</span>';
      list.appendChild(li);
    });

    container.innerHTML = '';
    container.appendChild(list);
  }

  function formatearNumero(n) {
    if (n === null || n === undefined) return '0';
    return Number(n).toLocaleString('es-DO', { maximumFractionDigits: 1 });
  }

  function moneda(n) {
    if (n === null || n === undefined) n = 0;
    return Number(n).toLocaleString('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 });
  }

  function formatearFecha(f) {
    if (!f) return '-';
    return new Date(f).toLocaleDateString('es-DO');
  }
});
