/* ========================================
   INVENTARIO.JS - Productos, movimientos y alertas de stock
   ======================================== */

document.addEventListener('DOMContentLoaded', async function () {
  const user = await Shell.init('inventario');
  if (!user) return;

  let productosData = [];
  let movimientosData = [];
  let alertasData = [];
  let deleteId = null;

  const puedeEditarProductos = user.rol === 'admin';
  const puedeMovimientos = ['admin', 'trabajador'].includes(user.rol);
  const puedeAlertas = user.rol === 'admin';
  const soloLectura = !puedeEditarProductos && !puedeMovimientos;

  initUI();
  await Promise.all([cargarProductos(), cargarMovimientos(), cargarAlertas()]);

  function initUI() {
    if (soloLectura) {
      document.getElementById('readonlyBanner').style.display = 'flex';
    }
    if (puedeEditarProductos) {
      document.getElementById('btnNewProducto').style.display = 'flex';
      document.getElementById('colAcciones').style.display = '';
    }
    if (puedeMovimientos) {
      document.getElementById('btnNewMovimiento').style.display = 'flex';
    }
    if (puedeAlertas) {
      document.getElementById('tabAlertas').style.display = '';
    }
  }

  // ============ TABS ============
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      if (tab.style.display === 'none') return;
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    });
  });

  // ============ CARGA DE DATOS ============
  async function cargarProductos() {
    try {
      const response = await fetch('/api/inventario/productos', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        productosData = result.data;
        renderProductos();
        poblarSelectProductos();
      }
    } catch (err) {
      console.error('Error al cargar productos:', err);
      Shell.showNotification('Error al cargar los productos', 'error');
    }
  }

  async function cargarMovimientos() {
    try {
      const response = await fetch('/api/inventario/movimientos', {
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

  async function cargarAlertas() {
    if (!puedeAlertas) return;
    try {
      const response = await fetch('/api/inventario/alertas', {
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) {
        alertasData = result.data;
        renderAlertas();
      }
    } catch (err) {
      console.error('Error al cargar alertas:', err);
    }
  }

  function poblarSelectProductos() {
    const select = document.getElementById('invProducto');
    select.innerHTML = '<option value="">Seleccione un producto</option>';
    productosData.forEach(function (p) {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = p.nombre + ' (' + p.stock_actual + ' ' + p.unidad_medida + ')';
      select.appendChild(option);
    });
  }

  // ============ TABLA PRODUCTOS ============
  function renderProductos() {
    const tbody = document.getElementById('productoBody');

    if (productosData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="no-data"><i class="fas fa-inbox"></i><p>No hay productos registrados</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    productosData.forEach(function (item) {
      const bajo = item.stock_bajo || parseFloat(item.stock_actual) < parseFloat(item.stock_minimo);
      const badge = bajo
        ? '<span class="badge badge-critico">Stock bajo</span>'
        : '<span class="badge badge-bueno">OK</span>';

      let acciones = '';
      if (puedeEditarProductos) {
        acciones = '<td class="actions">' +
          '<button class="btn-action btn-edit" data-id="' + item.id + '" title="Editar"><i class="fas fa-edit"></i></button>' +
          '<button class="btn-action btn-delete" data-id="' + item.id + '" title="Eliminar"><i class="fas fa-trash"></i></button>' +
          '</td>';
      }

      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + item.id + '</td>' +
        '<td><strong>' + Shell.escapeHtml(item.nombre) + '</strong></td>' +
        '<td>' + Shell.escapeHtml(item.categoria || '-') + '</td>' +
        '<td>' + Shell.escapeHtml(item.unidad_medida || '-') + '</td>' +
        '<td><strong>' + parseFloat(item.stock_actual) + '</strong></td>' +
        '<td>' + parseFloat(item.stock_minimo) + '</td>' +
        '<td>' + moneda(item.precio_unitario) + '</td>' +
        '<td>' + badge + '</td>' +
        acciones;
      tbody.appendChild(tr);
    });

    if (puedeEditarProductos) {
      tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          editarProducto(parseInt(this.getAttribute('data-id')));
        });
      });
      tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          confirmarEliminar(parseInt(this.getAttribute('data-id')));
        });
      });
    }
  }

  // ============ TABLA MOVIMIENTOS ============
  function renderMovimientos() {
    const tbody = document.getElementById('movBody');
    const filtro = document.getElementById('filtroTipo').value;
    const data = filtro
      ? movimientosData.filter(function (m) { return m.tipo === filtro; })
      : movimientosData;

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="no-data"><i class="fas fa-inbox"></i><p>Sin movimientos registrados</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.forEach(function (m) {
      const badge = m.tipo === 'Entrada'
        ? '<span class="badge badge-bueno">Entrada</span>'
        : '<span class="badge badge-critico">Salida</span>';
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + formatearFecha(m.fecha) + '</td>' +
        '<td><strong>' + Shell.escapeHtml(m.producto_nombre || '-') + '</strong></td>' +
        '<td>' + badge + '</td>' +
        '<td>' + parseFloat(m.cantidad) + '</td>' +
        '<td>' + moneda(m.costo_unitario) + '</td>' +
        '<td>' + Shell.escapeHtml(m.proveedor || '-') + '</td>' +
        '<td>' + Shell.escapeHtml(m.motivo || '-') + '</td>' +
        '<td>' + Shell.escapeHtml(m.responsable_nombre || '-') + '</td>';
      tbody.appendChild(tr);
    });
  }

  document.getElementById('filtroTipo').addEventListener('change', renderMovimientos);

  // ============ TABLA ALERTAS ============
  function renderAlertas() {
    const tbody = document.getElementById('alertaBody');

    if (alertasData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-data"><i class="fas fa-check-circle"></i><p>Todos los productos tienen stock suficiente</p></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    alertasData.forEach(function (a) {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + a.id + '</td>' +
        '<td><strong>' + Shell.escapeHtml(a.nombre) + '</strong></td>' +
        '<td>' + Shell.escapeHtml(a.categoria || '-') + '</td>' +
        '<td><span class="badge badge-critico">' + parseFloat(a.stock_actual) + '</span></td>' +
        '<td>' + parseFloat(a.stock_minimo) + '</td>' +
        '<td><strong>' + parseFloat(a.faltante) + '</strong> ' + Shell.escapeHtml(a.unidad_medida || '') + '</td>';
      tbody.appendChild(tr);
    });
  }

  // ============ MODAL PRODUCTO ============
  document.getElementById('btnNewProducto').addEventListener('click', function () {
    document.getElementById('productoId').value = '';
    document.getElementById('productoModalTitle').textContent = 'Nuevo Producto';
    document.getElementById('productoForm').reset();
    document.getElementById('pUnidad').value = 'unidad';
    document.getElementById('productoModal').classList.add('active');
  });

  document.getElementById('productoClose').addEventListener('click', function () {
    document.getElementById('productoModal').classList.remove('active');
  });

  document.getElementById('productoCancel').addEventListener('click', function () {
    document.getElementById('productoModal').classList.remove('active');
  });

  document.getElementById('productoModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });

  function editarProducto(id) {
    const item = productosData.find(function (p) { return p.id === id; });
    if (!item) return;

    document.getElementById('productoId').value = item.id;
    document.getElementById('productoModalTitle').textContent = 'Editar Producto';
    document.getElementById('productoForm').reset();
    document.getElementById('pNombre').value = item.nombre;
    document.getElementById('pCategoria').value = item.categoria || '';
    document.getElementById('pUnidad').value = item.unidad_medida || 'unidad';
    document.getElementById('pPrecio').value = item.precio_unitario;
    document.getElementById('pStock').value = item.stock_actual;
    document.getElementById('pMinimo').value = item.stock_minimo;
    document.getElementById('productoModal').classList.add('active');
  }

  document.getElementById('productoSave').addEventListener('click', async function () {
    const id = document.getElementById('productoId').value;
    const isEdit = id !== '';

    const nombre = document.getElementById('pNombre').value.trim();
    const categoria = document.getElementById('pCategoria').value.trim();
    const unidad_medida = document.getElementById('pUnidad').value;
    const precio_unitario = document.getElementById('pPrecio').value;
    const stock_actual = document.getElementById('pStock').value;
    const stock_minimo = document.getElementById('pMinimo').value;

    if (!nombre) {
      Shell.showNotification('El nombre es obligatorio', 'error');
      return;
    }

    const body = {
      nombre: nombre,
      categoria: categoria || null,
      unidad_medida: unidad_medida,
      stock_actual: stock_actual !== '' ? parseFloat(stock_actual) : 0,
      stock_minimo: stock_minimo !== '' ? parseFloat(stock_minimo) : 0,
      precio_unitario: precio_unitario !== '' ? parseFloat(precio_unitario) : 0
    };

    const btn = document.getElementById('productoSave');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      let url = '/api/inventario/productos';
      let method = 'POST';
      if (isEdit) {
        url = '/api/inventario/productos/' + id;
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
        Shell.showNotification(isEdit ? 'Producto actualizado' : 'Producto creado', 'success');
        document.getElementById('productoModal').classList.remove('active');
        await Promise.all([cargarProductos(), cargarAlertas()]);
      } else {
        Shell.showNotification(result.error || 'Error al guardar el producto', 'error');
      }
    } catch (err) {
      Shell.showNotification('Error de conexión. Intente nuevamente.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  });

  // ============ MODAL MOVIMIENTO ============
  document.getElementById('btnNewMovimiento').addEventListener('click', function () {
    document.getElementById('movimientoForm').reset();
    document.getElementById('invFecha').value = new Date().toISOString().split('T')[0];
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
    const producto_id = document.getElementById('invProducto').value;
    const tipo = document.getElementById('invTipo').value;
    const cantidad = document.getElementById('invCantidad').value;
    const fecha = document.getElementById('invFecha').value;
    const costo_unitario = document.getElementById('invCosto').value;
    const proveedor = document.getElementById('invProveedor').value.trim();
    const motivo = document.getElementById('invMotivo').value.trim();

    if (!producto_id || !tipo || cantidad === '') {
      Shell.showNotification('El producto, el tipo y la cantidad son obligatorios', 'error');
      return;
    }

    const btn = document.getElementById('movimientoSave');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      const response = await fetch('/api/inventario/movimientos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + Auth.getToken()
        },
        body: JSON.stringify({
          producto_id: parseInt(producto_id),
          tipo: tipo,
          cantidad: parseFloat(cantidad),
          fecha: fecha || null,
          costo_unitario: costo_unitario !== '' ? parseFloat(costo_unitario) : 0,
          proveedor: proveedor || null,
          motivo: motivo || null
        })
      });

      const result = await response.json();

      if (result.success) {
        Shell.showNotification(result.message || 'Movimiento registrado', 'success');
        document.getElementById('movimientoModal').classList.remove('active');
        await Promise.all([cargarMovimientos(), cargarProductos(), cargarAlertas()]);
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

  // ============ ELIMINAR PRODUCTO ============
  function confirmarEliminar(id) {
    const item = productosData.find(function (p) { return p.id === id; });
    if (!item) return;

    deleteId = id;
    document.getElementById('confirmSubtext').textContent = 'Se eliminará "' + item.nombre + '" del catálogo';
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
      const response = await fetch('/api/inventario/productos/' + deleteId, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + Auth.getToken() }
      });

      const result = await response.json();

      if (result.success) {
        Shell.showNotification('Producto eliminado', 'success');
        document.getElementById('confirmModal').classList.remove('active');
        await Promise.all([cargarProductos(), cargarAlertas()]);
      } else {
        Shell.showNotification(result.error || 'Error al eliminar el producto', 'error');
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
