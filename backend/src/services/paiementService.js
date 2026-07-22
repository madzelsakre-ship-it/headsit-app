// src/services/paiementService.js
// Intégration Mobile Money : Orange Money, MTN MoMo, Wave

/**
 * ARCHITECTURE PAIEMENT HEADSIT
 * 
 * Orange Money CI  → API CinetPay (agrégateur recommandé)
 * MTN MoMo         → API CinetPay ou API MTN directe
 * Wave             → API Wave Business
 * Carte bancaire   → CinetPay (Visa/MasterCard)
 * 
 * On utilise CinetPay comme agrégateur principal car il couvre
 * Orange Money, MTN, Moov, Wave et cartes en une seule intégration.
 */

const CINETPAY_API_KEY = process.env.CINETPAY_API_KEY
const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID
const CINETPAY_URL = 'https://api-checkout.cinetpay.com/v2/payment'
const WAVE_SECRET = process.env.WAVE_SECRET_KEY

// ── CinetPay (Orange Money, MTN, Moov, Carte) ──

export async function initierPaiementCinetPay({ commande_id, montant, client_nom, client_tel, description }) {
  const transaction_id = `HEADSIT_${commande_id}_${Date.now()}`

  const payload = {
    apikey: CINETPAY_API_KEY,
    site_id: CINETPAY_SITE_ID,
    transaction_id,
    amount: Math.round(montant),
    currency: 'XOF',
    description: description || `Commande Headsit #${commande_id?.slice(-6)}`,
    customer_name: client_nom || 'Client',
    customer_phone_number: client_tel || '',
    customer_email: '',
    notify_url: `${process.env.APP_URL}/api/paiements/webhook/cinetpay`,
    return_url: `${process.env.FRONTEND_URL}/commandes?paiement=success`,
    channels: 'ALL', // Orange Money + MTN + Moov + Wave + Carte
    lang: 'fr',
    metadata: JSON.stringify({ commande_id })
  }

  const response = await fetch(CINETPAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  const data = await response.json()

  if (data.code !== '201') {
    throw new Error(data.message || 'Erreur initialisation paiement CinetPay')
  }

  return {
    transaction_id,
    url_paiement: data.data.payment_url,
    provider: 'cinetpay'
  }
}

// ── Wave Business ──

export async function initierPaiementWave({ commande_id, montant, client_tel }) {
  const response = await fetch('https://api.wave.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WAVE_SECRET}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: Math.round(montant).toString(),
      currency: 'XOF',
      error_url: `${process.env.FRONTEND_URL}/commandes?paiement=echec`,
      success_url: `${process.env.FRONTEND_URL}/commandes?paiement=success&cmd=${commande_id}`,
      client_reference: commande_id
    })
  })

  const data = await response.json()
  if (!data.wave_launch_url) throw new Error('Erreur Wave')

  return {
    transaction_id: data.id,
    url_paiement: data.wave_launch_url,
    provider: 'wave'
  }
}

// ── Vérifier statut CinetPay ──

export async function verifierStatutCinetPay(transaction_id) {
  const response = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id
    })
  })
  return response.json()
}

// ── Valider signature webhook CinetPay ──

export function validerSignatureCinetPay(body, signature) {
  // CinetPay envoie cif_code dans le body pour vérification
  return body.cif_code === CINETPAY_SITE_ID
}
