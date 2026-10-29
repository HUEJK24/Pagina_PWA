import './styles.css'
import { registerSW } from 'virtual:pwa-register'
import { db } from './db.js'
import { contarPendientes, syncPending } from './sync.js'

const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]

const ui = {
  vistaCaptura: $('#vista-captura'),
  vistaReportes: $('#vista-reportes'),
  form: $('#form-reporte'),
  btnGuardar: $('#btn-guardar'),
  btnSync: $('#btn-sincronizar'),
  btnGps: $('#btn-gps'),
  btnInstalar: $('#btn-instalar'),
  btnIos: $('#btn-ios'),
  dialogoIos: $('#dialogo-ios'),
  gpsEstado: $('#gps-estado'),
  gpsMapa: $('#gps-mapa'),
  lat: $('#lat'),
  lng: $('#lng'),
  lista: $('#lista-reportes'),
  vacio: $('#lista-vacia'),
  contador: $('#contador'),
  contadorTop: $('#contador-top'),
  pendientesSync: $('#pendientes-sync'),
  resumen: $('#resumen-reportes'),
  netbar: $('#estado-red'),
  estadoTexto: $('#estado-texto'),
  estadoCola: $('#estado-cola'),
  toast: $('#toast'),
  formError: $('#form-error'),
  contadorDescripcion: $('#contador-descripcion'),
}

const formatoHora = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const formatoUltima = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const formatoDia = new Intl.DateTimeFormat('es-MX', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const ESTADOS = {
  pending: 'Pendiente de sincronizar',
  synced: 'Sincronizado',
  error: 'Error al enviar',
}

const ICONO_PIN = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
    <path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z" stroke-linejoin="round"/>
    <circle cx="12" cy="10" r="2.3"/>
  </svg>`

let toastTimer = null
let deferredPrompt = null
let sincronizando = false

/* ---------- Avisos ---------- */

function aviso(mensaje, tipo = 'info') {
  clearTimeout(toastTimer)
  ui.toast.textContent = mensaje
  ui.toast.dataset.tipo = tipo
  ui.toast.hidden = false
  toastTimer = setTimeout(() => {
    ui.toast.hidden = true
  }, 3400)
}

/* ---------- Estado de conexión ---------- */

function pintarRed() {
  const online = navigator.onLine
  ui.netbar.classList.toggle('is-offline', !online)
  ui.estadoTexto.textContent = online ? 'Conectado' : 'Trabajando sin conexión'
}

async function actualizarCola(totalGuardados, ultimaCaptura) {
  const pendientes = await contarPendientes()
  const errores = await db.reportes.where('syncStatus').equals('error').count()
  const total = totalGuardados ?? (await db.reportes.count())

  if (total === 0) {
    ui.estadoCola.textContent = ''
  } else if (errores > 0 && pendientes > 0) {
    ui.estadoCola.textContent = `${pendientes} por sincronizar · ${errores} con error`
  } else if (errores > 0) {
    ui.estadoCola.textContent = `${errores} con error`
  } else if (pendientes > 0) {
    ui.estadoCola.textContent = `${pendientes} por sincronizar`
  } else {
    ui.estadoCola.textContent = 'Todo sincronizado'
  }

  const enCola = pendientes + errores
  for (const contador of [ui.contador, ui.contadorTop]) {
    contador.hidden = enCola === 0
    contador.textContent = String(enCola)
  }

  ui.pendientesSync.hidden = pendientes === 0
  ui.pendientesSync.textContent = String(pendientes)
  ui.btnSync.disabled = pendientes === 0
  ui.btnSync.setAttribute(
    'aria-label',
    pendientes === 0 ? 'Sincronizar reportes' : `Sincronizar ${pendientes} reportes pendientes`
  )

  if (total === 0) {
    ui.resumen.textContent = 'Guardados en este dispositivo.'
  } else if (errores > 0 || pendientes > 0) {
    const sustantivo = total === 1 ? 'reporte' : 'reportes'
    const cola =
      errores > 0 && pendientes > 0
        ? `${pendientes} sin enviar · ${errores} con error`
        : errores > 0
          ? `${errores} con error`
          : `${pendientes} sin enviar`
    ui.resumen.textContent = `${total} ${sustantivo} en el teléfono · ${cola}`
  } else if (ultimaCaptura) {
    ui.resumen.textContent = `Última captura: ${formatoUltima.format(new Date(ultimaCaptura))}`
  } else {
    ui.resumen.textContent = 'Todo sincronizado.'
  }
}

/* ---------- Listado ---------- */

function claveDia(fecha) {
  const d = new Date(fecha)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function etiquetaDia(fecha) {
  const hoy = new Date()
  const ayer = new Date()
  ayer.setDate(hoy.getDate() - 1)

  if (claveDia(fecha) === claveDia(hoy)) return 'Hoy'
  if (claveDia(fecha) === claveDia(ayer)) return 'Ayer'

  const texto = formatoDia.format(new Date(fecha))
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function crearReporte(reporte) {
  const articulo = document.createElement('article')
  articulo.className = 'reporte'
  articulo.dataset.estado = reporte.syncStatus

  const meta = document.createElement('div')
  meta.className = 'reporte-meta'

  const hora = document.createElement('time')
  hora.dateTime = reporte.createdAt
  hora.textContent = formatoHora.format(new Date(reporte.createdAt))
  meta.append(hora)

  if (reporte.tecnico) {
    const separador = document.createElement('span')
    separador.textContent = '·'
    separador.setAttribute('aria-hidden', 'true')

    const tecnico = document.createElement('span')
    tecnico.className = 'reporte-tecnico'
    tecnico.textContent = reporte.tecnico

    meta.append(separador, tecnico)
  }

  const estado = document.createElement('span')
  estado.className = 'reporte-estado'
  estado.textContent = ESTADOS[reporte.syncStatus] ?? ESTADOS.pending
  if (reporte.lastError) estado.title = reporte.lastError
  meta.append(estado)

  const cliente = document.createElement('h3')
  cliente.className = 'reporte-cliente'
  cliente.textContent = reporte.cliente

  const servicio = document.createElement('p')
  servicio.className = 'reporte-servicio'
  servicio.textContent = reporte.servicio

  const descripcion = document.createElement('p')
  descripcion.className = 'reporte-desc'
  descripcion.textContent = reporte.descripcion

  articulo.append(meta, cliente, servicio, descripcion)

  if (reporte.syncStatus === 'error' && reporte.lastError) {
    const error = document.createElement('p')
    error.className = 'reporte-error'
    error.textContent = `No se pudo enviar: ${reporte.lastError}`
    articulo.append(error)
  }

  const tieneCoords = Number.isFinite(reporte.lat) && Number.isFinite(reporte.lng)
  if (reporte.ubicacion || tieneCoords) {
    const foot = document.createElement('div')
    foot.className = 'reporte-foot'

    if (reporte.ubicacion) {
      const lugar = document.createElement('span')
      lugar.className = 'reporte-lugar'
      lugar.innerHTML = ICONO_PIN
      lugar.append(reporte.ubicacion)
      foot.append(lugar)
    }

    if (tieneCoords) {
      const enlace = document.createElement('a')
      enlace.className = 'reporte-link'
      enlace.href = `https://www.google.com/maps?q=${reporte.lat},${reporte.lng}`
      enlace.target = '_blank'
      enlace.rel = 'noopener noreferrer'
      enlace.textContent = 'Ver mapa'
      foot.append(enlace)
    }

    articulo.append(foot)
  }

  return articulo
}

async function renderReportes() {
  const reportes = await db.reportes.orderBy('createdAt').reverse().toArray()

  const grupos = new Map()
  for (const reporte of reportes) {
    const clave = claveDia(reporte.createdAt)
    if (!grupos.has(clave)) grupos.set(clave, [])
    grupos.get(clave).push(reporte)
  }

  const dias = []
  for (const items of grupos.values()) {
    const dia = document.createElement('div')
    dia.className = 'ledger-day'

    const etiqueta = document.createElement('h2')
    etiqueta.className = 'day-label'
    etiqueta.textContent = etiquetaDia(items[0].createdAt)

    const cuenta = document.createElement('span')
    cuenta.className = 'day-count'
    cuenta.textContent = `· ${items.length}`
    etiqueta.append(cuenta)

    const filas = document.createElement('div')
    filas.className = 'day-rows'
    filas.append(...items.map(crearReporte))

    dia.append(etiqueta, filas)
    dias.push(dia)
  }

  ui.lista.replaceChildren(...dias)
  ui.vacio.hidden = reportes.length > 0
  await actualizarCola(reportes.length, reportes[0]?.createdAt)
}

/* ---------- Navegación ---------- */

function mostrarVista(nombre, { enfocar = true } = {}) {
  ui.vistaCaptura.hidden = nombre !== 'captura'
  ui.vistaReportes.hidden = nombre !== 'reportes'

  $$('.tab, .nav-tab').forEach((tab) => {
    const activo = tab.dataset.vista === nombre
    tab.classList.toggle('is-active', activo)
    if (activo) tab.setAttribute('aria-current', 'page')
    else tab.removeAttribute('aria-current')
  })

  window.scrollTo({ top: 0, behavior: 'auto' })

  const url = new URL(window.location.href)
  if (nombre === 'reportes') url.searchParams.set('vista', 'reportes')
  else url.searchParams.delete('vista')
  window.history.replaceState(null, '', url)

  if (enfocar) {
    const titulo = nombre === 'reportes' ? $('#titulo-reportes') : $('#titulo-captura')
    titulo.focus({ preventScroll: true })
  }

  if (nombre === 'reportes') renderReportes()
}

$$('[data-vista]').forEach((elemento) => {
  elemento.addEventListener('click', (event) => {
    if (elemento.tagName === 'A') event.preventDefault()
    mostrarVista(elemento.dataset.vista)
  })
})

/* ---------- Formulario ---------- */

$('#descripcion').addEventListener('input', (event) => {
  ui.contadorDescripcion.textContent = `${event.target.value.length} / 4000`
})

function marcarInvalidos() {
  $$('input[required], textarea[required]', ui.form).forEach((campo) => {
    campo.setAttribute('aria-invalid', String(!campo.validity.valid))
  })
}

// localStorage puede fallar en modo privado o con la cuota llena: no debe
// impedir que el reporte ya guardado en IndexedDB se envíe.
function guardarTecnico(tecnico) {
  try {
    localStorage.setItem('tecnico', tecnico)
  } catch {
    /* preferencia opcional */
  }
}

function leerTecnico() {
  try {
    return localStorage.getItem('tecnico')
  } catch {
    return null
  }
}

ui.form.addEventListener('input', (event) => {
  if (event.target.matches('input, textarea')) {
    event.target.setAttribute('aria-invalid', 'false')
  }
})

ui.form.addEventListener('submit', async (event) => {
  event.preventDefault()
  ui.formError.hidden = true
  marcarInvalidos()

  if (!ui.form.reportValidity()) {
    ui.formError.textContent =
      'Revisa los campos marcados: técnico, cliente, servicio y diagnóstico son obligatorios.'
    ui.formError.hidden = false
    return
  }

  const datos = new FormData(ui.form)
  const tecnico = String(datos.get('tecnico')).trim()

  const reporte = {
    id: crypto.randomUUID(),
    tecnico,
    cliente: String(datos.get('cliente')).trim(),
    servicio: String(datos.get('servicio')).trim(),
    descripcion: String(datos.get('descripcion')).trim(),
    ubicacion: String(datos.get('ubicacion') ?? '').trim(),
    lat: ui.lat.value ? Number(ui.lat.value) : null,
    lng: ui.lng.value ? Number(ui.lng.value) : null,
    estado: 'reportado',
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
    syncedAt: null,
    lastError: null,
  }

  ui.btnGuardar.disabled = true
  ui.btnGuardar.classList.add('is-busy')

  try {
    await db.reportes.add(reporte)
    guardarTecnico(tecnico)

    ui.form.reset()
    ui.contadorDescripcion.textContent = '0 / 4000'
    $('#tecnico').value = tecnico
    reiniciarGps()
    mostrarVista('reportes')

    if (!navigator.onLine) {
      aviso('Reporte guardado. Se enviará al reconectar.')
    } else {
      aviso('Reporte guardado. Enviando…')
      const { synced } = await syncPending()
      aviso(
        synced
          ? 'Reporte sincronizado con el servidor.'
          : 'Guardado en el teléfono. Se enviará al reconectar.'
      )
    }
  } catch (error) {
    console.error(error)
    aviso('No se pudo guardar el reporte en este dispositivo.', 'error')
  } finally {
    ui.btnGuardar.disabled = false
    ui.btnGuardar.classList.remove('is-busy')
    await renderReportes()
  }
})

/* ---------- GPS ---------- */

function reiniciarGps() {
  ui.lat.value = ''
  ui.lng.value = ''
  ui.gpsEstado.textContent = 'Sin coordenadas'
  ui.gpsEstado.classList.remove('is-ok')
  ui.gpsMapa.hidden = true
  ui.gpsMapa.href = '#'
}

ui.btnGps.addEventListener('click', () => {
  if (!('geolocation' in navigator)) {
    ui.gpsEstado.textContent = 'Este dispositivo no expone GPS'
    return
  }

  ui.btnGps.disabled = true
  ui.gpsEstado.textContent = 'Buscando señal…'
  ui.gpsEstado.classList.remove('is-ok')

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      ui.lat.value = String(coords.latitude)
      ui.lng.value = String(coords.longitude)
      ui.gpsEstado.textContent = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(
        5
      )} · ±${Math.round(coords.accuracy)} m`
      ui.gpsEstado.classList.add('is-ok')
      ui.gpsMapa.href = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`
      ui.gpsMapa.hidden = false
      ui.btnGps.disabled = false
    },
    (error) => {
      const mensajes = {
        1: 'Permiso de ubicación denegado',
        2: 'Sin señal GPS en este momento',
        3: 'El GPS tardó demasiado',
      }
      ui.gpsEstado.textContent = mensajes[error.code] ?? 'No se pudo obtener la ubicación'
      ui.btnGps.disabled = false
    },
    { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 }
  )
})

/* ---------- Sincronización ---------- */

async function sincronizar({ silencioso = false } = {}) {
  if (sincronizando) return
  sincronizando = true
  ui.btnSync.disabled = true
  ui.btnSync.classList.add('is-busy')

  try {
    const { synced, failed, offline } = await syncPending()

    if (!silencioso) {
      if (offline) aviso('Sin conexión. Los reportes siguen guardados.')
      else if (synced && !failed) aviso(`${synced} reporte(s) sincronizado(s).`)
      else if (failed) aviso(`${failed} reporte(s) no se pudieron enviar.`, 'error')
      else aviso('No hay reportes pendientes.')
    }
  } finally {
    sincronizando = false
    ui.btnSync.classList.remove('is-busy')
    await renderReportes()
  }
}

ui.btnSync.addEventListener('click', () => sincronizar())

window.addEventListener('online', async () => {
  pintarRed()
  aviso('Conexión recuperada. Enviando pendientes…')
  await sincronizar({ silencioso: true })
})

window.addEventListener('offline', () => {
  pintarRed()
  aviso('Sin conexión. Puedes seguir capturando reportes.')
})

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && navigator.onLine) {
    sincronizar({ silencioso: true })
  }
})

/* ---------- Instalación ---------- */

const esStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true

const esIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

function ocultarInstalacion() {
  ui.btnInstalar.hidden = true
  ui.btnIos.hidden = true
}

// El preventDefault es intencional: la app muestra su propio botón y llama a
// prompt() en el clic. Chromium avisa en consola que no mostrará su banner
// nativo; es informativo, no un fallo de instalabilidad.
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferredPrompt = event
  if (!esStandalone()) ui.btnInstalar.hidden = false
})

ui.btnInstalar.addEventListener('click', async () => {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  if (outcome === 'accepted') {
    ocultarInstalacion()
    aviso('Instalando la aplicación…')
  }
})

ui.btnIos.addEventListener('click', () => {
  ui.dialogoIos.showModal()
})

window.addEventListener('appinstalled', () => {
  ocultarInstalacion()
  aviso('Aplicación instalada.')
})

if (esIOS() && !esStandalone()) {
  ui.btnIos.hidden = false
}

/* ---------- Service Worker ---------- */

registerSW({
  immediate: true,
  onOfflineReady() {
    aviso('La app ya funciona sin conexión.')
  },
  onNeedRefresh() {
    aviso('Hay una versión nueva. Cierra y vuelve a abrir la app.')
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update()
    })
  },
})

/* ---------- Arranque ---------- */

async function iniciar() {
  pintarRed()

  const tecnicoGuardado = leerTecnico()
  if (tecnicoGuardado) $('#tecnico').value = tecnicoGuardado

  await renderReportes()

  const vista = new URLSearchParams(window.location.search).get('vista')
  if (vista === 'reportes') mostrarVista('reportes', { enfocar: false })

  if (navigator.storage?.persist) {
    navigator.storage.persist().catch(() => {})
  }

  if (navigator.onLine) {
    await sincronizar({ silencioso: true })
  }
}

iniciar()
