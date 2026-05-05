<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h2>⚙️ Administration</h2>
        <p class="subtitle">Gestion des utilisateurs, synchronisation Odoo et configuration mail</p>
      </div>
      <button class="btn btn-secondary" @click="$router.back()">← Retour</button>
    </div>

    <!-- Onglets -->
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <!-- ===== ONGLET UTILISATEURS ===== -->
    <div v-if="activeTab === 'users'" class="tab-content">
      <div class="card">
        <div class="card-header-row">
          <h3>👥 Utilisateurs</h3>
          <button class="btn btn-primary btn-sm" @click="openCreateUser">+ Ajouter</button>
        </div>

        <div v-if="usersLoading" class="loading-msg">Chargement…</div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Identifiant</th>
              <th>Rôle</th>
              <th>Actif</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.displayName }}</td>
              <td class="mono">{{ u.username }}</td>
              <td>
                <span class="badge" :class="u.role === 'admin' ? 'badge-admin' : 'badge-user'">
                  {{ u.role }}
                </span>
              </td>
              <td>
                <span class="dot" :class="u.active === false ? 'dot-off' : 'dot-on'">
                  {{ u.active === false ? '⛔ Non' : '✅ Oui' }}
                </span>
              </td>
              <td class="actions-cell">
                <button class="btn-icon" title="Modifier" @click="editUser(u)">✏️</button>
                <button class="btn-icon" :title="u.active === false ? 'Activer' : 'Désactiver'" @click="toggleUserActive(u)">
                  {{ u.active === false ? '✅' : '⛔' }}
                </button>
                <button class="btn-icon" title="Réinitialiser le mot de passe" @click="resetUserPassword(u)">🔑</button>
              </td>
            </tr>
            <tr v-if="users.length === 0">
              <td colspan="5" class="empty-msg">Aucun utilisateur trouvé</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Modal utilisateur -->
      <div v-if="showUserModal" class="overlay" @click.self="closeUserModal">
        <div class="modal">
          <h3>{{ editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur' }}</h3>
          <div class="form-group">
            <label>Nom affiché *</label>
            <input v-model="userForm.displayName" type="text" placeholder="Jean Dupont" />
          </div>
          <div class="form-group">
            <label>Identifiant *</label>
            <input v-model="userForm.username" type="text" placeholder="jean.dupont" :disabled="!!editingUser" />
            <small v-if="!editingUser">Ne pourra pas être modifié après création</small>
          </div>
          <div class="form-group">
            <label>Rôle *</label>
            <select v-model="userForm.role">
              <option value="user">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div class="form-group" v-if="!editingUser">
            <label>Mot de passe * <small>(min. 8 caractères)</small></label>
            <input v-model="userForm.password" type="password" />
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="closeUserModal">Annuler</button>
            <button class="btn btn-primary" @click="saveUser" :disabled="!canSaveUser">Enregistrer</button>
          </div>
          <p v-if="userError" class="error-msg">{{ userError }}</p>
        </div>
      </div>
    </div>

    <!-- ===== ONGLET ODOO ===== -->
    <div v-if="activeTab === 'odoo'" class="tab-content">
      <div class="card">
        <h3>🔄 Synchronisation Odoo</h3>
        <p class="card-desc">Activez ou désactivez la synchronisation avec votre instance Odoo. Désactiver la synchro masque les menus liés à Odoo.</p>

        <div class="toggle-row">
          <div>
            <strong>Activer la synchronisation Odoo</strong>
            <p class="toggle-hint">Lorsqu'elle est active, les menus Odoo et l'import de tâches sont disponibles.</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="odooEnabled" @change="saveOdooEnabled" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div v-if="odooEnabled" class="odoo-link-box">
          <p>✅ La synchronisation est <strong>activée</strong>. Configurez les paramètres de connexion ci-dessous.</p>
          <router-link to="/odoo" class="btn btn-secondary">
            ⚙️ Configurer la connexion Odoo →
          </router-link>
        </div>
        <div v-else class="info-box">
          <p>⛔ La synchronisation Odoo est <strong>désactivée</strong>. Les menus Odoo sont masqués dans la navigation.</p>
        </div>
      </div>

      <div class="card" v-if="odooEnabled">
        <h3>📊 État de la connexion</h3>
        <p class="card-desc">Vérifiez que votre connexion Odoo est correctement configurée.</p>
        <div v-if="odooConfig" class="odoo-status">
          <div class="status-row">
            <span class="status-label">URL :</span>
            <span class="status-value">{{ odooConfig.url || '—' }}</span>
          </div>
          <div class="status-row">
            <span class="status-label">Base de données :</span>
            <span class="status-value">{{ odooConfig.db || '—' }}</span>
          </div>
          <div class="status-row">
            <span class="status-label">Version :</span>
            <span class="status-value">{{ odooConfig.version ? 'Odoo ' + odooConfig.version : '—' }}</span>
          </div>
          <div class="status-row">
            <span class="status-label">Authentification :</span>
            <span class="status-value">{{ odooConfig.apiKey ? '🔑 API Key' : (odooConfig.username ? '👤 Login/Mot de passe' : '—') }}</span>
          </div>
        </div>
        <div v-else class="info-box">
          <p>Aucune connexion Odoo configurée. Cliquez sur "Configurer la connexion Odoo" pour commencer.</p>
        </div>
      </div>
    </div>

    <!-- ===== ONGLET SERVEUR MAIL ===== -->
    <div v-if="activeTab === 'mail'" class="tab-content">
      <div class="card">
        <h3>📧 Configuration du serveur mail (SMTP / Mailjet)</h3>
        <p class="card-desc">Configurez un provider mail pour l'envoi de notifications par e-mail (réinitialisation de mot de passe, alertes, etc.).</p>

        <div class="toggle-row" style="margin-bottom: 1.5rem;">
          <div>
            <strong>Activer les notifications par e-mail</strong>
            <p class="toggle-hint">Lorsqu'activé, l'application peut envoyer des e-mails via votre serveur SMTP.</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="mailConfig.enabled" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <template v-if="mailConfig.enabled">
          <div class="form-group">
            <label>Provider mail</label>
            <select v-model="mailConfig.provider">
              <option value="smtp">SMTP</option>
              <option value="mailjet">Mailjet (API)</option>
            </select>
          </div>

          <template v-if="mailConfig.provider === 'smtp'">
          <div class="form-grid">
            <div class="form-group">
              <label>Hôte SMTP *</label>
              <input v-model="mailConfig.host" type="text" placeholder="smtp.exemple.com" />
            </div>
            <div class="form-group">
              <label>Port *</label>
              <input v-model.number="mailConfig.port" type="number" placeholder="587" min="1" max="65535" />
              <small>Ports courants : 25 (non chiffré), 465 (SSL), 587 (STARTTLS)</small>
            </div>
          </div>

          <div class="form-group">
            <label>Adresse e-mail expéditeur (From) *</label>
            <input v-model="mailConfig.from" type="email" placeholder="no-reply@exemple.com" />
            <small>Adresse qui apparaîtra comme expéditeur — doit correspondre au compte authentifié</small>
          </div>
          <div class="form-group">
            <label>Nom expéditeur</label>
            <input v-model="mailConfig.fromName" type="text" placeholder="Gestion Tickets" />
          </div>

          <!-- Mode d'authentification -->
          <div class="form-group">
            <label>Mode d'authentification</label>
            <div class="auth-mode-tabs">
              <button type="button" class="auth-tab" :class="{ active: mailConfig.authMode === 'password' }" @click="mailConfig.authMode = 'password'">
                🔑 Mot de passe
              </button>
              <button type="button" class="auth-tab" :class="{ active: mailConfig.authMode === 'oauth2' }" @click="mailConfig.authMode = 'oauth2'">
                🔐 OAuth2 (Gmail, Outlook…)
              </button>
            </div>
          </div>

          <!-- Auth mot de passe -->
          <template v-if="mailConfig.authMode === 'password'">
            <div class="form-grid">
              <div class="form-group">
                <label>Nom d'utilisateur</label>
                <input v-model="mailConfig.user" type="text" placeholder="contact@exemple.com" />
              </div>
              <div class="form-group">
                <label>Mot de passe</label>
                <div class="password-input-wrap">
                  <input v-model="mailConfig.password" :type="showMailPass ? 'text' : 'password'" placeholder="••••••••" />
                  <button type="button" class="eye-btn" @click="showMailPass = !showMailPass">
                    {{ showMailPass ? '🙈' : '👁️' }}
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- Auth OAuth2 -->
          <template v-if="mailConfig.authMode === 'oauth2'">
            <div class="oauth2-info-box">
              <strong>📋 Prérequis OAuth2 Gmail</strong>
              <ol>
                <li>Allez sur <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a></li>
                <li>Créez un projet → <em>APIs & Services → Credentials</em></li>
                <li>Créez un <strong>OAuth 2.0 Client ID</strong> (type : Application Web)</li>
                <li>Ajoutez <code>https://developers.google.com/oauthplayground</code> comme URI de redirection autorisé</li>
                <li>Sur <a href="https://developers.google.com/oauthplayground" target="_blank">OAuth Playground</a>, autorisez le scope <code>https://mail.google.com/</code></li>
                <li>Échangez le code d'autorisation pour obtenir le <strong>Refresh Token</strong></li>
              </ol>
            </div>

            <div class="form-group">
              <label>Compte Google (user) *</label>
              <input v-model="mailConfig.user" type="email" placeholder="vous@gmail.com" />
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label>Client ID *</label>
                <input v-model="mailConfig.oauth2ClientId" type="text" placeholder="123456789-xxx.apps.googleusercontent.com" />
              </div>
              <div class="form-group">
                <label>Client Secret *</label>
                <div class="password-input-wrap">
                  <input v-model="mailConfig.oauth2ClientSecret" :type="showMailPass ? 'text' : 'password'" placeholder="GOCSPX-…" />
                  <button type="button" class="eye-btn" @click="showMailPass = !showMailPass">{{ showMailPass ? '🙈' : '👁️' }}</button>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>Refresh Token *</label>
              <div class="password-input-wrap">
                <input v-model="mailConfig.oauth2RefreshToken" :type="showMailPass ? 'text' : 'password'" placeholder="1//04xxx…" />
                <button type="button" class="eye-btn" @click="showMailPass = !showMailPass">{{ showMailPass ? '🙈' : '👁️' }}</button>
              </div>
            </div>
          </template>

          <div class="form-group">
            <label>Sécurité</label>
            <select v-model="mailConfig.security" @change="onSecurityChange">
              <option value="none">Aucune (port 25)</option>
              <option value="starttls">STARTTLS (port 587)</option>
              <option value="ssl">SSL/TLS (port 465)</option>
            </select>
          </div>

          <div v-if="portSecurityMismatch" class="warning-box">
            ⚠️ <strong>Incohérence port / sécurité :</strong>
            le port {{ mailConfig.port }} est inhabituel pour {{ securityLabel }}.
            Ports recommandés : SSL/TLS → 465, STARTTLS → 587, Aucune → 25.
            <button type="button" class="btn btn-secondary btn-xs" @click="fixPort">Corriger automatiquement</button>
          </div>

          <div class="form-group">
            <label>Rejeter les certificats invalides</label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="mailConfig.rejectUnauthorized" />
              Activer la vérification du certificat SSL (recommandé en production)
            </label>
          </div>
          </template>

          <template v-else>
            <div class="info-box" style="margin-bottom:1rem;">
              Utilisez vos clés API Mailjet (Key + Secret) pour envoyer les e-mails.
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label>Mailjet API Key *</label>
                <input v-model="mailConfig.mailjetApiKey" type="text" placeholder="xxxxxxxxxxxxxxxx" />
              </div>
              <div class="form-group">
                <label>Mailjet API Secret *</label>
                <div class="password-input-wrap">
                  <input v-model="mailConfig.mailjetApiSecret" :type="showMailPass ? 'text' : 'password'" placeholder="xxxxxxxxxxxxxxxx" />
                  <button type="button" class="eye-btn" @click="showMailPass = !showMailPass">{{ showMailPass ? '🙈' : '👁️' }}</button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Adresse e-mail expéditeur (From) *</label>
              <input v-model="mailConfig.from" type="email" placeholder="no-reply@exemple.com" />
              <small>Doit être un expéditeur autorisé/validé dans Mailjet.</small>
            </div>
            <div class="form-group">
              <label>Nom expéditeur</label>
              <input v-model="mailConfig.fromName" type="text" placeholder="Gestion Tickets" />
            </div>
          </template>

          <div class="test-mail-box">
            <h4>🧪 Tester la connexion</h4>
            <div class="form-inline">
              <input v-model="testMailTo" type="email" placeholder="destinataire@test.com" />
              <button class="btn btn-secondary" @click="sendTestMail" :disabled="testMailLoading || !testMailTo">
                {{ testMailLoading ? 'Envoi…' : '📤 Envoyer un mail de test' }}
              </button>
            </div>
            <p v-if="testMailResult" :class="testMailOk ? 'success-msg' : 'error-msg'">
              {{ testMailResult }}
            </p>
          </div>

          <div class="card" style="background:#f8f9fa; border:1px solid #e0e0e0; margin-top:1rem; margin-bottom:0;">
            <div class="toggle-row" style="margin-bottom: 1rem;">
              <div>
                <strong>Activer la réception IMAP</strong>
                <p class="toggle-hint">Permet de lister les emails reçus et de choisir lesquels importer en tickets.</p>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" v-model="mailConfig.imapEnabled" />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <template v-if="mailConfig.imapEnabled">
              <div class="form-grid">
                <div class="form-group">
                  <label>Hôte IMAP *</label>
                  <input v-model="mailConfig.imapHost" type="text" placeholder="imap.exemple.com" />
                </div>
                <div class="form-group">
                  <label>Port *</label>
                  <input v-model.number="mailConfig.imapPort" type="number" min="1" max="65535" placeholder="993" />
                </div>
              </div>
              <div class="form-grid">
                <div class="form-group">
                  <label>Utilisateur *</label>
                  <input v-model="mailConfig.imapUsername" type="text" placeholder="support@exemple.com" />
                </div>
                <div class="form-group">
                  <label>Mot de passe *</label>
                  <div class="password-input-wrap">
                    <input v-model="mailConfig.imapPassword" :type="showMailPass ? 'text' : 'password'" placeholder="••••••••" />
                    <button type="button" class="eye-btn" @click="showMailPass = !showMailPass">{{ showMailPass ? '🙈' : '👁️' }}</button>
                  </div>
                </div>
              </div>
              <div class="form-grid">
                <div class="form-group">
                  <label>Sécurité</label>
                  <select v-model="mailConfig.imapSecurity">
                    <option value="ssl">SSL/TLS (993)</option>
                    <option value="starttls">STARTTLS / opportuniste</option>
                    <option value="none">Aucune (143)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Boîte / dossier</label>
                  <input v-model="mailConfig.imapMailbox" type="text" placeholder="INBOX" />
                </div>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="mailConfig.imapRejectUnauthorized" />
                  Vérifier le certificat SSL IMAP
                </label>
              </div>

              <div class="test-mail-box" style="margin-top:0;">
                <h4>🧪 Tester la connexion IMAP</h4>
                <div class="form-inline">
                  <button class="btn btn-secondary" @click="testImapConnection" :disabled="testImapLoading">
                    {{ testImapLoading ? 'Test…' : '📥 Tester l\'accès IMAP' }}
                  </button>
                </div>
                <p v-if="testImapResult" :class="testImapOk ? 'success-msg' : 'error-msg'">
                  {{ testImapResult }}
                </p>
              </div>
            </template>
          </div>
        </template>

        <div class="save-row">
          <button class="btn btn-primary" @click="saveMailConfig" :disabled="mailSaving">
            {{ mailSaving ? 'Enregistrement…' : '💾 Enregistrer la configuration' }}
          </button>
          <span v-if="mailSaved" class="success-msg">✅ Configuration enregistrée !</span>
        </div>
      </div>

      <!-- Aperçu de la configuration actuelle -->
      <div class="card" v-if="mailConfig.enabled && (mailConfig.host || mailConfig.provider === 'mailjet')">
        <h3>📋 Résumé de la configuration</h3>
        <div class="status-row"><span class="status-label">Provider :</span><span class="status-value">{{ mailConfig.provider === 'mailjet' ? 'Mailjet API' : 'SMTP' }}</span></div>
        <div class="status-row" v-if="mailConfig.provider === 'smtp'"><span class="status-label">Hôte :</span><span class="status-value">{{ mailConfig.host }}:{{ mailConfig.port }}</span></div>
        <div class="status-row" v-if="mailConfig.provider === 'smtp'"><span class="status-label">Sécurité :</span><span class="status-value">{{ securityLabel }}</span></div>
        <div class="status-row"><span class="status-label">Expéditeur :</span><span class="status-value">{{ mailConfig.fromName || '' }} &lt;{{ mailConfig.from }}&gt;</span></div>
        <div class="status-row" v-if="mailConfig.provider === 'smtp'"><span class="status-label">Authentification :</span><span class="status-value">{{ mailConfig.authMode === 'oauth2' ? '🔐 OAuth2' : (mailConfig.user ? '🔑 Mot de passe' : '⚠️ Aucune') }}</span></div>
        <div class="status-row" v-else><span class="status-label">Authentification :</span><span class="status-value">🔑 API Key / Secret</span></div>
      </div>
    </div>

    <!-- ===== ONGLET ASSISTANT IA ===== -->
    <div v-if="activeTab === 'ai'" class="tab-content">
      <div class="card">
        <h3>🤖 Configuration Assistant IA</h3>
        <p class="card-desc">Configurez le mode local (sans API) ou un provider LLM (Mistral, Google Gemini, GitHub Copilot/Models ou OpenAI compatible).</p>

        <div class="toggle-row" style="margin-bottom: 1rem;">
          <div>
            <strong>Activer l'assistant IA</strong>
            <p class="toggle-hint">Si désactivé, l'écran Assistant IA reste en mode local minimal.</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="aiConfig.enabled" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label>Mode d'analyse</label>
          <select v-model="aiConfig.strategy">
            <option value="local">Local (offline, sans API)</option>
            <option value="llm">LLM (via API serveur)</option>
          </select>
        </div>

        <template v-if="aiConfig.strategy === 'llm'">
          <div class="form-group">
            <label>Provider</label>
            <select v-model="aiConfig.provider" @change="onAiProviderChange(true)">
              <option value="mistral">Mistral</option>
              <option value="gemini">Google Gemini</option>
              <option value="github-copilot">GitHub Copilot (GitHub Models)</option>
              <option value="openai-compatible">OpenAI compatible</option>
            </select>
          </div>

          <div class="info-box" style="margin-bottom: 1rem;" v-if="aiConfig.provider === 'mistral'">
            Astuce Mistral : base URL <strong>https://api.mistral.ai/v1</strong>, modèle conseillé <strong>mistral-small-latest</strong>.
          </div>

          <div class="info-box" style="margin-bottom: 1rem;" v-if="aiConfig.provider === 'gemini'">
            Astuce Google Gemini : obtenez votre clé API sur <strong><a href="https://aistudio.google.com/app/apikey" target="_blank">aistudio.google.com</a></strong>, modèle conseillé <strong>gemini-2.0-flash</strong>.
          </div>

          <div class="info-box" style="margin-bottom: 1rem;" v-if="aiConfig.provider === 'github-copilot'">
            Astuce GitHub Copilot/Models : utilisez un token GitHub avec accès à <strong><a href="https://github.com/marketplace/models" target="_blank">GitHub Models</a></strong>, base URL <strong>https://models.inference.ai.azure.com</strong>.
          </div>

          <template v-if="aiConfig.provider !== 'gemini'">
            <div class="form-grid">
              <div class="form-group">
                <label>Base URL API *</label>
                <input v-model="aiConfig.baseUrl" type="text" :placeholder="aiConfig.provider === 'mistral' ? 'https://api.mistral.ai/v1' : aiConfig.provider === 'github-copilot' ? 'https://models.inference.ai.azure.com' : 'https://api.openai.com/v1'" />
              </div>
              <div class="form-group">
                <label>Model *</label>
                <input v-model="aiConfig.model" type="text" :placeholder="aiConfig.provider === 'mistral' ? 'mistral-small-latest' : aiConfig.provider === 'github-copilot' ? 'gpt-4o-mini' : 'gpt-4o-mini'" />
              </div>
            </div>
          </template>

          <template v-if="aiConfig.provider === 'gemini'">
            <div class="form-grid">
              <div class="form-group">
                <label>Model *</label>
                <select v-model="aiConfig.model">
                  <option value="gemini-2.0-flash">gemini-2.0-flash (⚡ Recommandé)</option>
                  <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro (Plus puissant)</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                  <option value="gemini-1.5-pro-exp-0801">gemini-1.5-pro-exp-0801</option>
                </select>
              </div>
            </div>
          </template>

          <div class="form-grid">
            <div class="form-group">
              <label>API Key *</label>
              <div class="password-input-wrap">
                <input v-model="aiConfig.apiKey" :type="showAIApiKey ? 'text' : 'password'" :placeholder="aiConfig.provider === 'mistral' ? 'votre-clé-mistral' : aiConfig.provider === 'gemini' ? 'votre-clé-gemini' : aiConfig.provider === 'github-copilot' ? 'github_pat_... ou ghp_...' : 'sk-...'" />
                <button type="button" class="eye-btn" @click="showAIApiKey = !showAIApiKey">{{ showAIApiKey ? '🙈' : '👁️' }}</button>
              </div>
            </div>
            <div class="form-group">
              <label>Temperature</label>
              <input v-model.number="aiConfig.temperature" type="number" min="0" max="1" step="0.1" />
            </div>
          </div>

          <div class="form-group">
            <label>Prompt système</label>
            <textarea v-model="aiConfig.systemPrompt" rows="5" placeholder="Instructions globales du modèle"></textarea>
          </div>

          <div class="test-mail-box">
            <h4>🧪 Tester l'agent IA</h4>
            <div class="form-inline">
              <input v-model="testAiPrompt" type="text" placeholder="Ex: Que dois-je faire en priorité aujourd'hui ?" />
              <button class="btn btn-secondary" @click="testAiAgent" :disabled="testAiLoading || !testAiPrompt">
                {{ testAiLoading ? 'Test…' : '🚀 Lancer un test' }}
              </button>
            </div>
            <p v-if="testAiResult" :class="testAiOk ? 'success-msg' : 'error-msg'">
              {{ testAiResult }}
            </p>
          </div>
        </template>

        <div class="save-row">
          <button class="btn btn-primary" @click="saveAiConfig" :disabled="aiSaving">
            {{ aiSaving ? 'Enregistrement…' : '💾 Enregistrer la configuration IA' }}
          </button>
          <span v-if="aiSaved" class="success-msg">✅ Configuration IA enregistrée !</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../services/database-new'
import { auth } from '../services/auth'
import { apiFetch } from '../services/api'
import GeminiService from '../services/gemini'

const MAIL_CONFIG_KEY = 'app-mail-config'
const AI_CONFIG_KEY = 'app-ai-assistant-config'
const ODOO_ENABLED_KEY = 'app-odoo-enabled'
const ODOO_CONFIG_KEY = 'odoo-config'

const DEFAULT_MAIL_CONFIG = {
  enabled: false,
  provider: 'smtp', // 'smtp' | 'mailjet'
  authMode: 'password', // 'password' | 'oauth2'
  host: '',
  port: 587,
  user: '',
  password: '',
  mailjetApiKey: '',
  mailjetApiSecret: '',
  oauth2ClientId: '',
  oauth2ClientSecret: '',
  oauth2RefreshToken: '',
  from: '',
  fromName: 'Gestion Tickets',
  security: 'starttls',
  rejectUnauthorized: true,
  imapEnabled: false,
  imapHost: '',
  imapPort: 993,
  imapUsername: '',
  imapPassword: '',
  imapSecurity: 'ssl',
  imapMailbox: 'INBOX',
  imapRejectUnauthorized: true
}

const DEFAULT_AI_CONFIG = {
  enabled: true,
  strategy: 'local', // 'local' | 'llm'
  provider: 'mistral',
  baseUrl: 'https://api.mistral.ai/v1',
  apiKey: '',
  model: 'mistral-small-latest',
  temperature: 0.2,
  systemPrompt: 'Tu es un assistant de priorisation pour une application de gestion de tickets. Réponds en français, de façon concise, actionnable et structurée.'
}

const AI_PROVIDER_DEFAULTS = {
  mistral: {
    baseUrl: 'https://api.mistral.ai/v1',
    model: 'mistral-small-latest'
  },
  gemini: {
    baseUrl: null,
    model: 'gemini-2.0-flash'
  },
  'github-copilot': {
    baseUrl: 'https://models.inference.ai.azure.com',
    model: 'gpt-4o-mini'
  },
  'openai-compatible': {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini'
  }
}

const LEGACY_DEFAULT_AI_CONFIG = {
  enabled: true,
  strategy: 'local', // 'local' | 'llm'
  provider: 'openai-compatible',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.2,
  systemPrompt: 'Tu es un assistant de priorisation pour une application de gestion de tickets. Réponds en français, de façon concise, actionnable et structurée.'
}

export default {
  name: 'Administration',
  data() {
    return {
      activeTab: 'users',
      tabs: [
        { id: 'users', icon: '👥', label: 'Utilisateurs' },
        { id: 'odoo', icon: '🔄', label: 'Synchronisation Odoo' },
        { id: 'mail', icon: '📧', label: 'Serveur mail' },
        { id: 'ai', icon: '🤖', label: 'Assistant IA' }
      ],

      // Utilisateurs
      users: [],
      usersLoading: false,
      showUserModal: false,
      editingUser: null,
      userError: '',
      userForm: { displayName: '', username: '', role: 'user', password: '' },

      // Odoo
      odooEnabled: true,
      odooConfig: null,

      // Mail
      mailConfig: { ...DEFAULT_MAIL_CONFIG },
      mailSaving: false,
      mailSaved: false,
      showMailPass: false,
      testMailTo: '',
      testMailLoading: false,
      testMailResult: '',
      testMailOk: false,
      testImapLoading: false,
      testImapResult: '',
      testImapOk: false,

      // IA
      aiConfig: { ...DEFAULT_AI_CONFIG },
      aiSaving: false,
      aiSaved: false,
      showAIApiKey: false,
      testAiPrompt: '',
      testAiLoading: false,
      testAiResult: '',
      testAiOk: false
    }
  },
  computed: {
    canSaveUser() {
      if (!this.userForm.displayName || !this.userForm.username) return false
      if (!this.editingUser && this.userForm.password.length < 8) return false
      return true
    },
    securityLabel() {
      const map = { none: 'Aucune', starttls: 'STARTTLS', ssl: 'SSL/TLS' }
      return map[this.mailConfig.security] || '—'
    },
    portSecurityMismatch() {
      if (this.mailConfig.provider === 'mailjet') return false
      if (this.mailConfig.authMode === 'oauth2') return false
      if (!this.mailConfig.security || !this.mailConfig.port) return false
      const port = Number(this.mailConfig.port)
      if (this.mailConfig.security === 'ssl' && port !== 465) return true
      if (this.mailConfig.security === 'starttls' && port !== 587) return true
      if (this.mailConfig.security === 'none' && port !== 25) return true
      return false
    }
  },
  async mounted() {
    await this.loadUsers()
    this.loadOdooSettings()
    this.loadMailConfig()
    this.loadAiConfig()
  },
  methods: {
    // ===== UTILISATEURS =====
    async loadUsers() {
      this.usersLoading = true
      try {
        this.users = await db.getAllUsers()
      } finally {
        this.usersLoading = false
      }
    },
    openCreateUser() {
      this.userError = ''
      this.editingUser = null
      this.userForm = { displayName: '', username: '', role: 'user', password: '' }
      this.showUserModal = true
    },
    editUser(u) {
      this.userError = ''
      this.editingUser = u
      this.userForm = { displayName: u.displayName, username: u.username, role: u.role, password: '' }
      this.showUserModal = true
    },
    closeUserModal() {
      this.showUserModal = false
      this.editingUser = null
    },
    async saveUser() {
      this.userError = ''
      try {
        if (this.editingUser) {
          await db.updateUser(this.editingUser.id, {
            displayName: this.userForm.displayName,
            role: this.userForm.role
          })
        } else {
          await auth.createUser(
            this.userForm.displayName,
            this.userForm.username,
            this.userForm.password,
            this.userForm.role
          )
        }
        this.closeUserModal()
        await this.loadUsers()
      } catch (e) {
        this.userError = e.message || 'Erreur lors de l\'enregistrement'
      }
    },
    async toggleUserActive(u) {
      await db.updateUser(u.id, { active: u.active === false ? true : false })
      await this.loadUsers()
    },
    async resetUserPassword(u) {
      const pwd = prompt(`Nouveau mot de passe pour ${u.displayName} (min. 8 caractères)`)
      if (!pwd) return
      if (pwd.length < 8) {
        alert('Le mot de passe doit contenir au moins 8 caractères.')
        return
      }
      try {
        await auth.changeUserPassword(u.id, pwd)
        alert(`✅ Mot de passe de ${u.displayName} mis à jour.`)
      } catch (e) {
        alert('Erreur : ' + (e.message || 'Impossible de modifier le mot de passe'))
      }
    },

    // ===== ODOO =====
    loadOdooSettings() {
      const raw = localStorage.getItem(ODOO_ENABLED_KEY)
      this.odooEnabled = raw === null ? true : raw === 'true'
      const rawConfig = localStorage.getItem(ODOO_CONFIG_KEY)
      this.odooConfig = rawConfig ? JSON.parse(rawConfig) : null
    },
    saveOdooEnabled() {
      localStorage.setItem(ODOO_ENABLED_KEY, String(this.odooEnabled))
      // Émettre un événement pour que App.vue rafraîchisse le menu
      window.dispatchEvent(new CustomEvent('odoo-enabled-changed', { detail: this.odooEnabled }))
    },

    onSecurityChange() {
      const defaults = { ssl: 465, starttls: 587, none: 25 }
      this.mailConfig.port = defaults[this.mailConfig.security] ?? 587
    },
    fixPort() {
      const defaults = { ssl: 465, starttls: 587, none: 25 }
      this.mailConfig.port = defaults[this.mailConfig.security] ?? 587
    },
    buildImapConfig() {
      return {
        host: this.mailConfig.imapHost,
        port: this.mailConfig.imapPort,
        username: this.mailConfig.imapUsername,
        password: this.mailConfig.imapPassword,
        security: this.mailConfig.imapSecurity,
        mailbox: this.mailConfig.imapMailbox,
        rejectUnauthorized: this.mailConfig.imapRejectUnauthorized,
      }
    },

    // ===== MAIL =====
    loadMailConfig() {
      try {
        const raw = localStorage.getItem(MAIL_CONFIG_KEY)
        if (raw) {
          this.mailConfig = { ...DEFAULT_MAIL_CONFIG, ...JSON.parse(raw) }
        }
      } catch {
        this.mailConfig = { ...DEFAULT_MAIL_CONFIG }
      }
    },
    async saveMailConfig() {
      this.mailSaving = true
      this.mailSaved = false
      try {
        localStorage.setItem(MAIL_CONFIG_KEY, JSON.stringify(this.mailConfig))
        this.mailSaved = true
        setTimeout(() => { this.mailSaved = false }, 3000)
      } finally {
        this.mailSaving = false
      }
    },
    async sendTestMail() {
      if (!this.testMailTo) return
      this.testMailLoading = true
      this.testMailResult = ''
      try {
        // Appel vers l'API serveur si disponible, sinon avertissement
        const response = await fetch('/api/admin/mail/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: this.testMailTo, config: this.mailConfig })
        })
        if (response.ok) {
          this.testMailOk = true
          this.testMailResult = `✅ E-mail de test envoyé à ${this.testMailTo} avec succès !`
        } else {
          const err = await response.json().catch(() => ({}))
          this.testMailOk = false
          const details = [err.error, err.message, err.hint].filter(Boolean).join(' — ')
          this.testMailResult = `❌ Erreur : ${details || response.statusText}`
        }
      } catch {
        this.testMailOk = false
        this.testMailResult = '⚠️ Impossible de contacter le serveur. Assurez-vous que le backend est démarré et configurez d\'abord votre provider mail (SMTP ou Mailjet).'
      } finally {
        this.testMailLoading = false
      }
    },
    async testImapConnection() {
      this.testImapLoading = true
      this.testImapResult = ''
      try {
        const result = await apiFetch('/admin/imap/test', {
          method: 'POST',
          timeoutMs: 20000,
          body: JSON.stringify({
            config: this.buildImapConfig()
          })
        })
        this.testImapOk = true
        const fallbackInfo = result.usedFallback
          ? ` (mode détecté: ${result.effectiveSecurity?.toUpperCase()} / port ${result.effectivePort})`
          : ''
        this.testImapResult = `✅ Connexion IMAP OK — boîte ${result.mailbox} (${result.exists || 0} message(s))${fallbackInfo}`
      } catch (error) {
        this.testImapOk = false
        this.testImapResult = `❌ ${error?.message || 'Erreur de connexion IMAP'}`
      } finally {
        this.testImapLoading = false
      }
    },

    // ===== ASSISTANT IA =====
    loadAiConfig() {
      try {
        const raw = localStorage.getItem(AI_CONFIG_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          this.aiConfig = { ...DEFAULT_AI_CONFIG, ...LEGACY_DEFAULT_AI_CONFIG, ...parsed }
          this.onAiProviderChange(false)
        }
      } catch {
        this.aiConfig = { ...DEFAULT_AI_CONFIG }
      }
    },
    onAiProviderChange(force = false) {
      const provider = this.aiConfig.provider in AI_PROVIDER_DEFAULTS
        ? this.aiConfig.provider
        : 'mistral'
      const defaults = AI_PROVIDER_DEFAULTS[provider]
      const knownBaseUrls = Object.values(AI_PROVIDER_DEFAULTS)
        .map(cfg => cfg.baseUrl)
        .filter(Boolean)
      const knownModels = Object.values(AI_PROVIDER_DEFAULTS)
        .map(cfg => cfg.model)
        .filter(Boolean)

      this.aiConfig.provider = provider

      // Pour Gemini, on ne met pas de baseUrl
      if (provider !== 'gemini') {
        if (force || !this.aiConfig.baseUrl || knownBaseUrls.includes(this.aiConfig.baseUrl)) {
          this.aiConfig.baseUrl = defaults.baseUrl
        }
      } else {
        this.aiConfig.baseUrl = null
      }

      if (force || !this.aiConfig.model || knownModels.includes(this.aiConfig.model)) {
        this.aiConfig.model = defaults.model
      }
    },
    async saveAiConfig() {
      this.aiSaving = true
      this.aiSaved = false
      try {
        localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(this.aiConfig))
        this.aiSaved = true
        setTimeout(() => { this.aiSaved = false }, 3000)
      } finally {
        this.aiSaving = false
      }
    },
    async testAiAgent() {
      if (!this.testAiPrompt) return
      this.testAiLoading = true
      this.testAiResult = ''
      try {
        if (this.aiConfig.provider === 'gemini' && this.aiConfig.apiKey && this.aiConfig.model) {
          // Test direct avec Gemini
          const geminiService = new GeminiService({
            apiKey: this.aiConfig.apiKey,
            model: this.aiConfig.model,
            temperature: this.aiConfig.temperature
          })

          const response = await geminiService.generateContent(
            `Test rapide: ${this.testAiPrompt}`,
            this.aiConfig.systemPrompt,
            { maxTokens: 500 }
          )

          if (response && response.length > 0) {
            this.testAiOk = true
            this.testAiResult = `✅ Google Gemini opérationnel (réponse: "${response.substring(0, 100)}…").`
          } else {
            this.testAiOk = false
            this.testAiResult = '⚠️ Gemini a répondu mais la réponse est vide.'
          }
        } else {
          const response = await apiFetch('/ai/suggestions', {
            method: 'POST',
            timeoutMs: 30000,
            body: JSON.stringify({
              config: this.aiConfig,
              context: {
                prompt: this.testAiPrompt,
                projects: [],
                tickets: [],
                todos: [],
                sprints: [],
                localSuggestions: [
                  {
                    id: 'sample-1',
                    title: 'Traiter les tickets bloquants',
                    reason: 'Exemple de contexte local pour guider le modèle.',
                    source: 'Local',
                    level: 'high',
                    levelLabel: 'Haute priorité',
                    score: 90
                  }
                ]
              }
            })
          })
          const count = Array.isArray(response?.suggestions) ? response.suggestions.length : 0
          this.testAiOk = true
          this.testAiResult = count > 0
            ? `✅ Agent IA opérationnel (${count} suggestion(s) renvoyée(s)).`
            : '⚠️ Connexion IA OK, mais aucune suggestion exploitable n\'a été renvoyée. Vérifiez le modèle, le prompt système ou ajoutez plus de contexte.'
        }
      } catch (error) {
        this.testAiOk = false
        this.testAiResult = `❌ ${error?.message || 'Erreur de test IA'}`
      } finally {
        this.testAiLoading = false
      }
    }
  }
}
</script>

<style scoped>
.admin-page {
  padding: 1.5rem;
  max-width: 960px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.page-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.subtitle {
  color: #666;
  margin: 0.3rem 0 0;
  font-size: 0.9rem;
}

/* Onglets */
.tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0;
}

.tab-btn {
  padding: 0.65rem 1.25rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.95rem;
  color: #6b7280;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  border-radius: 6px 6px 0 0;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: #374151;
  background: #f3f4f6;
}

.tab-btn.active {
  color: #4DBA87;
  border-bottom-color: #4DBA87;
  font-weight: 600;
}

/* Cards */
.card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-header-row h3 {
  margin: 0;
}

.card-desc {
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 1.25rem;
}

/* Table */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.data-table th {
  text-align: left;
  padding: 0.6rem 0.75rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  color: #374151;
  font-weight: 600;
}

.data-table td {
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.data-table tr:last-child td {
  border-bottom: none;
}

.mono {
  font-family: monospace;
  font-size: 0.85rem;
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 99px;
  font-size: 0.8rem;
  font-weight: 600;
}

.badge-admin {
  background: #fef3c7;
  color: #92400e;
}

.badge-user {
  background: #e0f2fe;
  color: #075985;
}

.actions-cell {
  display: flex;
  gap: 0.4rem;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.25rem 0.35rem;
  border-radius: 4px;
  transition: background 0.15s;
}

.btn-icon:hover {
  background: #f3f4f6;
}

.loading-msg,
.empty-msg {
  text-align: center;
  color: #9ca3af;
  padding: 1.5rem;
}

/* Toggle switch */
.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  margin-bottom: 1rem;
  gap: 1rem;
}

.toggle-hint {
  font-size: 0.82rem;
  color: #6b7280;
  margin: 0.25rem 0 0;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #d1d5db;
  border-radius: 99px;
  transition: 0.25s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  left: 3px;
  top: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.25s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.toggle-switch input:checked + .toggle-slider {
  background: #4DBA87;
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(22px);
}

/* Odoo */
.odoo-link-box {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.info-box {
  background: #f8f9fa;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.9rem 1rem;
  color: #6b7280;
  font-size: 0.9rem;
}

.status-row {
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.9rem;
}

.status-row:last-child {
  border-bottom: none;
}

.status-label {
  font-weight: 600;
  color: #374151;
  min-width: 140px;
}

.status-value {
  color: #6b7280;
}

/* Mail */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 600px) {
  .form-grid { grid-template-columns: 1fr; }
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.35rem;
  font-size: 0.9rem;
  color: #374151;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #4DBA87;
}

.form-group small {
  display: block;
  color: #9ca3af;
  font-size: 0.78rem;
  margin-top: 0.3rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-label input {
  width: auto;
}

.password-input-wrap {
  position: relative;
}

.password-input-wrap input {
  padding-right: 2.5rem;
}

.eye-btn {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}

.test-mail-box {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 0.5rem;
  margin-bottom: 1rem;
}

.test-mail-box h4 {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
}

.form-inline {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.form-inline input {
  flex: 1;
  min-width: 200px;
  padding: 0.55rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
}

.save-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.warning-box {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #92400e;
  font-size: 0.88rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-xs {
  padding: 0.25rem 0.6rem;
  font-size: 0.78rem;
}

/* Auth mode tabs */
.auth-mode-tabs {
  display: flex;
  gap: 0.5rem;
}

.auth-tab {
  padding: 0.5rem 1rem;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.88rem;
  color: #6b7280;
  transition: all 0.15s;
}

.auth-tab:hover {
  border-color: #9ca3af;
  color: #374151;
}

.auth-tab.active {
  border-color: #4DBA87;
  background: #f0fdf4;
  color: #15803d;
  font-weight: 600;
}

/* OAuth2 info */
.oauth2-info-box {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.25rem;
  font-size: 0.88rem;
  color: #1e40af;
}

.oauth2-info-box strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

.oauth2-info-box ol {
  margin: 0;
  padding-left: 1.2rem;
}

.oauth2-info-box li {
  margin-bottom: 0.35rem;
  line-height: 1.5;
}

.oauth2-info-box a {
  color: #1d4ed8;
}

.oauth2-info-box code {
  background: #dbeafe;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  font-size: 0.82rem;
}

/* Boutons */
.btn {
  padding: 0.55rem 1.1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  transition: opacity 0.15s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #4DBA87;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #3da876;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
}

/* Modal */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal h3 {
  margin: 0 0 1.25rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

/* Messages */
.success-msg {
  color: #15803d;
  font-size: 0.88rem;
}

.error-msg {
  color: #b91c1c;
  font-size: 0.88rem;
  margin-top: 0.5rem;
}
</style>
