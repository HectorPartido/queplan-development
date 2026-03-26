# QuePlan - Mapa Interactivo de Cancún

> Aplicación web que impulsa el desarrollo turístico, cultural, ambiental y económico de Cancún, alineada con los Objetivos de Desarrollo Sostenible (ODS) 8, 14 y 15.

## Descripción

**QuePlan** es una aplicación web con mapa interactivo que permite a turistas y residentes de Cancún:

- Visualizar ubicaciones y actividades en un mapa interactivo
- Filtrar por presupuesto, cantidad de personas y mood/ambiente
- Participar en eventos de conservación ambiental ("Llamado a la ayuda")
- Calificar y guardar lugares favoritos
- Reportar contenido inapropiado o peligroso
- Recuperar contraseña por correo electrónico

### Alineación con ODS

| ODS | Nombre | Contribución |
|-----|--------|--------------|
| 8 | Trabajo decente y crecimiento económico | Visibiliza negocios locales |
| 14 | Vida submarina | Eventos de protección marina |
| 15 | Vida de ecosistemas terrestres | Eventos de conservación |

---

## Tecnologías

### Backend
- **Node.js** - Entorno de ejecución
- **Express** - Framework web
- **MySQL** - Base de datos relacional
- **mysql2** - Driver de MySQL
- **JWT** - Autenticación con tokens
- **bcrypt** - Encriptación de contraseñas
- **multer** - Subida de imágenes
- **nodemailer** - Envío de correos (SMTP Gmail)
- **Swagger** - Documentación de API

### Frontend
- **HTML5** - Estructura
- **Tailwind CSS** (CDN) - Estilos
- **JavaScript** (Vanilla) - Interactividad
- **Leaflet.js** - Mapa interactivo
- **SweetAlert2** - Alertas y modales

---

## Estructura del Proyecto

```
queplan/
├── database/
│   ├── schema.sql              # Estructura de la BD (tablas, índices)
│   └── seeds.sql               # Datos de prueba
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js     # Conexión MySQL
│   │   │   └── email.js        # Configuración SMTP
│   │   ├── controllers/        # Lógica de negocio
│   │   ├── middlewares/        # Autenticación y roles
│   │   ├── routes/             # Endpoints API
│   │   └── app.js              # Configuración Express
│   ├── uploads/                # Imágenes subidas (gitignored)
│   ├── server.js               # Punto de entrada
│   ├── package.json
│   └── .env.example            # Plantilla de variables de entorno
│
├── frontend/
│   ├── assets/
│   │   ├── css/                # Estilos
│   │   ├── js/
│   │   │   ├── api.js          # Cliente API centralizado
│   │   │   ├── utils.js        # Utilidades compartidas
│   │   │   ├── components/     # Componentes reutilizables (navbar, reportar-modal)
│   │   │   └── pages/          # Lógica por página
│   │   └── img/                # Imágenes estáticas
│   ├── pages/                  # Páginas HTML
│   └── index.html              # Página principal (mapa)
│
├── .gitignore
└── README.md
```

---

## Instalación

### Prerrequisitos

1. **Node.js** (v18 o superior) - [Descargar](https://nodejs.org/)
2. **MySQL** (v8 o superior)
   - Mac: `brew install mysql` y luego `brew services start mysql`
   - Windows: [Descargar MySQL](https://dev.mysql.com/downloads/)
3. **Git** - [Descargar](https://git-scm.com/)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/queplan.git
cd queplan

# 2. Crear la base de datos y cargar datos de prueba
mysql -u root -p < database/schema.sql
mysql -u root -p queplan < database/seeds.sql

# 3. Instalar dependencias del backend
cd backend
npm install

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales (ver sección Configuración)

# 5. Iniciar el servidor
npm start
```

La aplicación estará disponible en **http://localhost:3000**

---

## Configuración

Edita el archivo `backend/.env` con tus datos:

```env
# Servidor
PORT=3000
NODE_ENV=development

# Base de datos - usa TUS credenciales de MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=queplan
DB_USER=root
DB_PASSWORD=tu_contraseña_mysql

# JWT - cambia el secret por algo único
JWT_SECRET=una_clave_secreta_larga_y_unica
JWT_EXPIRES_IN=30d

# Frontend URL
FRONTEND_URL=http://127.0.0.1:5500

# Gmail SMTP (opcional, para recuperación de contraseña)
# Ver: https://myaccount.google.com/apppasswords
SMTP_USER=tu_correo@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
```

### Credenciales de prueba

| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@queplan.com | admin123 | Administrador |
| carlos@email.com | password123 | Vendedor |
| maria@email.com | password123 | Vendedor |
| juan@email.com | password123 | Usuario |

---

## API Endpoints

### Autenticación (`/api/auth`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/registro` | Registrar usuario |
| POST | `/login` | Iniciar sesión |
| GET | `/perfil` | Obtener perfil |
| PUT | `/perfil` | Actualizar perfil |
| POST | `/recuperar` | Solicitar código de recuperación |
| POST | `/resetear` | Cambiar contraseña con código |

### Ubicaciones (`/api/ubicaciones`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listar (con filtros) |
| GET | `/:id` | Obtener detalle |
| POST | `/` | Crear (vendedor/admin) |
| PUT | `/:id` | Actualizar |
| DELETE | `/:id` | Eliminar |
| PATCH | `/:id/estado` | Aprobar/rechazar (admin) |
| POST | `/:id/calificar` | Calificar |
| POST | `/:id/favorito` | Agregar favorito |
| DELETE | `/:id/favorito` | Quitar favorito |

### Eventos (`/api/eventos`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listar eventos |
| GET | `/ods` | Solo eventos ODS |
| GET | `/:id` | Obtener detalle |
| POST | `/` | Crear evento |
| PUT | `/:id` | Actualizar |
| DELETE | `/:id` | Eliminar |

### Notificaciones (`/api/notificaciones`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Mis notificaciones |
| GET | `/count` | Conteo no leídas |
| PATCH | `/:id/leer` | Marcar leída |
| PATCH | `/leer-todas` | Marcar todas leídas |
| DELETE | `/:id` | Eliminar |

### Reportes (`/api/reportes`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listar reportes (admin) |
| GET | `/count` | Conteo pendientes (admin) |
| POST | `/` | Crear reporte |
| PATCH | `/:id/estado` | Cambiar estado (admin) |
| DELETE | `/:id/eliminar-elemento` | Eliminar elemento reportado (admin) |

### Moods (`/api/moods`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listar todos los moods |
| GET | `/:id` | Obtener un mood |
| GET | `/:id/ubicaciones` | Ubicaciones por mood |

---

## Base de Datos

### Tablas

| Tabla | Descripción |
|-------|-------------|
| `usuario` | Usuarios (admin, vendedor, usuario) |
| `mood` | Categorías/ambientes (Playa, Cultura, etc.) |
| `ubicacion` | Lugares en el mapa |
| `ubicacion_mood` | Relación ubicación-mood |
| `actividad` | Actividades dentro de ubicaciones |
| `evento` | Eventos ODS y generales |
| `evento_asistencia` | Asistencia confirmada a eventos |
| `notificacion` | Notificaciones para usuarios |
| `calificacion` | Calificaciones con estrellas (1-5) |
| `favorito` | Ubicaciones guardadas como favoritas |
| `reporte` | Reportes de contenido |

---

## Equipo

**QuePlan** - Proyecto Integrador

---

## Licencia

MIT License
