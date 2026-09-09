// src/services/paiementService.js
// Intégration Mobile Money : Orange Money, MTN MoMo, Wave
import crypto from "crypto";

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

// ── Configuration et Constantes ──

const CINETPAY_API_KEY = process.env.CINETPAY_API_KEY
const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID;
const WAVE_SECRET = process.env.WAVE_SECRET_KEY

const API_URLS = {
  CINETPAY_PAYMENT: "https://api-checkout.cinetpay.com/v2/payment",
  CINETPAY_CHECK: "https://api-checkout.cinetpay.com/v2/payment/check",
  WAVE_CHECKOUT: "https://api.wave.com/v1/checkout/sessions",
};

if (!CINETPAY_API_KEY || !CINETPAY_SITE_ID) {
  console.warn(
    "CinetPay API Key or Site ID is not configured. Payment via CinetPay will fail.",
  );
}
if (!WAVE_SECRET) {
  console.warn(
    "Wave Secret Key is not configured. Payment via Wave will fail.",
  );
}

// ── CinetPay (Orange Money, MTN, Moov, Carte) ──

/**
 * Construit le payload pour l'API CinetPay.
 * @private
 */
function buildCinetPayPayload(commande_id, montant, client_nom, client_tel, description) {
  const transaction_id = `HEADSIT_${commande_id}_${Date.now()}`;
  return {
    apikey: CINETPAY_API_KEY,
    site_id: CINETPAY_SITE_ID,
    transaction_id,
    amount: Math.round(montant),
    currency: "XOF",
    description: description || `Commande Headsit #${commande_id?.slice(-6)}`,
    customer_name: client_nom || "Client",
    customer_phone_number: client_tel || "",
    customer_email: "",
    notify_url: `${process.env.APP_URL}/api/paiements/webhook/cinetpay`,
    return_url: `${process.env.FRONTEND_URL}/commandes?paiement=success`,
    channels: "ALL", // Orange Money + MTN + Moov + Wave + Carte
    lang: "fr",
    metadata: JSON.stringify({ commande_id }),
  };
}

export async function initierPaiementCinetPay({
  commande_id,
  montant,
  client_nom,
  client_tel,
  description,
}) {
  const payload = buildCinetPayPayload(
    commande_id,
    montant,
    client_nom,
    client_tel,
    description,
  );
  const transaction_id = payload.transaction_id;

  const response = await fetch(API_URLS.CINETPAY_PAYMENT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (data.code !== "201") {
    // Log l'erreur complète pour le débogage, mais ne l'exposez pas entièrement au client.
    console.error(`CinetPay Error for cmd ${commande_id}:`, data);
    throw new Error(
      "Erreur lors de l'initialisation du paiement CinetPay. " +
        (data.message || ""),
    );
  }

  return {
    transaction_id,
    url_paiement: data.data.payment_url,
    provider: "cinetpay",
  };
}

// ── Wave Business ──

/**
 * Construit le payload pour l'API Wave.
 * @private
 */
function buildWavePayload(commande_id, montant) {
  return {
    amount: Math.round(montant).toString(),
    currency: 'XOF',
    error_url: `${process.env.FRONTEND_URL}/commandes?paiement=echec`,
    success_url: `${process.env.FRONTEND_URL}/commandes?paiement=success&cmd=${commande_id}`,
    client_reference: commande_id
  };
}

export async function initierPaiementWave({ commande_id, montant }) {
  if (!WAVE_SECRET) throw new Error("Wave n'est pas configuré.");

  const payload = buildWavePayload(commande_id, montant);

  const response = await fetch(API_URLS.WAVE_CHECKOUT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WAVE_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json()
  if (!data.wave_launch_url) {
    // Log l'erreur complète pour le débogage
    console.error(`Wave Error for cmd ${commande_id}:`, data);
    throw new Error("Erreur lors de l'initialisation du paiement Wave.");
  }

  return {
    transaction_id: data.id,
    url_paiement: data.wave_launch_url,
    provider: 'wave'
  }
}

// ── Vérification et Webhooks ──

/**
 * Vérifie le statut d'une transaction CinetPay. C'est la méthode la plus sûre pour valider un webhook.
 */
export async function verifierStatutCinetPay(transaction_id) {
  const response = await fetch(API_URLS.CINETPAY_CHECK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id,
    }),
  });
  return response.json()
}

/**
 * Valide une notification de webhook de CinetPay en revérifiant le statut de la transaction.
 * @param {object} body - Le corps de la requête du webhook.
 * @returns {boolean} - Vrai si la transaction est confirmée et payée.
 */
export async function validerWebhookCinetPay(body) {
  if (body.cif_code !== CINETPAY_SITE_ID) return false;
  const statut = await verifierStatutCinetPay(body.cpm_trans_id);
  return statut?.data?.status === 'ACCEPTED';
}

/**
 * Valide la signature d'un webhook Wave.
 * @param {string} rawBody - Le corps brut de la requête.
 * @param {string} signature - La valeur de l'en-tête 'X-Wave-Signature'.
 * @returns {boolean}
 */
export function validerWebhookWave(rawBody, signature) {
  if (!WAVE_SECRET) return false;
  const hmac = crypto.createHmac('sha256', WAVE_SECRET);
  const digest = hmac.update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}
