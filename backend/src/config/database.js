import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()
const { Pool } = pg
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/headsit'
const pool = new Pool({ connectionString, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false })
pool.on('connect', () => console.log('✅ Base de données connectée'))
pool.on('error', (err) => console.error('❌ Erreur base de données:', err.message))
export default pool
