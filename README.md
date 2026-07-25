# Finca Ganadera El Progreso

Sitio web de la Finca Ganadera El Progreso con sistema de gestión de ganado, login con roles y reportes.

## Tecnologías

- HTML5, CSS3, JavaScript
- Node.js + Express.js
- PostgreSQL
- JWT (autenticación)
- bcryptjs (encriptación de contraseñas)

## Requisitos previos

- [Node.js](https://nodejs.org/) v16 o superior
- [PostgreSQL](https://www.postgresql.org/) v12 o superior
- [Git](https://git-scm.com/)

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/JensyMoralesYedom/El-Progreso-Page.git
cd El-Progreso-Page
```

### 2. Instalar dependencias

```bash
cd backend
npm install
```

### 3. Configurar la base de datos

Crear la base de datos en PostgreSQL:

```sql
CREATE DATABASE elprogreso;
```

Ejecutar el script de tablas y datos de prueba:

```bash
psql -U postgres -d elprogreso -f init.sql
```

### 4. Configurar variables de entorno

Editar el archivo `backend/.env` con las credenciales de su PostgreSQL:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=su_contraseña
DB_NAME=elprogreso
PORT=3000
JWT_SECRET=clave_secreta_el_progreso_2026
```

### 5. Iniciar el servidor

```bash
npm start
```

### 6. Abrir en el navegador

```
http://localhost:3000
```

## Credenciales de prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@elprogreso.com | admin123 |

Para acceder como **Invitado**, hacer clic en el botón "Entrar como Invitado" en la pantalla de login.

## Estructura del proyecto

```
landingELProgreso/
├── backend/                   Servidor y lógica del negocio
│   ├── server.js              Punto de entrada Express
│   ├── package.json           Dependencias del backend
│   ├── .env                   Variables de entorno
│   └── server/
│       ├── db.js              Conexión a PostgreSQL
│       ├── middleware/
│       │   └── auth.js        Middleware de autenticación JWT
│       └── routes/
│           ├── auth.js        Rutas de login, registro, invitado
│           └── ganado.js      Rutas CRUD de ganado
├── frontend/                  Archivos estáticos del cliente
│   ├── index.html             Landing page principal
│   ├── login.html             Formulario de login
│   ├── registro.html          Formulario de registro
│   ├── gestion.html           CRUD de ganado
│   ├── reportes.html          Tabla de reportes
│   ├── css/
│   │   ├── styles.css         Estilos originales
│   │   └── gestion.css        Estilos para gestión/login/reportes
│   ├── js/
│   │   ├── main.js            JavaScript original
│   │   ├── auth.js            Funciones de autenticación
│   │   ├── gestion.js         CRUD de ganado
│   │   └── reportes.js        Carga de reportes
│   └── img/                   Imágenes del sitio
├── init.sql                   Script de tablas + datos prueba
├── README.md                  Documentación del proyecto
└── .gitignore
```

## Funcionalidades

### Sitio público (sin login)
- Inicio, Nosotros, Servicios, Productos, Galería, Contacto

### Con login (Admin)
- CRUD completo de ganado (crear, leer, editar, eliminar)
- Visualización de reportes

### Como Invitado (solo lectura)
- Visualización de registros de ganado
- Visualización de reportes

## API Endpoints

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/registro | Registrar usuario |
| POST | /api/auth/login | Iniciar sesión |
| POST | /api/auth/invitado | Token temporal de invitado |
| GET | /api/auth/perfil | Verificar token |

### Ganado
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | /api/ganado | Listar registros | Sí |
| GET | /api/ganado/:id | Obtener registro | Sí |
| POST | /api/ganado | Crear registro | Admin |
| PUT | /api/ganado/:id | Actualizar registro | Admin |
| DELETE | /api/ganado/:id | Eliminar registro | Admin |
| GET | /api/ganado/razas/lista | Listar razas | Sí |
