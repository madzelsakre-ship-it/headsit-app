import { Router } from 'express'
import { verifierWebhookFacebook, recevoirCommentaireFacebook, recevoirCommentaireInstagram, simulerCommentaire } from '../controllers/webhookController.js'

const r = Router()
// Facebook webhook
r.get('/facebook', verifierWebhookFacebook)
r.post('/facebook', recevoirCommentaireFacebook)
// Instagram webhook
r.post('/instagram', recevoirCommentaireInstagram)
// Simulation (tests)
r.post('/simuler', simulerCommentaire)
export default r
