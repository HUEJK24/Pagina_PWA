# Reportes Técnicos de Campo — PWA

PWA offline-first para que técnicos de servicios registren reportes en zonas rurales **sin internet** y los sincronicen al recuperar la señal, desde Android o iOS, sin instalar nada desde una tienda.

## Qué resuelve

Un técnico llega a una ranchería sin cobertura, llena el reporte y lo guarda. La app no puede perder el reporte ni duplicarlo cuando vuelva la señal. Por eso el guardado ocurre primero en el dispositivo y la red se usa solo para transportar.

- Captura local con IndexedDB y estado `pending` / `synced`.
- Sincronización automática al recuperar conexión, al abrir la app o con un botón manual.
- API idempotente: reenviar el mismo UUID no crea otra fila.
- Instalación desde una URL, con manifest, Service Worker y `offline.html`.
- Interfaz móvil con objetivos táctiles de 44 px, contraste AA y `safe-area`.

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | Vite 7, HTML5, CSS3 y JavaScript nativo |
| PWA | `vite-plugin-pwa` con `injectManifest`, Workbox 7 y `sw.js` propio |
| Offline | Dexie.js 4 sobre IndexedDB |
| Backend | Node.js 20, Express 5 y `pg` |
| Base de datos | PostgreSQL 16 Alpine en local; Neon en producción |
| Local | Docker Compose con `frontend`, `backend` y `db` |
| Producción | Vercel, Render y Neon |

## Arranque rápido

Requisitos: Docker Desktop y Git.

```sh
git clone <URL_DEL_REPOSITORIO>
cd Pagina_PWA

docker compose up --build -d
docker compose exec backend npm run migrate
```

Servicios locales:

| Servicio | URL |
| --- | --- |
| App | http://localhost:5173 |
| API | http://localhost:3000/api/health |
| PostgreSQL | `localhost:5433` |

El contenedor del frontend sirve el build de producción con `vite preview`, para que el Service Worker se comporte como en la nube. Para desarrollo con recarga en caliente:

```sh
docker compose stop frontend
cd frontend
npm run dev
```

Para probar en un teléfono real hace falta HTTPS:

```sh
ngrok http 5173
```

## Producción

| Pieza | URL |
| --- | --- |
| App | https://frontend-chi-coral-19.vercel.app/ |
| API | https://pagina-pwa.onrender.com |
| Salud | https://pagina-pwa.onrender.com/api/health |

El frontend se publica en Vercel, la API en Render y la base de datos en Neon. Render usa el `Dockerfile` de `backend` y `/api/health` como health check. Vercel sirve el build de Vite con reglas para `/sw.js`, el manifest y los íconos.

## Estructura

```text
Pagina_PWA/
├── docker-compose.yml
├── frontend/
│   ├── public/          # manifest, offline.html, íconos y fuentes
│   ├── src/             # main.js, db.js, sync.js, sw.js y styles.css
│   └── vite.config.js   # injectManifest, proxy /api y hosts de Ngrok
├── backend/
│   ├── sql/schema.sql
│   └── src/             # server.js, db.js, migrate.js y rutas
└── docs/
    └── evidencias/      # capturas, video y reporte de Lighthouse
```

## Variables de entorno

| Variable | Dónde | Uso |
| --- | --- | --- |
| `DATABASE_URL` | backend | Cadena de PostgreSQL; en Neon incluye `?sslmode=require`. |
| `PORT` | backend | Puerto de la API; por defecto `3000`. |
| `CORS_ORIGIN` | backend | Orígenes permitidos, separados por coma. |
| `API_PROXY_TARGET` | frontend (contenedor) | Destino del proxy `/api`. |
| `VITE_API_URL` | frontend (build) | URL pública de la API; vacío en local. |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | db local | Credenciales del contenedor de desarrollo. |

No se versionan secretos. `.env` y `.env.*` están ignorados.

## Verificación

Antes de dar un cambio por terminado:

- `docker compose up --build -d` levanta los tres servicios y `/api/health` responde `ok`.
- El flujo funciona con la red desconectada en DevTools y se sincroniza al reconectar.
- Recargar sin red devuelve el shell; una ruta no cacheada muestra `offline.html`.
- Reenviar el mismo UUID responde 200 y no crea una fila nueva.
- La app se instala en Chrome Android y sigue la guía de instalación en Safari iOS.
- Lighthouse 11, categoría PWA, sobre la URL pública: 100.

## Evidencias

Las capturas, el video del modo avión y el reporte de Lighthouse están en [`docs/evidencias/`](docs/evidencias/).

## Licencia

Proyecto integrador UTM. Uso académico.
