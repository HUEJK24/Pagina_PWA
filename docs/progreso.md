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
| 5 | Ngrok y móvil real | Configuración lista | Token y capturas pendientes |
| 6 | UI móvil y formulario | Completa y rediseñada | Verificación en navegador |
| 7 | Manifest e instalación | Casi completa | Prompt en DevTools; dispositivo pendiente |
| 8 | Service Worker y offline | Completa | [Video del modo avión](evidencias/demo-modo-avion.mp4) |
| 9 | Sincronización y modo avión | Completa | [Video del modo avión](evidencias/demo-modo-avion.mp4) |
| 10 | Auditoría y despliegue | Auditoría local y guía | [Guía de despliegue](despliegue.md); nube pendiente |

**Avance estimado:** 89 % (promedio simple de los diez días). Siete jornadas tienen la implementación cerrada (1, 2, 3, 4, 6, 8 y 9); el día 7 está al 90 % porque falta la instalación en un teléfono real; el día 5 está al 40 % y el día 10 al 60 % porque dependen de cuentas y dispositivos.

El núcleo técnico —offline, sincronización, idempotencia e instalabilidad— funciona y está verificado en local. Lo que resta es evidencia externa: Ngrok, capturas en Android/iOS y URL pública.

## Entregables de la última sesión

### Día 1: arquitectura

- Documento con contexto, siete requerimientos y criterios de aceptación.
- Cinco alternativas evaluadas: web tradicional, SOA/API, nativa, multiplataforma y PWA.
- Matriz ponderada con totales recalculados y verificación aritmética: PWA 4.78, multiplataforma 3.78, nativa 2.80.
- Argumento SOA frente a PWA: el cliente delgado colapsa sin red y la PWA conserva la API en el servidor.
- Diagrama de componentes, contrato de la API, modelo de datos, riesgos, límites y trazabilidad.
- Entregable en Markdown y PDF de 11 páginas.

### Día 2: compatibilidad

- Tabla comparativa entre Chromium y WebKit para instalación, persistencia, Background Sync, push, Service Worker, GPS y cuota.
- Explicación de las tres limitaciones críticas de iOS: purga por ITP, ausencia de `beforeinstallprompt` y ausencia de Background Sync.
- Checklist de instalación con estado de cada criterio y matriz de pruebas por navegador.
- Guion de verificación en Android e iOS y preguntas de defensa.
- Entregable en Markdown y PDF de 7 páginas.

### Video del modo avión

- Recorrido de 32 segundos con dos reportes capturados sin red.
- Recarga con la red desconectada: el Service Worker sirve la app y los datos siguen en IndexedDB.
- Reconexión: el evento `online` sincroniza los dos reportes sin intervención.
- Verificación final contra `GET /api/reportes`: total 2, dos UUID distintos, ningún duplicado.
- Archivo: [`docs/evidencias/demo-modo-avion.mp4`](evidencias/demo-modo-avion.mp4). Póster: [`demo-modo-avion-poster.jpg`](evidencias/demo-modo-avion-poster.jpg).

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
| Guía de Ngrok y despliegue | `docs/despliegue.md` |
| API y esquema | `backend/src/routes/reportes.js`, `backend/sql/schema.sql` |
| Entorno reproducible | `docker-compose.yml`, `Dockerfile` de cada servicio |
| Offline y sincronización | `frontend/src/sw.js`, `sync.js`, `db.js` |
| Interfaz rediseñada | `frontend/index.html`, `styles.css`, `main.js` |
| Manifest e íconos | `frontend/public/manifest.webmanifest`, `frontend/public/icons/` |
| Fuente y licencia | `frontend/public/fonts/` |

## Pendientes inmediatos

1. **Día 5:** autenticar Ngrok (`ngrok config add-authtoken …`), abrir la URL en Android e iOS y capturar HTTPS, instalación y estado offline. Guía: [`despliegue.md`](despliegue.md).
2. **Día 7:** instalar la app en Chrome Android y agregarla a inicio en Safari iOS; guardar las capturas.
3. **Día 10:** crear Neon, Render y Vercel, cargar variables y repetir Lighthouse sobre la URL pública. Guía: [`despliegue.md`](despliegue.md).
4. Añadir las URLs finales al README y hacer el push.

## Bloqueos y riesgos

- **Ngrok:** el binario está instalado, pero sin token no se puede generar la URL HTTPS para los teléfonos.
- **Cuentas en la nube:** Neon, Render y Vercel requieren credenciales del propietario del proyecto.
- **iOS:** no existe `beforeinstallprompt` ni Background Sync. La sincronización depende de abrir la app, del evento `online` o del botón manual; instalar la PWA reduce el riesgo de purga de almacenamiento.
- **Datos sin sincronizar:** no hay respaldo. Si se borra el almacenamiento del navegador antes de enviar, el reporte se pierde.
- **Service Worker:** tras un despliegue puede servirse la versión anterior hasta recargar; está documentado.

## Próximo hito

Cerrar el día 5 y el día 7 con Ngrok y capturas reales. Después, desplegar en Neon, Render y Vercel, auditar la URL pública y actualizar el README con las URLs finales.
