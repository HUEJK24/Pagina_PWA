# Guion de defensa y demo en vivo

**Proyecto:** PWA de reportes técnicos de campo (UTM)

**Duración objetivo:** 8–10 minutos

**URL de la app:** <https://frontend-chi-coral-19.vercel.app/>

**API:** <https://pagina-pwa.onrender.com/api/health>

---

## Antes de entrar al aula

1. Abrir Render y esperar a que el servicio esté **Live**. El plan gratuito se duerme por inactividad.
2. Abrir la app en el teléfono Android y comprobar que carga.
3. Dejar abiertas estas pestañas:
   - App de Vercel.
   - `https://pagina-pwa.onrender.com/api/health`.
   - `https://pagina-pwa.onrender.com/api/reportes`.
   - Reporte de Lighthouse: `docs/evidencias/lighthouse-produccion.html`.
4. Tener el video `docs/evidencias/demo-modo-avion.mp4` como respaldo si falla la red del aula.
5. Confirmar que el teléfono tiene la app instalada y que el reporte de prueba no impide ver el flujo.
6. Si aparece el aviso de CSP, abrir la app en incógnito o desactivar extensiones antes de la demo; no se añade `unsafe-eval`.

---

## Guion de 8 minutos

### 1. Problema y decisión — 1 minuto

“El técnico trabaja en una ranchería sin señal. Si la app depende de la red, el reporte se pierde. La arquitectura elegida guarda primero en IndexedDB y sincroniza después con una cola idempotente. La PWA obtuvo 4.78 en la matriz porque gana en offline, coste y despliegue; pierde en acceso a hardware, que aquí solo necesitamos para GPS.”

Mostrar si hace falta:

- `docs/dia-01-arquitectura.md` o el PDF.
- Matriz: PWA 4.78, multiplataforma 3.78, nativa 2.80.

### 2. Producción — 1 minuto

Mostrar la app en Vercel y la API en Render:

- `GET /api/health` responde `{"ok":true,"db":"up"}`.
- `GET /api/reportes` devuelve los reportes persistidos en Neon.
- Manifest y Service Worker responden `200`.
- Lighthouse 11 público: 100 en PWA, accesibilidad, buenas prácticas, rendimiento y SEO.

Frase para la defensa:

“No es solo local: la app, la API y PostgreSQL están en la nube. El frontend llama a Render mediante `VITE_API_URL` y Render solo acepta el origen de Vercel por CORS.”

### 3. Instalación en Android — 1 minuto

En el teléfono:

1. Abrir la URL de Vercel en Chrome.
2. Mostrar el botón **Instalar** o el icono de instalación de Chrome.
3. Instalar y abrir desde el icono de la pantalla de inicio.
4. Mostrar que se abre en modo `standalone`, sin la barra de Safari/Chrome.

### 4. Reporte con red — 1 minuto

1. Llenar técnico, cliente, servicio y diagnóstico.
2. Guardar.
3. Mostrar que pasa a **Sincronizado**.
4. Abrir `GET /api/reportes` y señalar el registro.

### 5. Modo avión — 2 minutos

1. Activar modo avión o desactivar Wi-Fi/datos.
2. Crear un reporte.
3. Mostrar **Pendiente de sincronizar** y el contador.
4. Recargar la app sin red.
5. Mostrar que el shell abre y el reporte sigue en la lista.

### 6. Sincronización — 1 minuto

1. Desactivar modo avión.
2. Esperar el evento `online` o pulsar **Sincronizar**.
3. Mostrar **Sincronizado**.
4. Volver a `GET /api/reportes` y mostrar el registro nuevo.

Frase para la defensa:

“El reporte se guarda antes de tocar la red. El UUID nace en el cliente y el `POST` hace `ON CONFLICT (id) DO UPDATE`; por eso reintentar no duplica.”

### 7. Compatibilidad y cierre — 1 minuto

“Android quedó probado en hardware real. iOS no se pudo probar físicamente porque no tengo el dispositivo; la app implementa el flujo alternativo de iOS: guía Compartir → Agregar a inicio, sin `beforeinstallprompt` y sin Background Sync. La misma base de código y las APIs estándar hacen esperable el mismo comportamiento; lo que cambia es la instalación y el disparo de la sincronización. La compatibilidad está justificada en la tabla, pero no voy a afirmar una prueba que no hice.”

Mostrar la tabla de compatibilidad y las limitaciones de iOS.

---

## Preguntas probables

**¿Por qué no Flutter o React Native?**

Porque el requerimiento es capturar en campo, no acceder a hardware exótico. La PWA elimina tiendas, revisión y doble código; la matriz lo cuantifica (4.78 vs 3.78). Si mañana piden cámara avanzada o Bluetooth, la respuesta cambia.

**¿Qué pasa si el técnico borra los datos del navegador?**

Se pierden los pendientes. Por eso la app se instala, avisa del estado pendiente y sincroniza pronto. Es un riesgo aceptado y documentado.

**¿Cómo evitas duplicados si el técnico pulsa “sincronizar” cinco veces?**

El UUID se genera en el cliente y el `POST` hace `ON CONFLICT (id) DO UPDATE`; además hay una guardia que impide dos sincronizaciones concurrentes.

**¿Por qué `injectManifest` y no `generateSW`?**

Porque la rúbrica evalúa el ciclo de vida del SW. `injectManifest` deja un `sw.js` legible donde se ven `install`, `activate`, estrategias y fallback, y Vite inyecta los hashes de producción.

**¿Qué pasa en iOS sin Background Sync?**

Nada se pierde: el reporte está en IndexedDB. Se sincroniza al abrir la app, al recuperar `online` o al pulsar el botón manual.

**¿Por qué PostgreSQL y no LocalStorage?**

LocalStorage es síncrono, ronda los 5 MB y solo guarda texto. IndexedDB es asíncrono, tiene cuota mucho mayor e índices; Dexie lo hace manejable. LocalStorage se usa solo para recordar el nombre del técnico.

**Vi un aviso de “Banner not shown: beforeinstallpromptevent.preventDefault()”.**

Es informativo. La app intercepta el evento para mostrar su propio botón **Instalar** y llama a `prompt()` en el clic. No es un error de instalabilidad.

**Vi un aviso de CSP que bloquea `eval`.**

Vercel no envía una cabecera CSP para este sitio y el bundle no contiene `eval()` ni `new Function()`. Suele venir de una extensión del navegador. Se comprueba en incógnito y con `curl -I https://frontend-chi-coral-19.vercel.app/`. No se añade `unsafe-eval`.

---

## Evidencia que debe estar localizable

| Evidencia | Archivo o URL |
| --- | --- |
| App publicada | <https://frontend-chi-coral-19.vercel.app/> |
| API salud (URL) | <https://pagina-pwa.onrender.com/api/health> |
| API reportes (URL) | <https://pagina-pwa.onrender.com/api/reportes> |
| Lighthouse público | `docs/evidencias/lighthouse-produccion.html` |
| Captura Lighthouse | `docs/evidencias/lighthouse-produccion.png` |
| Reporte sincronizado | `docs/evidencias/produccion-reporte-sincronizado.png` |
| Captura API salud | `docs/evidencias/produccion-api-health.png` |
| Captura API reportes | `docs/evidencias/produccion-api-reportes.png` |
| Botón Instalar en producción | `docs/evidencias/produccion-instalar.png` |
| Video modo avión | `docs/evidencias/demo-modo-avion.mp4` |
| Ngrok | `docs/evidencias/ngrok-frontend.png`, `ngrok-frontend-mobile.png` |
| Arquitectura | `docs/dia-01-arquitectura.pdf` |
| Compatibilidad | `docs/dia-02-compatibilidad.pdf` |

La captura de `/api/reportes` es un resumen de la respuesta real: conserva el total y los UUID, y omite nombres, descripciones y coordenadas. La URL y el candado HTTPS se enseñan en vivo desde el navegador. No hay capturas de iOS porque no se probó en hardware.
