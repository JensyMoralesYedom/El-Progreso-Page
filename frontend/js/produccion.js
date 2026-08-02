/* ========================================
   PRODUCCION.JS - Registro diario de producción de leche
   ======================================== */

document.addEventListener('DOMContentLoaded', async function () {
  const user = await Shell.init('produccion');
  if (!user) return;

  if (!['admin', 'trabajador'].includes(user.rol)) {
    document.getElementById('noAccessBanner').style.display = 'flex';
    return;
  }

  let ganadoData = [];

  document.getElementById('produccionContent').style.display = 'block';

  await Promise.all([cargarGanado(), cargarProduccion()]);

  async function cargarGanado() {
    try {
      const response = await fetch('/api/ganado', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        ganadoData = result.data;
        const select = document.getElementById('prodAnimal');
        select.innerHTML = '<option value="">Seleccione un animal</option>';
        ganadoData.filter(function (g) { return g.estado === 'Activo' && g.sexo === 'Hembra'; }).forEach(function (g) {
          const option = document.createElement('option');
          option.value = g.id;
          option.textContent = g.arete + ' - ' + g.nombre;
          select.appendChild(option);
        });
      }
    } catch (err) {
      console.error('Error al cargar ganado:', err);
    }
  }

  async function cargarProduccion() {
    try {
      const fecha = document.getElementById('filtroFecha').value;
      const url = '/api/produccion' + (fecha ? '?fecha=' + fecha : '');
      const response = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        renderTotales(result.totales);
        renderTabla(result.data);
      }
    } catch (err) {
      console.error('Error al cargar producción:', err);
      Shell.showNotification('Error al cargar la producción', 'error');
    }
  }

  function renderTotales(t) {
    document.getElementById('kpiTotalLitros').textContent = parseFloat(t.total_litros) + ' L';
    document.getElementById('kpiManana').textContent = parseFloat(t.litros_manana) + ' L';
    document.getElementById('kpiTarde').textContent = parseFloat(t.litros_tarde) + ' L';
    document.getElementById('kpiDias').textContent = t.dias_registrados;
  }

  function renderTabla(data) {
    const tbody = document.getElementById('produccionBody');

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-data"><i class="fas fa-inbox"></i><p>Sin registros de producción</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.forEach(function (p) {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + p.id + '</td>' +
        '<td>' + formatearFecha(p.fecha) + '</td>' +
        '<td><strong>' + Shell.escapeHtml(p.arete || '-') + '</strong> ' + Shell.escapeHtml(p.animal_nombre || '') + '</td>' +
        '<td>' + p.turno + '</td>' +
        '<td><strong>' + parseFloat(p.litros) + '</strong></td>' +
        '<td>' + Shell.escapeHtml(p.observaciones || '-') + '</td>';
      tbody.appendChild(tr);
    });
  }

  document.getElementById('filtroFecha').addEventListener('change', cargarProduccion);

  // ============ MODAL ============
  document.getElementById('btnNewProduccion').addEventListener('click', function () {
    document.getElementById('produccionForm').reset();
    document.getElementById('prodFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('produccionModal').classList.add('active');
  });

  document.getElementById('produccionClose').addEventListener('click', function () {
    document.getElementById('produccionModal').classList.remove('active');
  });

  document.getElementById('produccionCancel').addEventListener('click', function () {
    document.getElementById('produccionModal').classList.remove('active');
  });

  document.getElementById('produccionModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });

  document.getElementById('produccionSave').addEventListener('click', async function () {
    const animal_id = document.getElementById('prodAnimal').value;
    const fecha = document.getElementById('prodFecha').value;
    const turno = document.getElementById('prodTurno').value;
    const litros = document.getElementById('prodLitros').value;
    const observaciones = document.getElementById('prodObs').value.trim();

    if (!animal_id || !turno || litros === '') {
      Shell.showNotification('El animal, el turno y los litros son obligatorios', 'error');
      return;
    }

    const btn = document.getElementById('produccionSave');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      const response = await fetch('/api/produccion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + Auth.getToken()
        },
        body: JSON.stringify({
          animal_id: parseInt(animal_id),
          fecha: fecha || null,
          turno: turno,
          litros: parseFloat(litros),
          observaciones: observaciones || null
        })
      });

      const result = await response.json();

      if (result.success) {
        Shell.showNotification('Producción registrada', 'success');
        document.getElementById('produccionModal').classList.remove('active');
        await cargarProduccion();
      } else {
        Shell.showNotification(result.error || 'Error al registrar la producción', 'error');
      }
    } catch (err) {
      Shell.showNotification('Error de conexión. Intente nuevamente.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  });

  // ============ HELPERS ============
  function formatearFecha(f) {
    if (!f) return '-';
    return new Date(f).toLocaleDateString('es-DO');
  }
});
