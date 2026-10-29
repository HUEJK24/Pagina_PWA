import Dexie from 'dexie'

/**
 * Base local del técnico. Vive en IndexedDB y es la fuente de verdad
 * mientras el reporte no llegue al servidor.
 */
export const db = new Dexie('ReportesDB')

db.version(1).stores({
  reportes: 'id, syncStatus, createdAt',
})
