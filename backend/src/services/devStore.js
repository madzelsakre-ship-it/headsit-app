import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const state = {
  users: [],
  boutiques: [],
  products: [],
  commands: [],
  lives: [],
}

const seeded = []

const nowIso = () => new Date().toISOString()

const ensureSeed = () => {
  if (seeded.length) return
  seeded.push(true)

  const boutiqueId = crypto.randomUUID()
  const userId = crypto.randomUUID()
  const products = [
    { id: crypto.randomUUID(), boutique_id: boutiqueId, nom: 'Robe bogolan', prix: 12500, stock_total: 12, stock_alerte: 5, categorie: 'Vêtements', actif: true },
    { id: crypto.randomUUID(), boutique_id: boutiqueId, nom: 'Sac en cuir', prix: 18000, stock_total: 8, stock_alerte: 3, categorie: 'Accessoires', actif: true },
    { id: crypto.randomUUID(), boutique_id: boutiqueId, nom: 'Chemise africaine', prix: 10500, stock_total: 4, stock_alerte: 3, categorie: 'Vêtements', actif: true },
  ]

  state.users.push({ id: userId, nom: 'Amina Koné', email: 'amina@test.com', mot_de_passe: '$2a$12$BB2d4EiUx0ZqpyhMO7Vxr.e7LRbMqZmjIn1IMYV.iFH0etp6/pXoi' })
  state.boutiques.push({ id: boutiqueId, user_id: userId, nom: 'Boutique Amina', devise: 'XOF' })
  state.products.push(...products)

  state.commands.push({
    id: crypto.randomUUID(),
    boutique_id: boutiqueId,
    client_nom: 'Sophie',
    client_tel: '+225 07 00 00 00',
    statut: 'en_attente',
    total: 12500,
    mode_paiement: 'cash',
    live_id: null,
    date: nowIso(),
    zone: 'Cocody',
    adresse: 'Avenue de la Paix, Cocody',
    livreur: 'Kouassi',
    lignes: [{ produit: 'Robe bogolan', quantite: 1, prix: 12500 }],
  })

  state.commands.push({
    id: crypto.randomUUID(),
    boutique_id: boutiqueId,
    client_nom: 'Marc',
    client_tel: '+225 07 11 11 11',
    statut: 'en_cours_livraison',
    total: 18000,
    mode_paiement: 'momo',
    live_id: null,
    date: nowIso(),
    zone: 'Yopougon',
    adresse: 'Rue des Jardins, Yopougon',
    livreur: 'Boni',
    lignes: [{ produit: 'Sac en cuir', quantite: 1, prix: 18000 }],
  })

  state.lives.push({ id: crypto.randomUUID(), boutique_id: boutiqueId, plateforme: 'facebook', url_stream: null, debut: nowIso(), fin: null, total_ventes: 0 })
}

ensureSeed()

export const devStore = {
  state,
  ensureSeed,
  getBoutiqueByUserId(userId) {
    return state.boutiques.find((b) => b.user_id === userId) || null
  },
  async createUserBattle({ nom, email, mot_de_passe, nom_boutique }) {
    const existing = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (existing) return { conflict: true }

    const userId = crypto.randomUUID()
    const boutiqueId = crypto.randomUUID()
    const hash = await bcrypt.hash(mot_de_passe, 12)
    const user = { id: userId, nom, email: email.toLowerCase(), mot_de_passe: hash }
    const boutique = { id: boutiqueId, user_id: userId, nom: nom_boutique, devise: 'XOF' }
    const starterProducts = [
      { id: crypto.randomUUID(), boutique_id: boutiqueId, nom: 'Robe bogolan', prix: 12500, stock_total: 12, stock_alerte: 5, categorie: 'Vêtements', actif: true },
      { id: crypto.randomUUID(), boutique_id: boutiqueId, nom: 'Sac en cuir', prix: 18000, stock_total: 8, stock_alerte: 3, categorie: 'Accessoires', actif: true },
      { id: crypto.randomUUID(), boutique_id: boutiqueId, nom: 'Chemise africaine', prix: 10500, stock_total: 4, stock_alerte: 3, categorie: 'Vêtements', actif: true },
    ]

    state.users.push(user)
    state.boutiques.push(boutique)
    state.products.push(...starterProducts)
    return { user, boutique }
  },
  findUserByEmail(email) {
    return state.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null
  },
  listProducts(boutiqueId) {
    return state.products.filter((p) => p.boutique_id === boutiqueId && p.actif !== false)
  },
  createProduct(boutiqueId, payload) {
    const product = {
      id: crypto.randomUUID(),
      boutique_id: boutiqueId,
      nom: payload.nom,
      prix: Number(payload.prix || 0),
      stock_total: Number(payload.stock_total || 0),
      stock_alerte: Number(payload.stock_alerte || 5),
      categorie: payload.categorie || '',
      actif: true,
      created_at: nowIso(),
    }
    state.products.push(product)
    return product
  },
  updateProduct(boutiqueId, id, payload) {
    const productIndex = state.products.findIndex((p) => p.id === id && p.boutique_id === boutiqueId)
    if (productIndex === -1) return null
    state.products[productIndex] = { ...state.products[productIndex], ...payload, boutique_id: boutiqueId }
    return state.products[productIndex]
  },
  deleteProduct(boutiqueId, id) {
    const product = state.products.find((p) => p.id === id && p.boutique_id === boutiqueId)
    if (!product) return false
    product.actif = false
    return true
  },
  listCommands(boutiqueId, statut = '') {
    return state.commands
      .filter((c) => c.boutique_id === boutiqueId && (!statut || c.statut === statut))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  },
  createCommand(boutiqueId, payload) {
    const command = {
      id: crypto.randomUUID(),
      boutique_id: boutiqueId,
      client_nom: payload.client_nom || 'Client',
      client_tel: payload.client_tel || '',
      statut: payload.statut || 'en_attente',
      total: Number(payload.total || 0),
      mode_paiement: payload.mode_paiement || 'cash',
      live_id: payload.live_id || null,
      date: nowIso(),
      zone: payload.zone || 'À définir',
      adresse: payload.adresse || 'À définir',
      livreur: payload.livreur || 'À assigner',
      lignes: payload.lignes || [],
    }
    state.commands.unshift(command)
    return command
  },
  updateCommandStatus(boutiqueId, id, statut) {
    const order = state.commands.find((c) => c.id === id && c.boutique_id === boutiqueId)
    if (!order) return null
    order.statut = statut
    return order
  },
  getDashboard(boutiqueId) {
    const today = new Date()
    const todayKey = today.toISOString().slice(0, 10)
    const commandes = state.commands.filter((c) => c.boutique_id === boutiqueId)
    const ventesJour = commandes.filter((c) => c.statut !== 'annulee' && new Date(c.date).toISOString().slice(0, 10) === todayKey).reduce((s, c) => s + Number(c.total || 0), 0)
    const ventesHier = commandes.filter((c) => c.statut !== 'annulee' && new Date(c.date).toISOString().slice(0, 10) !== todayKey).reduce((s, c) => s + Number(c.total || 0), 0)
    const commandesParStatut = ['en_attente', 'confirmee', 'en_cours_livraison', 'livree', 'annulee'].map((statut) => ({ statut, count: commandes.filter((c) => c.statut === statut).length }))
    const alertesStock = state.products.filter((p) => p.boutique_id === boutiqueId && p.actif !== false && Number(p.stock_total) <= Number(p.stock_alerte)).length
    const evolution = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (6 - i))
      const day = d.toISOString().slice(0, 10)
      return { jour: day, total: commandes.filter((c) => c.statut !== 'annulee' && new Date(c.date).toISOString().slice(0, 10) === day).reduce((s, c) => s + Number(c.total || 0), 0) }
    })
    return { ventes_jour: ventesJour, ventes_hier: ventesHier, commandes: commandesParStatut, alertes_stock: alertesStock, evolution_7j: evolution }
  },
  getActiveLive(boutiqueId) {
    return state.lives.find((live) => live.boutique_id === boutiqueId && !live.fin) || null
  },
  startLive(boutiqueId, plateforme, url_stream) {
    const existing = state.lives.find((live) => live.boutique_id === boutiqueId && !live.fin)
    if (existing) {
      existing.fin = nowIso()
    }
    const live = { id: crypto.randomUUID(), boutique_id: boutiqueId, plateforme, url_stream: url_stream || null, debut: nowIso(), fin: null, total_ventes: 0 }
    state.lives.unshift(live)
    return live
  },
  endLive(boutiqueId, id) {
    const live = state.lives.find((item) => item.id === id && item.boutique_id === boutiqueId)
    if (!live) return null
    live.fin = nowIso()
    const total = state.commands.filter((c) => c.live_id === id && c.statut !== 'annulee').reduce((s, c) => s + Number(c.total || 0), 0)
    live.total_ventes = total
    return { live, stats: { nb_commandes: state.commands.filter((c) => c.live_id === id && c.statut !== 'annulee').length, total_ventes: total, nb_clients: new Set(state.commands.filter((c) => c.live_id === id).map((c) => c.client_tel)).size } }
  },
  getHistorique(boutiqueId) {
    return state.lives.filter((live) => live.boutique_id === boutiqueId && live.fin).map((live) => ({ ...live, nb_commandes: state.commands.filter((c) => c.live_id === live.id).length }))
  },
}
