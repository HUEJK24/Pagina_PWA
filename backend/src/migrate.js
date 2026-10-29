import { readFile } from 'node:fs/promises'
import { pool } from './db.js'

const schema = await readFile(new URL('../sql/schema.sql', import.meta.url), 'utf8')

try {
  await pool.query(schema)
  console.log('Esquema aplicado correctamente')
} catch (error) {
  console.error('No se pudo aplicar el esquema', error)
  process.exitCode = 1
} finally {
  await pool.end()
}
