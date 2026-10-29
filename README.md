# Reportes Técnicos de Campo — PWA

PWA para que técnicos de servicios registren reportes en zonas rurales **sin internet** y los sincronicen al recuperar la señal, desde Android o iOS, sin instalar nada desde una tienda.

Proyecto integrador UTM. El avance jornada por jornada está en [`docs/progreso.md`](docs/progreso.md).

## Documentación

- [Arquitectura y matriz de decisión](docs/dia-01-arquitectura.md) · [PDF](docs/dia-01-arquitectura.pdf)
- [Compatibilidad de navegadores y checklist de instalación](docs/dia-02-compatibilidad.md) · [PDF](docs/dia-02-compatibilidad.pdf)
- [Guía de Ngrok, despliegue y verificación](docs/despliegue.md)
- [Guion de defensa y demo en vivo](docs/defensa.md)
- [Avance por etapas](docs/progreso.md)

## Estado

| Pieza | Estado |
| --- | --- |
| Entorno Docker (web + API + PostgreSQL) | Funcionando |
| API REST idempotente | Funcionando y probada |
| UI móvil (captura + listado) | Rediseñada y verificada |
| Manifest + instalación | Implementado; verificado en Android por Ngrok y en producción. iOS sin dispositivo físico |
| Service Worker (precache, SWR, offline.html) | Funcionando en local y producción |
| Guardado offline + sincronización automática/manual | Funcionando; instalación y offline se demuestran en vivo desde producción |
| Lighthouse (PWA, rendimiento, a11y, buenas prácticas, SEO) | 100 / 100 / 100 / 100 / 100 |
| Avance por etapas | Documentado en [`docs/progreso.md`](docs/progreso.md) |
| Documento de arquitectura y tabla de compatibilidad | Completos, en Markdown y PDF |
| Video del modo avión | [`docs/evidencias/demo-modo-avion.mp4`](docs/evidencias/demo-modo-avion.mp4) |
| Despliegue en Neon + Render + Vercel | Funcionando con HTTPS y persistencia real |

## Producción

| Servicio | URL |
| --- | --- |
| App (Vercel) | <https://frontend-chi-coral-19.vercel.app/> |
| API (Render) | <https://pagina-pwa.onrender.com> |
| Salud de la API | <https://pagina-pwa.onrender.com/api/health> |
| Reportes | <https://pagina-pwa.onrender.com/api/reportes> |
| Lighthouse público | [`docs/evidencias/lighthouse-produccion.html`](docs/evidencias/lighthouse-produccion.html) |
| Capturas de API e instalación | [`docs/evidencias/`](docs/evidencias/) |

La base de datos vive en Neon. El frontend llama a Render mediante `VITE_API_URL` y Render solo acepta el origen de Vercel configurado en `CORS_ORIGIN`.

## Arranque rápido

```sh
docker compose up --build -d          # web, API y base de datos
docker compose exec backend npm run migrate
```

- App: <http://localhost:5173>
- API: <http://localhost:3000/api/health>
- PostgreSQL: `localhost:5433` (usuario `pwa`, contraseña `pwa`, base `reportes`)

La primera vez que abras la app, el Service Worker se instala y precarga el shell. A partir de ahí puedes activar el modo avión y seguir trabajando.

## Stack

| Capa | Herramienta | Versión | Por qué |
| --- | --- | --- | --- |
| Entorno | Docker + Compose | 29 / v5 | Un comando levanta todo y no ensucia la máquina |
| Frontend | Vite | 7 | Build rápido, hashes automáticos, proxy `/api` en desarrollo |
| UI | HTML5 + CSS3 + JS nativo | — | Sin framework: menos peso, más control y nada que defender de más |
| Tipografía | IBM Plex Sans (autoalojada) | 5 | Una sola familia, OFL y precacheada: se ve igual sin red |
| PWA | `vite-plugin-pwa` (`injectManifest`) | 2 | `sw.js` propio y legible, con precache inyectado por Vite |
| Caché | Workbox | 7 | `precacheAndRoute`, `StaleWhileRevalidate`, `ExpirationPlugin` |
| Offline | Dexie.js sobre IndexedDB | 4 | API cómoda para IndexedDB, índices y consultas |
| Backend | Node + Express | 20 / 5 | API mínima, sin capas innecesarias |
| Datos | PostgreSQL | 16 Alpine | Integridad, `ON CONFLICT` para idempotencia |
| Driver | `pg` | 8 | Pool de conexiones y consultas parametrizadas |
| Producción | Neon + Render + Vercel | — | Capa gratuita real, HTTPS automático |
| Túneles | Ngrok | 3 | HTTPS para probar en teléfonos reales |

## Cómo funciona

```text
┌──────────────────────────── teléfono ────────────────────────────┐
│  UI (HTML/CSS/JS)                                                │
│      │ guardar                                                   │
│      ▼                                                           │
│  IndexedDB (Dexie)  ── pending ──▶  syncPending()  ──POST──▶ API │
│      ▲                                   │                       │
│      └──────────── synced ◀──────────────┘                       │
│                                                                  │
│  Service Worker: shell precacheado + SWR para estáticos          │
└──────────────────────────────────────────────────────────────────┘
                                   │
                          PostgreSQL / Neon
```

### Flujo de un reporte

1. El técnico llena el formulario y pulsa **Guardar reporte**.
2. Se genera un UUID con `crypto.randomUUID()` **en el cliente**.
3. El reporte se escribe en IndexedDB con `syncStatus: 'pending'`. Esto nunca depende de la red.
4. Si hay conexión, se intenta enviar de inmediato. Si no, la UI avisa: «Reporte guardado. Se enviará al reconectar».
5. Al volver la red (evento `online`), al abrir la app o al pulsar **Sincronizar**, se envían los `pending`.
6. El servidor responde 201 (nuevo) o 200 (ya existía) y el registro local pasa a `synced`.

### Decisiones que sostienen la rúbrica

- **Offline-first, no offline tolerante.** La red es un acelerador; el guardado ocurre en el dispositivo.
- **UUID en el cliente + `ON CONFLICT (id) DO UPDATE`.** Reintentar cinco veces no duplica: la clave primaria es el mismo UUID.
- **`injectManifest`.** El `sw.js` es código propio con `install`, `activate` y `fetch` visibles; Vite solo inyecta los hashes.
- **Stale-While-Revalidate** para CSS, JS, imágenes y fuentes: responde desde caché y actualiza en segundo plano.
- **`NetworkOnly` para `/api/`.** Cachear reportes produciría datos fantasma.
- **`offline.html`** para rutas de navegación no cacheadas; `/` siempre cae al shell precacheado.
- **iOS sin `beforeinstallprompt` ni Background Sync.** Se resuelve con modal de instalación guiado, botón manual y el evento `online`.
- **Interfaz mobile-first.** Formulario de una columna, controles principales de 44 px o más, enlaces de al menos 24 px, `safe-area-inset` y estados de sincronización visibles en cada fila. Desde 900 px la navegación pasa a la cabecera.
- **Tipografía autoalojada.** IBM Plex Sans viaja en el precache con su licencia OFL; la app no pide fuentes a terceros ni pierde su identidad sin red.

## Estructura

```text
Pagina_PWA/
├── docker-compose.yml          # web :5173, api :3000, db :5433
├── .env.example                # variables para producción (sin secretos)
├── docs/
│   ├── dia-01-arquitectura.md   # arquitectura, matriz y riesgos
│   ├── dia-01-arquitectura.pdf
│   ├── dia-02-compatibilidad.md # tabla iOS/Chromium y checklist
│   ├── dia-02-compatibilidad.pdf
│   ├── despliegue.md            # Ngrok, Neon, Render y Vercel
│   ├── defensa.md               # guion de demo y preguntas probables
│   ├── pdf-style.css            # estilos compartidos de los PDF
│   ├── progreso.md              # avance por jornada y evidencias
│   └── evidencias/
│       ├── demo-modo-avion.mp4
│       └── demo-modo-avion-poster.jpg
├── frontend/
│   ├── Dockerfile              # build de producción + vite preview
│   ├── index.html              # shell, manifest, meta iOS
│   ├── vite.config.js          # injectManifest, proxy /api, hosts de Ngrok
│   ├── scripts/generate-icons.py
│   ├── public/
│   │   ├── manifest.webmanifest
│   │   ├── offline.html
│   │   ├── robots.txt
│   │   ├── fonts/              # IBM Plex Sans + licencia OFL
│   │   └── icons/              # 192, 512, maskable, apple-touch
│   └── src/
│       ├── main.js             # UI, formulario, GPS, instalación, sync
│       ├── db.js               # Dexie (ReportesDB)
│       ├── sync.js             # cola idempotente + guardia de concurrencia
│       ├── sw.js               # install / activate / fetch
│       └── styles.css
└── backend/
    ├── Dockerfile
    ├── sql/schema.sql
    └── src/
        ├── server.js           # Express, CORS, health, errores
        ├── db.js               # pool de pg + SSL para Neon
        ├── migrate.js          # aplica el esquema (idempotente)
        └── routes/reportes.js  # GET y POST idempotente
```

## API

Base local: `http://localhost:3000`. En la app se consume por `/api` (proxy de Vite), así un solo túnel de Ngrok cubre frontend y backend.

### `GET /api/health`

```sh
curl -s localhost:3000/api/health
# {"ok":true,"db":"up","hora":"..."}
```

### `GET /api/reportes`

Devuelve los últimos 500, más recientes primero.

```sh
curl -s localhost:3000/api/reportes
# {"total":2,"reportes":[{...},{...}]}
```

### `POST /api/reportes`

Cuerpo mínimo: `id` (UUID), `cliente`, `servicio`, `descripcion`.

```sh
curl -s -X POST localhost:3000/api/reportes \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "3f2b8c1e-9d4a-4f7b-8c2e-1a5d6e7f8a9b",
    "tecnico": "Luis",
    "cliente": "Rancho El Sol",
    "servicio": "Internet y redes",
    "descripcion": "Cambio de antena",
    "ubicacion": "Km 4",
    "lat": 20.12345,
    "lng": -98.76543
  }'
```

- `201` si el reporte es nuevo (`insertado: true`).
- `200` si ya existía: actualiza campos, conserva `fecha_creacion` y no crea otra fila (`insertado: false`).
- `400` si falta el UUID o algún campo obligatorio.

## Variables de entorno

| Variable | Dónde | Para qué |
| --- | --- | --- |
| `DATABASE_URL` | backend | Cadena de PostgreSQL. En Neon incluye `?sslmode=require` |
| `PORT` | backend | Puerto de escucha (3000 por defecto) |
| `CORS_ORIGIN` | backend | Dominios permitidos, separados por coma |
| `API_PROXY_TARGET` | frontend (contenedor) | A dónde manda `/api` Vite. Por defecto `http://backend:3000` |
| `VITE_API_URL` | frontend (build) | URL pública de la API. Vacío en local (mismo origen) |

Copia `.env.example` como `.env` solo si necesitas cambiar los valores locales. Nunca subas `.env`.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `docker compose up --build -d` | Levanta o reconstruye los tres servicios |
| `docker compose logs -f frontend` | Logs del servidor web |
| `docker compose exec backend npm run migrate` | Crea tablas e índices |
| `docker compose exec db psql -U pwa -d reportes -c '\d reportes'` | Inspecciona la tabla |
| `docker compose down` | Detiene los contenedores (conserva datos) |
| `docker compose down -v` | Detiene y borra la base local |
| `cd frontend && npm run dev` | Desarrollo con HMR en el host (sin Service Worker) |
| `cd frontend && npm run build` | Build de producción con precache |
| `python3 frontend/scripts/generate-icons.py` | Regenera los íconos |

> El contenedor del frontend sirve el **build de producción** con `vite preview`, para que el Service Worker se comporte igual que en la nube. Si quieres editar con recarga en caliente, para el contenedor y usa `npm run dev` en `frontend/`.

## Prueba de modo avión

1. Abre <http://localhost:5173> y espera a que el navegador registre el Service Worker (DevTools → Application → Service Workers).
2. DevTools → Network → **Offline**.
3. La franja de estado debe mostrar el punto rojo y «Trabajando sin conexión».
4. Captura un reporte. Aparece como **Pendiente de sincronizar** y el contador de la pestaña sube.
5. Recarga la página: la app sigue abriendo (shell desde caché) y el reporte sigue ahí.
6. Vuelve a **Online**. En segundos el reporte pasa a **Sincronizado**.
7. Compruébalo en la base:

```sh
curl -s localhost:3000/api/reportes | python3 -m json.tool
```

Para la evidencia en video, repite el flujo con dos reportes y muestra el `POST /api/reportes` en la pestaña Network al reconectar. El recorrido grabado está en [`docs/evidencias/demo-modo-avion.mp4`](docs/evidencias/demo-modo-avion.mp4).

## Auditoría

```sh
npx lighthouse@11 http://localhost:5173 --only-categories=pwa,accessibility,best-practices,performance,seo --view
```

Resultado actual en local y en producción: **PWA 100 · Accesibilidad 100 · Buenas prácticas 100 · Rendimiento 100 · SEO 100**.

El reporte de la URL pública está en [`docs/evidencias/lighthouse-produccion.html`](docs/evidencias/lighthouse-produccion.html), su JSON en [`docs/evidencias/lighthouse-produccion.json`](docs/evidencias/lighthouse-produccion.json) y la captura en [`docs/evidencias/lighthouse-produccion.png`](docs/evidencias/lighthouse-produccion.png).

> Lighthouse 12 eliminó la categoría PWA. Para el requisito de la rúbrica hay que usar `lighthouse@11`. En la defensa conviene explicarlo: no es una limitación del proyecto, es un cambio de la herramienta.

## Pruebas en móvil real (Ngrok)

```sh
ngrok http 5173
```

Abre la URL `https://…ngrok-free.app` en el teléfono. No hace falta un segundo túnel: la API viaja por `/api` gracias al proxy.

- **Android/Chrome**: aparece el botón «Instalar app».
- **iOS/Safari**: aparece «Cómo instalar», que explica Compartir → Agregar a inicio.

El plan gratuito de Ngrok muestra una página **Visit Site** la primera vez. Púlsala y recarga una vez; si no, el manifest llega como HTML y Chrome no ofrece instalar.

Si Vite responde `Blocked request`, revisa `server.allowedHosts` en `vite.config.js`.

## Despliegue

La guía completa, con verificación y problemas frecuentes, está en [`docs/despliegue.md`](docs/despliegue.md).

### 1. Base de datos — Neon

1. Crea un proyecto en <https://neon.tech> y copia la **Pooled connection** con `?sslmode=require`.
2. Ejecuta `backend/sql/schema.sql` desde el editor SQL de Neon.

### 2. Backend — Render

| Ajuste | Valor |
| --- | --- |
| Tipo | Web Service · Docker |
| Root Directory | `backend` |
| Dockerfile Path | `Dockerfile` |
| Docker Build Context | `.` (relativo a `backend`) |
| Health check | `/api/health` |
| `DATABASE_URL` | cadena Pooled de Neon |
| `CORS_ORIGIN` | `https://frontend-chi-coral-19.vercel.app` |

### 3. Frontend — Vercel

| Ajuste | Valor |
| --- | --- |
| Root Directory | `frontend` |
| Framework | Vite |
| Build | `npm run build` |
| Output | `dist` |
| `VITE_API_URL` | `https://pagina-pwa.onrender.com` |

`vercel.json` desactiva la caché de `/sw.js` y sirve el manifest con el tipo correcto. Sin eso, el navegador puede quedarse con una versión vieja del Service Worker.

## Limitaciones conocidas

- **iOS/Safari**: no hay `beforeinstallprompt` ni Background Sync. La sincronización depende de abrir la app, recuperar red o pulsar el botón. Safari puede purgar el almacenamiento de sitios sin interacción; instalar la PWA lo mitiga.
- **Caché del Service Worker**: si cambias código y ves la versión anterior, DevTools → Application → Service Workers → Unregister, o recarga forzada.
- **Puerto 5432 ocupado**: el contenedor publica PostgreSQL en `5433` para no chocar con otras instalaciones.
- **`vite preview` no recarga en caliente**: es intencional, para que el entorno Docker se parezca a producción.

### Avisos que no son errores

- **`Banner not shown: beforeinstallpromptevent.preventDefault()`**: Chromium avisa que no mostrará su banner nativo porque la app lo intercepta para mostrar el botón **Instalar**. El `prompt()` se llama en el clic del usuario; la instalación funciona.
- **`Content Security Policy blocks eval`**: Vercel no envía una cabecera CSP para este sitio y el bundle no usa `eval()` ni `new Function()`. El aviso suele venir de una extensión del navegador. Se comprueba en incógnito y con `curl -I https://frontend-chi-coral-19.vercel.app/`.

El detalle y las respuestas para la defensa están en [`docs/defensa.md`](docs/defensa.md).

## Para repasar

| Concepto | En una línea |
| --- | --- |
| PWA | Web app instalable que usa manifest, Service Worker y HTTPS para comportarse como app. |
| Web App Manifest | JSON que define nombre, íconos, colores y modo `standalone`. |
| Service Worker | Proxy programable entre la app y la red; intercepta `fetch` y sirve desde caché. |
| Ciclo de vida | `install` precarga, `activate` limpia cachés viejas, `fetch` decide la estrategia. |
| Precaching | Guardar los assets del build antes de necesitarlos (con hashes de Vite). |
| Stale-While-Revalidate | Responde de caché al instante y actualiza en segundo plano. |
| IndexedDB | Base de datos del navegador, asíncrona, con cuota mucho mayor que LocalStorage. |
| Dexie | Capa fina sobre IndexedDB con índices y consultas legibles. |
| Idempotencia | Repetir la misma petición produce el mismo estado, no duplicados. |
| UUID | Identificador único generado en el cliente; permite reintentos seguros. |
| ITP | Política de Safari que limita el almacenamiento de sitios sin interacción. |
| `beforeinstallprompt` | Evento de Chromium para mostrar el prompt de instalación; no existe en iOS. |
| Background Sync | API de Chromium para reintentar en segundo plano; no existe en iOS. |
| Lighthouse | Auditoría de rendimiento, accesibilidad, SEO y (hasta v11) PWA. |

## Pendientes del proyecto

- [x] Documento de arquitectura con la matriz de decisión ponderada.
- [x] Tabla de compatibilidad y checklist de instalación en PDF.
- [x] Video del modo avión con dos reportes.
- [x] Prueba funcional en Android real por Ngrok.
- [x] Despliegue en Neon + Render + Vercel y auditoría sobre la URL pública.
- [x] README con las URLs finales.
- [ ] Captura de respaldo de la instalación en Android desde la URL de producción; la comprobación principal será en vivo.
- [x] Limitación de iOS documentada: no hay iPhone disponible y no se inventan capturas ni resultados.
- [ ] Persistencia tras un reinicio manual de Render.
- [ ] Ensayo de la defensa con la demo de producción.

El detalle de cada pendiente, con su día del plan y su evidencia, está en [`docs/progreso.md`](docs/progreso.md).

## Licencia

Por definir.
