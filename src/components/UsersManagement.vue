<template>
  <div class="users-page">
    <div class="header">
      <h2>👥 Utilisateurs</h2>
      <button class="btn" @click="openCreate">+ Ajouter</button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Username</th>
            <th>Rôle</th>
            <th>Actif</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.displayName }}</td>
            <td>{{ u.username }}</td>
            <td>{{ u.role }}</td>
            <td>{{ u.active === false ? 'Non' : 'Oui' }}</td>
            <td>
              <button @click="edit(u)">✏️</button>
              <button @click="toggleActive(u)">{{ u.active === false ? '✅' : '⛔' }}</button>
              <button @click="resetPassword(u)">🔑</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="overlay" @click.self="close">
      <div class="modal">
        <h3>{{ editing ? 'Modifier utilisateur' : 'Nouvel utilisateur' }}</h3>
        <div class="form-group">
          <label>Nom</label>
          <input v-model="form.displayName" type="text" />
        </div>
        <div class="form-group">
          <label>Username</label>
          <input v-model="form.username" type="text" :disabled="!!editing" />
        </div>
        <div class="form-group">
          <label>Rôle</label>
          <select v-model="form.role">
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <div class="form-group" v-if="!editing">
          <label>Mot de passe</label>
          <input v-model="form.password" type="password" />
        </div>
        <div class="actions">
          <button @click="close">Annuler</button>
          <button class="btn" @click="save" :disabled="!canSave">Enregistrer</button>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../services/database-new'
import { auth } from '../services/auth'

export default {
  name: 'UsersManagement',
  data() {
    return {
      users: [],
      showModal: false,
      editing: null,
      error: '',
      form: {
        displayName: '',
        username: '',
        role: 'user',
        password: ''
      }
    }
  },
  computed: {
    canSave() {
      if (!this.form.displayName || !this.form.username) return false
      if (!this.editing && this.form.password.length < 8) return false
      return true
    }
  },
  async mounted() {
    await this.load()
  },
  methods: {
    async load() {
      this.users = await db.getAllUsers()
    },
    openCreate() {
      this.error = ''
      this.editing = null
      this.form = { displayName: '', username: '', role: 'user', password: '' }
      this.showModal = true
    },
    edit(u) {
      this.error = ''
      this.editing = u
      this.form = { displayName: u.displayName, username: u.username, role: u.role, password: '' }
      this.showModal = true
    },
    close() {
      this.showModal = false
      this.editing = null
    },
    async save() {
      this.error = ''
      try {
        if (this.editing) {
          await db.updateUser(this.editing.id, {
            displayName: this.form.displayName,
            role: this.form.role
          })
        } else {
          await auth.createUser(this.form.displayName, this.form.username, this.form.password, this.form.role)
        }
        this.close()
        await this.load()
      } catch (e) {
        this.error = e.message || 'Erreur'
      }
    },
    async toggleActive(u) {
      await db.updateUser(u.id, { active: u.active === false ? true : false })
      await this.load()
    },
    async resetPassword(u) {
      const pwd = prompt(`Nouveau mot de passe pour ${u.username}`)
      if (!pwd || pwd.length < 8) return
      await auth.changeUserPassword(u.id, pwd)
      alert('Mot de passe mis à jour')
    }
  }
}
</script>

<style scoped>
.users-page { padding: 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.btn { background: #4DBA87; color: white; border: none; padding: 0.5rem 0.9rem; border-radius: 8px; cursor: pointer; }
.table-wrap { background: white; border-radius: 10px; padding: 1rem; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.6rem; border-bottom: 1px solid #eee; text-align: left; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display:flex; justify-content:center; align-items:center; }
.modal { width: 100%; max-width: 460px; background: white; border-radius: 10px; padding: 1rem; }
.form-group { margin-bottom: 0.8rem; }
label { display:block; margin-bottom: 0.3rem; font-weight: 600; }
input,select { width:100%; padding:0.6rem; border:1px solid #ddd; border-radius:8px; }
.actions { display:flex; justify-content:flex-end; gap:0.5rem; }
.error { color:#b30000; margin-top:0.5rem; }
</style>
