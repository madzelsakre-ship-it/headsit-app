import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import produitsRoutes from './routes/produits.js'
import commandesRoutes from './routes/commandes.js'
import dashboardRoutes from './routes/dashboard.js'
import liveRoutes from './routes/live.js'
import webhookRoutes from './routes/webhooks.js'
import exportRoutes from './routes/export.js'
import paiementsRoutes from './routes/paiements.js'

dotenv.config()
const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

app.use(cors())
app.use(express.json())
app.use((req, _res, next) => { req.io = io; next() })

app.use('/api/auth', authRoutes)
app.use('/api/produits', produitsRoutes)
app.use('/api/commandes', commandesRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/live', liveRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/paiements', paiementsRoutes)
app.get('/api/health', (_, res) => res.json({ status: 'ok', app: 'Headsit API v1.0' }))

io.on('connection', (socket) => {
  socket.on('rejoindre_live', (live_id) => socket.join(`live_${live_id}`))
  socket.on('nouveau_commentaire', ({ live_id, commentaire }) => io.to(`live_${live_id}`).emit('commentaire', commentaire))
  socket.on('commande_live', ({ live_id, commande }) => io.to(`live_${live_id}`).emit('nouvelle_commande', commande))
})

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => console.log(`🚀 Headsit API → http://localhost:${PORT}`))
