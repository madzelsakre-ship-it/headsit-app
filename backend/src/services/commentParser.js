// src/services/commentParser.js
// Détecte automatiquement les commandes dans les commentaires live

/**
 * Mots-clés qui indiquent une intention d'achat
 * Adapté pour le contexte ivoirien / francophone
 */
const MOTS_ACHAT = [
  'je prends', 'je veux', 'je commande', 'j\'achète', 'j\'achat',
  'commande', 'je take', 'i want', 'add', 'je le veux',
  'réserve', 'reserve', 'je réserve', '+1', '+2', '+3', '+4', '+5',
  'je veux ça', 'c\'est pour moi', 'pour moi', 'j\'en veux',
  'je prend', 'send me', 'j\'en prends'
]

const MOTS_QUESTION = ['prix', 'combien', 'disponible', 'taille', 'couleur', 'livraison', '?']

/**
 * Analyse un commentaire et retourne les infos d'achat détectées
 * @param {string} texte - Texte du commentaire
 * @param {Array} produits - Liste des produits de la boutique
 * @returns {Object} { est_commande, produit_detecte, quantite, confiance }
 */
export function analyserCommentaire(texte, produits = []) {
  const t = texte.toLowerCase().trim()

  // Détecter question (pas une commande)
  const est_question = MOTS_QUESTION.some(m => t.includes(m))

  // Détecter intention d'achat
  const est_achat = MOTS_ACHAT.some(m => t.includes(m))

  if (!est_achat) {
    return { est_commande: false, est_question, texte_original: texte }
  }

  // Extraire la quantité
  let quantite = 1
  const matchQte = t.match(/\+(\d+)|(\d+)\s*(pièces?|unités?|exemplaires?|fois)/i)
  if (matchQte) {
    quantite = parseInt(matchQte[1] || matchQte[2]) || 1
  }
  quantite = Math.min(quantite, 99) // Sécurité

  // Détecter le produit mentionné
  let produit_detecte = null
  let score_max = 0

  for (const prod of produits) {
    const nom = prod.nom.toLowerCase()
    const mots = nom.split(/\s+/)
    let score = 0

    // Score basé sur les mots du nom du produit trouvés dans le commentaire
    for (const mot of mots) {
      if (mot.length > 3 && t.includes(mot)) score += mot.length
    }

    // Nom complet trouvé = bonus
    if (t.includes(nom)) score += 20

    // Catégorie mentionnée
    if (prod.categorie && t.includes(prod.categorie.toLowerCase())) score += 5

    if (score > score_max) {
      score_max = score
      produit_detecte = prod
    }
  }

  // Détecter la variante (couleur, taille)
  const couleurs = ['rouge', 'bleu', 'vert', 'noir', 'blanc', 'rose', 'jaune', 'orange', 'violet', 'marron', 'gris']
  const tailles = ['xs', 'sm', 's', 'm', 'l', 'xl', 'xxl', '36', '37', '38', '39', '40', '41', '42', '43', '44']
  const couleur = couleurs.find(c => t.includes(c))
  const taille = tailles.find(s => t.includes(s) || t.includes(` ${s} `))

  return {
    est_commande: true,
    est_question: false,
    produit_detecte,
    quantite,
    variante_hint: [couleur, taille].filter(Boolean).join(' ') || null,
    confiance: score_max > 0 ? 'haute' : 'basse',
    texte_original: texte
  }
}

/**
 * Formater une réponse automatique pour le vendeur
 */
export function genererReponse(analyse, produit) {
  if (!analyse.est_commande) return null

  if (!produit) {
    return `Merci ! Quel produit souhaitez-vous ? 🛍️`
  }

  const prix = Number(produit.prix).toLocaleString('fr-FR')
  const stock = produit.stock_total

  if (stock <= 0) {
    return `Désolée, ${produit.nom} est en rupture de stock 😔`
  }

  if (stock < analyse.quantite) {
    return `Il nous reste seulement ${stock} ${produit.nom}. Vous en voulez ${stock} ? 🙏`
  }

  return `✅ Commande enregistrée : ${analyse.quantite}x ${produit.nom} = ${(Number(produit.prix) * analyse.quantite).toLocaleString('fr-FR')} FCFA. Envoyez votre adresse ou votre position en MP pour valider la livraison 📍`
}
