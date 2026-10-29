import { db } from './db.js'

const API_URL = import.meta.env.VITE_API_URL ?? ''
const ENDPOINT = `${API_URL}/api/reportes`

let running = null

/**
 * Envía los reportes pendientes. Es idempotente desde el servidor:
 * el UUID viaja desde el cliente, así que reintentar no duplica.
 */
export function syncPending() {
  if (!running) {
    running = run().finally(() => {
      running = null
    })
  }
  return running
}

async function run() {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0, offline: true }
  }

  const pendientes = await db.reportes.where('syncStatus').equals('pending').toArray()
  let synced = 0
  let failed = 0

  for (const reporte of pendientes) {
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reporte.id,
          tecnico: reporte.tecnico,
          cliente: reporte.cliente,
          servicio: reporte.servicio,
          descripcion: reporte.descripcion,
          ubicacion: reporte.ubicacion,
          lat: reporte.lat,
          lng: reporte.lng,
          estado: reporte.estado,
          createdAt: reporte.createdAt,
        }),
      })

      if (response.status >= 400 && response.status < 500) {
        // Error de datos: no tiene sentido reintentar en bucle.
        await db.reportes.update(reporte.id, {
          lastError: `HTTP ${response.status}`,
          syncStatus: 'error',
        })
        failed += 1
        continue
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      await db.reportes.update(reporte.id, {
        syncStatus: 'synced',
        syncedAt: new Date().toISOString(),
        lastError: null,
      })
      synced += 1
    } catch (error) {
      // Se cayó la red a mitad del envío: el resto sigue pendiente.
      if (!navigator.onLine) break

      await db.reportes.update(reporte.id, { lastError: error.message })
      failed += 1
    }
  }

  return { synced, failed, offline: false }
}

export async function contarPendientes() {
  return db.reportes.where('syncStatus').equals('pending').count()
}
