<template>
  <div class="login-page">
    <div class="login-card">
      <h2 v-if="isFirstSetup">🆕 Configuration initiale</h2>
      <h2 v-else>🔐 Connexion</h2>

      <p class="subtitle" v-if="isFirstSetup">Créez le premier compte administrateur</p>

      <div v-if="isFirstSetup">
        <div class="form-group">
          <label>Nom affiché</label>
          <input v-model="setup.displayName" type="text" placeholder="Ex: Mathieu" />
        </div>
        <div class="form-group">
          <label>Nom d'utilisateur</label>
          <input v-model="setup.username" type="text" placeholder="Ex: mathieu" />
        </div>
        <div class="form-group">
          <label>Mot de passe</label>
          <input v-model="setup.password" type="password" />
        </div>
        <div class="form-group">
          <label>Confirmation</label>
          <input v-model="setup.confirmPassword" type="password" />
        </div>
        <button class="btn-primary" @click="createFirstAdmin" :disabled="!canCreate">Créer le compte</button>
      </div>

      <div v-else>
        <div class="form-group">
          <label>Nom d'utilisateur</label>
          <input v-model="loginForm.username" type="text" @keyup.enter="login" />
        </div>
        <div class="form-group">
          <label>Mot de passe</label>
          <input v-model="loginForm.password" type="password" @keyup.enter="login" />
        </div>
        <button class="btn-primary" @click="login" :disabled="!canLogin">Se connecter</button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script>
import { auth } from '../services/auth'

export default {
  name: 'Login',
  data() {
    return {
      isFirstSetup: false,
      error: '',
      loginForm: {
        username: '',
        password: ''
      },
      setup: {
        displayName: '',
        username: '',
        password: '',
        confirmPassword: ''
      }
    }
  },
  computed: {
    canLogin() {
      return this.loginForm.username && this.loginForm.password
    },
    canCreate() {
      return this.setup.displayName && this.setup.username && this.setup.password.length >= 8 && this.setup.password === this.setup.confirmPassword
    }
  },
  async mounted() {
    this.isFirstSetup = !(await auth.hasUsers())
  },
  methods: {
    async login() {
      this.error = ''
      try {
        await auth.login(this.loginForm.username, this.loginForm.password)
        this.$router.push('/dashboard')
      } catch (e) {
        this.error = e.message || 'Connexion impossible'
      }
    },
    async createFirstAdmin() {
      this.error = ''
      try {
        await auth.createFirstAdmin(this.setup.displayName, this.setup.username, this.setup.password)
        this.$router.push('/dashboard')
      } catch (e) {
        this.error = e.message || 'Création impossible'
      }
    }
  }
}
</script>

<style scoped>
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f4f6fa; }
.login-card { width: 100%; max-width: 420px; background: white; border-radius: 14px; padding: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
h2 { margin: 0 0 0.5rem 0; }
.subtitle { color: #666; margin-bottom: 1rem; }
.form-group { margin-bottom: 1rem; }
label { display: block; margin-bottom: 0.4rem; font-weight: 600; }
input { width: 100%; padding: 0.7rem; border: 1px solid #ddd; border-radius: 8px; }
.btn-primary { width: 100%; background: #4DBA87; color: white; border: none; padding: 0.75rem; border-radius: 8px; font-weight: 700; cursor: pointer; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.error { color: #b30000; margin-top: 0.75rem; }
</style>
