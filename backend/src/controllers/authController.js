import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import pool from '../config/database.js'
import { devStore } from '../services/devStore.js'

const JWT_SECRET = process.env.JWT_SECRET || 'headsit_secret_super_long_2026'
const signToken = (id, email, boutiqueId) => jwt.sign({ id, email, boutique_id: boutiqueId }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })

const registerDevFallback = async (nom, email, mot_de_passe, nom_boutique) => {
  const result = await devStore.createUserBattle({ nom, email, mot_de_passe, nom_boutique })
  if (result.conflict) return { conflict: true }

  return {
    user: { id: result.user.id, nom: result.user.nom, email: result.user.email },
    boutique: { id: result.boutique.id, nom: result.boutique.nom },
  }
}

const loginDevFallback = async (email, mot_de_passe) => {
  const user = devStore.findUserByEmail(email)
  if (!user) return null

  const valid = await bcrypt.compare(mot_de_passe, user.mot_de_passe)
  if (!valid) return null

  const boutique = devStore.getBoutiqueByUserId(user.id)
  return {
    token: signToken(user.id, email, boutique.id),
  }
}

export const register = async (req, res) => {
  const { nom, email, mot_de_passe, nom_boutique } = req.body
  if (!nom || !email || !mot_de_passe || !nom_boutique)
    return res.status(400).json({ message: 'Tous les champs sont requis' })

  try {
    const existe = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existe.rows.length > 0) return res.status(409).json({ message: 'Email déjà utilisé' })

    const hash = await bcrypt.hash(mot_de_passe, 12)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const user = await client.query('INSERT INTO users (nom, email, mot_de_passe) VALUES ($1,$2,$3) RETURNING id,nom,email', [nom, email, hash])
      const boutique = await client.query('INSERT INTO boutiques (user_id, nom, devise) VALUES ($1,$2,$3) RETURNING id,nom', [user.rows[0].id, nom_boutique, 'XOF'])
      await client.query('COMMIT')
      res.status(201).json({ token: signToken(user.rows[0].id, email, boutique.rows[0].id), user: user.rows[0], boutique: boutique.rows[0] })
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      try {
        const fallback = await registerDevFallback(nom, email, mot_de_passe, nom_boutique)
        if (fallback.conflict) return res.status(409).json({ message: 'Email déjà utilisé' })
        return res.status(201).json({ token: signToken(fallback.user.id, fallback.user.email, fallback.boutique.id), ...fallback })
      } catch (fallbackErr) {
        console.error('Fallback register error:', fallbackErr)
      }
    }

    console.error(err)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

export const login = async (req, res) => {
  const { email, mot_de_passe } = req.body
  if (!email || !mot_de_passe) return res.status(400).json({ message: 'Email et mot de passe requis' })

  try {
    const result = await pool.query('SELECT u.*, b.id as boutique_id, b.nom as boutique_nom FROM users u JOIN boutiques b ON b.user_id=u.id WHERE u.email=$1', [email])
    const user = result.rows[0]
    if (!user || !(await bcrypt.compare(mot_de_passe, user.mot_de_passe)))
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' })

    res.json({ token: signToken(user.id, email, user.boutique_id), user: { id: user.id, nom: user.nom, email: user.email }, boutique: { id: user.boutique_id, nom: user.boutique_nom } })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      const fallback = await loginDevFallback(email, mot_de_passe)
      if (fallback) return res.json(fallback)
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' })
    }

    res.status(500).json({ message: 'Erreur serveur' })
  }
}
