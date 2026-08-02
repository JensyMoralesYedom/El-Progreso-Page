/* ========================================
   SALUD.JS - Vacunaciones, tratamientos, visitas e historial
   ======================================== */

document.addEventListener('DOMContentLoaded', async function () {
  const user = await Shell.init('salud');
  if (!user) return;

  const puedeModificar = ['admin', 'veterinario'].includes(user.rol);

  let ganadoData = [];
  let vacunasData = [];
  let tratamientosData = [];
  let visitasData = [];
  let deleteId = null;
  let deleteType = '';

  if (!puedeModificar) {
    document.getElementById('readonlyBanner').style.display = 'flex';
  } else {
    document.getElementById('btnNewVacuna').style.display = 'flex';
    document.getElementById('colAccionesVac').style.display = '';
    document.getElementById('btnNewTratamiento').style.display = 'flex';
    document.getElementById('colAccionesTra').style.display = '';
    document.getElementById('btnNewVisita').style.display = 'flex';
    document.getElementById('colAccionesVis').style.display = '';
  }

  await Promise.all([cargarGanado(), cargarVacunas(), cargarTratamientos(), cargarVisitas()]);

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
        poblarSelectsAnimales();
      }
    } catch (err) {
      console.error('Error al cargar ganado:', err);
    }
  }

  async function cargarVacunas() {
    try {
      const response = await fetch('/api/salud/vacunaciones', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        vacunasData = result.data;
        renderVacunas();
      }
    } catch (err) {
      console.error('Error al cargar vacunaciones:', err);
    }
  }

  async function cargarTratamientos() {
    try {
      const response = await fetch('/api/salud/tratamientos', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        tratamientosData = result.data;
        renderTratamientos();
      }
    } catch (err) {
      console.error('Error al cargar tratamientos:', err);
    }
  }

  async function cargarVisitas() {
    try {
      const response = await fetch('/api/salud/visitas', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        visitasData = result.data;
        renderVisitas();
      }
    } catch (err) {
      console.error('Error al cargar visitas:', err);
    }
  }

  function poblarSelectsAnimales() {
    const selects = ['vacAnimal', 'traAnimal', 'histAnimal'];
    selects.forEach(function (id) {
      const select = document.getElementById(id);
      const esHistorial = id === 'histAnimal';
      select.innerHTML = esHistorial
        ? '<option value="">Seleccione un animal</option>'
        : '<option value="">Seleccione un animal</option>';
      ganadoData.forEach(function (g) {
        const option = document.createElement('option');
        option.value = g.id;
        option.textContent = g.arete + ' - ' + g.nombre;
        select.appendChild(option);
      });
    });
  }

  // ============ TABLA VACUNAS ============
  function renderVacunas() {
    const tbody = document.getElementById('vacunaBody');

    if (vacunasData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="no-data"><i class="fas fa-inbox"></i><p>Sin vacunaciones registradas</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    vacunasData.forEach(function (v) {
      let acciones = '';
      if (puedeModificar) {
        acciones = '<td class="actions">' +
          '<button class="btn-action btn-edit" data-id="' + v.id + '" title="Editar"><i class="fas fa-edit"></i></button>' +
          '<button class="btn-action btn-delete" data-id="' + v.id + '" title="Eliminar"><i class="fas fa-trash"></i></button>' +
          '</td>';
      }

      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + v.id + '</td>' +
        '<td><strong>' + Shell.escapeHtml(v.arete || '-') + '</strong> ' + Shell.escapeHtml(v.animal_nombre || '') + '</td>' +
        '<td>' + Shell.escapeHtml(v.vacuna) + '</td>' +
        '<td>' + Shell.escapeHtml(v.dosis || '-') + '</td>' +
        '<td>' + formatearFecha(v.fecha_aplicacion) + '</td>' +
        '<td>' + formatearFecha(v.fecha_proxima) + '</td>' +
        '<td>' + Shell.escapeHtml(v.veterinario || '-') + '</td>' +
        '<td>' + Shell.escapeHtml(v.observaciones || '-') + '</td>' +
        acciones;
      tbody.appendChild(tr);
    });

    if (puedeModificar) {
      tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          editarVacuna(parseInt(this.getAttribute('data-id')));
        });
      });
      tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          deleteType = 'vacuna';
          confirmarEliminar(parseInt(this.getAttribute('data-id')));
        });
      });
    }
  }

  // ============ TABLA TRATAMIENTOS ============
  function renderTratamientos() {
    const tbody = document.getElementById('tratamientoBody');

    if (tratamientosData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="no-data"><i class="fas fa-inbox"></i><p>Sin tratamientos registrados</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    tratamientosData.forEach(function (t) {
      const estClass = t.estado === 'Activo' ? 'badge-critico' : (t.estado === 'Finalizado' ? 'badge-bueno' : 'badge-regular');

      let acciones = '';
      if (puedeModificar) {
        acciones = '<td class="actions">' +
          '<button class="btn-action btn-edit" data-id="' + t.id + '" title="Editar"><i class="fas fa-edit"></i></button>' +
          '<button class="btn-action btn-delete" data-id="' + t.id + '" title="Eliminar"><i class="fas fa-trash"></i></button>' +
          '</td>';
      }

      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + t.id + '</td>' +
        '<td><strong>' + Shell.escapeHtml(t.arete || '-') + '</strong> ' + Shell.escapeHtml(t.animal_nombre || '') + '</td>' +
        '<td>' + Shell.escapeHtml(t.tipo) + '</td>' +
        '<td>' + Shell.escapeHtml(t.diagnostico || '-') + '</td>' +
        '<td>' + Shell.escapeHtml(t.medicamento || '-') + '</td>' +
        '<td>' + formatearFecha(t.fecha_inicio) + '</td>' +
        '<td>' + formatearFecha(t.fecha_fin) + '</td>' +
        '<td><span class="badge ' + estClass + '">' + t.estado + '</span></td>' +
        '<td>' + moneda(t.costo) + '</td>' +
        acciones;
      tbody.appendChild(tr);
    });

    if (puedeModificar) {
      tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          editarTratamiento(parseInt(this.getAttribute('data-id')));
        });
      });
      tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          deleteType = 'tratamiento';
          confirmarEliminar(parseInt(this.getAttribute('data-id')));
        });
      });
    }
  }

  // ============ TABLA VISITAS ============
  function renderVisitas() {
    const tbody = document.getElementById('visitaBody');

    if (visitasData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="no-data"><i class="fas fa-inbox"></i><p>Sin visitas registradas</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    visitasData.forEach(function (v) {
      let acciones = '';
      if (puedeModificar) {
        acciones = '<td class="actions">' +
          '<button class="btn-action btn-edit" data-id="' + v.id + '" title="Editar"><i class="fas fa-edit"></i></button>' +
          '<button class="btn-action btn-delete" data-id="' + v.id + '" title="Eliminar"><i class="fas fa-trash"></i></button>' +
          '</td>';
      }

      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + v.id + '</td>' +
        '<td>' + formatearFecha(v.fecha) + '</td>' +
        '<td>' + Shell.escapeHtml(v.motivo || '-') + '</td>' +
        '<td>' + Shell.escapeHtml(v.diagnostico || '-') + '</td>' +
        '<td>' + moneda(v.costo) + '</td>' +
        '<td>' + Shell.escapeHtml(v.veterinario || '-') + '</td>' +
        acciones;
      tbody.appendChild(tr);
    });

    if (puedeModificar) {
      tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          editarVisita(parseInt(this.getAttribute('data-id')));
        });
      });
      tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          deleteType = 'visita';
          confirmarEliminar(parseInt(this.getAttribute('data-id')));
        });
      });
    }
  }

  // ============ HISTORIAL ============
  document.getElementById('histAnimal').addEventListener('change', cargarHistorial);

  async function cargarHistorial() {
    const animalId = document.getElementById('histAnimal').value;
    const cont = document.getElementById('histContenido');

    if (!animalId) {
      cont.innerHTML = '<p class="no-data" style="justify-content:flex-start;padding:1rem 0;"><i class="fas fa-info-circle"></i><p style="margin-left:0.5rem;">Seleccione un animal para ver su historial completo.</p></p>';
      return;
    }

    cont.innerHTML = '<div class="no-data"><i class="fas fa-spinner fa-spin"></i><p>Cargando historial...</p></div>';

    try {
      const response = await fetch('/api/salud/historial/' + animalId, {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();

      if (!result.success) {
        cont.innerHTML = '<div class="no-data"><i class="fas fa-exclamation-triangle"></i><p>' + Shell.escapeHtml(result.error || 'Error al cargar el historial') + '</p></div>';
        return;
      }

      const d = result.data;
      const animal = d.animal;

      let html = '';
      html += '<div class="panel-card" style="margin-bottom:1rem;">' +
        '<div class="panel-list">' +
          '<div class="panel-item"><span class="item-title">' + Shell.escapeHtml(animal.nombre) + ' (' + Shell.escapeHtml(animal.arete) + ')</span></div>' +
          '<div class="panel-item"><span>Raza:</span> ' + Shell.escapeHtml(animal.raza_nombre || '-') + '</div>' +
          '<div class="panel-item"><span>Potrero:</span> ' + Shell.escapeHtml(animal.potrero_nombre || '-') + '</div>' +
          '<div class="panel-item"><span>Estado sanitario:</span> ' + badgeSanitario(animal.estado_sanitario) + '</div>' +
        '</div>' +
      '</div>';

      html += '<h3 style="font-family:Fraunces,serif;color:var(--forest);margin:1.25rem 0 0.75rem;"><i class="fas fa-syringe"></i> Vacunaciones</h3>';
      html += tablaHistorial(d.vacunas, ['Fecha', 'Vacuna', 'Dosis', 'Veterinario'], function (v) {
        return [formatearFecha(v.fecha_aplicacion), v.vacuna, v.dosis || '-', v.veterinario || '-'];
      });

      html += '<h3 style="font-family:Fraunces,serif;color:var(--forest);margin:1.25rem 0 0.75rem;"><i class="fas fa-notes-medical"></i> Tratamientos</h3>';
      html += tablaHistorial(d.tratamientos, ['Inicio', 'Tipo', 'Diagnóstico', 'Estado'], function (t) {
        return [formatearFecha(t.fecha_inicio), t.tipo, t.diagnostico || '-', t.estado];
      });

      html += '<h3 style="font-family:Fraunces,serif;color:var(--forest);margin:1.25rem 0 0.75rem;"><i class="fas fa-stethoscope"></i> Visitas</h3>';
      html += tablaHistorial(d.visitas, ['Fecha', 'Motivo', 'Diagnóstico', 'Veterinario'], function (v) {
        return [formatearFecha(v.fecha), v.motivo || '-', v.diagnostico || '-', v.veterinario || '-'];
      });

      cont.innerHTML = html;
    } catch (err) {
      console.error('Error al cargar historial:', err);
      cont.innerHTML = '<div class="no-data"><i class="fas fa-exclamation-triangle"></i><p>Error de conexión</p></div>';
    }
  }

  function tablaHistorial(rows, headers, rowFn) {
    if (!rows || rows.length === 0) {
      return '<div class="no-data" style="padding:0.75rem 0;"><i class="fas fa-inbox"></i><p>Sin registros</p></div>';
    }
    let html = '<table class="data-table"><thead><tr>';
    headers.forEach(function (h) { html += '<th>' + h + '</th>'; });
    html += '</tr></thead><tbody>';
    rows.forEach(function (r) {
      const celdas = rowFn(r);
      html += '<tr>';
      celdas.forEach(function (c) { html += '<td>' + Shell.escapeHtml(c) + '</td>'; });
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  function badgeSanitario(texto) {
    let clase = 'badge-bueno';
    if (texto === 'Regular') clase = 'badge-regular';
    if (texto === 'Crítico') clase = 'badge-critico';
    return '<span class="badge ' + clase + '">' + texto + '</span>';
  }

  // ============ MODAL VACUNA ============
  document.getElementById('btnNewVacuna').addEventListener('click', function () {
    document.getElementById('vacunaId').value = '';
    document.getElementById('vacunaTitle').textContent = 'Nueva Vacunación';
    document.getElementById('vacunaForm').reset();
    document.getElementById('vacFechaAplicacion').value = new Date().toISOString().split('T')[0];
    document.getElementById('vacunaModal').classList.add('active');
  });

  document.getElementById('vacunaClose').addEventListener('click', function () {
    document.getElementById('vacunaModal').classList.remove('active');
  });

  document.getElementById('vacunaCancel').addEventListener('click', function () {
    document.getElementById('vacunaModal').classList.remove('active');
  });

  document.getElementById('vacunaModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });

  function editarVacuna(id) {
    const v = vacunasData.find(function (x) { return x.id === id; });
    if (!v) return;

    document.getElementById('vacunaId').value = v.id;
    document.getElementById('vacunaTitle').textContent = 'Editar Vacunación';
    document.getElementById('vacunaForm').reset();
    document.getElementById('vacAnimal').value = v.animal_id;
    document.getElementById('vacVacuna').value = v.vacuna;
    document.getElementById('vacDosis').value = v.dosis || '';
    document.getElementById('vacFechaAplicacion').value = v.fecha_aplicacion ? v.fecha_aplicacion.split('T')[0] : '';
    document.getElementById('vacFechaProxima').value = v.fecha_proxima ? v.fecha_proxima.split('T')[0] : '';
    document.getElementById('vacVeterinario').value = v.veterinario || '';
    document.getElementById('vacObservaciones').value = v.observaciones || '';
    document.getElementById('vacunaModal').classList.add('active');
  }

  document.getElementById('vacunaSave').addEventListener('click', async function () {
    const id = document.getElementById('vacunaId').value;
    const isEdit = id !== '';

    const animal_id = document.getElementById('vacAnimal').value;
    const vacuna = document.getElementById('vacVacuna').value.trim();
    const dosis = document.getElementById('vacDosis').value.trim();
    const fecha_aplicacion = document.getElementById('vacFechaAplicacion').value;
    const fecha_proxima = document.getElementById('vacFechaProxima').value;
    const veterinario = document.getElementById('vacVeterinario').value.trim();
    const observaciones = document.getElementById('vacObservaciones').value.trim();

    if (!animal_id || !vacuna) {
      Shell.showNotification('El animal y la vacuna son obligatorios', 'error');
      return;
    }

    const body = {
      animal_id: parseInt(animal_id),
      vacuna: vacuna,
      dosis: dosis || null,
      fecha_aplicacion: fecha_aplicacion || null,
      fecha_proxima: fecha_proxima || null,
      veterinario: veterinario || null,
      observaciones: observaciones || null
    };

    const btn = document.getElementById('vacunaSave');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      let url = '/api/salud/vacunaciones';
      let method = 'POST';
      if (isEdit) {
        url = '/api/salud/vacunaciones/' + id;
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
        Shell.showNotification(isEdit ? 'Vacunación actualizada' : 'Vacunación registrada', 'success');
        document.getElementById('vacunaModal').classList.remove('active');
        await cargarVacunas();
      } else {
        Shell.showNotification(result.error || 'Error al guardar la vacunación', 'error');
      }
    } catch (err) {
      Shell.showNotification('Error de conexión. Intente nuevamente.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  });

  // ============ MODAL TRATAMIENTO ============
  document.getElementById('btnNewTratamiento').addEventListener('click', function () {
    document.getElementById('tratamientoId').value = '';
    document.getElementById('tratamientoTitle').textContent = 'Nuevo Tratamiento';
    document.getElementById('tratamientoForm').reset();
    document.getElementById('traFechaInicio').value = new Date().toISOString().split('T')[0];
    document.getElementById('traTipo').value = 'Enfermedad';
    document.getElementById('traEstado').value = 'Activo';
    document.getElementById('tratamientoModal').classList.add('active');
  });

  document.getElementById('tratamientoClose').addEventListener('click', function () {
    document.getElementById('tratamientoModal').classList.remove('active');
  });

  document.getElementById('tratamientoCancel').addEventListener('click', function () {
    document.getElementById('tratamientoModal').classList.remove('active');
  });

  document.getElementById('tratamientoModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });

  function editarTratamiento(id) {
    const t = tratamientosData.find(function (x) { return x.id === id; });
    if (!t) return;

    document.getElementById('tratamientoId').value = t.id;
    document.getElementById('tratamientoTitle').textContent = 'Editar Tratamiento';
    document.getElementById('tratamientoForm').reset();
    document.getElementById('traAnimal').value = t.animal_id;
    document.getElementById('traTipo').value = t.tipo;
    document.getElementById('traEstado').value = t.estado;
    document.getElementById('traDiagnostico').value = t.diagnostico || '';
    document.getElementById('traMedicamento').value = t.medicamento || '';
    document.getElementById('traDosis').value = t.dosis || '';
    document.getElementById('traFechaInicio').value = t.fecha_inicio ? t.fecha_inicio.split('T')[0] : '';
    document.getElementById('traFechaFin').value = t.fecha_fin ? t.fecha_fin.split('T')[0] : '';
    document.getElementById('traCosto').value = t.costo;
    document.getElementById('traVeterinario').value = t.veterinario || '';
    document.getElementById('traObservaciones').value = t.observaciones || '';
    document.getElementById('tratamientoModal').classList.add('active');
  }

  document.getElementById('tratamientoSave').addEventListener('click', async function () {
    const id = document.getElementById('tratamientoId').value;
    const isEdit = id !== '';

    const animal_id = document.getElementById('traAnimal').value;
    const tipo = document.getElementById('traTipo').value;
    const estado = document.getElementById('traEstado').value;
    const diagnostico = document.getElementById('traDiagnostico').value.trim();
    const medicamento = document.getElementById('traMedicamento').value.trim();
    const dosis = document.getElementById('traDosis').value.trim();
    const fecha_inicio = document.getElementById('traFechaInicio').value;
    const fecha_fin = document.getElementById('traFechaFin').value;
    const costo = document.getElementById('traCosto').value;
    const veterinario = document.getElementById('traVeterinario').value.trim();
    const observaciones = document.getElementById('traObservaciones').value.trim();

    if (!animal_id) {
      Shell.showNotification('El animal es obligatorio', 'error');
      return;
    }

    const body = {
      animal_id: parseInt(animal_id),
      tipo: tipo,
      estado: estado,
      diagnostico: diagnostico || null,
      medicamento: medicamento || null,
      dosis: dosis || null,
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null,
      costo: costo !== '' ? parseFloat(costo) : 0,
      veterinario: veterinario || null,
      observaciones: observaciones || null
    };

    const btn = document.getElementById('tratamientoSave');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      let url = '/api/salud/tratamientos';
      let method = 'POST';
      if (isEdit) {
        url = '/api/salud/tratamientos/' + id;
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
        Shell.showNotification(isEdit ? 'Tratamiento actualizado' : 'Tratamiento registrado', 'success');
        document.getElementById('tratamientoModal').classList.remove('active');
        await cargarTratamientos();
      } else {
        Shell.showNotification(result.error || 'Error al guardar el tratamiento', 'error');
      }
    } catch (err) {
      Shell.showNotification('Error de conexión. Intente nuevamente.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  });

  // ============ MODAL VISITA ============
  document.getElementById('btnNewVisita').addEventListener('click', function () {
    document.getElementById('visitaId').value = '';
    document.getElementById('visitaTitle').textContent = 'Nueva Visita';
    document.getElementById('visitaForm').reset();
    document.getElementById('visFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('visitaModal').classList.add('active');
  });

  document.getElementById('visitaClose').addEventListener('click', function () {
    document.getElementById('visitaModal').classList.remove('active');
  });

  document.getElementById('visitaCancel').addEventListener('click', function () {
    document.getElementById('visitaModal').classList.remove('active');
  });

  document.getElementById('visitaModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });

  function editarVisita(id) {
    const v = visitasData.find(function (x) { return x.id === id; });
    if (!v) return;

    document.getElementById('visitaId').value = v.id;
    document.getElementById('visitaTitle').textContent = 'Editar Visita';
    document.getElementById('visitaForm').reset();
    document.getElementById('visFecha').value = v.fecha ? v.fecha.split('T')[0] : '';
    document.getElementById('visCosto').value = v.costo;
    document.getElementById('visMotivo').value = v.motivo || '';
    document.getElementById('visDiagnostico').value = v.diagnostico || '';
    document.getElementById('visVeterinario').value = v.veterinario || '';
    document.getElementById('visitaModal').classList.add('active');
  }

  document.getElementById('visitaSave').addEventListener('click', async function () {
    const id = document.getElementById('visitaId').value;
    const isEdit = id !== '';

    const fecha = document.getElementById('visFecha').value;
    const costo = document.getElementById('visCosto').value;
    const motivo = document.getElementById('visMotivo').value.trim();
    const diagnostico = document.getElementById('visDiagnostico').value.trim();
    const veterinario = document.getElementById('visVeterinario').value.trim();

    const body = {
      fecha: fecha || null,
      costo: costo !== '' ? parseFloat(costo) : 0,
      motivo: motivo || null,
      diagnostico: diagnostico || null,
      veterinario: veterinario || null
    };

    const btn = document.getElementById('visitaSave');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      let url = '/api/salud/visitas';
      let method = 'POST';
      if (isEdit) {
        url = '/api/salud/visitas/' + id;
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
        Shell.showNotification(isEdit ? 'Visita actualizada' : 'Visita registrada', 'success');
        document.getElementById('visitaModal').classList.remove('active');
        await cargarVisitas();
      } else {
        Shell.showNotification(result.error || 'Error al guardar la visita', 'error');
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
    const map = { vacuna: 'esta vacunación', tratamiento: 'este tratamiento', visita: 'esta visita' };
    document.getElementById('confirmSubtext').textContent = 'Se eliminará ' + (map[deleteType] || 'este registro') + ' de forma permanente';
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
      const url = '/api/salud/' + deleteType + 's/' + deleteId;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });

      const result = await response.json();

      if (result.success) {
        Shell.showNotification('Registro eliminado', 'success');
        document.getElementById('confirmModal').classList.remove('active');
        if (deleteType === 'vacuna') await cargarVacunas();
        if (deleteType === 'tratamiento') await cargarTratamientos();
        if (deleteType === 'visita') await cargarVisitas();
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

  function moneda(n) {
    if (n === null || n === undefined) return '0';
    return Number(n).toLocaleString('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 });
  }
});
