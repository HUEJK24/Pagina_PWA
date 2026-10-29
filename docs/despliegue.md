# Guía de despliegue y prueba móvil

Esta guía cubre la prueba HTTPS en teléfonos reales (día 5) y la puesta en producción con Neon, Render y Vercel (día 10). Ngrok y la producción ya se ejecutaron. La app está en <https://frontend-chi-coral-19.vercel.app/> y la API en <https://pagina-pwa.onrender.com>. La prueba física en iPhone se descartó por falta de dispositivo; la compatibilidad quedó implementada y la limitación documentada, sin capturas simuladas.

Los valores entre `<...>` son marcadores. No escribas tokens ni cadenas de conexión en el repositorio.

---

## Parte A — Ngrok y prueba en dispositivos (día 5)

### Requisitos

- Cuenta gratuita en <https://ngrok.com>.
- Ngrok instalado. En este equipo ya está en `/usr/local/bin/ngrok`.
- Frontend y API levantados con Docker.

### 1. Autenticar Ngrok

Copia el token desde el panel de Ngrok y ejecuta:

```sh
ngrok config add-authtoken <TU_TOKEN>
```

El comando guarda el token en la configuración local de Ngrok, fuera del repositorio. No lo agregues a `.env` ni a la documentación.

### 2. Levantar el entorno

```sh
docker compose up --build -d
docker compose exec backend npm run migrate
curl -s http://localhost:3000/api/health
```

La API debe responder `{"ok":true,"db":"up",...}` antes de abrir el túnel.

### 3. Abrir el túnel

```sh
ngrok http 5173
```

Ngrok muestra una URL parecida a `https://abc123.ngrok-free.app`. Esa URL sirve la app y la API, porque Vite reenvía `/api` al backend. No hace falta un segundo túnel.

Vite ya permite los dominios `ngrok-free.app`, `ngrok-free.dev`, `ngrok.app` y `ngrok.io` en `server.allowedHosts` y `preview.allowedHosts`. Si Ngrok entrega otro dominio, agrégalo en `frontend/vite.config.js` y reconstruye el contenedor.

### 4. Verificar en el teléfono

Abre la URL en el teléfono, siempre con HTTPS y el candado visible.

**Android / Chrome**

1. Espera el botón **Instalar** o el aviso del navegador.
2. Instala y abre la app desde el icono.
3. Activa el modo avión.
4. Captura un reporte: debe quedar **Pendiente de sincronizar**.
5. Cierra y abre la app sin red: el reporte debe seguir ahí.
6. Desactiva el modo avión y pulsa **Sincronizar**.
7. Comprueba **Sincronizado** y la fila en la API.

**iOS / Safari**

1. Abre la URL en Safari.
2. Toca **Compartir** y elige **Agregar a inicio**.
3. Abre la app desde el icono.
4. Repite el flujo offline y la sincronización manual.

### 5. Evidencias que debes capturar

| Evidencia | Qué debe verse |
| --- | --- |
| HTTPS | Barra de Safari o Chrome con candado y la URL `https://…ngrok-free.app`. |
| Instalación Android | Botón **Instalar** o app abierta desde la pantalla de inicio. |
| Instalación iOS | No aplica: sin dispositivo. No se fabrican capturas; se documenta la limitación. |
| Estado offline | Franja **Trabajando sin conexión** y reporte pendiente. |
| API | `GET /api/reportes` con el reporte capturado, abierto desde el teléfono o desde la computadora. |
| Recarga sin red | La app abre y el reporte sigue en la lista. |

Las capturas generadas están en `docs/evidencias/` (`ngrok-frontend*.png`, `produccion-api-*.png`, `produccion-instalar.png`). No inventes capturas ni edites la barra de URL; la prueba de Android se completa en vivo.

### 6. Problemas frecuentes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `Blocked request` en Vite | Dominio de Ngrok no permitido | Agrega el dominio a `allowedHosts` y reconstruye. |
| Ngrok muestra **Visit Site** y el manifest falla | Intersticial del plan gratuito; el manifest no envía la cookie de aceptación | Pulsa **Visit Site**, recarga la página una vez y verifica DevTools → Application → Manifest. |
| La app carga, pero la API falla | El backend no está levantado | `docker compose ps` y `curl localhost:3000/api/health`. |
| El navegador no ofrece instalar | Faltó una recarga o el manifest no cargó | Revisa DevTools → Application → Manifest. |
| Safari no muestra prompt | Comportamiento normal de iOS | Usa Compartir → Agregar a inicio. |
| El reporte no sincroniza en iOS | No hay Background Sync | Pulsa **Sincronizar** o cierra y abre la app con red. |

---

## Parte B — Producción (día 10)

### Arquitectura de producción

```text
Vercel (estáticos, HTTPS) ──VITE_API_URL──▶ Render (Express, HTTPS) ──▶ Neon (PostgreSQL)
```

### 1. Neon

1. Crea un proyecto en <https://neon.tech>.
2. Copia la cadena de conexión. Para Render usa la **Pooled connection** (host con `-pooler`); para `psql` puedes usar la **Direct connection**. En ambos casos debe incluir `?sslmode=require`.
3. Aplica el esquema:

```sh
psql "<CADENA_DE_NEON>" -f backend/sql/schema.sql
```

Si no tienes `psql` instalado, pega el contenido de `backend/sql/schema.sql` en el editor SQL de Neon.

4. Verifica:

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
SELECT count(*) FROM reportes;
```

No subas la cadena al repositorio. Render la guardará como variable de entorno.

### 2. Render

1. Crea un **Web Service** conectado al repositorio de GitHub.
2. Selecciona **Docker** como entorno.
3. En **Advanced**, configura **Root Directory** como `backend`.
4. Deja **Dockerfile Path** como `Dockerfile` y **Docker Build Context** como `.` (relativo a `backend`). Si no usas Root Directory, entonces usa Dockerfile Path `backend/Dockerfile` y contexto `backend`.
5. Health check: `/api/health`.
6. Variables de entorno:

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | Cadena de Neon con `?sslmode=require` |
| `CORS_ORIGIN` | `https://<TU_APP>.vercel.app` (se actualiza después de crear Vercel) |

7. Despliega y verifica:

```sh
curl -s https://<TU_API>.onrender.com/api/health
```

Debe responder `{"ok":true,"db":"up",...}`. Si el servicio gratuito estaba dormido, la primera petición puede tardar.

### 3. Vercel

1. Importa el repositorio en <https://vercel.com>.
2. Root Directory: `frontend`.
3. Framework Preset: Vite.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Variable de entorno:

| Variable | Valor |
| --- | --- |
| `VITE_API_URL` | `https://<TU_API>.onrender.com` |

7. Despliega. `frontend/vercel.json` ya define las cabeceras de `sw.js`, del manifest y de los iconos, además del rewrite de navegación.

La variable `VITE_API_URL` se incrusta en el build. Si cambias la URL de Render, vuelve a desplegar Vercel.

### 4. Cerrar CORS

Cuando Vercel te dé el dominio final, actualiza `CORS_ORIGIN` en Render:

```text
CORS_ORIGIN=https://<TU_APP>.vercel.app
```

Si usas dominios de preview de Vercel, agrégalos separados por coma. Después del cambio, Render reinicia el servicio.

### 5. Verificación de producción

| Prueba | Comando o acción | Resultado esperado |
| --- | --- | --- |
| Salud de la API | `curl https://<TU_API>.onrender.com/api/health` | `ok: true`, `db: up` |
| Persistencia | `POST /api/reportes` y luego `GET` | El reporte aparece y sobrevive a un reinicio de Render |
| Idempotencia | Repetir el mismo UUID | `200`, sin una fila nueva |
| PWA | DevTools → Application → Manifest y Service Workers | Sin errores; SW activo |
| Instalación | Abrir la URL de Vercel en Android | Instala y abre en modo standalone; iOS solo queda documentado |
| Offline | Modo avión, capturar, recargar, reconectar | Guarda, conserva y sincroniza |
| Lighthouse | `npx lighthouse@11 https://<TU_APP>.vercel.app --only-categories=pwa,accessibility,best-practices,performance,seo` | PWA 100 y el resto sin regresiones |
| HTTPS | Barra del navegador | Candado y URL `https://` |

Lighthouse 12 ya no incluye la categoría PWA. Usa la versión 11 para la evidencia de la rúbrica.

### 6. Problemas frecuentes en producción

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `CORS` bloquea el `POST` | `CORS_ORIGIN` no coincide con Vercel | Actualiza la variable y redeploya Render. |
| `502` o `503` | Render dormido o base caída | Espera el arranque; revisa `/api/health` y los logs. |
| El frontend llama a `localhost` | `VITE_API_URL` no se definió en el build | Configura la variable y redeploya Vercel. |
| `sw.js` viejo | Caché del navegador o del CDN | Revisa la cabecera `no-cache` y recarga forzada. |
| Error de certificado en Neon | Cadena sin `sslmode=require` | Usa la cadena completa de Neon. |
| El Dockerfile no encuentra `package.json` | Contexto de build en la raíz | Cambia el contexto a `backend`. |
| Chromium avisa que no muestra el banner de instalación | La app intercepta `beforeinstallprompt` para usar su botón | Es informativo; el botón **Instalar** llama a `prompt()`. |
| Aviso de CSP bloqueando `eval` | Extensión o herramienta del navegador; Vercel no envía CSP | Probar en incógnito y revisar que `dist` no contenga `eval(`. |

### 7. Checklist de cierre

- [x] Neon tiene la tabla `reportes` y los índices.
- [x] Render responde `/api/health` con `db: up`.
- [x] Vercel sirve la app con HTTPS y `VITE_API_URL` apunta a Render.
- [x] `CORS_ORIGIN` incluye el dominio de Vercel.
- [ ] Verificar que un reporte capturado en producción sobreviva a un reinicio manual de Render.
- [x] El mismo UUID no duplica filas.
- [x] Lighthouse 11 da 100 en PWA sobre la URL pública.
- [x] La app se instala en Android; hay reportes de producción capturados desde el teléfono y persistidos en Neon. iOS queda documentado como limitación por falta de dispositivo.
- [ ] Repetir el modo avión desde la URL de producción en Android; la comprobación principal será en vivo.
- [x] El README tiene las URLs finales y las capturas están en `docs/evidencias/`.
- [x] Capturas de `/api/health`, `/api/reportes` y del botón **Instalar** en producción.

---

## Lo que no se puede automatizar

La creación de cuentas, la aceptación de términos, la verificación de correo y la captura desde un teléfono físico requieren a la persona propietaria del proyecto. El código y la configuración están listos; estas acciones dejan la evidencia final.
