<template>
  <div>
    <div class="page-header">
      <h2>🔄 Synchronisation Odoo</h2>
    </div>

    <!-- Configuration Odoo -->
    <div class="card">
      <h3>Configuration Odoo</h3>

      <div class="info-box" style="margin-bottom: 1rem;">
        <p><strong>Proxy local :</strong> l'application web ne peut pas démarrer un processus Node.js directement depuis le navigateur.</p>
        <p>Utilisez la commande unique <code>npm run dev:full</code> pour lancer le proxy et l'app ensemble.</p>
        <template v-if="recommendedProxyUrl">
          <p style="margin-top: 0.5rem;"><strong>Proxy recommandé (serveur) :</strong> <code>{{ recommendedProxyUrl }}</code></p>
          <p style="color: #555;">En production, utilisez cette URL pour éviter les blocages CORS avec Odoo.</p>
          <button type="button" class="btn btn-primary" @click="applyRecommendedProxyUrl">
            ✅ Utiliser l'URL proxy recommandée
          </button>
        </template>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.75rem;">
          <button type="button" class="btn btn-secondary" @click="copyProxyCommand">
            📋 Copier la commande
          </button>
        </div>
      </div>
      
      <div v-if="!isConfigured" class="info-box">
        <p>📝 Configurez votre connexion à Odoo pour synchroniser vos projets et tickets.</p>
      </div>

      <div class="warning-box">
        <h4>✨ Compatible Odoo 18 et 19+</h4>
        <p>Cette application détecte automatiquement votre version d'Odoo :</p>
        <ul>
          <li><strong>Odoo 19+ :</strong> Utilisez une API Key (recommandé)</li>
          <li><strong>Odoo 18 et antérieurs :</strong> Utilisez login/mot de passe ou API Key</li>
        </ul>
        <p><strong>Pour créer une API Key dans Odoo :</strong> Préférences → Sécurité du compte → Nouvelle clé API</p>
      </div>

      <form @submit.prevent="saveConfig">
        <div class="form-group">
          <label>URL Odoo *</label>
          <input 
            v-model="config.url" 
            type="url" 
            placeholder="https://votre-instance.odoo.com"
            required 
          />
          <small>L'URL de votre instance Odoo (sans / à la fin)</small>
        </div>
        
        <div class="form-group">
          <label>Base de données</label>
          <input 
            v-model="config.db" 
            placeholder="nom_de_la_base (optionnel si une seule base)"
          />
          <small>Requis uniquement si plusieurs bases de données</small>
        </div>

        <div class="form-group">
          <label>Version Odoo *</label>
          <select v-model="config.version" required>
            <option value="18">Odoo 18 ou antérieur (XML-RPC)</option>
            <option value="19">Odoo 19+ (JSON-2)</option>
          </select>
          <small>Sélectionnez votre version d'Odoo</small>
        </div>

        <div class="auth-mode">
          <label>
            <input type="radio" v-model="authMode" value="apikey" />
            API Key (Recommandé)
          </label>
          <label>
            <input type="radio" v-model="authMode" value="password" />
            Login/Mot de passe
          </label>
        </div>
        
        <div v-if="authMode === 'apikey'" class="form-group">
          <label>API Key *</label>
          <input 
            v-model="config.apiKey" 
            type="password"
            placeholder="Votre clé API Odoo"
            :required="authMode === 'apikey'"
          />
          <small>📝 Créez votre API Key dans Odoo : Préférences → Sécurité du compte → Nouvelle clé API</small>
        </div>

        <div v-if="authMode === 'password'">
          <div class="form-group">
            <label>Login *</label>
            <input 
              v-model="config.username" 
              type="email"
              placeholder="utilisateur@example.com"
              :required="authMode === 'password'"
            />
          </div>
          
          <div class="form-group">
            <label>Mot de passe *</label>
            <input 
              v-model="config.password" 
              type="password"
              :required="authMode === 'password'"
            />
            <small>⚠️ Stocké localement dans le navigateur</small>
          </div>
        </div>

        <div style="display: flex; gap: 1rem;">
          <button type="submit" class="btn btn-primary">💾 Enregistrer la configuration</button>
          <button 
            v-if="isConfigured" 
            type="button" 
            @click="testConnection" 
            class="btn btn-secondary"
            :disabled="testing"
          >
            {{ testing ? '⏳ Test...' : '🔌 Tester la connexion' }}
          </button>
          <button 
            v-if="isConfigured" 
            type="button" 
            @click="clearConfig" 
            class="btn btn-danger"
          >
            🗑️ Effacer
          </button>
        </div>
      </form>

      <div v-if="connectionStatus" class="status-message" :class="connectionStatus.type">
        {{ connectionStatus.message }}
      </div>
    </div>

    <!-- Synchronisation -->
    <div v-if="isConfigured" class="card">
      <h3>Synchronisation des données</h3>

      <div class="sync-scope-box">
        <h4>🎯 Import ciblé par projet</h4>
        <p>Sélectionnez un projet pour importer uniquement ses tickets et ses feuilles de temps.</p>
        <div class="sync-scope-actions">
          <select v-model="selectedProjectId">
            <option value="">Tous les projets</option>
            <option v-for="project in localProjectsWithOdoo" :key="project.id" :value="String(project.id)">
              {{ project.name }}
            </option>
          </select>
          <button
            @click="syncTasks"
            class="btn btn-secondary"
            :disabled="syncing || !selectedProjectId"
          >
            {{ syncing ? '⏳ Sync...' : '🎫 Importer tickets du projet' }}
          </button>
          <button
            @click="syncAllTimeEntries"
            class="btn btn-secondary"
            :disabled="syncing || !selectedProjectId"
          >
            {{ syncing ? '⏳ Sync...' : '⏱️ Importer temps du projet' }}
          </button>
        </div>
      </div>
      
      <div class="sync-options">
        <div class="sync-item">
          <div class="sync-info">
            <h4>📁 Projets</h4>
            <p>Importer tous les projets et leurs étapes depuis Odoo</p>
          </div>
          <button 
            @click="syncProjects" 
            class="btn btn-primary"
            :disabled="syncing"
          >
            {{ syncing ? '⏳ Sync...' : '🔄 Synchroniser' }}
          </button>
        </div>

        <div class="sync-item">
          <div class="sync-info">
            <h4>🎫 Tickets</h4>
            <p>Importer tous les tickets depuis Odoo</p>
          </div>
          <button 
            @click="syncTasks" 
            class="btn btn-primary"
            :disabled="syncing"
          >
            {{ syncing ? '⏳ Sync...' : '🔄 Synchroniser' }}
          </button>
        </div>

        <div class="sync-item">
          <div class="sync-info">
            <h4>⏱️ Feuilles de temps</h4>
            <p>Importer toutes les feuilles de temps des tickets synchronisés</p>
          </div>
          <button 
            @click="syncAllTimeEntries" 
            class="btn btn-primary"
            :disabled="syncing"
          >
            {{ syncing ? '⏳ Sync...' : '🔄 Synchroniser' }}
          </button>
        </div>

        <div class="sync-item">
          <div class="sync-info">
            <h4>🔄 Synchronisation complète</h4>
            <p>Importer projets, tickets et feuilles de temps en une fois</p>
          </div>
          <button 
            @click="syncAll" 
            class="btn btn-success"
            :disabled="syncing"
          >
            {{ syncing ? '⏳ Sync...' : '⚡ Tout synchroniser' }}
          </button>
        </div>
      </div>

      <div v-if="syncStatus" class="status-message" :class="syncStatus.type">
        {{ syncStatus.message }}
      </div>

      <div v-if="timeEntriesProgress" class="progress-info">
        <p>{{ timeEntriesProgress }}</p>
      </div>
    </div>

    <!-- Export vers Odoo -->
    <div v-if="isConfigured" class="card">
      <h3>⬆️ Exporter un projet vers Odoo</h3>
      <p style="color: #666; margin-bottom: 1rem;">
        Poussez un projet local vers Odoo. Si le projet possède déjà un identifiant Odoo, il sera mis à jour ; sinon un nouveau projet sera créé.
      </p>

      <div class="sync-scope-actions" style="align-items: flex-end; gap: 1rem; flex-wrap: wrap;">
        <div class="form-group" style="margin: 0; flex: 1; min-width: 220px;">
          <label>Projet local à exporter</label>
          <select v-model="pushProjectId">
            <option value="">-- Choisir un projet --</option>
            <option v-for="project in allLocalProjects" :key="project.id" :value="String(project.id)">
              {{ project.name }}{{ project.odooId ? ' (déjà lié · ID Odoo ' + project.odooId + ')' : ' (nouveau)' }}
            </option>
          </select>
        </div>
        <button
          @click="pushProjectToOdoo"
          class="btn btn-primary"
          :disabled="pushing || !pushProjectId"
          style="white-space: nowrap;"
        >
          {{ pushing ? '⏳ Export...' : '⬆️ Exporter vers Odoo' }}
        </button>
      </div>

      <div v-if="pushStatus" class="status-message" :class="pushStatus.type" style="margin-top: 1rem;">
        {{ pushStatus.message }}
      </div>
    </div>

    <!-- Statistiques -->
    <div v-if="stats" class="card">
      <h3>📊 Statistiques de synchronisation</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.projects }}</div>
          <div class="stat-label">Projets importés</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.tasks }}</div>
          <div class="stat-label">Tickets importés</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.lastSync }}</div>
          <div class="stat-label">Dernière sync</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { odooService } from '../services/odoo-new'
import { db } from '../services/database-new'
import { auth } from '../services/auth'

export default {
  name: 'OdooSync',
  computed: {
    recommendedProxyUrl() {
      if (!this.currentOrigin) return ''
      if (this.currentOrigin.includes('localhost')) return ''
      return `${this.currentOrigin}/odoo`
    }
  },
  data() {
    return {
      config: {
        url: '',
        db: '',
        apiKey: '',
        username: '',
        password: '',
        version: '18'
      },
      authMode: 'apikey',
      isConfigured: false,
      testing: false,
      syncing: false,
      connectionStatus: null,
      syncStatus: null,
      stats: null,
      currentOrigin: window.location.origin,
      timeEntriesProgress: null,
      localProjectsWithOdoo: [],
      selectedProjectId: '',
      // Export vers Odoo
      allLocalProjects: [],
      pushProjectId: '',
      pushing: false,
      pushStatus: null
    }
  },
  mounted() {
    // Recharger la config Odoo pour l'utilisateur courant
    odooService.loadConfig()
    this.loadConfig()
    if (!this.config.url && this.recommendedProxyUrl) {
      this.config.url = this.recommendedProxyUrl
    }
    this.loadLocalProjectsWithOdoo()
    this.loadAllLocalProjects()
  },
  methods: {
    applyRecommendedProxyUrl() {
      if (!this.recommendedProxyUrl) return
      this.config.url = this.recommendedProxyUrl
      this.connectionStatus = {
        type: 'success',
        message: `✅ URL proxy appliquée: ${this.recommendedProxyUrl}`
      }
      setTimeout(() => this.connectionStatus = null, 3000)
    },
    async loadLocalProjectsWithOdoo() {
      try {
        const allProjects = await db.getAllProjects()
        this.localProjectsWithOdoo = allProjects.filter(p => p.odooId)
        if (this.selectedProjectId) {
          const exists = this.localProjectsWithOdoo.some(p => p.id === Number(this.selectedProjectId))
          if (!exists) {
            this.selectedProjectId = ''
          }
        }
      } catch (error) {
        console.error('[Sync] Erreur chargement projets locaux:', error)
        this.localProjectsWithOdoo = []
        this.selectedProjectId = ''
      }
    },
    async loadAllLocalProjects() {
      try {
        this.allLocalProjects = await db.getAllProjects()
      } catch (error) {
        console.error('[Sync] Erreur chargement de tous les projets:', error)
        this.allLocalProjects = []
      }
    },
    getSelectedProject() {
      if (!this.selectedProjectId) return null
      return this.localProjectsWithOdoo.find(p => p.id === Number(this.selectedProjectId)) || null
    },
    mapOdooTaskStatusToProjectColumn(odooTask, localProject) {
      const projectColumns = localProject?.kanbanColumns || []
      if (projectColumns.length === 0) return odooTask.status

      const stageName = String(odooTask.stageName || '').toLowerCase()
      const isDone =
        odooTask._forcedDone === true ||
        odooTask.status === 'done' ||
        stageName.includes('done') ||
        stageName.includes('ferm') ||
        stageName.includes('termin') ||
        stageName.includes('clos') ||
        stageName.includes('résolu') ||
        stageName.includes('resolu')

      // Priorité absolue: si terminé côté Odoo, toujours mapper vers une colonne finale
      if (isDone) {
        const doneColumns = projectColumns.filter(c => {
          const id = String(c.id || '').toLowerCase()
          const label = String(c.label || '').toLowerCase()
          return (
            id.includes('done') ||
            id.includes('close') ||
            id.includes('term') ||
            label.includes('done') ||
            label.includes('clos') ||
            label.includes('ferm') ||
            label.includes('termin') ||
            label.includes('résolu') ||
            label.includes('resolu')
          )
        })

        // Si plusieurs colonnes finales, garder la correspondance exacte d'étape quand possible
        if (odooTask.stageOdooId) {
          const exactDone = doneColumns.find(c => c.odooStageId === odooTask.stageOdooId)
          if (exactDone) return exactDone.id
        }

        if (doneColumns.length > 0) {
          return doneColumns[0].id
        }

        return 'done'
      }

      // 1) Priorité au mapping exact par étape Odoo (supporte plusieurs étapes "done")
      if (odooTask.stageOdooId) {
        const byStageId = projectColumns.find(c => c.odooStageId === odooTask.stageOdooId)
        if (byStageId) return byStageId.id
      }

      if (odooTask.stageName) {
        const normalized = String(odooTask.stageName).trim().toLowerCase()
        const byLabel = projectColumns.find(c => String(c.label || '').trim().toLowerCase() === normalized)
        if (byLabel) return byLabel.id
      }

      return odooTask.status
    },
    async copyProxyCommand() {
      try {
        await navigator.clipboard.writeText('npm run dev:full')
        this.connectionStatus = {
          type: 'success',
          message: '✅ Commande copiée : npm run dev:full'
        }
        setTimeout(() => this.connectionStatus = null, 3000)
      } catch (_error) {
        this.connectionStatus = {
          type: 'error',
          message: '❌ Impossible de copier automatiquement. Utilisez : npm run dev:full'
        }
      }
    },
    getStorageKey() {
      try {
        const session = auth.getSession()
        if (session?.userId) {
          return `odoo-config-${session.userId}`
        }
      } catch {}
      return 'odoo-config'
    },
    loadConfig() {
      const saved = localStorage.getItem(this.getStorageKey())
      if (saved) {
        const parsed = JSON.parse(saved)
        this.config = { ...this.config, ...parsed }
        // Assurer la compatibilité avec les anciennes configs
        if (!this.config.version) {
          this.config.version = '18'
        }
        this.isConfigured = true
        this.authMode = parsed.apiKey ? 'apikey' : 'password'
      } else {
        // Réinitialiser le formulaire si aucune config pour cet utilisateur
        this.config = { url: '', db: '', apiKey: '', username: '', password: '', version: '18' }
        this.authMode = 'apikey'
        this.isConfigured = false
      }
    },
    saveConfig() {
      odooService.saveConfig(
        this.config.url,
        this.config.db,
        this.authMode === 'apikey' ? this.config.apiKey : null,
        this.authMode === 'password' ? this.config.username : null,
        this.authMode === 'password' ? this.config.password : null
      )
      odooService.setVersion(this.config.version)
      this.isConfigured = true
      this.connectionStatus = {
        type: 'success',
        message: '✅ Configuration enregistrée avec succès'
      }
      setTimeout(() => this.connectionStatus = null, 3000)
    },
    clearConfig() {
      if (confirm('Êtes-vous sûr de vouloir supprimer la configuration Odoo ?')) {
        odooService.clearConfig()
        this.config = { url: '', db: '', apiKey: '', username: '', password: '', version: '18' }
        this.authMode = 'apikey'
        this.isConfigured = false
        this.connectionStatus = null
        this.syncStatus = null
        this.stats = null
      }
    },
    async testConnection() {
      this.testing = true
      this.connectionStatus = null
      
      try {
        await odooService.testConnection()
        this.connectionStatus = {
          type: 'success',
          message: '✅ Connexion réussie à Odoo !'
        }
      } catch (error) {
        this.connectionStatus = {
          type: 'error',
          message: `❌ Erreur de connexion: ${error.message}`
        }
      } finally {
        this.testing = false
      }
    },
    async syncProjects() {
      this.syncing = true
      this.syncStatus = null
      
      try {
        const odooProjects = await odooService.getProjects()
        console.log('[Sync] Projets Odoo récupérés:', odooProjects.length)
        console.log('[Sync] Premier projet Odoo:', odooProjects[0])
        
        // Importer les projets
        let imported = 0
        for (const odooProject of odooProjects) {
          console.log('[Sync] Import projet:', { name: odooProject.name, odooId: odooProject.odooId })

          let projectPayload = { ...odooProject }
          try {
            const stageColumns = await odooService.getProjectStages(odooProject.odooId)
            if (Array.isArray(stageColumns) && stageColumns.length > 0) {
              projectPayload.kanbanColumns = stageColumns
            }
          } catch (stageError) {
            console.warn('[Sync] Étapes projet non récupérées:', odooProject.odooId, stageError)
          }
          
          // Vérifier si le projet existe déjà (par odooId)
          const allProjects = await db.getAllProjects()
          const existing = allProjects.find(p => p.odooId === odooProject.odooId)
          
          if (existing) {
            console.log('[Sync] Mise à jour projet existant:', existing.id)
            await db.updateProject(existing.id, projectPayload)
          } else {
            console.log('[Sync] Création nouveau projet')
            const projectId = await db.addProject(projectPayload)
            console.log('[Sync] Projet créé avec ID:', projectId)
            
            // Vérifier que le projet a bien été créé avec odooId
            const createdProject = await db.getProject(projectId)
            console.log('[Sync] Projet créé vérifié:', createdProject)
          }
          imported++
        }
        
        this.syncStatus = {
          type: 'success',
          message: `✅ ${imported} projet(s) synchronisé(s) avec succès`
        }
        
        this.updateStats(imported, 0)
        await this.loadLocalProjectsWithOdoo()
      } catch (error) {
        console.error('[Sync] Erreur:', error)
        this.syncStatus = {
          type: 'error',
          message: `❌ Erreur: ${error.message}`
        }
      } finally {
        this.syncing = false
      }
    },
    async syncTasks() {
      this.syncing = true
      this.syncStatus = null
      
      try {
        const selectedProject = this.getSelectedProject()

        // Récupérer tous les projets locaux pour obtenir leurs odooId
        const allProjects = await db.getAllProjects()
        console.log('[Sync] Projets locaux:', allProjects.length)
        
        if (allProjects.length === 0) {
          this.syncStatus = {
            type: 'warning',
            message: '⚠️ Aucun projet local trouvé. Synchronisez d\'abord les projets.'
          }
          this.syncing = false
          return
        }
        
        // Extraire les odooId des projets locaux (ou du projet sélectionné)
        const projectsToSync = selectedProject
          ? allProjects.filter(p => p.id === selectedProject.id)
          : allProjects

        const teamIds = projectsToSync
          .filter(p => p.odooId)
          .map(p => p.odooId)
        
        console.log('[Sync] IDs Odoo des projets locaux:', teamIds)
        
        if (teamIds.length === 0) {
          this.syncStatus = {
            type: 'warning',
            message: '⚠️ Aucun projet avec odooId trouvé. Synchronisez d\'abord les projets depuis Odoo.'
          }
          this.syncing = false
          return
        }
        
        // Récupérer les tickets Odoo pour ces équipes
        const odooTasks = await odooService.getTasks(teamIds)
        console.log('[Sync] Tâches Odoo récupérées:', odooTasks.length)
        
        let imported = 0
        let skipped = 0
        const allTickets = await db.getAllTickets()
        const stageDoneCache = new Map()
        const closedStageIdsByProject = new Map()
        
        for (const odooTask of odooTasks) {
          // Trouver le projet local correspondant
          const localProject = allProjects.find(p => p.odooId === odooTask.projectOdooId)
          
          if (localProject) {
            const rawStageName = String(odooTask.stageName || '').toLowerCase()
            let forceDone =
              rawStageName.includes('ferm') ||
              rawStageName.includes('clos') ||
              rawStageName.includes('termin')

            if (!forceDone && localProject.odooId) {
              if (!closedStageIdsByProject.has(localProject.odooId)) {
                const closedIds = await odooService.getClosedStageIdsByProject(localProject.odooId)
                closedStageIdsByProject.set(localProject.odooId, new Set(closedIds))
              }

              if (odooTask.stageOdooId) {
                const closedSet = closedStageIdsByProject.get(localProject.odooId)
                if (closedSet && closedSet.has(odooTask.stageOdooId)) {
                  forceDone = true
                }
              }
            }

            if (!forceDone && odooTask.stageOdooId) {
              if (!stageDoneCache.has(odooTask.stageOdooId)) {
                const isClosedStage = await odooService.isHelpdeskStageClosed(odooTask.stageOdooId)
                stageDoneCache.set(odooTask.stageOdooId, isClosedStage)
              }
              forceDone = !!stageDoneCache.get(odooTask.stageOdooId)
            }

            const taskData = {
              title: odooTask.title,
              description: odooTask.description,
              projectId: localProject.id,
              status: this.mapOdooTaskStatusToProjectColumn({ ...odooTask, _forcedDone: forceDone }, localProject),
              priority: odooTask.priority,
              odooId: odooTask.odooId,
              createdAt: odooTask.createdAt,
              updatedAt: odooTask.updatedAt
            }
            
            // Vérifier si le ticket existe déjà
            const existing = allTickets.find(t => t.odooId === odooTask.odooId)
            
            if (existing) {
              await db.updateTicket(existing.id, taskData)
            } else {
              await db.addTicket(taskData)
            }
            imported++
          } else {
            console.warn('[Sync] Projet local introuvable pour la tâche:', odooTask.title, 'Project Odoo ID:', odooTask.projectOdooId)
            skipped++
          }
        }
        
        console.log('[Sync] Résultat:', { imported, skipped })
        
        const targetLabel = selectedProject ? ` pour le projet "${selectedProject.name}"` : ''

        if (skipped > 0) {
          this.syncStatus = {
            type: 'warning',
            message: `✅ ${imported} ticket(s) synchronisé(s)${targetLabel}. ⚠️ ${skipped} ticket(s) ignoré(s) (projets non synchronisés)`
          }
        } else {
          this.syncStatus = {
            type: 'success',
            message: `✅ ${imported} ticket(s) synchronisé(s) avec succès${targetLabel}`
          }
        }
        
        this.updateStats(0, imported)
      } catch (error) {
        console.error('[Sync] Erreur:', error)
        this.syncStatus = {
          type: 'error',
          message: `❌ Erreur: ${error.message}`
        }
      } finally {
        this.syncing = false
      }
    },
    async syncAllTimeEntries() {
      this.syncing = true
      this.syncStatus = null
      this.timeEntriesProgress = null
      
      try {
        const selectedProject = this.getSelectedProject()

        // Récupérer tous les tickets synchronisés (qui ont un odooId)
        let sourceTickets = []
        if (selectedProject) {
          sourceTickets = await db.getTicketsByProject(selectedProject.id)
        } else {
          sourceTickets = await db.getAllTickets()
        }

        const syncedTickets = sourceTickets.filter(t => t.odooId)
        
        if (syncedTickets.length === 0) {
          const targetLabel = selectedProject ? ` pour le projet "${selectedProject.name}"` : ''
          this.syncStatus = {
            type: 'warning',
            message: `⚠️ Aucun ticket synchronisé trouvé${targetLabel}. Synchronisez d'abord les tickets.`
          }
          this.syncing = false
          return
        }
        
        this.timeEntriesProgress = `Import en cours... 0/${syncedTickets.length} tickets traités`
        
        let totalImported = 0
        let ticketsProcessed = 0
        
        for (const ticket of syncedTickets) {
          try {
            // Récupérer les feuilles de temps depuis Odoo pour ce ticket
            const odooTimes = await odooService.getTicketTimeEntries(ticket.odooId)
            
            for (const odooTime of odooTimes) {
              // Vérifier si cette entrée n'existe pas déjà (par odooId)
              const existingEntries = await db.getTimeEntriesByTicket(ticket.id)
              const alreadyExists = existingEntries.some(e => e.odooId === odooTime.id)
              
              if (!alreadyExists) {
                // Importer l'entrée
                await db.addTimeEntry({
                  ticketId: ticket.id,
                  duration: Math.round(odooTime.unit_amount * 60), // heures -> minutes
                  date: odooTime.date,
                  description: odooTime.name || '',
                  synced: true,
                  odooId: odooTime.id
                })
                totalImported++
              }
            }
            
            ticketsProcessed++
            this.timeEntriesProgress = `Import en cours... ${ticketsProcessed}/${syncedTickets.length} tickets traités (${totalImported} entrées importées)`
          } catch (error) {
            console.error(`Erreur lors de l'import des temps pour le ticket ${ticket.id}:`, error)
            // Continuer avec les autres tickets
          }
        }
        
        this.timeEntriesProgress = null
        const targetLabel = selectedProject ? ` du projet "${selectedProject.name}"` : ''
        this.syncStatus = {
          type: 'success',
          message: `✅ ${totalImported} feuille(s) de temps importée(s)${targetLabel} depuis ${ticketsProcessed} ticket(s)`
        }
      } catch (error) {
        console.error('[Sync] Erreur:', error)
        this.timeEntriesProgress = null
        this.syncStatus = {
          type: 'error',
          message: `❌ Erreur: ${error.message}`
        }
      } finally {
        this.syncing = false
      }
    },
    async syncAll() {
      this.syncing = true
      this.syncStatus = null
      
      try {
        // D'abord les projets
        await this.syncProjects()
        
        // Puis les tickets
        await this.syncTasks()
        
        // Enfin les feuilles de temps
        await this.syncAllTimeEntries()
        
        this.syncStatus = {
          type: 'success',
          message: '✅ Synchronisation complète réussie !'
        }
      } catch (error) {
        this.syncStatus = {
          type: 'error',
          message: `❌ Erreur: ${error.message}`
        }
      } finally {
        this.syncing = false
      }
    },
    updateStats(projects, tasks) {
      const existing = this.stats || { projects: 0, tasks: 0 }
      this.stats = {
        projects: existing.projects + projects,
        tasks: existing.tasks + tasks,
        lastSync: new Date().toLocaleString('fr-FR')
      }
    },
    async pushProjectToOdoo() {
      if (!this.pushProjectId) return
      this.pushing = true
      this.pushStatus = null

      try {
        const project = this.allLocalProjects.find(p => p.id === Number(this.pushProjectId))
        if (!project) throw new Error('Projet introuvable')

        const odooId = await odooService.pushProject({
          name: project.name,
          description: project.description || '',
          status: project.status,
          odooId: project.odooId || null
        })

        const wasNew = !project.odooId

        // Sauvegarder l'odooId dans la base locale si nouvelle création
        if (wasNew) {
          await db.updateProject(project.id, { odooId })
          await this.loadAllLocalProjects()
          await this.loadLocalProjectsWithOdoo()
        }

        this.pushStatus = {
          type: 'success',
          message: wasNew
            ? `✅ Projet "${project.name}" créé dans Odoo (ID ${odooId})`
            : `✅ Projet "${project.name}" mis à jour dans Odoo (ID ${odooId})`
        }
      } catch (error) {
        console.error('[Push] Erreur:', error)
        this.pushStatus = {
          type: 'error',
          message: `❌ Erreur : ${error.message}`
        }
      } finally {
        this.pushing = false
      }
    }
  }
}
</script>

<style scoped>
.page-header {
  margin-bottom: 2rem;
}

.info-box {
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 4px;
}

.info-box p {
  margin: 0;
  color: #1976d2;
}

.warning-box {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 4px;
}

.warning-box.error {
  background: #f8d7da;
  border-left: 4px solid #dc3545;
}

.warning-box h4 {
  margin: 0 0 0.5rem 0;
  color: #856404;
}

.warning-box.error h4 {
  color: #721c24;
}

.warning-box p {
  margin: 0.5rem 0;
  color: #856404;
}

.warning-box.error p {
  color: #721c24;
}

.warning-box ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  color: #856404;
}

.auth-mode {
  display: flex;
  gap: 2rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.auth-mode label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
}

.auth-mode input[type="radio"] {
  cursor: pointer;
}

.code-block {
  background: #f8f9fa;
  padding: 0.75rem;
  border-radius: 4px;
  margin: 0.5rem 0;
  border: 1px solid #dee2e6;
  font-family: 'Courier New', monospace;
}

.code-block code {
  display: block;
  color: #333;
  line-height: 1.51.5rem;
  color: #155724;
}

.warning-box code {
  background: #f8f9fa;
  padding: 0.125rem 0.25rem;
  border-radius: 2px;
  font-family: 'Courier New', monospace;
  color: #333;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: #666;
  font-size: 0.875rem;
}

.status-message {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 4px;
  font-weight: 500;
}

.status-message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.sync-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sync-scope-box {
  margin-bottom: 1rem;
  padding: 1rem;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background: #f8f9fa;
}

.sync-scope-box h4 {
  margin: 0 0 0.5rem 0;
}

.sync-scope-box p {
  margin: 0 0 0.75rem 0;
  color: #666;
  font-size: 0.9rem;
}

.sync-scope-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.sync-scope-actions select {
  min-width: 260px;
}

.sync-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.sync-info h4 {
  margin: 0 0 0.25rem 0;
}

.sync-info p {
  margin: 0;
  color: #666;
  font-size: 0.875rem;
}

.btn-success {
  background: #27ae60;
  color: white;
}

.btn-success:hover {
  background: #229954;
}

.btn-success:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.stat-card {
  text-align: center;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #4DBA87;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: #666;
  font-size: 0.875rem;
}

.progress-info {
  margin-top: 1rem;
  padding: 1rem;
  background: #e7f3ff;
  border-left: 4px solid #2196F3;
  border-radius: 4px;
  color: #0c5460;
  font-weight: 500;
}

.progress-info p {
  margin: 0;
}
</style>
