<template>
  <div class="pwa-status">
    <!-- Indicateur de connexion -->
    <div class="connection-status" :class="{ offline: !isOnline }">
      <span v-if="isOnline">🟢 En ligne</span>
      <span v-else>🔴 Hors ligne</span>
    </div>

    <!-- Notification de mise à jour disponible -->
    <div v-if="updateAvailable" class="update-notification">
      <p>✨ Une nouvelle version est disponible !</p>
      <button @click="updateApp" class="btn btn-primary btn-sm">Mettre à jour</button>
      <button @click="updateAvailable = false" class="btn btn-secondary btn-sm">Plus tard</button>
    </div>

    <!-- Notification PWA installable -->
    <div v-if="deferredPrompt && !isInstalled" class="install-notification">
      <p>📱 Installer l'application sur votre appareil</p>
      <button @click="installPWA" class="btn btn-primary btn-sm">Installer</button>
      <button @click="dismissInstall" class="btn btn-secondary btn-sm">Non merci</button>
    </div>

    <!-- Notification d'installation réussie -->
    <div v-if="installSuccess" class="success-notification">
      <p>✅ Application installée avec succès !</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PWAStatus',
  data() {
    return {
      isOnline: navigator.onLine,
      updateAvailable: false,
      deferredPrompt: null,
      isInstalled: false,
      installSuccess: false
    }
  },
  mounted() {
    // Écouter les changements de connexion
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)

    // Écouter l'événement beforeinstallprompt
    window.addEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt)

    // Vérifier si l'app est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true
    }

    // Écouter l'événement d'installation
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true
      this.deferredPrompt = null
      this.installSuccess = true
      setTimeout(() => {
        this.installSuccess = false
      }, 5000)
    })
  },
  beforeUnmount() {
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    window.removeEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt)
  },
  methods: {
    handleOnline() {
      this.isOnline = true
      console.log('🟢 Connexion rétablie')
    },
    handleOffline() {
      this.isOnline = false
      console.log('🔴 Connexion perdue - Mode hors ligne activé')
    },
    handleBeforeInstallPrompt(e) {
      // Empêcher la mini-infobar par défaut
      e.preventDefault()
      // Sauvegarder l'événement pour l'utiliser plus tard
      this.deferredPrompt = e
      console.log('💡 PWA peut être installée')
    },
    async installPWA() {
      if (!this.deferredPrompt) {
        return
      }

      // Afficher la prompt d'installation
      this.deferredPrompt.prompt()

      // Attendre la réponse de l'utilisateur
      const { outcome } = await this.deferredPrompt.userChoice
      console.log(`Installation ${outcome === 'accepted' ? 'acceptée' : 'refusée'}`)

      // Réinitialiser la prompt
      this.deferredPrompt = null
    },
    dismissInstall() {
      this.deferredPrompt = null
      localStorage.setItem('pwa-install-dismissed', Date.now())
    },
    updateApp() {
      // Cette fonction sera appelée depuis le parent si nécessaire
      this.$emit('update')
      this.updateAvailable = false
    }
  }
}
</script>

<style scoped>
.pwa-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.connection-status {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
  display: inline-block;
}

.connection-status.offline {
  border-color: #dc3545;
  background: rgba(220, 53, 69, 0.2);
}

.update-notification,
.install-notification,
.success-notification {
  position: fixed;
  top: 80px;
  right: 10px;
  max-width: 350px;
  background: #fff;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out;
  z-index: 2000;
}

.update-notification {
  border-left: 4px solid #17a2b8;
}

.install-notification {
  border-left: 4px solid #4DBA87;
}

.success-notification {
  border-left: 4px solid #28a745;
}

.update-notification p,
.install-notification p,
.success-notification p {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  color: #333;
}

.update-notification button,
.install-notification button {
  margin-right: 0.5rem;
  margin-top: 0.5rem;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .pwa-status {
    left: 10px;
    right: 10px;
    max-width: none;
  }
  
  .connection-status {
    display: block;
    text-align: center;
  }
}
</style>
