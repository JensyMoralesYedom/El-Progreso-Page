/* ========================================
   GESTION.JS - Inventario completo de ganado
   (inventario + movimientos + traslados)
   ======================================== */

document.addEventListener('DOMContentLoaded', async function () {
  const user = await Shell.init('gestion');
  if (!user) return;

  let ganadoData = [];
  let razasData = [];
  let potrerosData = [];
  let movimientosData = [];
  let trasladosData = [];
  let deleteId = null;

  const puedeEditarGanado = user.rol === 'admin';
  const puedeMovimientos = ['admin', 'trabajador'].includes(user.rol);
  const soloLectura = ['invitado', 'veterinario'].includes(user.rol);

  initUI();
  await Promise.all([cargarRazas(), cargarPotreros(), cargarGanado(), cargarMovimientos(), cargarTraslados()]);

  function initUI() {
    if (soloLectura) {
      document.getElementById('readonlyBanner').style.display = 'flex';
    }

    if (puedeEditarGanado) {
      document.getElementById('btnNewGanado').style.display = 'flex';
      document.getElementById('colAcciones').style.display = '';
    }

    if (puedeMovimientos) {
      document.getElementById('btnNewMovimiento').style.display = 'flex';
      document.getElementById('btnNewTraslado').style.display = 'flex';
    }
  }

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
  async function cargarRazas() {
    try {
      const response = await fetch('/api/ganado/razas/lista', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        razasData = result.data;
        const select = document.getElementById('raza');
        select.innerHTML = '<option value="">Seleccione una raza</option>';
        razasData.forEach(function (raza) {
          select.appendChild(opcion(raza.id, raza.nombre));
        });
      }
    } catch (err) {
      console.error('Error al cargar razas:', err);
    }
  }

  async function cargarPotreros() {
    try {
      const response = await fetch('/api/potreros', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        potrerosData = result.data;
        const potreroSelect = document.getElementById('potrero');
        potreroSelect.innerHTML = '<option value="">Sin potrero</option>';
        const destinoSelect = document.getElementById('trDestino');
        destinoSelect.innerHTML = '<option value="">Seleccione un potrero</option>';
        result.data.forEach(function (p) {
          potreroSelect.appendChild(opcion(p.id, p.nombre));
          destinoSelect.appendChild(opcion(p.id, p.nombre));
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
        ganadoData = result.data;
        renderTabla(ganadoData);
        poblarSelectsAnimales();
      }
    } catch (err) {
      console.error('Error al cargar ganado:', err);
      Shell.showNotification('Error al cargar los registros', 'error');
    }
  }

  async function cargarMovimientos() {
    try {
      const response = await fetch('/api/ganado/movimientos', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 403) return;
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        movimientosData = result.data;
        renderMovimientos();
      }
    } catch (err) {
      console.error('Error al cargar movimientos:', err);
    }
  }

  async function cargarTraslados() {
    try {
      const response = await fetch('/api/ganado/traslados', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 403) return;
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        trasladosData = result.data;
        renderTraslados();
      }
    } catch (err) {
      console.error('Error al cargar traslados:', err);
    }
  }

  function poblarSelectsAnimales() {
    const activos = ganadoData.filter(function (g) { return g.estado === 'Activo'; });
    const hembras = ganadoData.filter(function (g) { return g.sexo === 'Hembra'; });
    const machos = ganadoData.filter(function (g) { return g.sexo === 'Macho'; });

    const movSelect = document.getElementById('movAnimal');
    movSelect.innerHTML = '<option value="">Seleccione un animal</option>';
    activos.forEach(function (g) { movSelect.appendChild(opcion(g.id, g.arete + ' - ' + g.nombre)); });

    const trSelect = document.getElementById('trAnimal');
    trSelect.innerHTML = '<option value="">Seleccione un animal</option>';
    activos.forEach(function (g) { trSelect.appendChild(opcion(g.id, g.arete + ' - ' + g.nombre)); });

    const filtroMov = document.getElementById('filtroMovAnimal');
    filtroMov.innerHTML = '<option value="">Todos los animales</option>';
    activos.forEach(function (g) { filtroMov.appendChild(opcion(g.id, g.arete + ' - ' + g.nombre)); });

    const madreSelect = document.getElementById('madre');
    madreSelect.innerHTML = '<option value="">Sin madre</option>';
    hembras.forEach(function (g) { madreSelect.appendChild(opcion(g.id, g.arete + ' - ' + g.nombre)); });

    const padreSelect = document.getElementById('padre');
    padreSelect.innerHTML = '<option value="">Sin padre</option>';
    machos.forEach(function (g) { padreSelect.appendChild(opcion(g.id, g.arete + ' - ' + g.nombre)); });
  }

  // ============ TABLA INVENTARIO ============
  function renderTabla(data) {
    const tbody = document.getElementById('tableBody');

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="no-data"><i class="fas fa-inbox"></i><p>No hay registros de ganado</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.forEach(function (item) {
      const tr = document.createElement('tr');

      const sanitario = badgeEstadoSanitario(item.estado_sanitario);
      const estadoBadge = badgeEstado(item.estado);
      const origen = item.origen === 'Comprado'
        ? '<i class="fas fa-shopping-cart" title="Comprado"></i> Comprado'
        : '<i class="fas fa-baby" title="Nacido"></i> Nacido';

      let acciones = '';
      if (puedeEditarGanado) {
        acciones = '<td class="actions">' +
          '<button class="btn-action btn-edit" data-id="' + item.id + '" title="Editar"><i class="fas fa-edit"></i></button>' +
          '<button class="btn-action btn-delete" data-id="' + item.id + '" title="Eliminar"><i class="fas fa-trash"></i></button>' +
          '</td>';
      }

      tr.innerHTML =
        '<td>' + item.id + '</td>' +
        '<td><strong>' + Shell.escapeHtml(item.arete) + '</strong></td>' +
        '<td>' + Shell.escapeHtml(item.nombre) + '</td>' +
        '<td>' + Shell.escapeHtml(item.raza_nombre || '-') + '</td>' +
        '<td>' + item.sexo + '</td>' +
        '<td>' + (item.peso_kg ? parseFloat(item.peso_kg).toFixed(2) : '-') + '</td>' +
        '<td><span class="badge ' + sanitario.clase + '">' + sanitario.texto + '</span></td>' +
        '<td><span class="badge ' + estadoBadge.clase + '">' + estadoBadge.texto + '</span></td>' +
        '<td>' + Shell.escapeHtml(item.potrero_nombre || '-') + '</td>' +
        '<td class="origen-col">' + origen + '</td>' +
        acciones;

      tbody.appendChild(tr);
    });

    if (puedeEditarGanado) {
      tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          editarRegistro(parseInt(this.getAttribute('data-id')));
        });
      });

      tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          confirmarEliminar(parseInt(this.getAttribute('data-id')));
        });
      });
    }
  }

  function badgeEstadoSanitario(texto) {
    let clase = 'badge-bueno';
    if (texto === 'Regular') clase = 'badge-regular';
    if (texto === 'Crítico') clase = 'badge-critico';
    return { texto: texto, clase: clase };
  }

  function badgeEstado(texto) {
    if (texto === 'Vendido') return { texto: texto, clase: 'badge-regular' };
    if (texto === 'Muerto') return { texto: texto, clase: 'badge-critico' };
    return { texto: 'Activo', clase: 'badge-bueno' };
  }

  // ============ TABLA MOVIMIENTOS ============
  function renderMovimientos() {
    const tbody = document.getElementById('movBody');
    const filtro = document.getElementById('filtroMovAnimal').value;
    const data = filtro
      ? movimientosData.filter(function (m) { return String(m.animal_id) === filtro; })
      : movimientosData;

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-data"><i class="fas fa-inbox"></i><p>Sin movimientos registrados</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.forEach(function (m) {
      const tr = document.createElement('tr');
      const badge = tipoMovimientoBadge(m.tipo);
      tr.innerHTML =
        '<td>' + formatearFecha(m.fecha) + '</td>' +
        '<td><strong>' + Shell.escapeHtml(m.arete || '-') + '</strong> ' + Shell.escapeHtml(m.animal_nombre || '') + '</td>' +
        '<td><span class="badge ' + badge.clase + '">' + m.tipo + '</span></td>' +
        '<td>' + Shell.escapeHtml(m.descripcion || '-') + '</td>' +
        '<td>' + (m.monto !== null ? moneda(m.monto) : '-') + '</td>' +
        '<td>' + Shell.escapeHtml(m.responsable_nombre || '-') + '</td>';
      tbody.appendChild(tr);
    });
  }

  function tipoMovimientoBadge(tipo) {
    switch (tipo) {
      case 'Nacimiento': return { texto: tipo, clase: 'badge-bueno' };
      case 'Compra': return { texto: tipo, clase: 'badge-blue' };
      case 'Venta': return { texto: tipo, clase: 'badge-wheat' };
      case 'Muerte': return { texto: tipo, clase: 'badge-critico' };
      case 'Descarte': return { texto: tipo, clase: 'badge-regular' };
      default: return { texto: tipo, clase: 'badge-regular' };
    }
  }

  // ============ TABLA TRASLADOS ============
  function renderTraslados() {
    const tbody = document.getElementById('trasladoBody');

    if (trasladosData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-data"><i class="fas fa-inbox"></i><p>Sin traslados registrados</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    trasladosData.forEach(function (t) {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + formatearFecha(t.fecha) + '</td>' +
        '<td><strong>' + Shell.escapeHtml(t.arete || '-') + '</strong> ' + Shell.escapeHtml(t.animal_nombre || '') + '</td>' +
        '<td>' + Shell.escapeHtml(t.potrero_origen_nombre || '-') + '</td>' +
        '<td><i class="fas fa-arrow-right" style="color:var(--leaf);"></i> ' + Shell.escapeHtml(t.potrero_destino_nombre || '-') + '</td>' +
        '<td>' + Shell.escapeHtml(t.motivo || '-') + '</td>' +
        '<td>' + Shell.escapeHtml(t.responsable_nombre || '-') + '</td>';
      tbody.appendChild(tr);
    });
  }

  // ============ MODAL GANADO ============
  document.getElementById('btnNewGanado').addEventListener('click', function () {
    document.getElementById('registroId').value = '';
    document.getElementById('modalTitle').textContent = 'Nuevo Registro';
    document.getElementById('ganadoForm').reset();
    document.getElementById('estado').value = 'Activo';
    document.getElementById('origen').value = 'Nacido';
    document.getElementById('formModal').classList.add('active');
  });

  document.getElementById('modalClose').addEventListener('click', function () {
    document.getElementById('formModal').classList.remove('active');
  });

  document.getElementById('btnCancel').addEventListener('click', function () {
    document.getElementById('formModal').classList.remove('active');
  });

  document.getElementById('formModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });

  function editarRegistro(id) {
    const item = ganadoData.find(function (g) { return g.id === id; });
    if (!item) return;

    document.getElementById('registroId').value = item.id;
    document.getElementById('modalTitle').textContent = 'Editar Registro';
    document.getElementById('ganadoForm').reset();
    document.getElementById('arete').value = item.arete;
    document.getElementById('nombre').value = item.nombre;
    document.getElementById('raza').value = item.raza_id;
    document.getElementById('sexo').value = item.sexo;
    document.getElementById('fechaNacimiento').value = item.fecha_nacimiento ? item.fecha_nacimiento.split('T')[0] : '';
    document.getElementById('peso').value = item.peso_kg || '';
    document.getElementById('estadoSanitario').value = item.estado_sanitario;
    document.getElementById('estado').value = item.estado;
    document.getElementById('origen').value = item.origen;
    document.getElementById('fechaCompra').value = item.fecha_compra ? item.fecha_compra.split('T')[0] : '';
    document.getElementById('precioCompra').value = item.precio_compra || '';
    document.getElementById('potrero').value = item.potrero_id || '';
    document.getElementById('madre').value = item.madre_id || '';
    document.getElementById('padre').value = item.padre_id || '';
    document.getElementById('formModal').classList.add('active');
  }

  document.getElementById('btnSave').addEventListener('click', async function () {
    const id = document.getElementById('registroId').value;
    const isEdit = id !== '';

    const arete = document.getElementById('arete').value.trim();
    const nombre = document.getElementById('nombre').value.trim();
    const raza_id = document.getElementById('raza').value;
    const sexo = document.getElementById('sexo').value;
    const fecha_nacimiento = document.getElementById('fechaNacimiento').value;
    const peso_kg = document.getElementById('peso').value;
    const estado_sanitario = document.getElementById('estadoSanitario').value;
    const estado = document.getElementById('estado').value;
    const origen = document.getElementById('origen').value;
    const fecha_compra = document.getElementById('fechaCompra').value;
    const precio_compra = document.getElementById('precioCompra').value;
    const potrero_id = document.getElementById('potrero').value;
    const madre_id = document.getElementById('madre').value;
    const padre_id = document.getElementById('padre').value;

    if (!arete || !nombre || !raza_id || !sexo || !estado_sanitario) {
      Shell.showNotification('Los campos marcados con * son obligatorios', 'error');
      return;
    }

    if (peso_kg && (isNaN(parseFloat(peso_kg)) || parseFloat(peso_kg) <= 0)) {
      Shell.showNotification('El peso debe ser un número positivo', 'error');
      return;
    }

    const body = {
      arete: arete,
      nombre: nombre,
      raza_id: parseInt(raza_id),
      sexo: sexo,
      fecha_nacimiento: fecha_nacimiento || null,
      peso_kg: peso_kg ? parseFloat(peso_kg) : null,
      estado_sanitario: estado_sanitario,
      estado: estado,
      origen: origen,
      fecha_compra: fecha_compra || null,
      precio_compra: precio_compra ? parseFloat(precio_compra) : null,
      potrero_id: potrero_id ? parseInt(potrero_id) : null,
      madre_id: madre_id ? parseInt(madre_id) : null,
      padre_id: padre_id ? parseInt(padre_id) : null
    };

    const btnSave = document.getElementById('btnSave');
    btnSave.disabled = true;
    btnSave.textContent = 'Guardando...';

    try {
      let url = '/api/ganado';
      let method = 'POST';
      if (isEdit) {
        url = '/api/ganado/' + id;
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
        Shell.showNotification(isEdit ? 'Registro actualizado exitosamente' : 'Registro creado exitosamente', 'success');
        document.getElementById('formModal').classList.remove('active');
        await Promise.all([cargarGanado(), cargarMovimientos()]);
      } else {
        Shell.showNotification(result.error || 'Error al guardar el registro', 'error');
      }
    } catch (err) {
      Shell.showNotification('Error de conexión. Intente nuevamente.', 'error');
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = 'Guardar';
    }
  });

  // ============ MODAL MOVIMIENTO ============
  document.getElementById('btnNewMovimiento').addEventListener('click', function () {
    document.getElementById('movimientoForm').reset();
    document.getElementById('movFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('movimientoModal').classList.add('active');
  });

  document.getElementById('movimientoClose').addEventListener('click', function () {
    document.getElementById('movimientoModal').classList.remove('active');
  });

  document.getElementById('movimientoCancel').addEventListener('click', function () {
    document.getElementById('movimientoModal').classList.remove('active');
  });

  document.getElementById('movimientoModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });

  document.getElementById('movimientoSave').addEventListener('click', async function () {
    const animal_id = document.getElementById('movAnimal').value;
    const tipo = document.getElementById('movTipo').value;
    const fecha = document.getElementById('movFecha').value;
    const monto = document.getElementById('movMonto').value;
    const descripcion = document.getElementById('movDescripcion').value.trim();

    if (!animal_id || !tipo) {
      Shell.showNotification('El animal y el tipo son obligatorios', 'error');
      return;
    }

    const btn = document.getElementById('movimientoSave');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      const response = await fetch('/api/ganado/movimientos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + Auth.getToken()
        },
        body: JSON.stringify({
          animal_id: parseInt(animal_id),
          tipo: tipo,
          fecha: fecha || null,
          monto: monto ? parseFloat(monto) : null,
          descripcion: descripcion || null
        })
      });

      const result = await response.json();

      if (result.success) {
        Shell.showNotification('Movimiento registrado exitosamente', 'success');
        document.getElementById('movimientoModal').classList.remove('active');
        await Promise.all([cargarMovimientos(), cargarGanado()]);
      } else {
        Shell.showNotification(result.error || 'Error al registrar el movimiento', 'error');
      }
    } catch (err) {
      Shell.showNotification('Error de conexión. Intente nuevamente.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  });

  document.getElementById('filtroMovAnimal').addEventListener('change', renderMovimientos);

  // ============ MODAL TRASLADO ============
  document.getElementById('btnNewTraslado').addEventListener('click', function () {
    document.getElementById('trasladoForm').reset();
    document.getElementById('trFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('trasladoModal').classList.add('active');
  });

  document.getElementById('trasladoClose').addEventListener('click', function () {
    document.getElementById('trasladoModal').classList.remove('active');
  });

  document.getElementById('trasladoCancel').addEventListener('click', function () {
    document.getElementById('trasladoModal').classList.remove('active');
  });

  document.getElementById('trasladoModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });

  document.getElementById('trasladoSave').addEventListener('click', async function () {
    const animal_id = document.getElementById('trAnimal').value;
    const potrero_destino_id = document.getElementById('trDestino').value;
    const fecha = document.getElementById('trFecha').value;
    const motivo = document.getElementById('trMotivo').value.trim();

    if (!animal_id || !potrero_destino_id) {
      Shell.showNotification('El animal y el potrero de destino son obligatorios', 'error');
      return;
    }

    const btn = document.getElementById('trasladoSave');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      const response = await fetch('/api/ganado/traslados', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + Auth.getToken()
        },
        body: JSON.stringify({
          animal_id: parseInt(animal_id),
          potrero_destino_id: parseInt(potrero_destino_id),
          fecha: fecha || null,
          motivo: motivo || null
        })
      });

      const result = await response.json();

      if (result.success) {
        Shell.showNotification('Traslado registrado exitosamente', 'success');
        document.getElementById('trasladoModal').classList.remove('active');
        await Promise.all([cargarTraslados(), cargarGanado()]);
      } else {
        Shell.showNotification(result.error || 'Error al registrar el traslado', 'error');
      }
    } catch (err) {
      Shell.showNotification('Error de conexión. Intente nuevamente.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  });

  // ============ ELIMINAR GANADO ============
  function confirmarEliminar(id) {
    const item = ganadoData.find(function (g) { return g.id === id; });
    if (!item) return;

    deleteId = id;
    document.getElementById('confirmSubtext').textContent = 'Se eliminará el registro "' + item.nombre + '" (' + item.arete + ')';
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
      const response = await fetch('/api/ganado/' + deleteId, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });

      const result = await response.json();

      if (result.success) {
        Shell.showNotification('Registro eliminado exitosamente', 'success');
        document.getElementById('confirmModal').classList.remove('active');
        await Promise.all([cargarGanado(), cargarMovimientos(), cargarTraslados()]);
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
  function opcion(valor, texto) {
    const option = document.createElement('option');
    option.value = valor;
    option.textContent = texto;
    return option;
  }

  function formatearFecha(f) {
    if (!f) return '-';
    return new Date(f).toLocaleDateString('es-DO');
  }

  function moneda(n) {
    if (n === null || n === undefined) return '0';
    return Number(n).toLocaleString('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 });
  }
});
