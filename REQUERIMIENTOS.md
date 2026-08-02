# REQUERIMIENTOS — Sistema de Gestión Finca Ganadera El Progreso

Documento de requerimientos funcionales y no funcionales, modelo de datos y plan de implementación para convertir la parte de gestión en un sistema completo que administre todos los procesos de la finca.

---

## 1. Descripción general

La aplicación actual cuenta con una landing pública, autenticación con roles (admin / invitado) y un CRUD básico de ganado con reportes exportables. Este proyecto amplía la sección de gestión a un sistema integral que cubre el ciclo productivo de la finca ganadera: inventario de ganado, salud y sanidad, reproducción, producción lechera, alimentación, finanzas, empleados y tareas, e inventario de productos e insumos.

### 1.1 Objetivos

- Gestionar el ciclo de vida completo de cada animal (nacimiento/compra, cría, producción, venta/muerte).
- Registrar los procesos de salud, reproducción, alimentación y producción de leche.
- Llevar control financiero de ingresos y egresos, incluidos los pagos a empleados.
- Administrar el personal y sus tareas.
- Controlar inventarios de productos e insumos con entradas y salidas.
- Brindar reportes y un panel de indicadores para la toma de decisiones.

### 1.2 Stack tecnológico (se mantiene)

- Frontend: HTML5, CSS3, JavaScript vanilla (sin frameworks).
- Backend: Node.js + Express.js (CommonJS).
- Base de datos: PostgreSQL.
- Autenticación: JWT + bcryptjs.

---

## 2. Módulos

| # | Módulo | Descripción |
|---|--------|-------------|
| M1 | Ganado (inventario completo) | CRUD ampliado con estado, origen, compras, ventas, nacimientos, muertes y traslados entre potreros. Vínculos de madre/padre. |
| M2 | Salud y sanidad | Vacunaciones, tratamientos (incluye desparasitaciones), visitas del veterinario e historial sanitario por animal. |
| M3 | Reproducción | Montas (natural/inseminación), gestaciones con fecha de parto estimada, partos con alta automática de crías. |
| M4 | Producción lechera | Registro diario de litros por animal y turno (mañana/tarde). |
| M5 | Alimentación | Raciones por potrero o animal: tipo de alimento, cantidad, costo y responsable. |
| M6 | Finanzas | Ingresos y egresos por categoría, pagos a empleados, saldo por periodo. |
| M7 | Empleados y tareas | Personal de la finca, asignación de tareas con estado y prioridad. |
| M8 | Productos e inventario | Catálogo de productos/insumos (independiente del ganado), entradas/salidas y alertas de stock mínimo. |

Catálogos de apoyo: `razas` (existente) y `potreros` (ubicación, traslados y alimentación).

---

## 3. Roles y permisos

| Módulo | Admin | Trabajador | Veterinario | Invitado |
|--------|:-----:|:----------:|:-----------:|:--------:|
| Ganado | CRUD + movimientos | Movimientos + lectura | Lectura | Lectura |
| Salud y sanidad | CRUD | Lectura | CRUD | Lectura |
| Reproducción | CRUD | Lectura | CRUD | Lectura |
| Producción lechera | CRUD | CRUD | Lectura | Lectura |
| Alimentación | CRUD | CRUD | Lectura | Lectura |
| Finanzas | CRUD | Sin acceso | Sin acceso | Lectura |
| Empleados | CRUD | Ver/actualizar sus tareas | Lectura | Lectura |
| Tareas | CRUD | CRUD sobre sus tareas | Lectura | Lectura |
| Productos / Inventario | CRUD | Entradas y salidas | Lectura | Lectura |
| Dashboard y reportes | Total | Sus módulos | Salud | Solo lectura |

---

## 4. Requerimientos funcionales (RF)

### M1 — Ganado (inventario completo)

- RF-1.1: El sistema permite registrar, consultar, editar y eliminar animales (CRUD) con: arete (único), nombre, raza, sexo, fecha de nacimiento, peso, estado sanitario (Bueno/Regular/Crítico), estado (Activo/Vendido/Muerto), origen (Nacido/Comprado), fecha y precio de compra, potrero, madre y padre.
- RF-1.2: Registrar entradas de ganado por **Nacimiento** (vinculado al parto de una madre) o **Compra** (con monto y fecha).
- RF-1.3: Registrar salidas por **Venta** (con monto), **Muerte** o **Descarte**, cambiando el estado del animal a Vendido/Muerto.
- RF-1.4: Registrar **traslados** entre potreros con fecha, motivo y responsable; el animal queda en el potrero destino.
- RF-1.5: Consultar el historial de movimientos y traslados de cada animal.
- RF-1.6: El inventario actual corresponde a los animales en estado **Activo**.

### M2 — Salud y sanidad

- RF-2.1: Registrar **vacunaciones** por animal: vacuna, dosis, fecha de aplicación, próxima dosis, veterinario y observaciones.
- RF-2.2: Registrar **tratamientos** por animal: tipo (enfermedad/lesión/desparasitación/otro), diagnóstico, medicamento, fechas, estado, costo y veterinario.
- RF-2.3: Registrar **visitas del veterinario** con motivo, diagnóstico, costo y responsable.
- RF-2.4: Consultar el **historial sanitario completo** de un animal (vacunas + tratamientos).
- RF-2.5: Sugerir el estado sanitario: si existe un tratamiento activo el estado pasa a *Regular*; el estado *Crítico* solo se asigna manualmente.

### M3 — Reproducción

- RF-3.1: Registrar **montas** con macho, hembra, fecha, tipo (natural/inseminación) y resultado.
- RF-3.2: Registrar **gestaciones** por hembra con fecha de inicio, fecha estimada de parto, estado (en curso/finalizada/abortada) y resultado del parto.
- RF-3.3: Al registrar un **parto** se da de alta automáticamente la cría (nuevo animal) vinculada como madre/padre y se genera el movimiento de entrada por Nacimiento.
- RF-3.4: Listar próximos partos (gestaciones en curso con fecha estimada cercana).

### M4 — Producción lechera

- RF-4.1: Registrar producción diaria de litros por animal y turno (mañana/tarde).
- RF-4.2: Evitar duplicados de producción del mismo animal/fecha/turno.
- RF-4.3: Consultar totales por día, por animal y por periodo.

### M5 — Alimentación

- RF-5.1: Registrar raciones por **potrero** o **animal**: fecha, tipo (forraje/suplemento/concentrado/minerales/otro), alimento, cantidad en kg, costo y responsable.
- RF-5.2: Consultar consumo y costos por potrero y por periodo.

### M6 — Finanzas

- RF-6.1: Registrar **movimientos financieros** (Ingreso/Egreso) con categoría, descripción, monto, método de pago y responsable.
- RF-6.2: Registrar **pagos a empleados** por periodo (bruto, deducciones, neto, fecha y método de pago).
- RF-6.3: Consultar el **saldo** (ingresos − egresos) por periodo y por categoría.

### M7 — Empleados y tareas

- RF-7.1: CRUD de **empleados**: nombre, cargo, contacto, fecha de ingreso, salario base y estado.
- RF-7.2: CRUD de **tareas** con título, descripción, empleado responsable, fechas, prioridad y estado.
- RF-7.3: Un trabajador puede ver y actualizar el estado de **sus propias tareas**.
- RF-7.4: Al completar una tarea se registra la fecha de completación.

### M8 — Productos e inventario

- RF-8.1: CRUD de **productos** (catálogo independiente del ganado): nombre, categoría, unidad de medida, stock actual, stock mínimo y precio unitario.
- RF-8.2: Registrar **entradas** y **salidas** de inventario con cantidad, fecha, costo unitario, proveedor y motivo.
- RF-8.3: Actualizar automáticamente el stock actual según los movimientos.
- RF-8.4: Generar **alertas** cuando el stock cae por debajo del mínimo.

### M9 — Dashboard y reportes

- RF-9.1: Panel de resumen con indicadores: total de ganado activo, hembras/machos, litros del día, ingresos/egresos/saldo del mes, tareas pendientes, animales en estado crítico, próximos partos y alertas de stock bajo.
- RF-9.2: Cada módulo dispone de **reportes** con filtros y exportación PDF/Excel (reutilizando el patrón de `reportes.html`).

---

## 5. Requerimientos no funcionales (RNF)

- RNF-1: Mantener el stack actual (vanilla JS + Express + PostgreSQL + JWT). No introducir frameworks.
- RNF-2: Control de acceso por rol en cada endpoint mediante el middleware `requerirRol` existente.
- RNF-3: Consultas parametrizadas (evita inyección SQL) y validación de entrada en backend y frontend.
- RNF-4: Contraseñas encriptadas con bcrypt y tokens JWT con expiración.
- RNF-5: Navegación lateral común entre módulos, reutilizando las variables CSS existentes (`--leaf`, `--cream`, etc.) para consistencia visual.
- RNF-6: Un archivo de ruta por módulo en `backend/server/routes/` para mantener el código escalable y ordenado.
- RNF-7: `init.sql` idempotente: aplicable tanto a bases nuevas como a bases existentes (contiene la migración del esquema anterior de `ganado`).

---

## 6. Modelo de datos

Ver `init.sql` (esquema y datos semilla). Resumen de tablas:

**Existentes (modificadas):**
- `usuarios` — agregar soporte de roles: `admin`, `trabajador`, `veterinario`, `invitado`.
- `razas` — sin cambios.
- `ganado` — nuevas columnas: `estado`, `origen`, `fecha_compra`, `precio_compra`, `potrero_id` (FK), `madre_id`, `padre_id`. Se migra `ubicacion` (texto) a `potrero_id` (FK).

**Nuevas:**
| Tabla | Propósito |
|-------|-----------|
| `potreros` | Catálogo de potreros/establos con capacidad y estado |
| `movimientos_ganado` | Entradas/salidas de ganado (nacimiento, compra, venta, muerte, descarte) |
| `traslados` | Historial de traslados entre potreros |
| `vacunaciones` | Vacunas por animal |
| `tratamientos` | Tratamientos médicos y desparasitaciones |
| `visitas_veterinario` | Visitas del veterinario |
| `montas` | Registro de montas e inseminaciones |
| `gestaciones` | Seguimiento de gestaciones y partos |
| `produccion_leche` | Producción diaria por animal y turno |
| `alimentacion` | Raciones por potrero o animal |
| `movimientos_financieros` | Ingresos y egresos |
| `empleados` | Personal de la finca |
| `tareas` | Tareas asignadas a empleados |
| `pagos_empleados` | Pagos de salarios por periodo |
| `productos` | Catálogo de productos/insumos |
| `movimientos_inventario` | Entradas y salidas de inventario |

---

## 7. Diseño de API

Rutas nuevas en `backend/server/routes/` (cada archivo usa `verificarToken` y, donde aplique, `requerirRol`).

| Router | Endpoint | Método | Descripción | Roles |
|--------|----------|--------|-------------|-------|
| `/api/auth` | `/registro` | POST | Crear usuario | Público |
| `/api/auth` | `/login` | POST | Iniciar sesión | Público |
| `/api/auth` | `/invitado` | POST | Token de invitado | Público |
| `/api/auth` | `/perfil` | GET | Verificar token | Autenticado |
| `/api/ganado` | `/` `/` `:id` | GET/POST/PUT/DELETE | CRUD ganado | según rol |
| `/api/ganado` | `/movimientos` | GET/POST | Entradas/salidas | Admin/Trabajador |
| `/api/ganado` | `/traslados` | GET/POST | Traslados entre potreros | Admin/Trabajador |
| `/api/ganado` | `/razas/lista` | GET | Listar razas | Autenticado |
| `/api/potreros` | `/` `/:id` | GET/POST/PUT/DELETE | CRUD potreros | Admin |
| `/api/salud` | `/vacunaciones` | CRUD | Vacunas | Admin/Veterinario |
| `/api/salud` | `/tratamientos` | CRUD | Tratamientos | Admin/Veterinario |
| `/api/salud` | `/visitas` | CRUD | Visitas veterinario | Admin/Veterinario |
| `/api/salud` | `/historial/:animalId` | GET | Historial sanitario | Autenticado |
| `/api/reproduccion` | `/montas` | CRUD | Montas | Admin/Veterinario |
| `/api/reproduccion` | `/gestaciones` | CRUD | Gestaciones | Admin/Veterinario |
| `/api/reproduccion` | `/partos` | POST | Registrar parto + alta de cría | Admin/Veterinario |
| `/api/produccion` | `/` | GET/POST | Producción diaria | Admin/Trabajador |
| `/api/alimentacion` | `/` | GET/POST | Raciones | Admin/Trabajador |
| `/api/finanzas` | `/movimientos` | CRUD | Ingresos/egresos | Admin |
| `/api/finanzas` | `/pagos` | CRUD | Pagos a empleados | Admin |
| `/api/finanzas` | `/saldo` | GET | Saldo por periodo | Admin |
| `/api/empleados` | `/` `/:id` | CRUD | Empleados | Admin |
| `/api/empleados` | `/tareas` | CRUD | Tareas | Admin (Trabajador: propias) |
| `/api/inventario` | `/productos` | CRUD | Catálogo de productos | Admin |
| `/api/inventario` | `/movimientos` | GET/POST | Entradas/salidas | Admin/Trabajador |
| `/api/inventario` | `/alertas` | GET | Stock bajo mínimo | Admin |
| `/api/dashboard` | `/resumen` | GET | Indicadores del panel | Autenticado |

---

## 8. Diseño de frontend

- `dashboard.html` — panel de resumen con KPIs y navegación lateral hacia todos los módulos.
- `gestion.html` — inventario completo de ganado (amplía el CRUD actual con movimientos y traslados).
- `salud.html`, `reproduccion.html`, `produccion.html`, `alimentacion.html`, `finanzas.html`, `empleados.html`, `inventario.html` — CRUD por módulo.
- Menú lateral compartido (CSS en `css/gestion.css` o nuevo `css/dashboard.css`).
- `reportes.html` — se amplía o se crean reportes por módulo con exportación PDF/Excel.
- Patrón reutilizado: tablas `data-table`, modales `modal-overlay`/`modal`, notificaciones y badges de estado existentes.

---

## 9. Plan de implementación

### Fase 1 — Datos ✅ (ejecutada)
- [x] Extender `init.sql` con todas las tablas, claves foráneas y datos semilla.
- [x] Migración automática del esquema anterior de `ganado` (texto `ubicacion` → FK `potrero_id`).
- [x] Datos de prueba para potreros, movimientos, salud, reproducción, producción, alimentación, empleados, tareas, pagos, productos, inventario y finanzas.

### Fase 2 — Backend base ✅ (ejecutada)
- [x] Ampliar `auth.js`: registro/login soportando roles `trabajador` y `veterinario`.
- [x] Ampliar `/api/ganado` con `estado`, `origen`, `fecha_compra`, `precio_compra`, `madre_id`, `padre_id`.
- [x] Crear `/api/ganado/movimientos` y `/api/ganado/traslados`.
- [x] Crear `/api/potreros`.
- [x] Crear `/api/dashboard` con los KPIs.

### Fase 3 — Backend módulos ✅ (ejecutada)
- [x] `/api/salud`: vacunaciones, tratamientos, visitas e historial.
- [x] `/api/reproduccion`: montas, gestaciones, partos con alta de crías.
- [x] `/api/produccion`: registro y totales de leche.
- [x] `/api/alimentacion`: raciones por potrero/animal.
- [x] `/api/finanzas`: movimientos, pagos y saldo.
- [x] `/api/empleados`: empleados y tareas.
- [x] `/api/inventario`: productos, movimientos y alertas de stock.

### Fase 4 — Frontend shell
- [x] Crear `dashboard.html` con KPIs y menú lateral de módulos.
- [x] Adaptar `gestion.html` al inventario completo de ganado.
- [x] Actualizar `auth.js` para los nuevos roles.
- [x] Login/registro redirigen a `dashboard.html` y registro permite elegir rol.

### Fase 5 — Frontend módulos
- [x] Páginas CRUD de salud, reproducción, producción, alimentación, finanzas, empleados e inventario, reutilizando tablas/modales/notificaciones actuales.
- [x] Control de UI por rol (ocultar botones de creación/edición/eliminación para roles sin permiso).

### Fase 6 — Reportes ✅ (ejecutada)
- [x] Reportes por módulo con filtros y exportación PDF/Excel (`frontend/reportes.html` + `frontend/js/reportes.js`).
- [x] 16 reportes config-driven con selector de módulo, rango de fechas y filtros dinámicos (razas, categorías, estados).
- [x] Filtrado por rol de cada reporte (fincanzas/invitado, inventario/veterinario, etc.) y resumen de totales.
- [x] Exportación PDF (jsPDF + autotable) y Excel (SheetJS) con encabezado y filtros aplicados.

### Fase 7 — Pulido y pruebas ✅ (ejecutada)
- [x] Validaciones frontend/backend por módulo (auditoría de todas las rutas y páginas).
- [x] Pruebas de flujos completos (parto→cría, venta→movimiento, entrada→stock).
- [x] Pruebas de permisos por rol (14 verificaciones UI + API).
- [x] Revisión visual responsive y consistencia de estilos (clase `.table-responsive`, shell compartido, badges).

---

## 10. Criterios de aceptación

- Todos los RF listados en la sección 4 funcionan según lo descrito.
- Los permisos por rol se respetan tanto en la UI como en la API.
- `init.sql` se ejecuta correctamente en una base nueva y en una existente (migración).
- Los reportes exportan PDF/Excel con los datos filtrados.
- El dashboard refleja datos reales de los módulos.
