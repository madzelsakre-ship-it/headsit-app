import jwt from 'jsonwebtoken'
import { devStore } from '../services/devStore.js'

const JWT_SECRET = process.env.JWT_SECRET || 'headsit_secret_super_long_2026'

export const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'Non autorisé — token manquant' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)

    if (!req.user.boutique_id && req.user.id) {
      const boutique = devStore.getBoutiqueByUserId(req.user.id)
      if (boutique?.id) req.user.boutique_id = boutique.id
    }

    if (!req.user.boutique_id) {
      return res.status(401).json({ message: 'Contexte boutique introuvable' })
    }

    next()
  } catch {
    return res.status(401).json({ message: 'Token invalide ou expiré' })
  }
}
