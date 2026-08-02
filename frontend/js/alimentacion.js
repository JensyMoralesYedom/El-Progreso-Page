/* ========================================
   ALIMENTACION.JS - Registro de raciones por potrero o animal
   ======================================== */

document.addEventListener('DOMContentLoaded', async function () {
  const user = await Shell.init('alimentacion');
  if (!user) return;

  if (!['admin', 'trabajador'].includes(user.rol)) {
    document.getElementById('noAccessBanner').style.display = 'flex';
    return;
  }

  document.getElementById('alimentacionContent').style.display = 'block';

  await Promise.all([cargarPotreros(), cargarGanado(), cargarAlimentacion()]);

  async function cargarPotreros() {
    try {
      const response = await fetch('/api/potreros', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        const select = document.getElementById('aliPotrero');
        select.innerHTML = '<option value="">Seleccione un potrero</option>';
        result.data.forEach(function (p) {
          const option = document.createElement('option');
          option.value = p.id;
          option.textContent = p.nombre;
          select.appendChild(option);
        });
      }
    } catch (err) {
      console.error('Error al cargar potreros:', err);
    }
  }

  async function cargarGanado() {
    try {
      const response = await fetch('/api/ganado', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        const select = document.getElementById('aliAnimal');
        select.innerHTML = '<option value="">Seleccione un animal</option>';
        result.data.filter(function (g) { return g.estado === 'Activo'; }).forEach(function (g) {
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

  async function cargarAlimentacion() {
    try {
      const response = await fetch('/api/alimentacion', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        renderTotales(result.totales);
        renderTabla(result.data);
      }
    } catch (err) {
      console.error('Error al cargar alimentación:', err);
      Shell.showNotification('Error al cargar la alimentación', 'error');
    }
  }

  function renderTotales(t) {
    document.getElementById('kpiTotalKg').textContent = parseFloat(t.total_kg) + ' kg';
    document.getElementById('kpiTotalCosto').textContent = moneda(t.total_costo);
    document.getElementById('kpiRaciones').textContent = t.total_raciones;
  }

  function renderTabla(data) {
    const tbody = document.getElementById('alimentacionBody');

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="no-data"><i class="fas fa-inbox"></i><p>Sin raciones registradas</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.forEach(function (a) {
      let destino = '-';
      if (a.potrero_nombre) {
        destino = '<span class="badge badge-blue"><i class="fas fa-tree"></i> ' + Shell.escapeHtml(a.potrero_nombre) + '</span>';
      } else if (a.arete) {
        destino = '<span class="badge badge-wheat"><i class="fas fa-cow"></i> ' + Shell.escapeHtml(a.arete) + ' ' + Shell.escapeHtml(a.animal_nombre || '') + '</span>';
      }

      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + a.id + '</td>' +
        '<td>' + formatearFecha(a.fecha) + '</td>' +
        '<td>' + Shell.escapeHtml(a.tipo) + '</td>' +
        '<td><strong>' + Shell.escapeHtml(a.alimento) + '</strong></td>' +
        '<td>' + parseFloat(a.cantidad_kg) + '</td>' +
        '<td>' + moneda(a.costo) + '</td>' +
        '<td>' + destino + '</td>' +
        '<td>' + Shell.escapeHtml(a.responsable_nombre || '-') + '</td>';
      tbody.appendChild(tr);
    });
  }

  // ============ MODAL ============
  document.getElementById('btnNewAlimentacion').addEventListener('click', function () {
    document.getElementById('alimentacionForm').reset();
    document.getElementById('aliFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('aliTipo').value = 'Forraje';
    document.getElementById('alimentacionModal').classList.add('active');
  });

  document.getElementById('alimentacionClose').addEventListener('click', function () {
    document.getElementById('alimentacionModal').classList.remove('active');
  });

  document.getElementById('alimentacionCancel').addEventListener('click', function () {
    document.getElementById('alimentacionModal').classList.remove('active');
  });

  document.getElementById('alimentacionModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });

  document.getElementById('alimentacionSave').addEventListener('click', async function () {
    const fecha = document.getElementById('aliFecha').value;
    const tipo = document.getElementById('aliTipo').value;
    const alimento = document.getElementById('aliAlimento').value.trim();
    const cantidad_kg = document.getElementById('aliCantidad').value;
    const costo = document.getElementById('aliCosto').value;
    const potrero_id = document.getElementById('aliPotrero').value;
    const animal_id = document.getElementById('aliAnimal').value;
    const observaciones = document.getElementById('aliObs').value.trim();

    if (!alimento || cantidad_kg === '') {
      Shell.showNotification('El alimento y la cantidad son obligatorios', 'error');
      return;
    }

    if (!potrero_id && !animal_id) {
      Shell.showNotification('Debe indicar un potrero o un animal', 'error');
      return;
    }

    const btn = document.getElementById('alimentacionSave');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      const response = await fetch('/api/alimentacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + Auth.getToken()
        },
        body: JSON.stringify({
          fecha: fecha || null,
          tipo: tipo,
          alimento: alimento,
          cantidad_kg: parseFloat(cantidad_kg),
          costo: costo !== '' ? parseFloat(costo) : 0,
          potrero_id: potrero_id ? parseInt(potrero_id) : null,
          animal_id: animal_id ? parseInt(animal_id) : null,
          observaciones: observaciones || null
        })
      });

      const result = await response.json();

      if (result.success) {
        Shell.showNotification('Ración registrada', 'success');
        document.getElementById('alimentacionModal').classList.remove('active');
        await cargarAlimentacion();
      } else {
        Shell.showNotification(result.error || 'Error al registrar la ración', 'error');
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

  function moneda(n) {
    if (n === null || n === undefined) return '0';
    return Number(n).toLocaleString('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 });
  }
});
