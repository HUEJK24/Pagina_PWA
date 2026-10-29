import { Router } from 'express'
import { pool } from '../db.js'

export const reportes = Router()

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const texto = (valor, max = 2000) =>
  typeof valor === 'string' ? valor.trim().slice(0, max) : ''

const numero = (valor) => (typeof valor === 'number' && Number.isFinite(valor) ? valor : null)

reportes.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM reportes ORDER BY fecha_creacion DESC LIMIT 500'
  )
  res.json({ total: rows.length, reportes: rows })
})

reportes.post('/', async (req, res) => {
  const body = req.body ?? {}

  const id = texto(body.id, 36).toLowerCase()
  const cliente = texto(body.cliente, 160)
  const servicio = texto(body.servicio, 160)
  const descripcion = texto(body.descripcion, 4000)

  if (!UUID.test(id) || !cliente || !servicio || !descripcion) {
    return res.status(400).json({
      error: 'id (UUID), cliente, servicio y descripcion son obligatorios',
    })
  }

  const { rows } = await pool.query(
    `INSERT INTO reportes
       (id, tecnico, cliente, servicio, descripcion, ubicacion, lat, lng, estado, fecha_creacion)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'reportado'), COALESCE($10, now()))
     ON CONFLICT (id) DO UPDATE SET
       tecnico = EXCLUDED.tecnico,
       cliente = EXCLUDED.cliente,
       servicio = EXCLUDED.servicio,
       descripcion = EXCLUDED.descripcion,
       ubicacion = EXCLUDED.ubicacion,
       lat = EXCLUDED.lat,
       lng = EXCLUDED.lng,
       estado = EXCLUDED.estado,
       actualizado_en = now()
     RETURNING *, (xmax = 0) AS insertado`,
    [
      id,
      texto(body.tecnico, 160),
      cliente,
      servicio,
      descripcion,
      texto(body.ubicacion, 300),
      numero(body.lat),
      numero(body.lng),
      texto(body.estado, 40) || null,
      body.createdAt ?? body.fecha_creacion ?? null,
    ]
  )

  const insertado = rows[0].insertado === true
  res.status(insertado ? 201 : 200).json(rows[0])
})
