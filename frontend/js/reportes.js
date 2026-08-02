/* ========================================
   REPORTES.JS - Reportes por módulo con filtros y exportación PDF/Excel
   ======================================== */

/* ========================================
   DEFINICIÓN DE REPORTES
   ======================================== */
const REPORTES = [
  {
    key: 'ganado',
    label: 'Inventario de Ganado',
    icon: 'cow',
    url: '/api/ganado',
    roles: ['admin', 'trabajador', 'veterinario', 'invitado'],
    dateField: 'fecha_registro',
    filters: [
      { field: 'estado_sanitario', label: 'Estado sanitario', options: ['Bueno', 'Regular', 'Crítico'] },
      { field: 'sexo', label: 'Sexo', options: ['Macho', 'Hembra'] },
      { field: 'estado', label: 'Estado', options: ['Activo', 'Vendido', 'Muerto'] },
      { field: 'origen', label: 'Origen', options: ['Nacido', 'Comprado'] },
      { field: 'raza_nombre', label: 'Raza', dynamic: 'razas' }
    ],
    columns: [
      { title: 'ID', key: 'id', width: 10 },
      { title: 'Arete', key: 'arete', width: 16 },
      { title: 'Nombre', key: 'nombre', width: 18 },
      { title: 'Raza', key: 'raza_nombre', width: 16 },
      { title: 'Sexo', key: 'sexo', width: 10 },
      { title: 'F. Nacimiento', key: 'fecha_nacimiento', type: 'date', width: 16 },
      { title: 'Peso (kg)', key: 'peso_kg', type: 'number', width: 14 },
      { title: 'Estado', key: 'estado', width: 14, render: function (r) { return badgeEstado(r.estado); } },
      { title: 'Estado sanitario', key: 'estado_sanitario', width: 20, render: function (r) { return badgeSanitario(r.estado_sanitario); } },
      { title: 'Potrero', key: 'potrero_nombre', width: 18 },
      { title: 'Origen', key: 'origen', width: 14 }
    ]
  },
  {
    key: 'movimientos',
    label: 'Movimientos de Ganado',
    icon: 'arrows-alt-h',
    url: '/api/ganado/movimientos',
    roles: ['admin', 'trabajador'],
    dateField: 'fecha',
    filters: [
      { field: 'tipo', label: 'Tipo', options: ['Nacimiento', 'Compra', 'Venta', 'Muerte', 'Descarte'] }
    ],
    columns: [
      { title: 'ID', key: 'id', width: 10 },
      { title: 'Animal', key: 'arete', width: 22, render: function (r) { return renderAnimal(r); } },
      { title: 'Tipo', key: 'tipo', width: 18, render: function (r) { return badgeTipoMov(r.tipo); } },
      { title: 'Fecha', key: 'fecha', type: 'date', width: 16 },
      { title: 'Monto', key: 'monto', type: 'money', width: 22 },
      { title: 'Descripción', key: 'descripcion', width: 40 },
      { title: 'Responsable', key: 'responsable_nombre', width: 22 }
    ],
    summaries: [
      { label: 'Monto total', field: 'monto', type: 'money' }
    ]
  },
  {
    key: 'traslados',
    label: 'Traslados entre Potreros',
    icon: 'exchange-alt',
    url: '/api/ganado/traslados',
    roles: ['admin', 'trabajador'],
    dateField: 'fecha',
    filters: [],
    columns: [
      { title: 'ID', key: 'id', width: 10 },
      { title: 'Animal', key: 'arete', width: 24, render: function (r) { return renderAnimal(r); } },
      { title: 'Potrero origen', key: 'potrero_origen_nombre', width: 24 },
      { title: 'Potrero destino', key: 'potrero_destino_nombre', width: 24 },
      { title: 'Fecha', key: 'fecha', type: 'date', width: 16 },
      { title: 'Motivo', key: 'motivo', width: 36 },
      { title: 'Responsable', key: 'responsable_nombre', width: 22 }
    ]
  },
  {
    key: 'vacunaciones',
    label: 'Vacunaciones',
    icon: 'syringe',
    url: '/api/salud/vacunaciones',
    roles: ['admin', 'trabajador', 'veterinario', 'invitado'],
    dateField: 'fecha_aplicacion',
    filters: [],
    columns: [
      { title: 'ID', key: 'id', width: 10 },
      { title: 'Animal', key: 'arete', width: 22, render: function (r) { return renderAnimal(r); } },
      { title: 'Vacuna', key: 'vacuna', width: 30 },
      { title: 'Dosis', key: 'dosis', width: 14 },
      { title: 'F. Aplicación', key: 'fecha_aplicacion', type: 'date', width: 18 },
      { title: 'F. Próxima', key: 'fecha_proxima', type: 'date', width: 18 },
      { title: 'Veterinario', key: 'veterinario', width: 22 },
      { title: 'Observaciones', key: 'observaciones', width: 26 }
    ]
  },
  {
    key: 'tratamientos',
    label: 'Tratamientos',
    icon: 'notes-medical',
    url: '/api/salud/tratamientos',
    roles: ['admin', 'trabajador', 'veterinario', 'invitado'],
    dateField: 'fecha_inicio',
    filters: [
      { field: 'tipo', label: 'Tipo', options: ['Enfermedad', 'Lesión', 'Desparasitación', 'Otro'] },
      { field: 'estado', label: 'Estado', options: ['Activo', 'Finalizado', 'Cancelado'] }
    ],
    columns: [
      { title: 'ID', key: 'id', width: 10 },
      { title: 'Animal', key: 'arete', width: 22, render: function (r) { return renderAnimal(r); } },
      { title: 'Tipo', key: 'tipo', width: 18 },
      { title: 'Diagnóstico', key: 'diagnostico', width: 26 },
      { title: 'Medicamento', key: 'medicamento', width: 22 },
      { title: 'Inicio', key: 'fecha_inicio', type: 'date', width: 16 },
      { title: 'Fin', key: 'fecha_fin', type: 'date', width: 16 },
      { title: 'Estado', key: 'estado', width: 16, render: function (r) { return badgeEstadoTratamiento(r.estado); } },
      { title: 'Costo', key: 'costo', type: 'money', width: 22 }
    ],
    summaries: [
      { label: 'Costo total', field: 'costo', type: 'money' }
    ]
  },
  {
    key: 'visitas',
    label: 'Visitas del Veterinario',
    icon: 'stethoscope',
    url: '/api/salud/visitas',
    roles: ['admin', 'trabajador', 'veterinario', 'invitado'],
    dateField: 'fecha',
    filters: [],
    columns: [
      { title: 'ID', key: 'id', width: 10 },
      { title: 'Fecha', key: 'fecha', type: 'date', width: 16 },
      { title: 'Motivo', key: 'motivo', width: 28 },
      { title: 'Diagnóstico', key: 'diagnostico', width: 32 },
      { title: 'Costo', key: 'costo', type: 'money', width: 22 },
      { title: 'Veterinario', key: 'veterinario', width: 22 }
    ],
    summaries: [
      { label: 'Costo total', field: 'costo', type: 'money' }
    ]
  },
  {
    key: 'montas',
    label: 'Montas e Inseminaciones',
    icon: 'heart',
    url: '/api/reproduccion/montas',
    roles: ['admin', 'trabajador', 'veterinario', 'invitado'],
    dateField: 'fecha',
    filters: [
      { field: 'tipo', label: 'Tipo', options: ['Natural', 'Inseminación'] }
    ],
    columns: [
      { title: 'ID', key: 'id', width: 10 },
      { title: 'Macho', key: 'macho_arete', width: 26, render: function (r) { return renderAnimal2(r, 'macho_arete', 'macho_nombre'); } },
      { title: 'Hembra', key: 'hembra_arete', width: 26, render: function (r) { return renderAnimal2(r, 'hembra_arete', 'hembra_nombre'); } },
      { title: 'Fecha', key: 'fecha', type: 'date', width: 16 },
      { title: 'Tipo', key: 'tipo', width: 16, render: function (r) { return r.tipo === 'Inseminación' ? badgeText(r.tipo, 'badge-blue') : badgeText(r.tipo, 'badge-bueno'); } },
      { title: 'Resultado', key: 'resultado', width: 20 },
      { title: 'Observaciones', key: 'observaciones', width: 30 }
    ]
  },
  {
    key: 'gestaciones',
    label: 'Gestaciones y Partos',
    icon: 'baby',
    url: '/api/reproduccion/gestaciones',
    roles: ['admin', 'trabajador', 'veterinario', 'invitado'],
    dateField: 'fecha_inicio',
    filters: [
      { field: 'estado', label: 'Estado', options: ['En curso', 'Finalizada', 'Abortada'] },
      { field: 'resultado', label: 'Resultado', options: ['Normal', 'Difícil', 'Aborto'] }
    ],
    columns: [
      { title: 'ID', key: 'id', width: 10 },
      { title: 'Hembra', key: 'hembra_arete', width: 26, render: function (r) { return renderAnimal2(r, 'hembra_arete', 'hembra_nombre'); } },
      { title: 'Inicio', key: 'fecha_inicio', type: 'date', width: 16 },
      { title: 'Parto estimado', key: 'fecha_parto_estimada', type: 'date', width: 18 },
      { title: 'Parto real', key: 'fecha_parto_real', type: 'date', width: 18 },
      { title: 'Estado', key: 'estado', width: 16, render: function (r) { return badgeGestacion(r.estado); } },
      { title: 'Resultado', key: 'resultado', width: 14 },
      { title: 'Cría', key: 'cria_arete', width: 26, render: function (r) { return renderAnimal2(r, 'cria_arete', 'cria_nombre'); } }
    ]
  },
  {
    key: 'produccion',
    label: 'Producción Lechera',
    icon: 'tint',
    url: '/api/produccion',
    roles: ['admin', 'trabajador'],
    dateField: 'fecha',
    filters: [
      { field: 'turno', label: 'Turno', options: ['Mañana', 'Tarde'] }
    ],
    columns: [
      { title: 'ID', key: 'id', width: 10 },
      { title: 'Animal', key: 'arete', width: 24, render: function (r) { return renderAnimal(r); } },
      { title: 'Fecha', key: 'fecha', type: 'date', width: 16 },
      { title: 'Turno', key: 'turno', width: 14, render: function (r) { return r.turno === 'Mañana' ? badgeText(r.turno, 'badge-blue') : badgeText(r.turno, 'badge-wheat'); } },
      { title: 'Litros', key: 'litros', type: 'number', width: 14 },
      { title: 'Observaciones', key: 'observaciones', width: 30 }
    ],
    summaries: [
      { label: 'Litros totales', field: 'litros', type: 'number' }
    ]
  },
  {
    key: 'alimentacion',
    label: 'Alimentación',
    icon: 'seedling',
    url: '/api/alimentacion',
    roles: ['admin', 'trabajador'],
    dateField: 'fecha',
    filters: [
      { field: 'tipo', label: 'Tipo', options: ['Forraje', 'Suplemento', 'Concentrado', 'Minerales', 'Otro'] }
    ],
    columns: [
      { title: 'ID', key: 'id', width: 10 },
      { title: 'Fecha', key: 'fecha', type: 'date', width: 16 },
      { title: 'Tipo', key: 'tipo', width: 16 },
      { title: 'Alimento', key: 'alimento', width: 26 },
      { title: 'Cantidad (kg)', key: 'cantidad_kg', type: 'number', width: 18 },
      { title: 'Costo', key: 'costo', type: 'money', width: 22 },
      { title: 'Potrero', key: 'potrero_nombre', width: 20 },
      { title: 'Animal', key: 'arete', width: 20, render: function (r) { return renderAnimal(r); } },
      { title: 'Responsable', key: 'responsable_nombre', width: 20 }
    ],
    summaries: [
      { label: 'Total kg', field: 'cantidad_kg', type: 'number' },
      { label: 'Costo total', field: 'costo', type: 'money' }
    ]
  },
  {
    key: 'finanzas',
    label: 'Movimientos Financieros',
    icon: 'coins',
    url: '/api/finanzas/movimientos',
    roles: ['admin', 'invitado'],
    dateField: 'fecha',
    filters: [
      { field: 'tipo', label: 'Tipo', options: ['Ingreso', 'Egreso'] },
      { field: 'categoria', label: 'Categoría', dynamic: 'data' }
    ],
    columns: [
      { title: 'ID', key: 'id', width: 10 },
      { title: 'Fecha', key: 'fecha', type: 'date', width: 16 },
      { title: 'Tipo', key: 'tipo', width: 14, render: function (r) { return badgeFin(r.tipo); } },
      { title: 'Categoría', key: 'categoria', width: 24 },
      { title: 'Descripción', key: 'descripcion', width: 30 },
      { title: 'Monto', key: 'monto', type: 'money', width: 24 },
      { title: 'Método de pago', key: 'metodo_pago', width: 18 },
      { title: 'Responsable', key: 'responsable_nombre', width: 20 }
    ],
    summaries: [
      { label: 'Total ingresos', field: 'monto', type: 'money', filter: function (r) { return r.tipo === 'Ingreso'; } },
      { label: 'Total egresos', field: 'monto', type: 'money', filter: function (r) { return r.tipo === 'Egreso'; } }
    ]
  },
  {
    key: 'pagos',
    label: 'Pagos a Empleados',
    icon: 'wallet',
    url: '/api/finanzas/pagos',
    roles: ['admin', 'invitado'],
    dateField: 'fecha_pago',
    filters: [],
    columns: [
      { title: 'ID', key: 'id', width: 10 },
      { title: 'Empleado', key: 'empleado_nombre', width: 28 },
      { title: 'Periodo', key: 'periodo', width: 14 },
      { title: 'Bruto', key: 'salario_bruto', type: 'money', width: 24 },
      { title: 'Deducciones', key: 'deducciones', type: 'money', width: 24 },
      { title: 'Neto', key: 'salario_neto', type: 'money', width: 24 },
      { title: 'F. Pago', key: 'fecha_pago', type: 'date', width: 16 },
      { title: 'Método', key: 'metodo_pago', width: 20 }
    ],
    summaries: [
      { label: 'Total neto', field: 'salario_neto', type: 'money' }
    ]
  },
  {
    key: 'empleados',
    label: 'Empleados',
    icon: 'users',
    url: '/api/empleados',
    roles: ['admin', 'veterinario', 'invitado'],
    filters: [
      { field: 'estado', label: 'Estado', options: ['Activo', 'Inactivo'] },
      { field: 'cargo', label: 'Cargo', dynamic: 'data' }
    ],
    columns: [
      { title: 'ID', key: 'id', width: 10 },
      { title: 'Nombre', key: 'nombre', width: 28 },
      { title: 'Cargo', key: 'cargo', width: 24 },
      { title: 'Teléfono', key: 'telefono', width: 18 },
      { title: 'Email', key: 'email', width: 30 },
      { title: 'F. Ingreso', key: 'fecha_ingreso', type: 'date', width: 16 },
      { title: 'Salario base', key: 'salario_base', type: 'money', width: 22 },
      { title: 'Estado', key: 'estado', width: 16, render: function (r) { return badgeEmpleado(r.estado); } }
    ]
  },
  {
    key: 'tareas',
    label: 'Tareas',
    icon: 'tasks',
    url: '/api/empleados/tareas',
    roles: ['admin', 'trabajador', 'veterinario', 'invitado'],
    filters: [
      { field: 'estado', label: 'Estado', options: ['Pendiente', 'En progreso', 'Completada', 'Cancelada'] },
      { field: 'prioridad', label: 'Prioridad', options: ['Baja', 'Media', 'Alta'] }
    ],
    columns: [
      { title: 'ID', key: 'id', width: 10 },
      { title: 'Título', key: 'titulo', width: 32 },
      { title: 'Empleado', key: 'empleado_nombre', width: 24 },
      { title: 'Asignación', key: 'fecha_asignacion', type: 'date', width: 16 },
      { title: 'Vencimiento', key: 'fecha_vencimiento', type: 'date', width: 16 },
      { title: 'Prioridad', key: 'prioridad', width: 14, render: function (r) { return badgePrioridad(r.prioridad); } },
      { title: 'Estado', key: 'estado', width: 18, render: function (r) { return badgeTarea(r.estado); } }
    ]
  },
  {
    key: 'productos',
    label: 'Productos e Inventario',
    icon: 'boxes',
    url: '/api/inventario/productos',
    roles: ['admin', 'trabajador', 'veterinario', 'invitado'],
    filters: [
      { field: 'categoria', label: 'Categoría', dynamic: 'data' }
    ],
    columns: [
      { title: 'ID', key: 'id', width: 10 },
      { title: 'Nombre', key: 'nombre', width: 30 },
      { title: 'Categoría', key: 'categoria', width: 22 },
      { title: 'Unidad', key: 'unidad_medida', width: 14 },
      { title: 'Stock actual', key: 'stock_actual', type: 'number', width: 18 },
      { title: 'Stock mínimo', key: 'stock_minimo', type: 'number', width: 18 },
      { title: 'Precio unitario', key: 'precio_unitario', type: 'money', width: 22 },
      { title: 'Estado stock', key: 'stock_bajo', width: 18, render: function (r) { return badgeStock(r); } }
    ]
  },
  {
    key: 'mov_inventario',
    label: 'Movimientos de Inventario',
    icon: 'sync-alt',
    url: '/api/inventario/movimientos',
    roles: ['admin', 'trabajador'],
    dateField: 'fecha',
    filters: [
      { field: 'tipo', label: 'Tipo', options: ['Entrada', 'Salida'] }
    ],
    columns: [
      { title: 'ID', key: 'id', width: 10 },
      { title: 'Producto', key: 'producto_nombre', width: 28 },
      { title: 'Tipo', key: 'tipo', width: 14, render: function (r) { return r.tipo === 'Entrada' ? badgeText(r.tipo, 'badge-bueno') : badgeText(r.tipo, 'badge-critico'); } },
      { title: 'Cantidad', key: 'cantidad', type: 'number', width: 14 },
      { title: 'Fecha', key: 'fecha', type: 'date', width: 16 },
      { title: 'Costo unitario', key: 'costo_unitario', type: 'money', width: 22 },
      { title: 'Proveedor', key: 'proveedor', width: 24 },
      { title: 'Motivo', key: 'motivo', width: 28 }
    ],
    summaries: [
      { label: 'Cantidad total', field: 'cantidad', type: 'number' }
    ]
  }
];

/* ========================================
   HELPERS DE RENDERIZADO
   ======================================== */
function badgeText(texto, clase) {
  if (!texto) return '<span class="badge badge-regular">-</span>';
  return '<span class="badge ' + clase + '">' + Shell.escapeHtml(texto) + '</span>';
}

function badgeSanitario(texto) {
  let clase = 'badge-bueno';
  if (texto === 'Regular') clase = 'badge-regular';
  if (texto === 'Crítico') clase = 'badge-critico';
  return badgeText(texto, clase);
}

function badgeEstado(texto) {
  let clase = 'badge-bueno';
  if (texto === 'Vendido') clase = 'badge-regular';
  if (texto === 'Muerto') clase = 'badge-critico';
  return badgeText(texto, clase);
}

function badgeTipoMov(texto) {
  let clase = 'badge-blue';
  if (texto === 'Nacimiento') clase = 'badge-blue';
  if (texto === 'Compra') clase = 'badge-bueno';
  if (texto === 'Venta') clase = 'badge-wheat';
  if (texto === 'Muerte') clase = 'badge-critico';
  if (texto === 'Descarte') clase = 'badge-regular';
  return badgeText(texto, clase);
}

function badgeEstadoTratamiento(texto) {
  let clase = 'badge-regular';
  if (texto === 'Activo') clase = 'badge-critico';
  if (texto === 'Finalizado') clase = 'badge-bueno';
  if (texto === 'Cancelado') clase = 'badge-regular';
  return badgeText(texto, clase);
}

function badgeGestacion(texto) {
  let clase = 'badge-blue';
  if (texto === 'En curso') clase = 'badge-blue';
  if (texto === 'Finalizada') clase = 'badge-bueno';
  if (texto === 'Abortada') clase = 'badge-critico';
  return badgeText(texto, clase);
}

function badgeFin(texto) {
  let clase = 'badge-bueno';
  if (texto === 'Egreso') clase = 'badge-critico';
  return badgeText(texto, clase);
}

function badgeEmpleado(texto) {
  let clase = 'badge-bueno';
  if (texto === 'Inactivo') clase = 'badge-regular';
  return badgeText(texto, clase);
}

function badgePrioridad(texto) {
  let clase = 'badge-blue';
  if (texto === 'Media') clase = 'badge-wheat';
  if (texto === 'Alta') clase = 'badge-critico';
  return badgeText(texto, clase);
}

function badgeTarea(texto) {
  let clase = 'badge-wheat';
  if (texto === 'Pendiente') clase = 'badge-wheat';
  if (texto === 'En progreso') clase = 'badge-blue';
  if (texto === 'Completada') clase = 'badge-bueno';
  if (texto === 'Cancelada') clase = 'badge-regular';
  return badgeText(texto, clase);
}

function badgeStock(r) {
  if (r.stock_bajo) {
    return badgeText('Bajo', 'badge-critico');
  }
  return badgeText('Suficiente', 'badge-bueno');
}

function renderAnimal(r) {
  const arete = r.arete || r.animal_arete || '-';
  const nombre = r.animal_nombre || r.nombre || '';
  return '<strong>' + Shell.escapeHtml(arete) + '</strong> ' + Shell.escapeHtml(nombre);
}

function renderAnimal2(r, areteKey, nombreKey) {
  const arete = r[areteKey] || '-';
  const nombre = r[nombreKey] || '';
  if (!nombre) return Shell.escapeHtml(arete);
  return '<strong>' + Shell.escapeHtml(arete) + '</strong> ' + Shell.escapeHtml(nombre);
}

/* ========================================
   LÓGICA PRINCIPAL
   ======================================== */
document.addEventListener('DOMContentLoaded', async function () {
  const user = await Shell.init('reportes');
  if (!user) return;

  const token = Auth.getToken();
  let currentReport = null;
  let allData = [];
  let razas = [];

  const REPORTES_VISIBLES = REPORTES.filter(function (r) {
    return r.roles.includes(user.rol);
  });

  await cargarRazas();
  poblarSelector();
  bindEventos();

  /* ---------- Selector de módulo ---------- */
  function poblarSelector() {
    const select = document.getElementById('selectReporte');
    select.innerHTML = '';
    REPORTES_VISIBLES.forEach(function (r) {
      const option = document.createElement('option');
      option.value = r.key;
      option.textContent = r.label;
      select.appendChild(option);
    });
    if (REPORTES_VISIBLES.length > 0) {
      select.value = REPORTES_VISIBLES[0].key;
      cambiarReporte();
    } else {
      document.getElementById('tableBody').innerHTML =
        '<tr><td colspan="2" class="no-data"><i class="fas fa-shield-alt"></i><p>No tiene acceso a ningún reporte</p></td></tr>';
    }
  }

  function bindEventos() {
    document.getElementById('selectReporte').addEventListener('change', cambiarReporte);
    document.getElementById('btnClearFilters').addEventListener('click', limpiarFiltros);
    document.getElementById('reporteDesde').addEventListener('change', aplicarFiltros);
    document.getElementById('reporteHasta').addEventListener('change', aplicarFiltros);
    document.getElementById('btnExportPDF').addEventListener('click', exportarPDF);
    document.getElementById('btnExportExcel').addEventListener('click', exportarExcel);
  }

  async function cargarRazas() {
    try {
      const response = await fetch('/api/ganado/razas/lista', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (response.status === 401) { Auth.logout(); return; }
      const result = await response.json();
      if (result.success) razas = result.data;
    } catch (err) {
      console.error('Error al cargar razas:', err);
    }
  }

  /* ---------- Cambio de reporte ---------- */
  async function cambiarReporte() {
    const key = document.getElementById('selectReporte').value;
    currentReport = REPORTES_VISIBLES.find(function (r) { return r.key === key; }) || null;
    if (!currentReport) return;

    document.getElementById('reportTitle').innerHTML = '<i class="fas fa-' + currentReport.icon + '"></i> ' + currentReport.label;
    document.title = currentReport.label + ' - Reportes - Finca Ganadera El Progreso';

    // Deshabilitar rango de fechas si el reporte no tiene campo de fecha
    document.getElementById('reporteDesde').value = '';
    document.getElementById('reporteHasta').value = '';
    document.getElementById('reporteDesde').disabled = !currentReport.dateField;
    document.getElementById('reporteHasta').disabled = !currentReport.dateField;

    construirFiltros();

    document.getElementById('tableBody').innerHTML =
      '<tr><td colspan="' + (currentReport.columns.length || 2) + '" class="no-data"><i class="fas fa-spinner fa-spin"></i><p>Cargando reporte...</p></td></tr>';

    await cargarReporte();
  }

  function construirFiltros() {
    const bar = document.getElementById('filtersBar');
    bar.innerHTML = '';

    if (!currentReport.filters || currentReport.filters.length === 0) {
      bar.style.display = 'none';
      return;
    }

    bar.style.display = '';
    currentReport.filters.forEach(function (f) {
      const group = document.createElement('div');
      group.className = 'filter-group';
      const label = document.createElement('label');
      label.setAttribute('for', 'filtro-' + f.field);
      label.textContent = f.label;
      const select = document.createElement('select');
      select.id = 'filtro-' + f.field;
      select.innerHTML = '<option value="">Todos</option>';
      group.appendChild(label);
      group.appendChild(select);
      bar.appendChild(group);

      if (f.dynamic === 'razas') {
        razas.forEach(function (raza) {
          const option = document.createElement('option');
          option.value = raza.nombre;
          option.textContent = raza.nombre;
          select.appendChild(option);
        });
      } else if (f.options) {
        f.options.forEach(function (opt) {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          select.appendChild(option);
        });
      }

      select.addEventListener('change', aplicarFiltros);
    });
  }

  /* ---------- Carga y filtrado ---------- */
  async function cargarReporte() {
    try {
      const response = await fetch(currentReport.url, {
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (response.status === 401) { Auth.logout(); return; }
      if (response.status === 403) {
        document.getElementById('tableBody').innerHTML =
          '<tr><td colspan="' + currentReport.columns.length + '" class="no-data"><i class="fas fa-shield-alt"></i><p>No tiene permisos para ver este reporte</p></td></tr>';
        return;
      }

      const result = await response.json();

      if (result.success) {
        allData = result.data || [];
        poblarFiltrosDinamicos();
        renderReporte();
      } else {
        document.getElementById('tableBody').innerHTML =
          '<tr><td colspan="' + currentReport.columns.length + '" class="no-data"><i class="fas fa-exclamation-circle"></i><p>Error al cargar el reporte</p></td></tr>';
      }
    } catch (err) {
      console.error('Error al cargar reporte:', err);
      document.getElementById('tableBody').innerHTML =
        '<tr><td colspan="' + currentReport.columns.length + '" class="no-data"><i class="fas fa-exclamation-circle"></i><p>Error de conexión</p></td></tr>';
    }
  }

  function poblarFiltrosDinamicos() {
    currentReport.filters.forEach(function (f) {
      if (f.dynamic !== 'data') return;
      const select = document.getElementById('filtro-' + f.field);
      if (!select) return;

      const valores = {};
      allData.forEach(function (r) {
        const v = r[f.field];
        if (v) valores[v] = true;
      });
      const opciones = Object.keys(valores).sort(function (a, b) {
        return a.localeCompare(b, 'es');
      });

      select.innerHTML = '<option value="">Todos</option>';
      opciones.forEach(function (opt) {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
      });
    });
  }

  function getFilteredData() {
    if (!currentReport) return [];
    let filtered = allData.slice();

    const desde = document.getElementById('reporteDesde').value;
    const hasta = document.getElementById('reporteHasta').value;

    if (currentReport.dateField) {
      if (desde) {
        filtered = filtered.filter(function (r) {
          return r[currentReport.dateField] && String(r[currentReport.dateField]).slice(0, 10) >= desde;
        });
      }
      if (hasta) {
        filtered = filtered.filter(function (r) {
          return r[currentReport.dateField] && String(r[currentReport.dateField]).slice(0, 10) <= hasta;
        });
      }
    }

    currentReport.filters.forEach(function (f) {
      const select = document.getElementById('filtro-' + f.field);
      const value = select ? select.value : '';
      if (!value) return;
      filtered = filtered.filter(function (r) {
        return String(r[f.field]) === value;
      });
    });

    return filtered;
  }

  function aplicarFiltros() {
    if (!currentReport) return;
    renderReporte();
  }

  function limpiarFiltros() {
    document.getElementById('reporteDesde').value = '';
    document.getElementById('reporteHasta').value = '';
    currentReport.filters.forEach(function (f) {
      const select = document.getElementById('filtro-' + f.field);
      if (select) select.value = '';
    });
    renderReporte();
  }

  /* ---------- Renderizado de tabla ---------- */
  function renderReporte() {
    const data = getFilteredData();
    const tbody = document.getElementById('tableBody');
    const thead = document.getElementById('tableHead');
    const totalSpan = document.getElementById('totalRegistros');

    // Encabezados
    thead.innerHTML = '<tr>' + currentReport.columns.map(function (c) {
      return '<th>' + Shell.escapeHtml(c.title) + '</th>';
    }).join('') + '</tr>';

    totalSpan.textContent = 'Total: ' + data.length + ' registro' + (data.length !== 1 ? 's' : '');

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="' + currentReport.columns.length + '" class="no-data"><i class="fas fa-inbox"></i><p>No hay registros que coincidan con los filtros</p></td></tr>';
      renderSummary(data);
      return;
    }

    tbody.innerHTML = '';
    data.forEach(function (item) {
      const tr = document.createElement('tr');
      tr.innerHTML = currentReport.columns.map(function (c) {
        const contenido = c.render ? c.render(item) : Shell.escapeHtml(formatearValor(item[c.key], c.type));
        return '<td>' + contenido + '</td>';
      }).join('');
      tbody.appendChild(tr);
    });

    renderSummary(data);
  }

  function renderSummary(data) {
    const bar = document.getElementById('summaryBar');
    if (!currentReport.summaries || currentReport.summaries.length === 0) {
      bar.style.display = 'none';
      return;
    }

    bar.innerHTML = '';
    currentReport.summaries.forEach(function (s) {
      let total = 0;
      data.forEach(function (r) {
        if (s.filter && !s.filter(r)) return;
        const v = parseFloat(r[s.field]);
        if (!isNaN(v)) total += v;
      });
      const value = s.type === 'money' ? moneda(total) : formatearNumero(total);
      bar.innerHTML += '<div class="summary-item"><i class="fas fa-calculator"></i>' + Shell.escapeHtml(s.label) + ': ' + value + '</div>';
    });
    bar.style.display = 'flex';
  }

  /* ---------- Exportación ---------- */
  function getFilterDescription() {
    const parts = [];
    const desde = document.getElementById('reporteDesde').value;
    const hasta = document.getElementById('reporteHasta').value;

    if (desde && hasta) parts.push('Del ' + formatFechaInput(desde) + ' al ' + formatFechaInput(hasta));
    else if (desde) parts.push('Desde ' + formatFechaInput(desde));
    else if (hasta) parts.push('Hasta ' + formatFechaInput(hasta));

    currentReport.filters.forEach(function (f) {
      const select = document.getElementById('filtro-' + f.field);
      const value = select ? select.value : '';
      if (value) parts.push(f.label + ': ' + value);
    });

    return parts.length > 0 ? 'Filtros: ' + parts.join(' | ') : 'Sin filtros aplicados';
  }

  function getFormattedDate() {
    const now = new Date();
    return now.toLocaleDateString('es-DO') + ' ' + now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
  }

  function formatFechaInput(f) {
    const partes = String(f).split('-');
    if (partes.length === 3) return partes[2] + '/' + partes[1] + '/' + partes[0];
    return f;
  }

  function fileName() {
    const slug = currentReport.key;
    return 'Reporte_' + slug.charAt(0).toUpperCase() + slug.slice(1) + '_' + new Date().toISOString().slice(0, 10);
  }

  function exportarPDF() {
    const data = getFilteredData();
    if (data.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFontSize(16);
    doc.setTextColor(15, 61, 43);
    doc.text('Finca Ganadera El Progreso', 14, 15);
    doc.setFontSize(12);
    doc.text(currentReport.label, 14, 22);

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Fecha: ' + getFormattedDate(), 14, 28);
    doc.text(getFilterDescription(), 14, 33);
    doc.text('Total: ' + data.length + ' registro' + (data.length !== 1 ? 's' : ''), 14, 38);

    const columns = currentReport.columns;
    const head = [columns.map(function (c) { return c.title; })];
    const body = data.map(function (item) {
      return columns.map(function (c) {
        return formatearValor(item[c.key], c.type);
      });
    });

    // Calcular anchos proporcionales sobre el ancho útil (~269mm)
    const totalWidth = columns.reduce(function (acc, c) { return acc + (c.width || 20); }, 0);
    const usable = 269;
    const columnStyles = {};
    columns.forEach(function (c, i) {
      columnStyles[i] = { cellWidth: (c.width || 20) * (usable / totalWidth) };
    });

    doc.autoTable({
      startY: 43,
      head: head,
      body: body,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: [28, 42, 30],
        overflow: 'ellipsize'
      },
      headStyles: {
        fillColor: [15, 61, 43],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7
      },
      alternateRowStyles: {
        fillColor: [250, 250, 245]
      },
      columnStyles: columnStyles
    });

    doc.save(fileName() + '.pdf');
  }

  function exportarExcel() {
    const data = getFilteredData();
    if (data.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const columns = currentReport.columns;
    const wsData = [
      ['Finca Ganadera El Progreso'],
      [currentReport.label],
      ['Fecha: ' + getFormattedDate()],
      [getFilterDescription()],
      ['Total: ' + data.length + ' registro' + (data.length !== 1 ? 's' : '')],
      [],
      columns.map(function (c) { return c.title; })
    ];

    data.forEach(function (item) {
      wsData.push(columns.map(function (c) {
        return formatearValor(item[c.key], c.type);
      }));
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = columns.map(function (c) {
      return { wch: Math.max(8, Math.round((c.width || 20) / 1.4)) };
    });

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: columns.length - 1 } }
    ];

    XLSX.utils.book_append_sheet(wb, ws, currentReport.label.slice(0, 31));
    XLSX.writeFile(wb, fileName() + '.xlsx');
  }

  /* ---------- Formateo de valores ---------- */
  function formatearValor(valor, type) {
    if (valor === null || valor === undefined || valor === '') return '-';
    if (type === 'date') return formatFecha(valor);
    if (type === 'money') return moneda(valor);
    if (type === 'number') return formatearNumero(valor);
    return String(valor);
  }

  function formatFecha(f) {
    const s = String(f).slice(0, 10);
    const partes = s.split('-');
    if (partes.length !== 3) return s;
    return partes[2] + '/' + partes[1] + '/' + partes[0];
  }

  function formatearNumero(n) {
    if (n === null || n === undefined) return '0';
    return Number(n).toLocaleString('es-DO', { maximumFractionDigits: 2 });
  }

  function moneda(n) {
    if (n === null || n === undefined) return '0';
    return Number(n).toLocaleString('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 });
  }
});
