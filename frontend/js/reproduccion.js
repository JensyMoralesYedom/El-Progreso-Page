/* ========================================
   REPRODUCCION.JS - Montas, gestaciones y partos
   ======================================== */

document.addEventListener('DOMContentLoaded', async function () {
  const user = await Shell.init('reproduccion');
  if (!user) return;

  const puedeModificar = ['admin', 'veterinario'].includes(user.rol);

  let ganadoData = [];
  let montasData = [];
  let gestacionesData = [];
  let deleteId = null;
  let deleteType = '';

  if (!puedeModificar) {
    document.getElementById('readonlyBanner').style.display = 'flex';
  } else {
    document.getElementById('btnNewMonta').style.display = 'flex';
    document.getElementById('colAccionesMon').style.display = '';
    document.getElementById('btnNewGestacion').style.display = 'flex';
    document.getElementById('colAccionesGes').style.display = '';
    document.getElementById('btnNewParto').style.display = 'flex';
  }

  await Promise.all([cargarGanado(), cargarMontas(), cargarGestaciones()]);

  // ============ TABS ============
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    });
  });

  // ============ CARGA DE DATOS ============
  async function cargarGanado() {
    try {
      const response = await fetch('/api/ganado', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        ganadoData = result.data;
        poblarSelects();
      }
    } catch (err) {
      console.error('Error al cargar ganado:', err);
    }
  }

  async function cargarMontas() {
    try {
      const response = await fetch('/api/reproduccion/montas', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        montasData = result.data;
        renderMontas();
      }
    } catch (err) {
      console.error('Error al cargar montas:', err);
    }
  }

  async function cargarGestaciones() {
    try {
      const filtro = document.getElementById('filtroEstadoGestacion').value;
      const url = '/api/reproduccion/gestaciones' + (filtro ? '?estado=' + encodeURIComponent(filtro) : '');
      const response = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        gestacionesData = result.data;
        renderGestaciones();
        renderPartos();
      }
    } catch (err) {
      console.error('Error al cargar gestaciones:', err);
    }
  }

  function poblarSelects() {
    const hembras = ganadoData.filter(function (g) { return g.sexo === 'Hembra'; });
    const machos = ganadoData.filter(function (g) { return g.sexo === 'Macho'; });

    ['monHembra', 'gesHembra'].forEach(function (id) {
      const select = document.getElementById(id);
      select.innerHTML = '<option value="">Seleccione una hembra</option>';
      hembras.forEach(function (g) {
        const option = document.createElement('option');
        option.value = g.id;
        option.textContent = g.arete + ' - ' + g.nombre;
        select.appendChild(option);
      });
    });

    const monMacho = document.getElementById('monMacho');
    monMacho.innerHTML = '<option value="">Seleccione un macho</option>';
    machos.forEach(function (g) {
      const option = document.createElement('option');
      option.value = g.id;
      option.textContent = g.arete + ' - ' + g.nombre;
      monMacho.appendChild(option);
    });

    const gesMonta = document.getElementById('gesMonta');
    gesMonta.innerHTML = '<option value="">Sin monta asociada</option>';
    montasData.forEach(function (m) {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = m.hembra_arete + ' - ' + (m.tipo || '') + ' (' + formatearFecha(m.fecha) + ')';
      gesMonta.appendChild(option);
    });
  }

  // ============ TABLA MONTAS ============
  function renderMontas() {
    const tbody = document.getElementById('montaBody');

    if (montasData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="no-data"><i class="fas fa-inbox"></i><p>Sin montas registradas</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    montasData.forEach(function (m) {
      let acciones = '';
      if (puedeModificar) {
        acciones = '<td class="actions">' +
          '<button class="btn-action btn-edit" data-id="' + m.id + '" title="Editar"><i class="fas fa-edit"></i></button>' +
          '<button class="btn-action btn-delete" data-id="' + m.id + '" title="Eliminar"><i class="fas fa-trash"></i></button>' +
          '</td>';
      }

      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + m.id + '</td>' +
        '<td>' + formatearFecha(m.fecha) + '</td>' +
        '<td>' + Shell.escapeHtml(m.macho_arete || '-') + ' ' + Shell.escapeHtml(m.macho_nombre || '') + '</td>' +
        '<td><strong>' + Shell.escapeHtml(m.hembra_arete || '-') + '</strong> ' + Shell.escapeHtml(m.hembra_nombre || '') + '</td>' +
        '<td>' + Shell.escapeHtml(m.tipo) + '</td>' +
        '<td>' + Shell.escapeHtml(m.resultado || '-') + '</td>' +
        '<td>' + Shell.escapeHtml(m.observaciones || '-') + '</td>' +
        acciones;
      tbody.appendChild(tr);
    });

    if (puedeModificar) {
      tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          editarMonta(parseInt(this.getAttribute('data-id')));
        });
      });
      tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          deleteType = 'monta';
          confirmarEliminar(parseInt(this.getAttribute('data-id')));
        });
      });
    }
  }

  // ============ TABLA GESTACIONES ============
  function renderGestaciones() {
    const tbody = document.getElementById('gestacionBody');

    if (gestacionesData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="no-data"><i class="fas fa-inbox"></i><p>Sin gestaciones registradas</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    gestacionesData.forEach(function (g) {
      const estClass = g.estado === 'En curso' ? 'badge-wheat' : (g.estado === 'Finalizada' ? 'badge-bueno' : 'badge-critico');

      let acciones = '';
      if (puedeModificar) {
        acciones = '<td class="actions">' +
          '<button class="btn-action btn-edit" data-id="' + g.id + '" title="Editar"><i class="fas fa-edit"></i></button>' +
          '<button class="btn-action btn-delete" data-id="' + g.id + '" title="Eliminar"><i class="fas fa-trash"></i></button>' +
          '</td>';
      }

      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + g.id + '</td>' +
        '<td><strong>' + Shell.escapeHtml(g.hembra_arete || '-') + '</strong> ' + Shell.escapeHtml(g.hembra_nombre || '') + '</td>' +
        '<td>' + formatearFecha(g.fecha_inicio) + '</td>' +
        '<td>' + formatearFecha(g.fecha_parto_estimada) + '</td>' +
        '<td><span class="badge ' + estClass + '">' + g.estado + '</span></td>' +
        '<td>' + Shell.escapeHtml(g.resultado || '-') + '</td>' +
        '<td>' + Shell.escapeHtml(g.cria_arete ? g.cria_arete + ' - ' + g.cria_nombre : '-') + '</td>' +
        acciones;
      tbody.appendChild(tr);
    });

    if (puedeModificar) {
      tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          editarGestacion(parseInt(this.getAttribute('data-id')));
        });
      });
      tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          deleteType = 'gestacion';
          confirmarEliminar(parseInt(this.getAttribute('data-id')));
        });
      });
    }
  }

  // ============ TABLA PARTOS (gestaciones en curso) ============
  function renderPartos() {
    const tbody = document.getElementById('partoBody');
    const enCurso = gestacionesData.filter(function (g) { return g.estado === 'En curso'; });

    if (enCurso.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-data"><i class="fas fa-inbox"></i><p>No hay gestaciones en curso</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    enCurso.forEach(function (g) {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + g.id + '</td>' +
        '<td><strong>' + Shell.escapeHtml(g.hembra_arete || '-') + '</strong> ' + Shell.escapeHtml(g.hembra_nombre || '') + '</td>' +
        '<td>' + formatearFecha(g.fecha_inicio) + '</td>' +
        '<td>' + formatearFecha(g.fecha_parto_estimada) + '</td>' +
        '<td>' + Shell.escapeHtml(g.cria_arete ? g.cria_arete + ' - ' + g.cria_nombre : '-') + '</td>' +
        '<td><span class="badge badge-wheat">En curso</span></td>';
      tbody.appendChild(tr);
    });
  }

  document.getElementById('filtroEstadoGestacion').addEventListener('change', cargarGestaciones);

  // ============ MODAL MONTA ============
  document.getElementById('btnNewMonta').addEventListener('click', function () {
    document.getElementById('montaId').value = '';
    document.getElementById('montaTitle').textContent = 'Nueva Monta';
    document.getElementById('montaForm').reset();
    document.getElementById('monFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('monTipo').value = 'Natural';
    document.getElementById('montaModal').classList.add('active');
  });

  document.getElementById('montaClose').addEventListener('click', function () {
    document.getElementById('montaModal').classList.remove('active');
  });

  document.getElementById('montaCancel').addEventListener('click', function () {
    document.getElementById('montaModal').classList.remove('active');
  });

  document.getElementById('montaModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });

  function editarMonta(id) {
    const m = montasData.find(function (x) { return x.id === id; });
    if (!m) return;

    document.getElementById('montaId').value = m.id;
    document.getElementById('montaTitle').textContent = 'Editar Monta';
    document.getElementById('montaForm').reset();
    document.getElementById('monHembra').value = m.hembra_id;
    document.getElementById('monMacho').value = m.macho_id || '';
    document.getElementById('monFecha').value = m.fecha ? m.fecha.split('T')[0] : '';
    document.getElementById('monTipo').value = m.tipo;
    document.getElementById('monResultado').value = m.resultado || '';
    document.getElementById('monObs').value = m.observaciones || '';
    document.getElementById('montaModal').classList.add('active');
  }

  document.getElementById('montaSave').addEventListener('click', async function () {
    const id = document.getElementById('montaId').value;
    const isEdit = id !== '';

    const hembra_id = document.getElementById('monHembra').value;
    const macho_id = document.getElementById('monMacho').value;
    const fecha = document.getElementById('monFecha').value;
    const tipo = document.getElementById('monTipo').value;
    const resultado = document.getElementById('monResultado').value.trim();
    const observaciones = document.getElementById('monObs').value.trim();

    if (!hembra_id) {
      Shell.showNotification('La hembra es obligatoria', 'error');
      return;
    }

    const body = {
      hembra_id: parseInt(hembra_id),
      macho_id: macho_id ? parseInt(macho_id) : null,
      fecha: fecha || null,
      tipo: tipo,
      resultado: resultado || null,
      observaciones: observaciones || null
    };

    const btn = document.getElementById('montaSave');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      let url = '/api/reproduccion/montas';
      let method = 'POST';
      if (isEdit) {
        url = '/api/reproduccion/montas/' + id;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + Auth.getToken()
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (result.success) {
        Shell.showNotification(isEdit ? 'Monta actualizada' : 'Monta registrada', 'success');
        document.getElementById('montaModal').classList.remove('active');
        await Promise.all([cargarMontas(), cargarGestaciones()]);
      } else {
        Shell.showNotification(result.error || 'Error al guardar la monta', 'error');
      }
    } catch (err) {
      Shell.showNotification('Error de conexión. Intente nuevamente.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  });

  // ============ MODAL GESTACIÓN ============
  document.getElementById('btnNewGestacion').addEventListener('click', function () {
    document.getElementById('gestacionId').value = '';
    document.getElementById('gestacionTitle').textContent = 'Nueva Gestación';
    document.getElementById('gestacionForm').reset();
    document.getElementById('gesInicio').value = new Date().toISOString().split('T')[0];
    document.getElementById('gesEstado').value = 'En curso';
    document.getElementById('gestacionModal').classList.add('active');
  });

  document.getElementById('gestacionClose').addEventListener('click', function () {
    document.getElementById('gestacionModal').classList.remove('active');
  });

  document.getElementById('gestacionCancel').addEventListener('click', function () {
    document.getElementById('gestacionModal').classList.remove('active');
  });

  document.getElementById('gestacionModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });

  function editarGestacion(id) {
    const g = gestacionesData.find(function (x) { return x.id === id; });
    if (!g) return;

    document.getElementById('gestacionId').value = g.id;
    document.getElementById('gestacionTitle').textContent = 'Editar Gestación';
    document.getElementById('gestacionForm').reset();
    document.getElementById('gesHembra').value = g.hembra_id;
    document.getElementById('gesMonta').value = g.monta_id || '';
    document.getElementById('gesInicio').value = g.fecha_inicio ? g.fecha_inicio.split('T')[0] : '';
    document.getElementById('gesPartoEstimado').value = g.fecha_parto_estimada ? g.fecha_parto_estimada.split('T')[0] : '';
    document.getElementById('gesEstado').value = g.estado;
    document.getElementById('gesResultado').value = g.resultado || '';
    document.getElementById('gesObs').value = g.observaciones || '';
    document.getElementById('gestacionModal').classList.add('active');
  }

  document.getElementById('gestacionSave').addEventListener('click', async function () {
    const id = document.getElementById('gestacionId').value;
    const isEdit = id !== '';

    const hembra_id = document.getElementById('gesHembra').value;
    const monta_id = document.getElementById('gesMonta').value;
    const fecha_inicio = document.getElementById('gesInicio').value;
    const fecha_parto_estimada = document.getElementById('gesPartoEstimado').value;
    const estado = document.getElementById('gesEstado').value;
    const resultado = document.getElementById('gesResultado').value;
    const observaciones = document.getElementById('gesObs').value.trim();

    if (!hembra_id || !fecha_inicio) {
      Shell.showNotification('La hembra y la fecha de inicio son obligatorias', 'error');
      return;
    }

    const body = {
      hembra_id: parseInt(hembra_id),
      monta_id: monta_id ? parseInt(monta_id) : null,
      fecha_inicio: fecha_inicio,
      fecha_parto_estimada: fecha_parto_estimada || null,
      estado: estado,
      resultado: resultado || null,
      observaciones: observaciones || null
    };

    const btn = document.getElementById('gestacionSave');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      let url = '/api/reproduccion/gestaciones';
      let method = 'POST';
      if (isEdit) {
        url = '/api/reproduccion/gestaciones/' + id;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + Auth.getToken()
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (result.success) {
        Shell.showNotification(isEdit ? 'Gestación actualizada' : 'Gestación registrada', 'success');
        document.getElementById('gestacionModal').classList.remove('active');
        await cargarGestaciones();
      } else {
        Shell.showNotification(result.error || 'Error al guardar la gestación', 'error');
      }
    } catch (err) {
      Shell.showNotification('Error de conexión. Intente nuevamente.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  });

  // ============ MODAL PARTO ============
  function poblarGestacionesParto() {
    const select = document.getElementById('parGestacion');
    select.innerHTML = '<option value="">Seleccione una gestación</option>';
    gestacionesData.filter(function (g) { return g.estado === 'En curso'; }).forEach(function (g) {
      const option = document.createElement('option');
      option.value = g.id;
      option.textContent = g.id + ' - ' + g.hembra_arete + ' ' + g.hembra_nombre;
      select.appendChild(option);
    });
  }

  document.getElementById('btnNewParto').addEventListener('click', function () {
    document.getElementById('partoForm').reset();
    document.getElementById('parFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('parResultado').value = 'Normal';
    poblarGestacionesParto();
    document.getElementById('parCriaFields').style.display = 'flex';
    document.getElementById('parCriaFields2').style.display = 'flex';
    document.getElementById('partoModal').classList.add('active');
  });

  document.getElementById('partoClose').addEventListener('click', function () {
    document.getElementById('partoModal').classList.remove('active');
  });

  document.getElementById('partoCancel').addEventListener('click', function () {
    document.getElementById('partoModal').classList.remove('active');
  });

  document.getElementById('partoModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });

  document.getElementById('parResultado').addEventListener('change', function () {
    const esAborto = this.value === 'Aborto';
    document.getElementById('parCriaFields').style.display = esAborto ? 'none' : 'flex';
    document.getElementById('parCriaFields2').style.display = esAborto ? 'none' : 'flex';
  });

  document.getElementById('partoSave').addEventListener('click', async function () {
    const gestacion_id = document.getElementById('parGestacion').value;
    const fecha_parto = document.getElementById('parFecha').value;
    const resultado = document.getElementById('parResultado').value;
    const arete_cria = document.getElementById('parArete').value.trim();
    const nombre_cria = document.getElementById('parNombre').value.trim();
    const sexo_cria = document.getElementById('parSexo').value;
    const peso_kg_cria = document.getElementById('parPeso').value;

    if (!gestacion_id) {
      Shell.showNotification('Debe seleccionar una gestación', 'error');
      return;
    }

    if (resultado !== 'Aborto' && (!arete_cria || !nombre_cria || !sexo_cria)) {
      Shell.showNotification('Para un parto exitoso se requieren arete, nombre y sexo de la cría', 'error');
      return;
    }

    const body = {
      gestacion_id: parseInt(gestacion_id),
      fecha_parto: fecha_parto || null,
      resultado: resultado,
      arete_cria: arete_cria || null,
      nombre_cria: nombre_cria || null,
      sexo_cria: sexo_cria || null,
      peso_kg_cria: peso_kg_cria !== '' ? parseFloat(peso_kg_cria) : null
    };

    const btn = document.getElementById('partoSave');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      const response = await fetch('/api/reproduccion/partos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + Auth.getToken()
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (result.success) {
        Shell.showNotification(result.message || 'Parto registrado', 'success');
        document.getElementById('partoModal').classList.remove('active');
        await cargarGestaciones();
      } else {
        Shell.showNotification(result.error || 'Error al registrar el parto', 'error');
      }
    } catch (err) {
      Shell.showNotification('Error de conexión. Intente nuevamente.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  });

  // ============ ELIMINAR ============
  function confirmarEliminar(id) {
    deleteId = id;
    const base = deleteType === 'monta' ? 'esta monta' : 'esta gestación';
    document.getElementById('confirmSubtext').textContent = 'Se eliminará ' + base + ' de forma permanente';
    document.getElementById('confirmModal').classList.add('active');
  }

  document.getElementById('btnConfirmCancel').addEventListener('click', function () {
    document.getElementById('confirmModal').classList.remove('active');
    deleteId = null;
  });

  document.getElementById('confirmModal').addEventListener('click', function (e) {
    if (e.target === this) {
      this.classList.remove('active');
      deleteId = null;
    }
  });

  document.getElementById('btnConfirmDelete').addEventListener('click', async function () {
    if (deleteId === null) return;

    const btn = document.getElementById('btnConfirmDelete');
    btn.disabled = true;
    btn.textContent = 'Eliminando...';

    try {
      const url = '/api/reproduccion/' + deleteType + 's/' + deleteId;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });

      const result = await response.json();

      if (result.success) {
        Shell.showNotification('Registro eliminado', 'success');
        document.getElementById('confirmModal').classList.remove('active');
        await Promise.all([cargarMontas(), cargarGestaciones()]);
      } else {
        Shell.showNotification(result.error || 'Error al eliminar el registro', 'error');
      }
    } catch (err) {
      Shell.showNotification('Error de conexión. Intente nuevamente.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Eliminar';
      deleteId = null;
    }
  });

  // ============ HELPERS ============
  function formatearFecha(f) {
    if (!f) return '-';
    return new Date(f).toLocaleDateString('es-DO');
  }
});
