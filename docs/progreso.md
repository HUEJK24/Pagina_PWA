# Avance del proyecto por etapas

Registro de lo construido y lo que falta, jornada por jornada. El plan completo son dos semanas y diez días; cada día deja una evidencia que se puede enseñar.

**Última actualización:** 28 de octubre de 2026.

## Resumen

| Día | Tema | Implementación | Evidencia |
| --- | --- | --- | --- |
| 1 | Documento de arquitectura | Completa | [Documento y PDF](dia-01-arquitectura.md) |
| 2 | Compatibilidad e instalación | Completa | [Tabla, checklist y PDF](dia-02-compatibilidad.md) |
| 3 | Entorno Docker y repositorio | Completa | Repo y `docker compose` funcionando |
| 4 | API REST y base de datos | Completa | Pruebas con `curl` |
| 5 | Ngrok y móvil real | Completa en Android; iOS sin dispositivo | HTTPS y app por Ngrok verificados |
| 6 | UI móvil y formulario | Completa y rediseñada | Verificación en navegador |
| 7 | Manifest e instalación | Implementada; Android verificado | Lighthouse PWA 100; iOS documentado como limitación |
| 8 | Service Worker y offline | Completa | [Video del modo avión](evidencias/demo-modo-avion.mp4) |
| 9 | Sincronización y modo avión | Completa | [Video del modo avión](evidencias/demo-modo-avion.mp4) |
| 10 | Auditoría y despliegue | Completa | [Lighthouse público](evidencias/lighthouse-produccion.html); Neon + Render + Vercel |

**Avance estimado:** 95 %. Las diez jornadas están cerradas; los días 5 y 7 se validaron en Android real y la limitación de iOS quedó documentada, no simulada. El 5 % restante corresponde a la prueba física en un segundo motor (iOS), que no se puede hacer sin dispositivo.

El núcleo técnico —offline, sincronización, idempotencia, instalabilidad y despliegue— funciona y está verificado en Android y producción. Lo que resta es el ensayo de la defensa y la evidencia en vivo de Android.

## Entregables de la última sesión

### Día 1: arquitectura

- Documento con contexto, siete requerimientos y criterios de aceptación.
- Cinco alternativas evaluadas: web tradicional, SOA/API, nativa, multiplataforma y PWA.
- Matriz ponderada con totales recalculados y verificación aritmética: PWA 4.78, multiplataforma 3.78, nativa 2.80.
- Argumento SOA frente a PWA: el cliente delgado colapsa sin red y la PWA conserva la API en el servidor.
- Diagrama de componentes, contrato de la API, modelo de datos, riesgos, límites y trazabilidad.
- Entregable en Markdown y PDF actualizado.

### Día 2: compatibilidad

- Tabla comparativa entre Chromium y WebKit para instalación, persistencia, Background Sync, push, Service Worker, GPS y cuota.
- Explicación de las tres limitaciones críticas de iOS: purga por ITP, ausencia de `beforeinstallprompt` y ausencia de Background Sync.
- Checklist de instalación con estado de cada criterio y matriz de pruebas por navegador.
- Guion de verificación en Android e iOS y preguntas de defensa.
- Entregable en Markdown y PDF actualizado.

### Video del modo avión

- Recorrido de 32 segundos con dos reportes capturados sin red.
- Recarga con la red desconectada: el Service Worker sirve la app y los datos siguen en IndexedDB.
- Reconexión: el evento `online` sincroniza los dos reportes sin intervención.
- Verificación final contra `GET /api/reportes`: total 2, dos UUID distintos, ningún duplicado.
- Archivo: [`docs/evidencias/demo-modo-avion.mp4`](evidencias/demo-modo-avion.mp4). Póster: [`demo-modo-avion-poster.jpg`](evidencias/demo-modo-avion-poster.jpg).

### Producción: Neon + Render + Vercel

- Neon con el esquema aplicado y la tabla `reportes`.
- API en Render: `https://pagina-pwa.onrender.com/api/health` responde `{"ok":true,"db":"up"}`.
- Frontend en Vercel: `https://frontend-chi-coral-19.vercel.app/`.
- CORS cerrado al dominio exacto de Vercel, sin barra final.
- Tres reportes persistidos en Neon; dos capturados desde Android en producción y visibles en `/api/reportes`.
- Reenvío del mismo UUID dos veces: respuestas 200 y total sin cambios en la prueba controlada (1); después se añadieron reportes reales.
- Recarga de la app publicada sin red: el shell y el reporte siguen disponibles.
- Manifest y Service Worker activos en producción.
- Lighthouse 11 sobre la URL pública: PWA 100, accesibilidad 100, buenas prácticas 100, rendimiento 100 y SEO 100.

Los detalles y las capturas están en [`despliegue.md`](despliegue.md) y en `docs/evidencias/`. El guion de la demo, los tiempos y las respuestas a los avisos de Chromium están en [`defensa.md`](defensa.md).

### Corrección del guardado

El guardado escribía la preferencia del técnico en `localStorage` dentro del mismo `try` que la persistencia en IndexedDB. Si el navegador lanzaba una excepción por cuota o modo privado, el flujo se abortaba después de guardar el reporte y antes de sincronizarlo. Ahora `guardarTecnico()` y `leerTecnico()` capturan el error: la preferencia es opcional y el reporte sigue su curso.

La corrección se probó con una página que fuerza `QuotaExceededError` en `localStorage.setItem`: el reporte se guardó, pasó a **Sincronizado** y apareció una sola vez en la API.

## Dirección visual

- Papel frío (`#f2f4f0`) y verde pino (`#0d5c45`) como único acento.
- IBM Plex Sans autoalojada (45 KB, licencia OFL) y precacheada: la app no depende de Google Fonts.
- Sin micro-etiquetas en mayúsculas ni sombras en reposo. Títulos de 24 px, secciones de 14.5 px y metadatos de 11.5–12.5 px.
- Cabecera clara con marca, navegación y acción de instalar; franja de estado separada.
- Formulario en dos paneles: **Datos del servicio** y **Ubicación**.
- Campos de 46 px, texto de 16 px para evitar el zoom de iOS y botón principal de 52 px.
- GPS con estado en vivo, precisión en metros y enlace **Ver mapa**.
- Listado agrupado por día, hora en formato de 24 h, estados completos y carril de color.
- Navegación inferior en móvil y superior desde 900 px; lienzo de 820 px.
- Sin desbordamiento horizontal entre 320 px y 1440 px.

## Verificación

| Prueba | Resultado |
| --- | --- |
| `npm run build` | Correcto; precache de 11 entradas (250 KiB) |
| Lighthouse 11 (local) | PWA 100 · Accesibilidad 100 · Buenas prácticas 100 · Rendimiento 100 · SEO 100 |
| Inspección de diseño | 0 fallos; 1 aviso de lienzo centrado (falso positivo) |
| Ancho 320 / 390 / 768 / 1440 px | Sin desbordamiento horizontal |
| Objetivos táctiles | Todos ≥ 24 px; controles principales ≥ 44 px |
| Modo offline | Guardar sin red, recargar y conservar la cola |
| Reconexión | Sincronización automática y paso a «Sincronizado» |
| Idempotencia | Reenviar el mismo UUID responde 200 y no duplica |
| `localStorage` bloqueado | El reporte se guarda y sincroniza igual |
| Video del modo avión | 2 reportes offline → recarga → 2 sincronizados; API total 2 |
| App publicada | `https://frontend-chi-coral-19.vercel.app/` responde 200 |
| API publicada | `/api/health` responde `db: up` desde Render |
| CORS producción | Preflight y `GET` con `Access-Control-Allow-Origin` de Vercel |
| Persistencia producción | Tres reportes en Neon; dos capturados desde Android en producción |
| Idempotencia producción | Mismo UUID dos veces: 200 y total sin cambios |
| Lighthouse público | PWA 100 · Accesibilidad 100 · Buenas prácticas 100 · Rendimiento 100 · SEO 100 |

### Cómo se reproduce

```sh
docker compose up --build -d
docker compose exec backend npm run migrate

npx lighthouse@11 http://localhost:5173 \
  --only-categories=pwa,accessibility,best-practices,performance,seo
```

Para la prueba offline: DevTools → Network → Offline, capturar un reporte, recargar y volver a Online. La cola debe pasar de «Pendiente de sincronizar» a «Sincronizado» sin crear filas repetidas.

## Evidencias en el repositorio

| Evidencia | Dónde |
| --- | --- |
| Arquitectura y matriz de decisión | `docs/dia-01-arquitectura.md` y `.pdf` |
| Compatibilidad y checklist | `docs/dia-02-compatibilidad.md` y `.pdf` |
| Video del modo avión | `docs/evidencias/demo-modo-avion.mp4` |
| Ngrok: app pública | `docs/evidencias/ngrok-frontend.png`, `ngrok-frontend-mobile.png` |
| Reporte sincronizado en producción | `docs/evidencias/produccion-reporte-sincronizado.png` |
| API de producción | `docs/evidencias/produccion-api-health.png`; resumen sin datos personales en `produccion-api-reportes.png` |
| Botón Instalar en producción | `docs/evidencias/produccion-instalar.png` |
| Lighthouse público | `docs/evidencias/lighthouse-produccion.html`, `.json` y `.png` |
| Guía de Ngrok y despliegue | `docs/despliegue.md` |
| Guion de defensa y demo | `docs/defensa.md` |
| API y esquema | `backend/src/routes/reportes.js`, `backend/sql/schema.sql` |
| Entorno reproducible | `docker-compose.yml`, `Dockerfile` de cada servicio |
| Offline y sincronización | `frontend/src/sw.js`, `sync.js`, `db.js` |
| Interfaz rediseñada | `frontend/index.html`, `styles.css`, `main.js` |
| Manifest e íconos | `frontend/public/manifest.webmanifest`, `frontend/public/icons/` |
| Fuente y licencia | `frontend/public/fonts/` |

## Pendientes inmediatos

1. **Día 5/7, iOS:** descartada la prueba física por falta de dispositivo. La compatibilidad está implementada y la limitación documentada; no se presentarán capturas ni resultados inventados.
2. **Cierre de evidencia:** la instalación, el modo avión y la sincronización en Android se mostrarán en vivo desde la URL de producción. Una captura de respaldo es opcional.
3. **Persistencia:** reiniciar Render y comprobar que el reporte de Neon sigue disponible.
4. **Defensa:** ensayar la demostración con la app de Vercel, la API de Render y la tabla de Neon. Guion en [`defensa.md`](defensa.md).
5. **Push:** subir los cambios de documentación, capturas y reportes Lighthouse al repositorio, con autorización.

## Bloqueos y riesgos

- **iOS:** no hay iPhone físico. La app tiene el flujo de instalación y las limitaciones documentadas, pero no se puede afirmar una prueba en Safari iOS real sin hardware.
- **Render gratuito:** el servicio se duerme por inactividad; la primera petición puede tardar. Para la defensa hay que despertarlo unos minutos antes.
- **Datos sin sincronizar:** no hay respaldo. Si se borra el almacenamiento del navegador antes de enviar, el reporte se pierde.
- **Service Worker:** tras un despliegue puede servirse la versión anterior hasta recargar; está documentado.

## Próximo hito

Ensayar la defensa con la demo de producción, verificar la persistencia tras reiniciar Render y publicar la documentación. La ausencia de prueba física en iOS queda declarada como limitación; no se busca simularla.
