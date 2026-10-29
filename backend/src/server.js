import express from 'express'
import cors from 'cors'
import { pool } from './db.js'
import { reportes } from './routes/reportes.js'

const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean)

app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(cors({ origin: allowedOrigins }))
app.use(express.json({ limit: '64kb' }))

app.get('/api/health', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT now() AS ahora')
    res.json({ ok: true, db: 'up', hora: rows[0].ahora })
  } catch (error) {
    res.status(503).json({ ok: false, db: 'down', error: error.message })
  }
})

app.use('/api/reportes', reportes)

app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
})

app.use((error, _req, res, _next) => {
  console.error('Error no controlado', error)
  res.status(500).json({ error: 'Error interno del servidor' })
})

const port = Number(process.env.PORT ?? 3000)

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`)
  console.log(`CORS permitido para: ${allowedOrigins.join(', ')}`)
})
