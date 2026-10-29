import pg from 'pg'

const { Pool } = pg

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('Falta la variable de entorno DATABASE_URL')
}

const usesSsl = connectionString.includes('sslmode=require')

export const pool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ...(usesSsl ? { ssl: { rejectUnauthorized: false } } : {}),
})

pool.on('error', (error) => {
  console.error('Error inesperado en el pool de PostgreSQL', error)
})
