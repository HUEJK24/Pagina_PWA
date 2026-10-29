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
  lat: $('#lat'),
  lng: $('#lng'),
  lista: $('#lista-reportes'),
  vacio: $('#lista-vacia'),
  contador: $('#contador'),
  netbar: $('#estado-red'),
  estadoTexto: $('#estado-texto'),
  estadoCola: $('#estado-cola'),
  toast: $('#toast'),
  formError: $('#form-error'),
  contadorDescripcion: $('#contador-descripcion'),
}

const formatoFecha = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

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
  ui.estadoTexto.textContent = online ? 'Conectado a Internet' : 'Trabajando sin conexión'
  actualizarCola()
}

async function actualizarCola() {
  const pendientes = await contarPendientes()
  const errores = await db.reportes.where('syncStatus').equals('error').count()

  if (errores > 0) {
    ui.estadoCola.textContent = `${errores} con error`
  } else if (pendientes > 0) {
    ui.estadoCola.textContent = `${pendientes} por sincronizar`
  } else {
    ui.estadoCola.textContent = 'Todo sincronizado'
  }

  const total = pendientes + errores
  ui.contador.hidden = total === 0
  ui.contador.textContent = String(total)
}

/* ---------- Lista ---------- */

function crearReporte(reporte) {
  const articulo = document.createElement('article')
  articulo.className = 'reporte'
  articulo.dataset.estado = reporte.syncStatus

  const head = document.createElement('div')
  head.className = 'reporte-head'

  const identidad = document.createElement('div')
  const cliente = document.createElement('h3')
  cliente.className = 'reporte-cliente'
  cliente.textContent = reporte.cliente
  const servicio = document.createElement('p')
  servicio.className = 'reporte-servicio'
  servicio.textContent = reporte.servicio
  identidad.append(cliente, servicio)

  const pill = document.createElement('span')
  pill.className = 'pill'
  if (reporte.syncStatus === 'synced') {
    pill.classList.add('pill-synced')
    pill.textContent = 'Sincronizado'
  } else if (reporte.syncStatus === 'error') {
    pill.classList.add('pill-error')
    pill.textContent = 'Error al enviar'
    if (reporte.lastError) pill.title = reporte.lastError
  } else {
    pill.classList.add('pill-pending')
    pill.textContent = 'Pendiente de sincronizar'
  }

  head.append(identidad, pill)

  const descripcion = document.createElement('p')
  descripcion.className = 'reporte-desc'
  descripcion.textContent = reporte.descripcion

  const foot = document.createElement('div')
  foot.className = 'reporte-foot'

  const fecha = document.createElement('time')
  fecha.dateTime = reporte.createdAt
  fecha.textContent = formatoFecha.format(new Date(reporte.createdAt))

  foot.append(fecha)

  if (Number.isFinite(reporte.lat) && Number.isFinite(reporte.lng)) {
    const enlace = document.createElement('a')
    enlace.className = 'reporte-link'
    enlace.href = `https://www.google.com/maps?q=${reporte.lat},${reporte.lng}`
    enlace.target = '_blank'
    enlace.rel = 'noopener noreferrer'
    enlace.textContent = 'Ver ubicación'
    foot.append(enlace)
  }

  articulo.append(head, descripcion, foot)
  return articulo
}

async function renderReportes() {
  const reportes = await db.reportes.orderBy('createdAt').reverse().toArray()
  ui.lista.replaceChildren(...reportes.map(crearReporte))
  ui.vacio.hidden = reportes.length > 0
  await actualizarCola()
}

/* ---------- Navegación ---------- */

function mostrarVista(nombre) {
  ui.vistaCaptura.hidden = nombre !== 'captura'
  ui.vistaReportes.hidden = nombre !== 'reportes'

  $$('.tab').forEach((tab) => {
    const activo = tab.dataset.vista === nombre
    tab.classList.toggle('is-active', activo)
    if (activo) tab.setAttribute('aria-current', 'page')
    else tab.removeAttribute('aria-current')
  })

  if (nombre === 'reportes') renderReportes()
}

$$('.tab').forEach((tab) => {
  tab.addEventListener('click', () => mostrarVista(tab.dataset.vista))
})

/* ---------- Formulario ---------- */

$('#descripcion').addEventListener('input', (event) => {
  ui.contadorDescripcion.textContent = String(event.target.value.length)
})

function marcarInvalidos() {
  $$('input[required], textarea[required]', ui.form).forEach((campo) => {
    campo.setAttribute('aria-invalid', String(!campo.validity.valid))
  })
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
    ui.formError.textContent = 'Revisa los campos marcados: cliente, servicio y diagnóstico son obligatorios.'
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
    localStorage.setItem('tecnico', tecnico)

    ui.form.reset()
    ui.contadorDescripcion.textContent = '0'
    $('#tecnico').value = tecnico
    reiniciarGps()
    mostrarVista('reportes')

    if (!navigator.onLine) {
      aviso('Reporte guardado localmente. Se enviará al volver a tener red.')
    } else {
      aviso('Reporte guardado. Enviando al servidor…')
      const { synced, failed } = await syncPending()
      await renderReportes()
      aviso(
        synced
          ? 'Reporte sincronizado con el servidor.'
          : failed
            ? 'Guardado en el teléfono. No se pudo enviar todavía.'
            : 'Guardado en el teléfono.'
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
}

ui.btnGps.addEventListener('click', () => {
  if (!('geolocation' in navigator)) {
    ui.gpsEstado.textContent = 'Este dispositivo no expone GPS'
    return
  }

  ui.btnGps.disabled = true
  ui.gpsEstado.textContent = 'Buscando señal…'

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      ui.lat.value = String(coords.latitude)
      ui.lng.value = String(coords.longitude)
      ui.gpsEstado.textContent = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(
        5
      )} · ±${Math.round(coords.accuracy)} m`
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
    ui.btnSync.disabled = false
    ui.btnSync.classList.remove('is-busy')
    await renderReportes()
  }
}

ui.btnSync.addEventListener('click', () => sincronizar())

window.addEventListener('online', async () => {
  pintarRed()
  aviso('Conexión recuperada. Sincronizando pendientes…')
  await sincronizar({ silencioso: true })
  await actualizarCola()
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

  const tecnicoGuardado = localStorage.getItem('tecnico')
  if (tecnicoGuardado) $('#tecnico').value = tecnicoGuardado

  await renderReportes()

  const vista = new URLSearchParams(window.location.search).get('vista')
  if (vista === 'reportes') mostrarVista('reportes')

  if (navigator.storage?.persist) {
    navigator.storage.persist().catch(() => {})
  }

  if (navigator.onLine) {
    await sincronizar({ silencioso: true })
  }
}

iniciar()
