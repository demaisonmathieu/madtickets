<template>
  <div class="password-manager">
    <div class="page-header">
      <h2>🔐 Gestionnaire de Mots de Passe</h2>
      <div class="header-actions" v-if="isUnlocked">
        <button @click="showAddModal = true" class="btn-add">
          <span>+</span> Ajouter
        </button>
        <button @click="lockVault" class="btn-lock">🔒 Verrouiller</button>
      </div>
    </div>

    <!-- Setup / Unlock -->
    <div v-if="!isUnlocked" class="vault-lock-screen">
      <div class="vault-card">
        <h3 v-if="isFirstUse">🆕 Configurer le mot de passe maître</h3>
        <h3 v-else>🔓 Déverrouiller le coffre-fort</h3>

        <p class="vault-subtitle" v-if="isFirstUse">
          Ce mot de passe protège tous vos secrets avec AES-GCM.
        </p>
        <p class="vault-subtitle" v-else>
          Entrez votre mot de passe maître pour accéder aux mots de passe.
        </p>

        <div v-if="isFirstUse" class="vault-form">
          <div class="form-group">
            <label>Mot de passe maître *</label>
            <input v-model="setupMasterPassword" type="password" placeholder="Minimum 10 caractères" />
          </div>
          <div class="form-group">
            <label>Confirmer *</label>
            <input v-model="setupMasterPasswordConfirm" type="password" placeholder="Confirmez le mot de passe" />
          </div>
          <button @click="setupVault" class="btn btn-primary" :disabled="!canSetupVault">
            Créer le coffre-fort
          </button>
        </div>

        <div v-else class="vault-form">
          <div class="form-group">
            <label>Mot de passe maître *</label>
            <input v-model="unlockPassword" type="password" placeholder="Votre mot de passe maître" @keyup.enter="unlockVault" />
          </div>
          <button @click="unlockVault" class="btn btn-primary" :disabled="!unlockPassword">
            Déverrouiller
          </button>
        </div>

        <div v-if="unlockError" class="vault-error">{{ unlockError }}</div>
      </div>
    </div>

    <template v-else>
      <!-- Avertissement sécurité -->
      <div class="security-warning">
        <div class="warning-icon">⚠️</div>
        <div>
          <strong>Informations importantes :</strong>
          <p>Les mots de passe sont stockés localement et chiffrés avec AES-GCM via Web Crypto. Gardez votre mot de passe maître en sécurité.</p>
        </div>
      </div>

    <!-- Barre de recherche et filtres -->
    <div class="filters-bar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Rechercher..." 
          class="search-input"
        />
      </div>

      <div class="filter-tabs">
        <button 
          @click="selectedCategory = 'all'" 
          :class="['tab-btn', { active: selectedCategory === 'all' }]"
        >
          Tous ({{ passwords.length }})
        </button>
        <button 
          @click="selectedCategory = 'favorite'" 
          :class="['tab-btn', { active: selectedCategory === 'favorite' }]"
        >
          ⭐ Favoris ({{ favoriteCount }})
        </button>
        <button 
          v-for="cat in categories" 
          :key="cat" 
          @click="selectedCategory = cat"
          :class="['tab-btn', { active: selectedCategory === cat }]"
        >
          {{ getCategoryIcon(cat) }} {{ cat }} ({{ getCategoryCount(cat) }})
        </button>
      </div>
    </div>

    <!-- Liste des mots de passe -->
    <div class="passwords-grid">
      <div 
        v-for="entry in filteredPasswords" 
        :key="entry.id" 
        class="password-card"
      >
        <div class="card-header">
          <div class="title-row">
            <h3>{{ entry.title }}</h3>
            <button 
              @click="toggleFavorite(entry)" 
              class="btn-favorite"
              :class="{ active: entry.favorite }"
            >
              {{ entry.favorite ? '⭐' : '☆' }}
            </button>
          </div>
          <span class="category-badge" :style="getCategoryStyle(entry.category)">
            {{ getCategoryIcon(entry.category) }} {{ entry.category || 'Autre' }}
          </span>
        </div>

        <div class="card-body">
          <div v-if="entry.url" class="info-row">
            <span class="label">🌐 URL</span>
            <a :href="entry.url" target="_blank" class="link">{{ entry.url }}</a>
          </div>

          <div v-if="entry.username" class="info-row">
            <span class="label">👤 Identifiant</span>
            <div class="value-with-action">
              <span>{{ entry.username }}</span>
              <button @click="copyToClipboard(entry.username, 'Identifiant')" class="btn-copy">
                📋
              </button>
            </div>
          </div>

          <div class="info-row">
            <span class="label">🔑 Mot de passe</span>
            <div class="value-with-action">
              <span v-if="!showPasswords[entry.id]" class="password-hidden">••••••••</span>
              <span v-else class="password-shown">{{ decryptedPasswords[entry.id] || '••••••••' }}</span>
              <div class="action-buttons">
                <button 
                  @click="togglePasswordVisibility(entry)" 
                  class="btn-toggle"
                  :title="showPasswords[entry.id] ? 'Masquer' : 'Afficher'"
                >
                  {{ showPasswords[entry.id] ? '🙈' : '👁️' }}
                </button>
                <button 
                  @click="copyPassword(entry)" 
                  class="btn-copy"
                  title="Copier"
                >
                  📋
                </button>
              </div>
            </div>
          </div>

          <div v-if="entry.notes" class="info-row notes">
            <span class="label">📝 Notes</span>
            <span class="notes-content">{{ entry.notes }}</span>
          </div>
        </div>

        <div class="card-footer">
          <span class="date-info">Créé le {{ formatDate(entry.createdAt) }}</span>
          <div class="actions">
            <button @click="editEntry(entry)" class="btn-action btn-edit">✏️ Modifier</button>
            <button @click="deleteEntry(entry)" class="btn-action btn-delete">🗑️ Supprimer</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Message si vide -->
      <div v-if="filteredPasswords.length === 0" class="empty-state">
      <div class="empty-icon">🔐</div>
      <h3>{{ searchQuery ? 'Aucun résultat' : 'Aucun mot de passe' }}</h3>
      <p>{{ searchQuery ? 'Essayez une autre recherche' : 'Ajoutez votre premier mot de passe' }}</p>
      </div>

    <!-- Modal Ajout/Édition -->
      <div v-if="showAddModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingEntry ? '✏️ Modifier' : '➕ Nouveau mot de passe' }}</h3>
          <button @click="closeModal" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Titre *</label>
            <input v-model="formData.title" type="text" placeholder="Ex: Gmail, Facebook..." />
          </div>

          <div class="form-group">
            <label>Catégorie</label>
            <div class="category-selector">
              <button 
                v-for="cat in defaultCategories" 
                :key="cat"
                @click="formData.category = cat"
                :class="['category-btn', { active: formData.category === cat }]"
              >
                {{ getCategoryIcon(cat) }} {{ cat }}
              </button>
            </div>
            <input 
              v-model="formData.category" 
              type="text" 
              placeholder="Ou créer une catégorie..."
              class="category-custom"
            />
          </div>

          <div class="form-group">
            <label>URL</label>
            <input v-model="formData.url" type="url" placeholder="https://..." />
          </div>

          <div class="form-group">
            <label>Identifiant</label>
            <input v-model="formData.username" type="text" placeholder="nom@exemple.com" />
          </div>

          <div class="form-group">
            <label>Mot de passe *</label>
            <div class="password-input-group">
              <input 
                v-model="formData.password" 
                :type="showFormPassword ? 'text' : 'password'" 
                placeholder="Entrez le mot de passe"
              />
              <button 
                @click="showFormPassword = !showFormPassword" 
                class="btn-toggle-pw"
                type="button"
              >
                {{ showFormPassword ? '🙈' : '👁️' }}
              </button>
              <button 
                @click="generatePassword" 
                class="btn-generate"
                type="button"
                title="Générer un mot de passe"
              >
                🎲
              </button>
            </div>
            <div v-if="passwordStrength" class="password-strength">
              <div class="strength-bar" :class="passwordStrength.class">
                <div class="strength-fill" :style="{ width: passwordStrength.score + '%' }"></div>
              </div>
              <span class="strength-label" :style="{ color: passwordStrength.color }">
                {{ passwordStrength.label }}
              </span>
            </div>
          </div>

          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="formData.notes" rows="3" placeholder="Notes supplémentaires..."></textarea>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.favorite" />
              <span>⭐ Marquer comme favori</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeModal" class="btn btn-secondary">Annuler</button>
          <button @click="saveEntry" class="btn btn-primary" :disabled="!isFormValid">
            {{ editingEntry ? 'Enregistrer' : 'Ajouter' }}
          </button>
        </div>
      </div>
      </div>
    </template>
  </div>
</template>

<script>
import { db } from '../services/database-new'
import { auth } from '../services/auth'

export default {
  name: 'PasswordManager',
  data() {
    return {
      passwords: [],
      searchQuery: '',
      selectedCategory: 'all',
      showPasswords: {},
      decryptedPasswords: {},
      showAddModal: false,
      editingEntry: null,
      showFormPassword: false,
      isUnlocked: false,
      isFirstUse: false,
      setupMasterPassword: '',
      setupMasterPasswordConfirm: '',
      unlockPassword: '',
      unlockError: '',
      masterKey: null,
      currentSession: auth.getSession(),
      formData: {
        title: '',
        username: '',
        password: '',
        url: '',
        category: '',
        notes: '',
        favorite: false
      },
      defaultCategories: ['Personnel', 'Travail', 'Réseaux sociaux', 'Banque', 'Email', 'Développement']
    }
  },
  computed: {
    categories() {
      const cats = new Set()
      this.passwords.forEach(p => {
        if (p.category) cats.add(p.category)
      })
      return Array.from(cats).filter(c => !this.defaultCategories.includes(c))
    },
    favoriteCount() {
      return this.passwords.filter(p => p.favorite).length
    },
    filteredPasswords() {
      let filtered = [...this.passwords]

      // Filtre par catégorie
      if (this.selectedCategory === 'favorite') {
        filtered = filtered.filter(p => p.favorite)
      } else if (this.selectedCategory !== 'all') {
        filtered = filtered.filter(p => p.category === this.selectedCategory)
      }

      // Filtre par recherche
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(p => 
          p.title.toLowerCase().includes(query) ||
          (p.username && p.username.toLowerCase().includes(query)) ||
          (p.url && p.url.toLowerCase().includes(query)) ||
          (p.notes && p.notes.toLowerCase().includes(query))
        )
      }

      return filtered.sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1
        return a.title.localeCompare(b.title)
      })
    },
    isFormValid() {
      return this.formData.title && this.formData.password
    },
    canSetupVault() {
      return this.setupMasterPassword.length >= 10 && this.setupMasterPasswordConfirm.length >= 10
    },
    passwordStrength() {
      if (!this.formData.password) return null
      
      const pwd = this.formData.password
      let score = 0
      
      // Longueur
      if (pwd.length >= 8) score += 20
      if (pwd.length >= 12) score += 20
      if (pwd.length >= 16) score += 10
      
      // Complexité
      if (/[a-z]/.test(pwd)) score += 10
      if (/[A-Z]/.test(pwd)) score += 10
      if (/[0-9]/.test(pwd)) score += 15
      if (/[^a-zA-Z0-9]/.test(pwd)) score += 15
      
      let label, cls, color
      if (score < 40) {
        label = 'Faible'
        cls = 'weak'
        color = '#e74c3c'
      } else if (score < 70) {
        label = 'Moyen'
        cls = 'medium'
        color = '#f39c12'
      } else {
        label = 'Fort'
        cls = 'strong'
        color = '#27ae60'
      }
      
      return { score, label, class: cls, color }
    }
  },
  async mounted() {
    await this.initializeVault()
  },
  methods: {
    getMasterSaltStorageKey() {
      const userId = this.currentSession?.userId || 'anonymous'
      return `pm.master.salt.${userId}`
    },
    getMasterVerifierStorageKey() {
      const userId = this.currentSession?.userId || 'anonymous'
      return `pm.master.verifier.${userId}`
    },
    async initializeVault() {
      this.currentSession = auth.getSession()
      if (!this.currentSession) {
        this.$router.push('/login')
        return
      }

      const salt = localStorage.getItem(this.getMasterSaltStorageKey())
      const verifier = localStorage.getItem(this.getMasterVerifierStorageKey())
      this.isFirstUse = !(salt && verifier)
      this.isUnlocked = false
      this.unlockError = ''
    },
    arrayBufferToBase64(buffer) {
      let binary = ''
      const bytes = new Uint8Array(buffer)
      const chunkSize = 0x8000
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize)
        binary += String.fromCharCode.apply(null, chunk)
      }
      return btoa(binary)
    },
    base64ToArrayBuffer(base64) {
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes.buffer
    },
    async deriveKeyFromPassword(password, saltBase64) {
      const enc = new TextEncoder()
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
      )

      return await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new Uint8Array(this.base64ToArrayBuffer(saltBase64)),
          iterations: 250000,
          hash: 'SHA-256'
        },
        keyMaterial,
        {
          name: 'AES-GCM',
          length: 256
        },
        false,
        ['encrypt', 'decrypt']
      )
    },
    async encryptStringWithKey(plaintext, key) {
      const enc = new TextEncoder()
      const iv = window.crypto.getRandomValues(new Uint8Array(12))
      const cipher = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(plaintext)
      )

      const ivBase64 = this.arrayBufferToBase64(iv.buffer)
      const cipherBase64 = this.arrayBufferToBase64(cipher)
      return `v1.${ivBase64}.${cipherBase64}`
    },
    async decryptStringWithKey(payload, key) {
      if (!payload || typeof payload !== 'string') return ''

      // Compatibilité legacy (ancien base64)
      if (!payload.startsWith('v1.')) {
        try {
          return atob(payload)
        } catch {
          return payload
        }
      }

      const parts = payload.split('.')
      if (parts.length !== 3) throw new Error('Format de chiffrement invalide')

      const iv = new Uint8Array(this.base64ToArrayBuffer(parts[1]))
      const cipherBuffer = this.base64ToArrayBuffer(parts[2])

      const plainBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        cipherBuffer
      )

      return new TextDecoder().decode(plainBuffer)
    },
    async setupVault() {
      this.unlockError = ''
      if (this.setupMasterPassword.length < 10) {
        this.unlockError = 'Le mot de passe maître doit contenir au moins 10 caractères.'
        return
      }
      if (this.setupMasterPassword !== this.setupMasterPasswordConfirm) {
        this.unlockError = 'La confirmation ne correspond pas.'
        return
      }

      try {
        const salt = window.crypto.getRandomValues(new Uint8Array(16))
        const saltBase64 = this.arrayBufferToBase64(salt.buffer)
        const key = await this.deriveKeyFromPassword(this.setupMasterPassword, saltBase64)
        const verifier = await this.encryptStringWithKey('vault-verifier', key)

        localStorage.setItem(this.getMasterSaltStorageKey(), saltBase64)
        localStorage.setItem(this.getMasterVerifierStorageKey(), verifier)

        this.masterKey = key
        this.isFirstUse = false
        this.isUnlocked = true
        this.setupMasterPassword = ''
        this.setupMasterPasswordConfirm = ''
        await this.loadPasswords()
      } catch (error) {
        console.error('Erreur setup vault:', error)
        this.unlockError = 'Impossible de configurer le coffre-fort.'
      }
    },
    async unlockVault() {
      this.unlockError = ''
      try {
        const saltBase64 = localStorage.getItem(this.getMasterSaltStorageKey())
        const verifier = localStorage.getItem(this.getMasterVerifierStorageKey())

        if (!saltBase64 || !verifier) {
          this.isFirstUse = true
          this.unlockError = 'Aucune configuration trouvée. Créez un coffre-fort.'
          return
        }

        const key = await this.deriveKeyFromPassword(this.unlockPassword, saltBase64)
        const plainVerifier = await this.decryptStringWithKey(verifier, key)

        if (plainVerifier !== 'vault-verifier') {
          this.unlockError = 'Mot de passe maître incorrect.'
          return
        }

        this.masterKey = key
        this.isUnlocked = true
        this.unlockPassword = ''
        await this.loadPasswords()
      } catch (error) {
        console.error('Erreur unlock vault:', error)
        this.unlockError = 'Mot de passe maître incorrect.'
      }
    },
    lockVault() {
      this.isUnlocked = false
      this.masterKey = null
      this.showPasswords = {}
      this.decryptedPasswords = {}
      this.showAddModal = false
      this.editingEntry = null
      this.unlockPassword = ''
      this.unlockError = ''
    },
    async loadPasswords() {
      if (!this.isUnlocked) {
        this.passwords = []
        return
      }
      const all = await db.getAllPasswords()
      this.passwords = all.filter(p => p.ownerUserId === this.currentSession?.userId)
      this.showPasswords = {}
      this.decryptedPasswords = {}
    },
    async encryptPassword(password) {
      if (!this.masterKey) throw new Error('Coffre-fort verrouillé')
      return await this.encryptStringWithKey(password, this.masterKey)
    },
    async decryptPassword(encrypted) {
      if (!this.masterKey) return null
      try {
        return await this.decryptStringWithKey(encrypted, this.masterKey)
      } catch {
        return null
      }
    },
    async togglePasswordVisibility(entry) {
      const id = entry.id
      if (this.showPasswords[id]) {
        this.showPasswords = {
          ...this.showPasswords,
          [id]: false
        }
        return
      }

      const decrypted = await this.decryptPassword(entry.password)
      if (decrypted === null) {
        alert('❌ Impossible de déchiffrer ce mot de passe.')
        return
      }

      this.decryptedPasswords = {
        ...this.decryptedPasswords,
        [id]: decrypted
      }
      this.showPasswords = {
        ...this.showPasswords,
        [id]: true
      }
    },
    async copyPassword(entry) {
      let password = this.decryptedPasswords[entry.id]
      if (!password) {
        password = await this.decryptPassword(entry.password)
      }
      if (!password) {
        alert('❌ Impossible de déchiffrer ce mot de passe.')
        return
      }
      await this.copyToClipboard(password, 'Mot de passe')
    },
    async copyToClipboard(text, label) {
      try {
        await navigator.clipboard.writeText(text)
        alert(`✅ ${label} copié dans le presse-papier`)
      } catch (error) {
        console.error('Erreur de copie:', error)
        alert('❌ Erreur lors de la copie')
      }
    },
    async toggleFavorite(entry) {
      await db.updatePassword(entry.id, { favorite: !entry.favorite })
      await this.loadPasswords()
    },
    async editEntry(entry) {
      const decrypted = await this.decryptPassword(entry.password)
      if (decrypted === null) {
        alert('❌ Impossible de déchiffrer ce mot de passe.')
        return
      }
      this.editingEntry = entry
      this.formData = {
        title: entry.title,
        username: entry.username || '',
        password: decrypted,
        url: entry.url || '',
        category: entry.category || '',
        notes: entry.notes || '',
        favorite: entry.favorite || false
      }
      this.showAddModal = true
    },
    async deleteEntry(entry) {
      if (!confirm(`Supprimer "${entry.title}" ?`)) return
      
      await db.deletePassword(entry.id)
      await this.loadPasswords()
      alert('✅ Mot de passe supprimé')
    },
    async saveEntry() {
      if (!this.isFormValid) return

      const data = {
        ...this.formData,
        password: await this.encryptPassword(this.formData.password),
        ownerUserId: this.currentSession?.userId || null
      }

      try {
        if (this.editingEntry) {
          await db.updatePassword(this.editingEntry.id, data)
          alert('✅ Mot de passe mis à jour')
        } else {
          await db.addPassword(data)
          alert('✅ Mot de passe ajouté')
        }

        this.closeModal()
        await this.loadPasswords()
      } catch (error) {
        console.error('Erreur:', error)
        alert('❌ Erreur lors de l\'enregistrement')
      }
    },
    closeModal() {
      this.showAddModal = false
      this.editingEntry = null
      this.showFormPassword = false
      this.unlockError = ''
      this.formData = {
        title: '',
        username: '',
        password: '',
        url: '',
        category: '',
        notes: '',
        favorite: false
      }
    },
    generatePassword() {
      const length = 16
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
      let password = ''
      for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length))
      }
      this.formData.password = password
      this.showFormPassword = true
    },
    getCategoryIcon(category) {
      const icons = {
        'Personnel': '👤',
        'Travail': '💼',
        'Réseaux sociaux': '📱',
        'Banque': '🏦',
        'Email': '📧',
        'Développement': '💻'
      }
      return icons[category] || '📁'
    },
    getCategoryStyle(category) {
      const colors = {
        'Personnel': '#667eea',
        'Travail': '#f093fb',
        'Réseaux sociaux': '#4facfe',
        'Banque': '#43e97b',
        'Email': '#fa709a',
        'Développement': '#764ba2'
      }
      const color = colors[category] || '#718096'
      return {
        background: `linear-gradient(135deg, ${color}40, ${color}20)`,
        color: color,
        borderColor: color
      }
    },
    getCategoryCount(category) {
      return this.passwords.filter(p => p.category === category).length
    },
    formatDate(dateString) {
      if (!dateString) return ''
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }
  }
}
</script>

<style scoped>
.password-manager {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.page-header h2 {
  margin: 0;
  color: #2d3748;
  font-size: 2rem;
  font-weight: 700;
}

.btn-add {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-add:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.btn-add span {
  font-size: 1.5rem;
  line-height: 1;
}

.btn-lock {
  padding: 0.75rem 1rem;
  background: #2d3748;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-lock:hover {
  background: #1a202c;
  transform: translateY(-1px);
}

.vault-lock-screen {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.vault-card {
  width: 100%;
  max-width: 520px;
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.vault-card h3 {
  margin: 0 0 0.5rem 0;
  color: #2d3748;
}

.vault-subtitle {
  margin: 0 0 1rem 0;
  color: #4a5568;
}

.vault-form {
  margin-top: 0.5rem;
}

.vault-error {
  margin-top: 1rem;
  color: #c53030;
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 0.9rem;
}

/* Avertissement sécurité */
.security-warning {
  display: flex;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%);
  border-left: 4px solid #ffc107;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.warning-icon {
  font-size: 2rem;
}

.security-warning strong {
  color: #856404;
}

.security-warning p {
  margin: 0.5rem 0 0 0;
  color: #856404;
  font-size: 0.9rem;
}

/* Filtres */
.filters-bar {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
}

.search-box {
  position: relative;
  margin-bottom: 1.5rem;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.2rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filter-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 0.5rem 1rem;
  background: #f7fafc;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  color: #4a5568;
}

.tab-btn:hover {
  background: #e2e8f0;
}

.tab-btn.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  border-color: #667eea;
  color: #667eea;
  font-weight: 600;
}

/* Grille de mots de passe */
.passwords-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.password-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  transition: all 0.3s;
  border: 2px solid transparent;
}

.password-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
  border-color: rgba(102, 126, 234, 0.2);
}

.card-header {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f7fafc;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.title-row h3 {
  margin: 0;
  color: #2d3748;
  font-size: 1.3rem;
}

.btn-favorite {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  filter: grayscale(100%);
}

.btn-favorite.active {
  filter: grayscale(0%);
}

.btn-favorite:hover {
  transform: scale(1.2);
}

.category-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  border: 1px solid;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-row .label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #718096;
}

.link {
  color: #667eea;
  text-decoration: none;
  word-break: break-all;
}

.link:hover {
  text-decoration: underline;
}

.value-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: #f7fafc;
  border-radius: 8px;
}

.password-hidden,
.password-shown {
  flex: 1;
  font-family: monospace;
  font-size: 1.1rem;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-toggle,
.btn-copy {
  background: white;
  border: 1px solid #e2e8f0;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.2s;
}

.btn-toggle:hover,
.btn-copy:hover {
  background: #667eea;
  border-color: #667eea;
  transform: scale(1.1);
}

.notes {
  padding: 1rem;
  background: #fffbf0;
  border-left: 3px solid #f39c12;
  border-radius: 6px;
}

.notes-content {
  color: #4a5568;
  font-size: 0.9rem;
  white-space: pre-wrap;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px solid #f7fafc;
}

.date-info {
  font-size: 0.8rem;
  color: #a0aec0;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn-action {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-edit {
  background: #e6f3ff;
  color: #0066cc;
}

.btn-edit:hover {
  background: #0066cc;
  color: white;
}

.btn-delete {
  background: #fee;
  color: #c00;
}

.btn-delete:hover {
  background: #c00;
  color: white;
}

/* État vide */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
}

.empty-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: #2d3748;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #718096;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.5rem;
  color: #2d3748;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #718096;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f7fafc;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #4a5568;
  font-size: 0.9rem;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.category-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.category-btn {
  padding: 0.5rem 1rem;
  background: #f7fafc;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.category-btn:hover {
  background: #e2e8f0;
}

.category-btn.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  border-color: #667eea;
  color: #667eea;
  font-weight: 600;
}

.category-custom {
  margin-top: 0.5rem;
}

.password-input-group {
  display: flex;
  gap: 0.5rem;
}

.password-input-group input {
  flex: 1;
  margin: 0;
}

.btn-toggle-pw,
.btn-generate {
  padding: 0.75rem;
  background: #f7fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
}

.btn-toggle-pw:hover,
.btn-generate:hover {
  background: #667eea;
  border-color: #667eea;
  transform: scale(1.05);
}

.password-strength {
  margin-top: 0.75rem;
}

.strength-bar {
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.strength-fill {
  height: 100%;
  transition: all 0.3s;
}

.strength-bar.weak .strength-fill {
  background: #e74c3c;
}

.strength-bar.medium .strength-fill {
  background: #f39c12;
}

.strength-bar.strong .strength-fill {
  background: #27ae60;
}

.strength-label {
  font-size: 0.85rem;
  font-weight: 600;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
}

.checkbox-label input {
  width: auto;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #e2e8f0;
  color: #4a5568;
}

.btn-secondary:hover {
  background: #cbd5e0;
}
</style>
