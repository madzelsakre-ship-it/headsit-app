// src/services/commentParser.js
// Détecte automatiquement les commandes dans les commentaires live

/**
 * Mots-clés qui indiquent une intention d'achat
 * Adapté pour le contexte ivoirien / francophone
 */
const KEYWORDS = {
  PURCHASE: [
    "je prends",
    "je veux",
    "je commande",
    "j'achète",
    "j'achat",
    "commande",
    "je take",
    "i want",
    "add",
    "je le veux",
    "réserve",
    "reserve",
    "je réserve",
    "+1",
    "+2",
    "+3",
    "+4",
    "+5",
    "je veux ça",
    "c'est pour moi",
    "pour moi",
    "j'en veux",
    "je prend",
    "send me",
    "j'en prends",
  ],
  QUESTION: [
    "prix",
    "combien",
    "disponible",
    "taille",
    "couleur",
    "livraison",
    "?",
  ],
  // On pourrait ajouter des mots-clés pour les variantes
  COLORS: [
    "rouge",
    "bleu",
    "vert",
    "noir",
    "blanc",
    "rose",
    "jaune",
    "orange",
    "violet",
    "marron",
    "gris",
  ],
  SIZES: [
    "xs",
    "sm",
    "s",
    "m",
    "l",
    "xl",
    "xxl",
    "36",
    "37",
    "38",
    "39",
    "40",
    "41",
    "42",
    "43",
    "44",
  ],
};

// Utilitaire : échapper les caractères spéciaux pour inclusion sûre dans un RegExp
const escapeForRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Construire des patterns sûrs en échappant chaque mot-clé
const purchasePattern = KEYWORDS.PURCHASE.map(escapeForRegex).join("|");
const questionPattern = KEYWORDS.QUESTION.map(escapeForRegex).join("|");

// Utiliser des bornes de token plus permissives (début/fin de mot ou espace)
const TOKEN_BOUNDARY_START = "(?<!\\S)";
const TOKEN_BOUNDARY_END = "(?!\\S)";

const PURCHASE_REGEX = new RegExp(
  `${TOKEN_BOUNDARY_START}(${purchasePattern})${TOKEN_BOUNDARY_END}`,
  "i",
);
const QUESTION_REGEX = new RegExp(
  `${TOKEN_BOUNDARY_START}(${questionPattern})${TOKEN_BOUNDARY_END}`,
  "i",
);

/**
 * Analyse un commentaire et retourne les infos d'achat détectées
 * @param {string} texte - Texte du commentaire
 * @param {Array} produits - Liste des produits de la boutique
 * @returns {Object|null} { est_commande, produit_detecte, quantite, confiance, variante_hint, texte_original }
 */
export function analyserCommentaire(texte, produits = []) {
  const t = texte.toLowerCase().trim();

  // Détecter question (pas une commande)
  const est_question = KEYWORDS.QUESTION.some((m) => t.includes(m));

  // Détecter intention d'achat avec une regex pour plus de précision
  const matchAchat = t.match(PURCHASE_REGEX);

  if (!matchAchat) {
    return { est_commande: false, est_question, texte_original: texte };
  }

  // Extraire la quantité
  let quantite = 1;
  // Regex améliorée pour la quantité
  const matchQte =
    t.match(
      /(?:\b|x|\*)(\d+)|(\d+)\s*(?:pièces?|unités?|exemplaires?|fois)/i,
    ) || t.match(/\+(\d+)/);
  if (matchQte) {
    // Utilise le premier groupe de capture non nul
    quantite =
      parseInt(
        matchQte.find((val, i) => i > 0 && val),
        10,
      ) || 1;
  }
  quantite = Math.max(1, Math.min(quantite, 99)); // Sécurité

  // Détecter le produit mentionné
  let produit_detecte = null;
  let score_max = 0;

  for (const prod of produits) {
    const nom = prod.nom.toLowerCase();
    const mots = nom.split(/\s+/);
    let score = 0;

    // Score basé sur les mots du nom du produit trouvés dans le commentaire
    for (const mot of mots) {
      if (mot.length > 3 && t.includes(mot)) score += mot.length;
    }

    // Nom complet trouvé = bonus
    if (t.includes(nom)) score += 20;

    // Catégorie mentionnée
    if (prod.categorie && t.includes(prod.categorie.toLowerCase())) score += 5;

    if (score > score_max) {
      score_max = score;
      produit_detecte = prod;
    }
  }

  // Détecter la variante (couleur, taille)
  const couleur = KEYWORDS.COLORS.find((c) => t.includes(c));
  const taille = KEYWORDS.SIZES.find((s) => new RegExp(`\\b${s}\\b`).test(t));

  return {
    est_commande: true,
    est_question: false,
    produit_detecte,
    quantite,
    variante_hint: [couleur, taille].filter(Boolean).join(" ") || null, // Garde les variantes détectées
    confiance: Math.min(1, score_max / 30).toFixed(2), // Score de confiance entre 0 et 1
    texte_original: texte,
  };
}

/**
 * Formater une réponse automatique pour le vendeur
 */
export function genererReponse(analyse, produit) {
  if (!analyse.est_commande) return null;

  if (!produit) {
    return `Merci ! Quel produit souhaitez-vous ? 🛍️`;
  }

  const prix = Number(produit.prix).toLocaleString("fr-FR");
  const stock = produit.stock_total;

  if (stock <= 0) {
    return `Désolée, ${produit.nom} est en rupture de stock 😔`;
  }

  if (stock < analyse.quantite) {
    return `Il nous reste seulement ${stock} ${produit.nom}. Vous en voulez ${stock} ? 🙏`;
  }

  return `✅ Commande enregistrée : ${analyse.quantite}x ${produit.nom} = ${(Number(produit.prix) * analyse.quantite).toLocaleString("fr-FR")} FCFA. Envoyez votre adresse ou votre position en MP pour valider la livraison 📍`;
}
