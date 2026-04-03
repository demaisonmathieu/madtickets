<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h2>📊 Tableau de bord</h2>
      <div class="quick-actions">
        <button @click="showProjectModal = true" class="btn-quick-action btn-project">
          <span>📁</span> Nouveau Projet
        </button>
        <button @click="showTicketModal = true" class="btn-quick-action btn-ticket">
          <span>🎫</span> Nouveau Ticket
        </button>
        <button @click="showTodoModal = true" class="btn-quick-action btn-todo">
          <span>✅</span> Nouvelle Tâche
        </button>
        <button @click="openTimeEntryModal" class="btn-quick-action btn-time">
          <span>⏱️</span> Feuille de temps
        </button>
      </div>
    </div>

    <!-- Onglets de navigation -->
    <div class="dashboard-tabs">
      <button type="button" class="dashboard-tab" :class="{ active: activeTab === 'activites' }" @click="activeTab = 'activites'; scrollToTop()">🧾 Activités récentes</button>
      <button type="button" class="dashboard-tab" :class="{ active: activeTab === 'tableau' }" @click="activeTab = 'tableau'; scrollToTop()">📊 Tableau de bord</button>
      <button type="button" class="dashboard-tab" :class="{ active: activeTab === 'progression' }" @click="activeTab = 'progression'; scrollToTop()">📈 Progression</button>
      <button type="button" class="dashboard-tab" :class="{ active: activeTab === 'temps' }" @click="activeTab = 'temps'; scrollToTop()">⏱️ Feuilles de temps</button>
    </div>

    <div v-show="activeTab === 'activites'">
    <!-- Résumé d'activité tickets / tâches (section principale) -->
    <div class="charts-section">
      <div class="activity-section-header">
        <h3>🧾 Activité récente – tickets / tâches</h3>
        <div class="activity-days-selector">
          <button
            v-for="opt in activityDaysOptions"
            :key="opt.value"
            type="button"
            class="days-btn"
            :class="{ active: activityDaysFilter === opt.value }"
            @click="activityDaysFilter = opt.value"
          >{{ opt.label }}</button>
        </div>
      </div>

      <div class="activity-summary-grid">
        <button
          type="button"
          class="priority-card activity-filter-card"
          :class="{ active: activityTypeFilter === 'created' }"
          @click="setActivityTypeFilter('created')"
        >
          <div class="priority-icon">🆕</div>
          <div class="priority-count">{{ recentActivitySummary.created }}</div>
          <div class="priority-label">Créations</div>
        </button>
        <button
          type="button"
          class="priority-card activity-filter-card"
          :class="{ active: activityTypeFilter === 'updated' }"
          @click="setActivityTypeFilter('updated')"
        >
          <div class="priority-icon">✏️</div>
          <div class="priority-count">{{ recentActivitySummary.updated }}</div>
          <div class="priority-label">Modifications</div>
        </button>
        <button
          type="button"
          class="priority-card activity-filter-card"
          :class="{ active: activityTypeFilter === 'notes' }"
          @click="setActivityTypeFilter('notes')"
        >
          <div class="priority-icon">📝</div>
          <div class="priority-count">{{ recentActivitySummary.notes }}</div>
          <div class="priority-label">Notes</div>
        </button>
        <button
          type="button"
          class="priority-card activity-filter-card"
          :class="{ active: activityTypeFilter === 'recettes' }"
          @click="setActivityTypeFilter('recettes')"
        >
          <div class="priority-icon">🧪</div>
          <div class="priority-count">{{ recentActivitySummary.recettes }}</div>
          <div class="priority-label">Recettes</div>
        </button>
        <button
          type="button"
          class="priority-card activity-filter-card"
          :class="{ active: activityTypeFilter === 'messages' }"
          @click="setActivityTypeFilter('messages')"
        >
          <div class="priority-icon">💬</div>
          <div class="priority-count">{{ recentActivitySummary.messages }}</div>
          <div class="priority-label">Messages</div>
        </button>
      </div>

      <div class="activity-filter-actions">
        <button
          type="button"
          class="btn btn-secondary"
          :disabled="activityTypeFilter === 'all'"
          @click="setActivityTypeFilter('all')"
        >
          Afficher tout
        </button>
        <span v-if="activityTypeFilter !== 'all'" class="activity-filter-label">
          Filtre actif : {{ getActivityTypeLabel(activityTypeFilter) }}
        </span>
        <span class="activity-filter-label" style="margin-left: auto; color: #999;">
          {{ filteredRecentEntityActivities.length }} activité(s)
        </span>
      </div>

      <div class="activity-search-bar">
        <span class="activity-search-icon">🔍</span>
        <input
          v-model="activitySearchQuery"
          type="text"
          placeholder="Rechercher dans les activités (titre, projet, description)..."
          class="activity-search-input"
        />
        <button v-if="activitySearchQuery" type="button" class="activity-search-clear" @click="activitySearchQuery = ''">✕</button>
      </div>

      <div class="recent-activity" style="margin-top: 1rem;">
        <div v-if="filteredRecentEntityActivities.length === 0" class="empty-state">
          Aucune activité sur cette période
        </div>

        <div
          v-for="item in filteredRecentEntityActivities"
          :key="item.key"
          class="activity-item clickable-activity"
          @click="openActivityItem(item)"
        >
          <div class="activity-icon">{{ item.icon }}</div>
          <div class="activity-content">
            <div class="activity-title">{{ item.title }}</div>
            <div class="activity-meta" style="flex-wrap: wrap;">
              <span class="badge badge-info">{{ item.typeLabel }}</span>
              <span>📁 {{ item.projectName || 'Projet inconnu' }}</span>
              <span class="activity-date">{{ formatDate(item.date) }}</span>
            </div>
            <div
              v-if="item.description"
              class="activity-description"
              v-html="truncateHtml(item.description, 500)"
            ></div>
          </div>
        </div>
      </div>
    </div>
    </div><!-- /tab activites -->

    <div v-show="activeTab === 'tableau'">
    <!-- Filtres -->
    <div class="filters-container">
      <div class="filters-header">
        <h3>🔍 Filtres</h3>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button
            @click="toggleMyTimeEntries"
            :class="['btn-reset', myTimeEntriesOnly ? 'btn-reset-active' : '']"
            type="button"
          >
            <span>⏱️</span> {{ myTimeEntriesOnly ? 'Mes FDT activées' : 'Mes feuilles de temps' }}
          </button>
          <button v-if="hasActiveFilters || myTimeEntriesOnly" @click="resetFilters" class="btn-reset">
            <span>✕</span> Réinitialiser
          </button>
        </div>
      </div>
      
      <div class="filters-grid">
        <div class="filter-card">
          <div class="filter-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">📁</div>
          <div class="filter-content">
            <label>Projet</label>
            <select v-model="filters.projectId" @change="applyFilters">
              <option :value="null">Tous les projets</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="filter-card">
          <div class="filter-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">📅</div>
          <div class="filter-content">
            <label>Année</label>
            <select v-model="filters.year" @change="applyFilters">
              <option :value="null">Toutes les années</option>
              <option v-for="year in availableYears" :key="year" :value="year">
                {{ year }}
              </option>
            </select>
          </div>
        </div>

        <div class="filter-card">
          <div class="filter-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">🕒</div>
          <div class="filter-content">
            <label>Période</label>
            <select v-model="filters.period" @change="applyFilters">
              <option value="all">Toute la période</option>
              <option value="thisMonth">Ce mois</option>
              <option value="last3Months">3 derniers mois</option>
              <option value="last6Months">6 derniers mois</option>
              <option value="thisYear">Cette année</option>
            </select>
          </div>
        </div>

        <div class="filter-card" :class="{ 'filter-disabled': !filters.projectId }">
          <div class="filter-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">🏃</div>
          <div class="filter-content">
            <label>Sprint</label>
            <select v-model="filters.sprintId" @change="applyFilters" :disabled="!filters.projectId">
              <option :value="null">{{ filters.projectId ? 'Tous les sprints' : 'Sélectionnez un projet' }}</option>
              <option v-for="sprint in filteredSprints" :key="sprint.id" :value="sprint.id">
                {{ sprint.name }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="kpi-grid">
      <!-- KPI Projets -->
      <div class="kpi-card">
        <div class="kpi-header">
          <h3>📁 Projets</h3>
        </div>
        <div class="kpi-stats">
          <div class="kpi-main">
            <div class="kpi-number">{{ stats.projects.total }}</div>
            <div class="kpi-label">Total</div>
          </div>
          <div class="kpi-breakdown">
            <div class="kpi-item">
              <span class="badge badge-active">●</span>
              <span>{{ stats.projects.active }} Actifs</span>
            </div>
            <div class="kpi-item">
              <span class="badge badge-completed">●</span>
              <span>{{ stats.projects.completed }} Terminés</span>
            </div>
            <div class="kpi-item">
              <span class="badge badge-paused">●</span>
              <span>{{ stats.projects.paused }} En pause</span>
            </div>
          </div>
        </div>
      </div>

      <!-- KPI Tickets -->
      <div class="kpi-card">
        <div class="kpi-header">
          <h3>🎫 Tickets</h3>
        </div>
        <div class="kpi-stats">
          <div class="kpi-main">
            <div class="kpi-number">{{ stats.tickets.total }}</div>
            <div class="kpi-label">Total</div>
          </div>
          <div class="kpi-breakdown">
            <div class="kpi-item" v-for="(count, status) in stats.tickets.byStatus" :key="status">
              <span class="badge" :class="getStatusBadgeClass(status)">●</span>
              <span>{{ count }} {{ status }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- KPI Sprints -->
      <div class="kpi-card">
        <div class="kpi-header">
          <h3>🏃 Sprints</h3>
        </div>
        <div class="kpi-stats">
          <div class="kpi-main">
            <div class="kpi-number">{{ stats.sprints.total }}</div>
            <div class="kpi-label">Total</div>
          </div>
          <div class="kpi-breakdown">
            <div class="kpi-item">
              <span class="badge badge-planned">●</span>
              <span>{{ stats.sprints.planned }} Planifiés</span>
            </div>
            <div class="kpi-item">
              <span class="badge badge-active">●</span>
              <span>{{ stats.sprints.active }} En cours</span>
            </div>
            <div class="kpi-item">
              <span class="badge badge-completed">●</span>
              <span>{{ stats.sprints.completed }} Terminés</span>
            </div>
          </div>
        </div>
      </div>

      <!-- KPI Todolist -->
      <div class="kpi-card">
        <div class="kpi-header">
          <h3>✅ Todo du jour</h3>
        </div>
        <div class="kpi-stats">
          <div class="kpi-main">
            <div class="kpi-number">{{ stats.todos.completionRate }}%</div>
            <div class="kpi-label">Progression</div>
          </div>
          <div class="kpi-breakdown">
            <div class="kpi-item">
              <span class="badge badge-completed">●</span>
              <span>{{ stats.todos.completed }} Terminées</span>
            </div>
            <div class="kpi-item">
              <span class="badge badge-pending">●</span>
              <span>{{ stats.todos.pending }} En cours</span>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: stats.todos.completionRate + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- KPI Temps total -->
      <div class="kpi-card">
        <div class="kpi-header">
          <h3>⏱️ Temps passé</h3>
        </div>
        <div class="kpi-stats">
          <div class="kpi-main">
            <div class="kpi-number">{{ formatDuration(stats.timeEntries.total) }}</div>
            <div class="kpi-label">Total</div>
          </div>
          <div class="kpi-breakdown">
            <div class="kpi-item">
              <span class="badge badge-info">●</span>
              <span>{{ stats.timeEntries.count }} entrées</span>
            </div>
            <div class="kpi-item">
              <span class="badge badge-active">●</span>
              <span>{{ formatDuration(stats.timeEntries.thisWeek) }} cette semaine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div><!-- /tab tableau -->

    <div v-show="activeTab === 'temps'">
    </div><!-- /tab temps -->

    <div v-show="activeTab === 'progression'">
    <!-- Graphiques de progression -->
    <div class="charts-section">
      <h3>📈 Progression par projet</h3>
      <div class="projects-progress">
        <div v-if="projectsWithTickets.length === 0" class="empty-state">
          Aucun projet avec des tickets
        </div>
        <div v-for="project in projectsWithTickets" :key="project.id" class="project-progress">
          <div class="project-info">
            <span class="project-name">{{ project.name }}</span>
            <span class="project-stats">{{ project.completedTickets }}/{{ project.totalTickets }} tickets</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: project.completionRate + '%' }"
              :class="{ 'progress-complete': project.completionRate === 100 }"
            ></div>
          </div>
          <div class="project-percentage">{{ project.completionRate }}%</div>
        </div>
      </div>
    </div>

    <!-- Tickets par priorité -->
    <div class="charts-section">
      <h3>⚡ Répartition par priorité</h3>
      <div class="priority-grid">
        <div class="priority-card priority-high">
          <div class="priority-icon">🔴</div>
          <div class="priority-count">{{ stats.tickets.byPriority.haute || 0 }}</div>
          <div class="priority-label">Haute</div>
        </div>
        <div class="priority-card priority-medium">
          <div class="priority-icon">🟡</div>
          <div class="priority-count">{{ stats.tickets.byPriority.moyenne || 0 }}</div>
          <div class="priority-label">Moyenne</div>
        </div>
        <div class="priority-card priority-low">
          <div class="priority-icon">🟢</div>
          <div class="priority-count">{{ stats.tickets.byPriority.basse || 0 }}</div>
          <div class="priority-label">Basse</div>
        </div>
      </div>
    </div>
    </div><!-- /tab progression -->

    <!-- Modal Nouveau Projet -->
    <div v-if="showProjectModal" class="modal-overlay" @click.self="showProjectModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>📁 Nouveau Projet</h3>
          <button @click="showProjectModal = false" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nom du projet *</label>
            <input v-model="newProject.name" type="text" placeholder="Ex: Refonte site web" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea v-model="newProject.description" rows="4" placeholder="Description du projet..."></textarea>
          </div>
          <div class="form-group">
            <label>Statut</label>
            <select v-model="newProject.status">
              <option value="Actif">Actif</option>
              <option value="En pause">En pause</option>
              <option value="Terminé">Terminé</option>
            </select>
          </div>
          <div class="form-group">
            <label>Assigné à</label>
            <select v-model="newProject.assignedUserId">
              <option :value="null">Non assigné</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.displayName }} ({{ user.username }})
              </option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showProjectModal = false" class="btn btn-secondary">Annuler</button>
          <button @click="createProject" class="btn btn-primary" :disabled="!newProject.name">Créer</button>
        </div>
      </div>
    </div>

    <!-- Modal Nouveau Ticket -->
    <div v-if="showTicketModal" class="modal-overlay" @click.self="showTicketModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>🎫 Nouveau Ticket</h3>
          <button @click="showTicketModal = false" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Projet *</label>
            <select v-model="newTicket.projectId" @change="onNewTicketProjectChange">
              <option :value="null">Sélectionnez un projet</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Titre *</label>
            <input v-model="newTicket.title" type="text" placeholder="Ex: Correction bug connexion" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea v-model="newTicket.description" rows="4" placeholder="Description détaillée..."></textarea>
          </div>
          <div class="form-group">
            <label>Assigné à</label>
            <select v-model="newTicket.assignedUserId">
              <option :value="null">Non assigné</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.displayName }} ({{ user.username }})
              </option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Priorité</label>
              <select v-model="newTicket.priority">
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>
            <div class="form-group">
              <label>Statut</label>
              <select v-model="newTicket.status">
                <option value="À faire">À faire</option>
                <option value="En cours">En cours</option>
                <option value="Terminé">Terminé</option>
              </select>
            </div>
          </div>

          <div v-if="selectedNewTicketProject" style="margin-top: 1rem; padding: 0.85rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
            <div v-if="!selectedProjectGithubRef" style="color:#64748b; font-size:0.92rem;">
              🐙 Aucun dépôt GitHub lié à ce projet. Associez d'abord un dépôt dans la fiche projet.
            </div>
            <template v-else>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
              <strong>🐙 GitHub lié : {{ selectedProjectGithubRef.owner }}/{{ selectedProjectGithubRef.repo }}</strong>
              <button type="button" class="btn btn-secondary btn-sm" @click="loadGithubCommitsForNewTicket" :disabled="githubTicketCommitsLoading">
                {{ githubTicketCommitsLoading ? '⏳ Chargement...' : '🔄 Rafraîchir commits' }}
              </button>
            </div>

            <div class="form-group" style="margin-bottom: 0.5rem;">
              <label>Branche des commits (optionnel)</label>
              <select v-model="githubTicketBranchInput" @change="loadGithubCommitsForNewTicket">
                <option :value="selectedNewTicketProject?.githubDefaultBranch || 'main'">{{ githubTicketBranchesLoading ? 'Chargement des branches...' : `Branche par défaut (${selectedNewTicketProject?.githubDefaultBranch || 'main'})` }}</option>
                <option v-for="branch in githubTicketBranches" :key="`dashboard-github-branch-${branch}`" :value="branch">{{ branch }}</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 0.5rem;">
              <label style="display: inline-flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" v-model="newTicketGithub.createBranch" style="width:auto;" />
                Créer automatiquement une branche GitHub après création du ticket
              </label>
            </div>

            <div v-if="newTicketGithub.createBranch" class="form-row">
              <div class="form-group">
                <label>Nom de branche (optionnel)</label>
                <input v-model="newTicketGithub.branchName" type="text" placeholder="Ex: feat/mon-ticket" />
              </div>
              <div class="form-group">
                <label>Token GitHub (requis pour créer la branche)</label>
                <input v-model="githubTicketTokenInput" type="password" placeholder="ghp_..." />
              </div>
            </div>

            <div v-if="githubTicketCommitsError" class="alert-inline alert-error" style="margin-top: 0.5rem;">
              {{ githubTicketCommitsError }}
            </div>

            <div style="margin-top: 0.5rem; max-height: 180px; overflow: auto; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff;">
              <div v-if="githubTicketCommits.length === 0" style="padding: 0.6rem; color: #64748b; font-size: 0.9rem;">Aucun commit chargé</div>
              <button
                v-for="commit in githubTicketCommits"
                :key="commit.sha"
                type="button"
                @click="newTicketGithub.baseSha = commit.sha"
                style="display: block; width: 100%; text-align: left; padding: 0.55rem 0.65rem; border: none; border-bottom: 1px solid #f1f5f9; background: transparent; cursor: pointer;"
                :style="newTicketGithub.baseSha === commit.sha ? 'background:#eef2ff;' : ''"
              >
                <div style="font-size: 0.88rem; font-weight: 600; color: #1f2937;">{{ commit.message }}</div>
                <div style="font-size: 0.78rem; color: #64748b;">{{ commit.sha.slice(0, 7) }} • {{ commit.author }} • {{ formatDate(commit.date) }}</div>
              </button>
            </div>
            </template>
          </div>

          <div v-if="selectedNewTicketProject" style="margin-top: 1rem; padding: 0.85rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
            <div v-if="!selectedProjectGitlabRef" style="color:#64748b; font-size:0.92rem;">
              🦊 Aucun projet GitLab lié à ce projet. Associez-le d'abord dans la fiche projet.
            </div>
            <template v-else>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
              <strong>🦊 GitLab lié : {{ selectedProjectGitlabRef.projectPath }}</strong>
              <button type="button" class="btn btn-secondary btn-sm" @click="loadGitlabCommitsForNewTicket" :disabled="gitlabTicketCommitsLoading">
                {{ gitlabTicketCommitsLoading ? '⏳ Chargement...' : '🔄 Rafraîchir commits' }}
              </button>
            </div>

            <div class="form-group" style="margin-bottom: 0.5rem;">
              <label>Branche des commits (optionnel)</label>
              <select v-model="gitlabTicketBranchInput" @change="loadGitlabCommitsForNewTicket">
                <option :value="selectedNewTicketProject?.gitlabDefaultBranch || 'main'">{{ gitlabTicketBranchesLoading ? 'Chargement des branches...' : `Branche par défaut (${selectedNewTicketProject?.gitlabDefaultBranch || 'main'})` }}</option>
                <option v-for="branch in gitlabTicketBranches" :key="`dashboard-gitlab-branch-${branch}`" :value="branch">{{ branch }}</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 0.5rem;">
              <label style="display: inline-flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" v-model="newTicketGitlab.createBranch" style="width:auto;" />
                Créer automatiquement une branche GitLab après création du ticket
              </label>
            </div>

            <div v-if="newTicketGitlab.createBranch" class="form-row">
              <div class="form-group">
                <label>Nom de branche (optionnel)</label>
                <input v-model="newTicketGitlab.branchName" type="text" placeholder="Ex: feat/mon-ticket" />
              </div>
              <div class="form-group">
                <label>Token GitLab (requis pour créer la branche, scope `api`)</label>
                <input v-model="gitlabTicketTokenInput" type="password" placeholder="glpat-..." />
              </div>
            </div>

            <div v-if="gitlabTicketCommitsError" class="alert-inline alert-error" style="margin-top: 0.5rem;">
              {{ gitlabTicketCommitsError }}
            </div>

            <div style="margin-top: 0.5rem; max-height: 180px; overflow: auto; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff;">
              <div v-if="gitlabTicketCommits.length === 0" style="padding: 0.6rem; color: #64748b; font-size: 0.9rem;">Aucun commit chargé</div>
              <button
                v-for="commit in gitlabTicketCommits"
                :key="`dashboard-gitlab-${commit.sha}`"
                type="button"
                @click="newTicketGitlab.baseSha = commit.sha"
                style="display: block; width: 100%; text-align: left; padding: 0.55rem 0.65rem; border: none; border-bottom: 1px solid #f1f5f9; background: transparent; cursor: pointer;"
                :style="newTicketGitlab.baseSha === commit.sha ? 'background:#fff7ed;' : ''"
              >
                <div style="font-size: 0.88rem; font-weight: 600; color: #1f2937;">{{ commit.message }}</div>
                <div style="font-size: 0.78rem; color: #64748b;">{{ commit.sha.slice(0, 7) }} • {{ commit.author }} • {{ formatDate(commit.date) }}</div>
              </button>
            </div>
            </template>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showTicketModal = false" class="btn btn-secondary">Annuler</button>
          <button @click="createTicket" class="btn btn-primary" :disabled="!newTicket.title || !newTicket.projectId">Créer</button>
        </div>
      </div>
    </div>

    <!-- Modal Nouvelle Tâche -->
    <div v-if="showTodoModal" class="modal-overlay" @click.self="showTodoModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>✅ Nouvelle Tâche</h3>
          <button @click="showTodoModal = false" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Type de tâche</label>
            <div class="task-type-selector">
              <button 
                @click="newTodo.type = 'daily'" 
                :class="['task-type-btn', { active: newTodo.type === 'daily' }]"
              >
                <span>📅</span> Tâche du jour
              </button>
              <button 
                @click="newTodo.type = 'project'" 
                :class="['task-type-btn', { active: newTodo.type === 'project' }]"
              >
                <span>📁</span> Tâche projet
              </button>
            </div>
          </div>

          <div v-if="newTodo.type === 'project'" class="form-group">
            <label>Projet *</label>
            <select v-model="newTodo.projectId">
              <option :value="null">Sélectionnez un projet</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>{{ newTodo.type === 'daily' ? 'Description' : 'Titre' }} *</label>
            <input v-model="newTodo.text" type="text" :placeholder="newTodo.type === 'daily' ? 'Ex: Répondre aux emails clients' : 'Ex: Implémenter le formulaire de contact'" />
          </div>

          <div class="form-group">
            <label>Assigné à</label>
            <select v-model="newTodo.assignedUserId">
              <option :value="null">Moi (par défaut)</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.displayName }} ({{ user.username }})
              </option>
            </select>
          </div>

          <div v-if="newTodo.type === 'project'" class="form-group">
            <label>Description</label>
            <textarea v-model="newTodo.description" rows="3" placeholder="Description détaillée de la tâche..."></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Priorité</label>
              <select v-model="newTodo.priority">
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>
            <div v-if="newTodo.type === 'project'" class="form-group">
              <label>Statut</label>
              <select v-model="newTodo.status">
                <option value="À faire">À faire</option>
                <option value="En cours">En cours</option>
                <option value="Terminé">Terminé</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showTodoModal = false" class="btn btn-secondary">Annuler</button>
          <button @click="createTodo" class="btn btn-primary" :disabled="!isValidTodo">Créer</button>
        </div>
      </div>
    </div>

    <!-- Modal Nouvelle Feuille de temps -->
    <div v-if="showTimeEntryModal" class="modal-overlay" @click.self="showTimeEntryModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>⏱️ Nouvelle feuille de temps</h3>
          <button @click="showTimeEntryModal = false" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Projet (filtre)</label>
            <select v-model="newTimeEntry.projectId" @change="resetTimeEntryTargetSelection">
              <option :value="null">Tous les projets</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Type</label>
            <div class="task-type-selector" style="grid-template-columns: repeat(3, 1fr);">
              <button
                @click="setTimeEntryTargetType('ticket')"
                :class="['task-type-btn', { active: newTimeEntry.targetType === 'ticket' }]"
              >
                <span>🎫</span> Ticket
              </button>
              <button
                @click="setTimeEntryTargetType('localTask')"
                :class="['task-type-btn', { active: newTimeEntry.targetType === 'localTask' }]"
              >
                <span>✅</span> Tâche locale
              </button>
              <button
                @click="setTimeEntryTargetType('odooTask')"
                :class="['task-type-btn', { active: newTimeEntry.targetType === 'odooTask' }]"
              >
                <span>🧩</span> Tâche Odoo
              </button>
            </div>
          </div>

          <div v-if="newTimeEntry.targetType === 'ticket'" class="form-group">
            <label>Ticket *</label>
            <select v-model="newTimeEntry.ticketId">
              <option :value="null">Sélectionnez un ticket</option>
              <option v-for="ticket in availableTicketsForTimesheet" :key="ticket.id" :value="ticket.id">
                {{ ticket.title }} — {{ getProjectNameById(ticket.projectId) }}
              </option>
            </select>
          </div>

          <div v-if="newTimeEntry.targetType === 'localTask'" class="form-group">
            <label>Tâche locale *</label>
            <select v-model="newTimeEntry.localTaskId">
              <option :value="null">Sélectionnez une tâche locale</option>
              <option v-for="task in availableLocalTasksForTimesheet" :key="task.id" :value="task.id">
                {{ task.title }} — {{ getProjectNameById(task.projectId) }}
              </option>
            </select>
          </div>

          <div v-if="newTimeEntry.targetType === 'odooTask'" class="form-group">
            <label>Tâche Odoo *</label>
            <select v-model="newTimeEntry.odooTaskId">
              <option :value="null">Sélectionnez une tâche Odoo</option>
              <option v-for="task in availableOdooTasksForTimesheet" :key="task.odooId" :value="task.odooId">
                {{ task.title }} — {{ task.projectName || 'Projet inconnu' }}
              </option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Heures</label>
              <input v-model.number="newTimeEntry.hours" type="number" min="0" />
            </div>
            <div class="form-group">
              <label>Minutes</label>
              <input v-model.number="newTimeEntry.minutes" type="number" min="0" max="59" />
            </div>
          </div>

          <div class="form-group">
            <label>Date *</label>
            <input v-model="newTimeEntry.date" type="date" />
          </div>

          <div class="form-group">
            <label>Utilisateur</label>
            <select v-model="newTimeEntry.userId">
              <option :value="null">Non défini</option>
              <option v-for="user in users" :key="`dashboard-time-user-${user.id}`" :value="user.id">
                {{ user.displayName }} ({{ user.username }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Description</label>
            <input v-model="newTimeEntry.description" type="text" placeholder="Travail effectué..." />
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showTimeEntryModal = false" class="btn btn-secondary">Annuler</button>
          <button @click="createTimeEntry" class="btn btn-primary" :disabled="!isValidTimeEntry">
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../services/database-new'
import { auth } from '../services/auth'
import { odooService } from '../services/odoo-new'
import { listGithubCommits, listGithubBranches, createGithubBranch, parseGithubRepoRef } from '../services/github'
import { listGitlabCommits, listGitlabBranches, createGitlabBranch, parseGitlabRepoRef } from '../services/gitlab'

export default {
  name: 'Dashboard',
  data() {
    return {
      projects: [],
      users: [],
      activeTab: 'activites',
      currentUserId: null,
      tickets: [],
      sprints: [],
      todos: [],
      timeEntries: [],
      // Filtres
      filters: {
        projectId: null,
        year: null,
        period: 'thisMonth',
        sprintId: null
      },
      myTimeEntriesOnly: false,
      allTickets: [],
      allTimeEntries: [],
      allSprints: [],
      allLocalTasks: [],
      allOdooTasks: [],
      allRecettes: [],
      // Modals
      showProjectModal: false,
      showTicketModal: false,
      showTodoModal: false,
      showTimeEntryModal: false,
      // Formulaires
      newProject: {
        name: '',
        description: '',
        status: 'Actif',
        assignedUserId: null
      },
      newTicket: {
        projectId: null,
        title: '',
        description: '',
        priority: 'medium',
        status: 'À faire',
        assignedUserId: null
      },
      newTicketGithub: {
        createBranch: true,
        branchName: '',
        baseSha: ''
      },
      githubTicketTokenInput: localStorage.getItem('github.connector.token') || '',
      githubTicketBranchInput: '',
      githubTicketBranches: [],
      githubTicketBranchesLoading: false,
      githubTicketCommits: [],
      githubTicketCommitsLoading: false,
      githubTicketCommitsError: '',
      newTicketGitlab: {
        createBranch: true,
        branchName: '',
        baseSha: ''
      },
      gitlabTicketTokenInput: localStorage.getItem('gitlab.connector.token') || '',
      gitlabTicketBranchInput: '',
      gitlabTicketBranches: [],
      gitlabTicketBranchesLoading: false,
      gitlabTicketCommits: [],
      gitlabTicketCommitsLoading: false,
      gitlabTicketCommitsError: '',
      newTodo: {
        type: 'daily', // 'daily' ou 'project'
        text: '',
        description: '',
        projectId: null,
        priority: 'medium',
        status: 'À faire',
        assignedUserId: null
      },
      newTimeEntry: {
        projectId: null,
        targetType: 'ticket',
        ticketId: null,
        localTaskId: null,
        odooTaskId: null,
        hours: 0,
        minutes: 0,
        date: new Date().toISOString().split('T')[0],
        userId: null,
        description: ''
      },
      stats: {
        projects: {
          total: 0,
          active: 0,
          completed: 0,
          paused: 0
        },
        tickets: {
          total: 0,
          byStatus: {},
          byPriority: {}
        },
        sprints: {
          total: 0,
          planned: 0,
          active: 0,
          completed: 0
        },
        todos: {
          total: 0,
          completed: 0,
          pending: 0,
          completionRate: 0
        },
        timeEntries: {
          total: 0,
          count: 0,
          thisWeek: 0
        }
      },
      projectsWithTickets: [],
      recentTickets: [],
      recentEntityActivities: [],
      activityTypeFilter: 'all',
      activitySearchQuery: '',
      activityDaysFilter: null,
      activityDaysOptions: [
        { value: 7, label: '7j' },
        { value: 30, label: '30j' },
        { value: 90, label: '90j' },
        { value: null, label: 'Tout' }
      ],
      editingTimeEntryId: null,
      editingTimeEntry: {
        duration: 0,
        date: '',
        userId: null,
        description: ''
      }
    }
  },
  computed: {
    availableYears() {
      const years = new Set()
      this.allTickets.forEach(ticket => {
        if (ticket.createdAt) {
          years.add(new Date(ticket.createdAt).getFullYear())
        }
      })
      return Array.from(years).sort((a, b) => b - a)
    },
    filteredSprints() {
      if (!this.filters.projectId) return []
      return this.allSprints.filter(s => s.projectId === this.filters.projectId)
    },
    selectedNewTicketProject() {
      if (!this.newTicket.projectId) return null
      return this.projects.find(p => Number(p.id) === Number(this.newTicket.projectId)) || null
    },
    selectedProjectGithubRef() {
      return this.resolveProjectGithubRef(this.selectedNewTicketProject)
    },
    selectedProjectGitlabRef() {
      return this.resolveProjectGitlabRef(this.selectedNewTicketProject)
    },
    hasActiveFilters() {
      return this.filters.projectId !== null || 
             this.filters.year !== null || 
             this.filters.period !== 'all' ||
             this.filters.sprintId !== null
    },
    isValidTodo() {
      if (!this.newTodo.text) return false
      if (this.newTodo.type === 'project' && !this.newTodo.projectId) return false
      return true
    },
    availableTicketsForTimesheet() {
      let tickets = this.allTickets.filter(t => !this.isCompletedItemStatus(t.status))
      if (this.newTimeEntry.projectId) {
        tickets = tickets.filter(t => t.projectId === this.newTimeEntry.projectId)
      }
      return tickets.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    },
    availableLocalTasksForTimesheet() {
      let tasks = this.allLocalTasks.filter(t => !this.isCompletedItemStatus(t.status))
      if (this.newTimeEntry.projectId) {
        tasks = tasks.filter(t => t.projectId === this.newTimeEntry.projectId)
      }
      return tasks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    },
    availableOdooTasksForTimesheet() {
      let tasks = this.allOdooTasks.filter(t => !this.isCompletedItemStatus(t.status))
      if (this.newTimeEntry.projectId) {
        tasks = tasks.filter(t => Number(t.localProjectId) === Number(this.newTimeEntry.projectId))
      }
      return tasks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    },
    isValidTimeEntry() {
      const duration = (this.newTimeEntry.hours || 0) * 60 + (this.newTimeEntry.minutes || 0)
      if (duration <= 0 || !this.newTimeEntry.date) return false

      if (this.newTimeEntry.targetType === 'ticket') return !!this.newTimeEntry.ticketId
      if (this.newTimeEntry.targetType === 'localTask') return !!this.newTimeEntry.localTaskId
      if (this.newTimeEntry.targetType === 'odooTask') return !!this.newTimeEntry.odooTaskId
      return false
    },
    weeklyTimeByUser() {
      const now = new Date()
      const startOfWeek = new Date(now)
      const day = now.getDay()
      const diffToMonday = day === 0 ? -6 : 1 - day
      startOfWeek.setDate(now.getDate() + diffToMonday)
      startOfWeek.setHours(0, 0, 0, 0)

      const grouped = new Map()

      for (const entry of this.timeEntries) {
        if (!entry?.date) continue
        if (new Date(entry.date) < startOfWeek) continue

        const userId = entry.userId || null
        const key = userId || 'na'

        if (!grouped.has(key)) {
          grouped.set(key, { userId, totalMinutes: 0, entriesCount: 0 })
        }

        const aggregate = grouped.get(key)
        aggregate.totalMinutes += Number(entry.duration || 0)
        aggregate.entriesCount += 1
      }

      return Array.from(grouped.values()).sort((a, b) => b.totalMinutes - a.totalMinutes)
    },
    recentTimeEntries() {
      return [...this.timeEntries]
        .sort((a, b) => {
          const dateDiff = new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
          if (dateDiff !== 0) return dateDiff
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        })
        .slice(0, 8)
    },
    projectTimeSummary() {
      const groupedProjects = new Map()

      for (const entry of this.timeEntries) {
        const ticket = this.allTickets.find(item => item.id === entry.ticketId)
        if (!ticket) continue

        const project = this.projects.find(item => item.id === ticket.projectId)
        const projectId = ticket.projectId

        if (!groupedProjects.has(projectId)) {
          groupedProjects.set(projectId, {
            projectId,
            projectName: project?.name || 'Projet inconnu',
            totalMinutes: 0,
            entriesCount: 0,
            tickets: new Map()
          })
        }

        const projectGroup = groupedProjects.get(projectId)
        projectGroup.totalMinutes += Number(entry.duration || 0)
        projectGroup.entriesCount += 1

        if (!projectGroup.tickets.has(ticket.id)) {
          projectGroup.tickets.set(ticket.id, {
            ticketId: ticket.id,
            ticketTitle: ticket.title || 'Ticket inconnu',
            totalMinutes: 0,
            entriesCount: 0,
            lastEntryDate: null
          })
        }

        const ticketGroup = projectGroup.tickets.get(ticket.id)
        ticketGroup.totalMinutes += Number(entry.duration || 0)
        ticketGroup.entriesCount += 1
        if (!ticketGroup.lastEntryDate || new Date(entry.date) > new Date(ticketGroup.lastEntryDate)) {
          ticketGroup.lastEntryDate = entry.date
        }
      }

      return Array.from(groupedProjects.values())
        .map(project => ({
          ...project,
          tickets: Array.from(project.tickets.values()).sort((a, b) => b.totalMinutes - a.totalMinutes)
        }))
        .sort((a, b) => b.totalMinutes - a.totalMinutes)
    },
    recentActivitiesByDays() {
      if (!this.activityDaysFilter) return this.recentEntityActivities
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - this.activityDaysFilter)
      cutoff.setHours(0, 0, 0, 0)
      return this.recentEntityActivities.filter(item => item.date && new Date(item.date) >= cutoff)
    },
    recentActivitySummary() {
      const list = this.recentActivitiesByDays
      return {
        created: list.filter(i => i.type === 'created').length,
        updated: list.filter(i => i.type === 'updated').length,
        notes: list.filter(i => i.type === 'notes').length,
        recettes: list.filter(i => i.type === 'recettes').length,
        messages: list.filter(i => i.type === 'messages').length
      }
    },
    filteredRecentEntityActivities() {
      let list = this.recentActivitiesByDays
      if (this.activityTypeFilter !== 'all') {
        list = list.filter(item => item.type === this.activityTypeFilter)
      }
      const q = this.activitySearchQuery.trim().toLowerCase()
      if (!q) return list
      return list.filter(item => {
        const inTitle = (item.title || '').toLowerCase().includes(q)
        const inProject = (item.projectName || '').toLowerCase().includes(q)
        const inDesc = this.stripHtml(item.description || '').toLowerCase().includes(q)
        return inTitle || inProject || inDesc
      })
    }
  },
  async mounted() {
    await this.loadData()
  },
  methods: {
    resolveProjectGithubRef(project) {
      if (!project) return null
      const owner = String(project.githubRepoOwner || '').trim()
      const repo = String(project.githubRepoName || '').trim()
      if (owner && repo) return { owner, repo }

      const repoUrl = String(project.githubRepoUrl || '').trim()
      if (!repoUrl) return null
      try {
        const ref = parseGithubRepoRef(repoUrl)
        return { owner: ref.owner, repo: ref.repo }
      } catch {
        return null
      }
    },
    resolveProjectGitlabRef(project) {
      if (!project) return null
      const projectPath = String(project.gitlabProjectPath || '').trim()
      const projectId = String(project.gitlabProjectId || '').trim()
      if (projectPath) {
        const repoUrl = String(project.gitlabRepoUrl || '').trim()
        if (repoUrl) {
          try {
            const parsed = parseGitlabRepoRef(repoUrl)
            return {
              host: parsed.host,
              projectPath,
              projectId: projectId || undefined
            }
          } catch {
            // fallback ci-dessous
          }
        }
        return { projectPath, projectId: projectId || undefined }
      }

      const repoUrl = String(project.gitlabRepoUrl || '').trim()
      if (!repoUrl) return null
      try {
        return parseGitlabRepoRef(repoUrl)
      } catch {
        return null
      }
    },
    onNewTicketProjectChange() {
      this.newTicketGithub.baseSha = ''
      this.githubTicketCommits = []
      this.githubTicketCommitsError = ''
      this.githubTicketBranchInput = this.selectedNewTicketProject?.githubDefaultBranch || ''
      this.githubTicketBranches = []
      this.newTicketGitlab.baseSha = ''
      this.gitlabTicketCommits = []
      this.gitlabTicketCommitsError = ''
      this.gitlabTicketBranchInput = this.selectedNewTicketProject?.gitlabDefaultBranch || ''
      this.gitlabTicketBranches = []
      this.loadGithubBranchesForNewTicket()
      this.loadGitlabBranchesForNewTicket()
      this.loadGithubCommitsForNewTicket()
      this.loadGitlabCommitsForNewTicket()
    },
    async loadGithubBranchesForNewTicket() {
      const ref = this.selectedProjectGithubRef
      if (!ref) {
        this.githubTicketBranches = []
        return
      }
      if (this.githubTicketBranchesLoading) return

      this.githubTicketBranchesLoading = true
      try {
        const token = String(this.githubTicketTokenInput || '').trim() || undefined
        const branches = await listGithubBranches(ref, token, 100, 1)
        this.githubTicketBranches = Array.from(new Set((branches || []).map(branch => branch.name).filter(Boolean)))
      } catch {
        this.githubTicketBranches = []
      } finally {
        this.githubTicketBranchesLoading = false
      }
    },
    async loadGitlabBranchesForNewTicket() {
      const ref = this.selectedProjectGitlabRef
      if (!ref) {
        this.gitlabTicketBranches = []
        return
      }
      if (this.gitlabTicketBranchesLoading) return

      this.gitlabTicketBranchesLoading = true
      try {
        const token = String(this.gitlabTicketTokenInput || '').trim() || undefined
        const branches = await listGitlabBranches(ref, token, 100, 1)
        this.gitlabTicketBranches = Array.from(new Set((branches || []).map(branch => branch.name).filter(Boolean)))
      } catch {
        this.gitlabTicketBranches = []
      } finally {
        this.gitlabTicketBranchesLoading = false
      }
    },
    async loadGithubCommitsForNewTicket() {
      const ref = this.selectedProjectGithubRef
      if (!ref) {
        this.githubTicketCommits = []
        this.githubTicketCommitsError = ''
        return
      }

      this.githubTicketCommitsLoading = true
      this.githubTicketCommitsError = ''
      try {
        await this.loadGithubBranchesForNewTicket()
        const branch = String(this.githubTicketBranchInput || this.selectedNewTicketProject?.githubDefaultBranch || '').trim() || undefined
        const commits = await listGithubCommits(
          ref,
          this.githubTicketTokenInput || undefined,
          12,
          1,
          branch
        )
        this.githubTicketCommits = commits
        this.newTicketGithub.baseSha = commits[0]?.sha || ''
      } catch (error) {
        this.githubTicketCommits = []
        this.githubTicketCommitsError = error?.message || 'Impossible de charger les commits GitHub'
      } finally {
        this.githubTicketCommitsLoading = false
      }
    },
    async loadGitlabCommitsForNewTicket() {
      const ref = this.selectedProjectGitlabRef
      if (!ref) {
        this.gitlabTicketCommits = []
        this.gitlabTicketCommitsError = ''
        return
      }

      this.gitlabTicketCommitsLoading = true
      this.gitlabTicketCommitsError = ''
      try {
        await this.loadGitlabBranchesForNewTicket()
        const branch = String(this.gitlabTicketBranchInput || this.selectedNewTicketProject?.gitlabDefaultBranch || '').trim() || undefined
        const commits = await listGitlabCommits(
          ref,
          this.gitlabTicketTokenInput || undefined,
          12,
          1,
          branch
        )
        this.gitlabTicketCommits = commits
        this.newTicketGitlab.baseSha = commits[0]?.sha || ''
      } catch (error) {
        this.gitlabTicketCommits = []
        this.gitlabTicketCommitsError = error?.message || 'Impossible de charger les commits GitLab'
      } finally {
        this.gitlabTicketCommitsLoading = false
      }
    },
    buildTicketBranchName(ticketId, ticketTitle) {
      const base = String(ticketTitle || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 40) || 'ticket'
      return `ticket/${ticketId}-${base}`
    },
    isCompletedItemStatus(status) {
      if (!status) return false
      const normalized = String(status).toLowerCase()
      return (
        normalized === 'done' ||
        normalized === 'completed' ||
        normalized === 'closed' ||
        normalized.includes('termin') ||
        normalized.includes('résolu') ||
        normalized.includes('resolu')
      )
    },
    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    async loadData() {
      this.currentUserId = auth.getSession()?.userId || null
      this.projects = await db.getAllProjects()
      this.users = await db.getActiveUsers()
      if (this.newProject.assignedUserId === null) this.newProject.assignedUserId = this.currentUserId
      if (this.newTicket.assignedUserId === null) this.newTicket.assignedUserId = this.currentUserId
      if (this.newTodo.assignedUserId === null) this.newTodo.assignedUserId = this.currentUserId
      if (this.newTimeEntry.userId === null) this.newTimeEntry.userId = this.currentUserId
      this.allTickets = await db.getAllTickets()
      this.allSprints = await db.getAllSprints()
      this.allTimeEntries = await db.getAllTimeEntries()
      this.allLocalTasks = await db.getAllLocalTasks()
      this.allOdooTasks = await db.getAllOdooTasks()
      this.allRecettes = await db.getAllRecettes()
      
      // Charger les todos prévus pour aujourd'hui (plannedDate)
      const today = new Date().toISOString().split('T')[0]
      const allTodos = await db.getAllTodos()
      this.todos = allTodos.filter(t => t.plannedDate === today)
      
      // Appliquer les filtres initiaux
      this.applyFilters()
    },
    applyFilters() {
      let filteredTickets = [...this.allTickets]
      let filteredTimeEntries = [...this.allTimeEntries]
      let filteredSprints = [...this.allSprints]
      let filteredLocalTasks = [...this.allLocalTasks]
      let filteredRecettes = [...this.allRecettes]

      // Flux activités (décorrélé du filtre de période du tableau)
      // Il reste impacté par les filtres projet/sprint/année appliqués ci-dessous.
      let activityTickets = []
      let activityLocalTasks = []
      let activityRecettes = []

      if (this.myTimeEntriesOnly) {
        filteredTimeEntries = filteredTimeEntries.filter(entry => (entry.userId || null) === (this.currentUserId || null))
      }

      // Filtre par projet
      if (this.filters.projectId) {
        filteredTickets = filteredTickets.filter(t => t.projectId === this.filters.projectId)
        filteredSprints = filteredSprints.filter(s => s.projectId === this.filters.projectId)
        filteredLocalTasks = filteredLocalTasks.filter(t => t.projectId === this.filters.projectId)
        filteredRecettes = filteredRecettes.filter(r => r.projectId === this.filters.projectId)
        filteredTimeEntries = filteredTimeEntries.filter(te => {
          const ticket = this.allTickets.find(t => t.id === te.ticketId)
          return ticket && ticket.projectId === this.filters.projectId
        })
      }

      // Filtre par sprint
      if (this.filters.sprintId) {
        filteredTickets = filteredTickets.filter(t => t.sprintId === this.filters.sprintId)
        filteredLocalTasks = filteredLocalTasks.filter(t => t.sprintId === this.filters.sprintId)
        filteredRecettes = filteredRecettes.filter(r => r.sprintId === this.filters.sprintId)
      }

      // Filtre par année
      if (this.filters.year) {
        filteredTickets = filteredTickets.filter(t => {
          if (!t.createdAt) return false
          return new Date(t.createdAt).getFullYear() === this.filters.year
        })
        filteredLocalTasks = filteredLocalTasks.filter(t => {
          const referenceDate = t.updatedAt || t.createdAt
          if (!referenceDate) return false
          return new Date(referenceDate).getFullYear() === this.filters.year
        })
        filteredRecettes = filteredRecettes.filter(r => {
          const referenceDate = r.updatedAt || r.createdAt
          if (!referenceDate) return false
          return new Date(referenceDate).getFullYear() === this.filters.year
        })
        filteredTimeEntries = filteredTimeEntries.filter(te => {
          if (!te.date) return false
          return new Date(te.date).getFullYear() === this.filters.year
        })
      }

      // Filtre par période
      activityTickets = [...filteredTickets]
      activityLocalTasks = [...filteredLocalTasks]
      activityRecettes = [...filteredRecettes]

      if (this.filters.period !== 'all') {
        const now = new Date()
        let startDate

        switch (this.filters.period) {
          case 'thisMonth':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            break
          case 'last3Months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
            break
          case 'last6Months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1)
            break
          case 'thisYear':
            startDate = new Date(now.getFullYear(), 0, 1)
            break
        }

        if (startDate) {
          filteredTickets = filteredTickets.filter(t => {
            if (!t.createdAt) return false
            return new Date(t.createdAt) >= startDate
          })
          filteredLocalTasks = filteredLocalTasks.filter(t => {
            const referenceDate = t.updatedAt || t.createdAt
            if (!referenceDate) return false
            return new Date(referenceDate) >= startDate
          })
          filteredRecettes = filteredRecettes.filter(r => {
            const referenceDate = r.updatedAt || r.createdAt
            if (!referenceDate) return false
            return new Date(referenceDate) >= startDate
          })
          filteredTimeEntries = filteredTimeEntries.filter(te => {
            if (!te.date) return false
            return new Date(te.date) >= startDate
          })
        }
      }

      this.tickets = filteredTickets
      this.timeEntries = filteredTimeEntries
      this.sprints = filteredSprints
      this.buildRecentActivityFeed(activityTickets, activityLocalTasks, activityRecettes)
      this.calculateStats()
    },
    resetFilters() {
      this.filters = {
        projectId: null,
        year: null,
        period: 'thisMonth',
        sprintId: null
      }
      this.myTimeEntriesOnly = false
      this.applyFilters()
    },
    toggleMyTimeEntries() {
      this.myTimeEntriesOnly = !this.myTimeEntriesOnly
      this.applyFilters()
    },
    stripHtml(html) {
      if (!html) return ''
      return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    },
    truncateHtml(html, maxChars) {
      if (!html) return ''
      const text = this.stripHtml(html)
      if (text.length <= maxChars) {
        // Pas de troncature nécessaire, on retourne le HTML directement
        return html
      }
      // On tronque sur le texte brut
      const truncated = text.slice(0, maxChars)
      return `<span>${truncated.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span><span style="color:#bbb;"> … <em>[contenu tronqué]</em></span>`
    },
    setActivityTypeFilter(type) {
      if (this.activityTypeFilter === type) {
        this.activityTypeFilter = 'all'
        return
      }
      this.activityTypeFilter = type
    },
    getActivityTypeLabel(type) {
      const labels = {
        all: 'Toutes les activités',
        created: 'Créations',
        updated: 'Modifications',
        notes: 'Notes',
        recettes: 'Recettes',
        messages: 'Messages'
      }
      return labels[type] || type
    },
    startDashboardTimeEntryEdit(entry) {
      this.editingTimeEntryId = entry.id
      this.editingTimeEntry = {
        duration: Number(entry.duration || 0),
        date: entry.date || '',
        userId: entry.userId ?? null,
        description: entry.description || ''
      }
    },
    cancelDashboardTimeEntryEdit() {
      this.editingTimeEntryId = null
      this.editingTimeEntry = {
        duration: 0,
        date: '',
        userId: null,
        description: ''
      }
    },
    async createProject() {
      if (!this.newProject.name) return
      
      try {
        const projectData = {
          name: this.newProject.name,
          description: this.newProject.description,
          status: this.newProject.status,
          assignedUserId: this.newProject.assignedUserId || this.currentUserId,
          createdAt: new Date().toISOString()
        }
        
        await db.addProject(projectData)
        
        // Réinitialiser le formulaire
        this.newProject = {
          name: '',
          description: '',
          status: 'Actif',
          assignedUserId: this.currentUserId
        }
        
        this.showProjectModal = false
        await this.loadData()
        alert('✅ Projet créé avec succès !')
      } catch (error) {
        console.error('Erreur lors de la création du projet:', error)
        alert('❌ Erreur lors de la création du projet')
      }
    },
    async createTicket() {
      if (!this.newTicket.title || !this.newTicket.projectId) return
      
      try {
        const ticketData = {
          projectId: this.newTicket.projectId,
          title: this.newTicket.title,
          description: this.newTicket.description,
          priority: this.newTicket.priority,
          status: this.newTicket.status,
          assignedUserId: this.newTicket.assignedUserId || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        const createdTicketKey = await db.addTicket(ticketData)

        let odooSyncMessage = ''
        let githubMessage = ''
        let gitlabMessage = ''
        const selectedProject = this.projects.find(p => p.id === this.newTicket.projectId)

        if (selectedProject?.odooId && odooService.isConfigured()) {
          try {
            const createdOdooId = await odooService.createHelpdeskTicketForProject(
              selectedProject.odooId,
              this.newTicket.title,
              this.newTicket.description || '',
              this.newTicket.priority
            )

            const localTicketId = Number(createdTicketKey)
            if (Number.isFinite(localTicketId) && localTicketId > 0) {
              await db.updateTicket(localTicketId, { odooId: createdOdooId })
            }

            odooSyncMessage = ' + synchronisé Odoo'
          } catch (syncError) {
            console.error('Erreur de synchronisation ticket vers Odoo:', syncError)
            odooSyncMessage = ' (⚠️ non synchronisé Odoo)'
          }
        }

        const localTicketId = Number(createdTicketKey)
        const githubRef = this.resolveProjectGithubRef(selectedProject)
        if (this.newTicketGithub.createBranch && githubRef) {
          try {
            const token = String(this.githubTicketTokenInput || '').trim()
            if (!token) {
              throw new Error('Token GitHub requis pour créer la branche')
            }

            localStorage.setItem('github.connector.token', token)

            const branchName = String(this.newTicketGithub.branchName || '').trim() || this.buildTicketBranchName(localTicketId, this.newTicket.title)
            const branchUrl = await createGithubBranch(
              githubRef,
              branchName,
              token,
              this.newTicketGithub.baseSha || undefined,
              selectedProject.githubDefaultBranch || undefined
            )
            githubMessage = ` + branche créée (${branchName})`
            if (confirm(`✅ Branche GitHub créée. Ouvrir la branche ?\n${branchName}`)) {
              window.open(branchUrl, '_blank', 'noopener')
            }
          } catch (githubError) {
            console.error('Erreur création branche GitHub:', githubError)
            githubMessage = ` (⚠️ branche GitHub non créée: ${githubError?.message || 'erreur'})`
          }
        }

        const gitlabRef = this.resolveProjectGitlabRef(selectedProject)
        if (this.newTicketGitlab.createBranch && gitlabRef) {
          try {
            const token = String(this.gitlabTicketTokenInput || '').trim()
            if (!token) {
              throw new Error('Token GitLab requis pour créer la branche')
            }

            localStorage.setItem('gitlab.connector.token', token)

            const branchName = String(this.newTicketGitlab.branchName || '').trim() || this.buildTicketBranchName(localTicketId, this.newTicket.title)
            const branchUrl = await createGitlabBranch(
              gitlabRef,
              branchName,
              token,
              this.newTicketGitlab.baseSha || undefined,
              selectedProject.gitlabDefaultBranch || undefined
            )
            gitlabMessage = ` + branche GitLab créée (${branchName})`
            if (confirm(`✅ Branche GitLab créée. Ouvrir la branche ?\n${branchName}`)) {
              window.open(branchUrl, '_blank', 'noopener')
            }
          } catch (gitlabError) {
            console.error('Erreur création branche GitLab:', gitlabError)
            gitlabMessage = ` (⚠️ branche GitLab non créée: ${gitlabError?.message || 'erreur'})`
          }
        }
        
        // Réinitialiser le formulaire
        this.newTicket = {
          projectId: null,
          title: '',
          description: '',
          priority: 'medium',
          status: 'À faire',
          assignedUserId: this.currentUserId
        }
        this.newTicketGithub = {
          createBranch: true,
          branchName: '',
          baseSha: ''
        }
        this.githubTicketCommits = []
        this.githubTicketCommitsError = ''
        this.newTicketGitlab = {
          createBranch: true,
          branchName: '',
          baseSha: ''
        }
        this.gitlabTicketCommits = []
        this.gitlabTicketCommitsError = ''
        
        this.showTicketModal = false
        await this.loadData()
        alert(`✅ Ticket créé avec succès !${odooSyncMessage}${githubMessage}${gitlabMessage}`)
      } catch (error) {
        console.error('Erreur lors de la création du ticket:', error)
        alert('❌ Erreur lors de la création du ticket')
      }
    },
    async createTodo() {
      if (!this.newTodo.text) return
      
      try {
        if (this.newTodo.type === 'daily') {
          // Créer une tâche du jour
          const todoData = {
            text: this.newTodo.text,
            priority: this.newTodo.priority,
            completed: false,
            date: new Date().toISOString().split('T')[0],
            assignedUserId: this.newTodo.assignedUserId || this.currentUserId,
            createdAt: new Date().toISOString()
          }
          
          await db.addTodo(todoData)
          alert('✅ Tâche du jour créée avec succès !')
        } else {
          // Créer une tâche locale liée à un projet
          if (!this.newTodo.projectId) return
          
          const localTaskData = {
            projectId: this.newTodo.projectId,
            title: this.newTodo.text,
            description: this.newTodo.description || '',
            priority: this.newTodo.priority,
            status: this.newTodo.status,
            assignedUserId: this.newTodo.assignedUserId || this.currentUserId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          
          await db.addLocalTask(localTaskData)
          alert('✅ Tâche projet créée avec succès !')
        }
        
        // Réinitialiser le formulaire
        this.newTodo = {
          type: 'daily',
          text: '',
          description: '',
          projectId: null,
          priority: 'medium',
          status: 'À faire',
          assignedUserId: this.currentUserId
        }
        
        this.showTodoModal = false
        await this.loadData()
      } catch (error) {
        console.error('Erreur lors de la création de la tâche:', error)
        alert('❌ Erreur lors de la création de la tâche')
      }
    },
    openTimeEntryModal() {
      this.newTimeEntry = {
        projectId: this.filters.projectId || null,
        targetType: 'ticket',
        ticketId: null,
        localTaskId: null,
        odooTaskId: null,
        hours: 0,
        minutes: 0,
        date: new Date().toISOString().split('T')[0],
        userId: this.currentUserId,
        description: ''
      }
      this.showTimeEntryModal = true
    },
    resetTimeEntryTargetSelection() {
      this.newTimeEntry.ticketId = null
      this.newTimeEntry.localTaskId = null
      this.newTimeEntry.odooTaskId = null
    },
    setTimeEntryTargetType(targetType) {
      if (this.newTimeEntry.targetType !== targetType) {
        this.newTimeEntry.targetType = targetType
        this.resetTimeEntryTargetSelection()
      }
    },
    getProjectNameById(projectId) {
      const project = this.projects.find(p => p.id === projectId)
      return project ? project.name : 'Projet inconnu'
    },
    getProjectNameByTicketId(ticketId) {
      const ticket = this.allTickets.find(t => t.id === ticketId)
      if (!ticket) return 'Projet inconnu'
      return this.getProjectNameById(ticket.projectId)
    },
    getTicketTitle(ticketId) {
      return this.allTickets.find(t => t.id === ticketId)?.title || 'Ticket inconnu'
    },
    buildRecentActivityFeed(filteredTickets, filteredLocalTasks, filteredRecettes) {
      const activities = []

      const addActivity = (item) => {
        if (!item?.date) return
        activities.push(item)
      }

      for (const ticket of filteredTickets) {
        const ticketTitle = ticket.title || 'Ticket sans titre'
        const projectName = this.getProjectNameById(ticket.projectId)

        if (ticket.createdAt) {
          addActivity({
            key: `ticket-created-${ticket.id}-${ticket.createdAt}`,
            icon: '🎫',
            type: 'created',
            typeLabel: 'Ticket créé',
            date: ticket.createdAt,
            title: ticketTitle,
            description: ticket.description || '',
            ticketId: ticket.id,
            projectId: ticket.projectId,
            projectName
          })
        }

        if (ticket.updatedAt && ticket.updatedAt !== ticket.createdAt) {
          addActivity({
            key: `ticket-updated-${ticket.id}-${ticket.updatedAt}`,
            icon: '✏️',
            type: 'updated',
            typeLabel: 'Ticket modifié',
            date: ticket.updatedAt,
            title: ticketTitle,
            description: 'Mise à jour du ticket',
            ticketId: ticket.id,
            projectId: ticket.projectId,
            projectName
          })
        }

        for (const note of (ticket.notes || [])) {
          const noteDate = note.updatedAt || note.createdAt
          addActivity({
            key: `ticket-note-${ticket.id}-${note.id}-${noteDate}`,
            icon: '📝',
            type: 'notes',
            typeLabel: 'Note',
            date: noteDate,
            title: ticketTitle,
            description: note.content || '',
            ticketId: ticket.id,
            projectId: ticket.projectId,
            projectName
          })
        }

        for (const entry of (ticket.recetteHistory || [])) {
          addActivity({
            key: `ticket-recette-${ticket.id}-${entry.id}-${entry.createdAt}`,
            icon: '🧪',
            type: 'recettes',
            typeLabel: 'Recette',
            date: entry.createdAt,
            title: ticketTitle,
            description: entry.comment || this.getRecetteStatusLabel(entry.status),
            ticketId: ticket.id,
            projectId: ticket.projectId,
            projectName
          })
        }

        for (const message of (ticket.emailHistory || [])) {
          addActivity({
            key: `ticket-message-${ticket.id}-${message.id}-${message.createdAt}`,
            icon: '💬',
            type: 'messages',
            typeLabel: 'Message',
            date: message.createdAt,
            title: ticketTitle,
            description: message.subject || message.parsedBody || message.body || '',
            ticketId: ticket.id,
            projectId: ticket.projectId,
            projectName
          })
        }
      }

      for (const task of filteredLocalTasks) {
        const taskTitle = task.title || 'Tâche locale sans titre'
        const projectName = this.getProjectNameById(task.projectId)

        if (task.createdAt) {
          addActivity({
            key: `task-created-${task.id}-${task.createdAt}`,
            icon: '✅',
            type: 'created',
            typeLabel: 'Tâche créée',
            date: task.createdAt,
            title: taskTitle,
            description: task.description || '',
            localTaskId: task.id,
            projectId: task.projectId,
            projectName
          })
        }

        if (task.updatedAt && task.updatedAt !== task.createdAt) {
          addActivity({
            key: `task-updated-${task.id}-${task.updatedAt}`,
            icon: '✏️',
            type: 'updated',
            typeLabel: 'Tâche modifiée',
            date: task.updatedAt,
            title: taskTitle,
            description: 'Mise à jour de la tâche',
            localTaskId: task.id,
            projectId: task.projectId,
            projectName
          })
        }
      }

      for (const recette of filteredRecettes) {
        const referenceDate = recette.updatedAt || recette.createdAt
        addActivity({
          key: `recette-${recette.id}-${referenceDate}`,
          icon: '🧪',
          type: 'recettes',
          typeLabel: 'Recette',
          date: referenceDate,
          title: recette.name || 'Recette',
          description: recette.description || '',
          projectId: recette.projectId || null,
          projectName: recette.projectId ? this.getProjectNameById(recette.projectId) : 'Projet inconnu'
        })
      }

      const sorted = activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 30)

      this.recentEntityActivities = sorted
    },
    getRecetteStatusLabel(status) {
      const labels = {
        pending: 'À retester',
        ready_for_test: 'Prêt à tester',
        in_test: 'En test',
        blocked: 'Bloqué',
        validated: 'Validé',
        rejected: 'Rejeté'
      }
      return labels[status] || 'Recette'
    },
    openActivityItem(item) {
      if (item.ticketId) {
        this.viewTicket(item.ticketId)
        return
      }

      if (item.localTaskId) {
        this.viewLocalTask(item.localTaskId)
        return
      }

      if (item.projectId) {
        this.viewProject(item.projectId)
      }
    },
    viewProject(projectId) {
      this.$router.push(`/projects/${projectId}`)
    },
    viewLocalTask(localTaskId) {
      this.$router.push(`/local-tasks/${localTaskId}`)
    },
    getUserDisplayName(userId) {
      if (!userId) return 'Non assigné'
      const user = this.users.find(u => u.id === userId)
      return user ? `${user.displayName} (${user.username})` : 'Utilisateur inconnu'
    },
    async saveDashboardTimeEntryEdit(entry) {
      if (!entry?.id) return
      if (!this.editingTimeEntry.duration || this.editingTimeEntry.duration <= 0) {
        alert('La durée doit être supérieure à 0')
        return
      }
      if (!this.editingTimeEntry.date) {
        alert('La date est obligatoire')
        return
      }

      try {
        await db.updateTimeEntry(entry.id, {
          duration: this.editingTimeEntry.duration,
          date: this.editingTimeEntry.date,
          userId: this.editingTimeEntry.userId ?? null,
          description: this.editingTimeEntry.description || ''
        })

        const ticket = this.allTickets.find(item => item.id === entry.ticketId)
        if (entry.odooId && ticket?.odooId && odooService.isConfigured()) {
          await odooService.updateTimeEntry(
            entry.odooId,
            this.editingTimeEntry.duration,
            this.editingTimeEntry.date,
            this.editingTimeEntry.description || ''
          )
        } else if (!entry.odooId && ticket?.odooId && odooService.isConfigured()) {
          const newOdooId = await odooService.createTimeEntry(
            ticket.odooId,
            this.editingTimeEntry.duration,
            this.editingTimeEntry.date,
            this.editingTimeEntry.description || ''
          )
          await db.updateTimeEntry(entry.id, { synced: true, odooId: newOdooId })
        }

        await this.loadData()
        this.cancelDashboardTimeEntryEdit()
      } catch (error) {
        console.error('Erreur édition inline FDT dashboard:', error)
        alert(`❌ ${error.message || 'Erreur lors de la mise à jour de la feuille de temps'}`)
      }
    },
    async createTimeEntry() {
      if (!this.isValidTimeEntry) return

      const duration = (this.newTimeEntry.hours || 0) * 60 + (this.newTimeEntry.minutes || 0)

      try {
        if (this.newTimeEntry.targetType === 'ticket') {
          const ticket = this.allTickets.find(t => t.id === this.newTimeEntry.ticketId)
          if (!ticket) {
            alert('❌ Ticket introuvable')
            return
          }

          let createdOdooId = null
          let synced = false
          let syncMessage = ''

          if (ticket.odooId && odooService.isConfigured()) {
            try {
              createdOdooId = await odooService.createTimeEntry(
                ticket.odooId,
                duration,
                this.newTimeEntry.date,
                this.newTimeEntry.description || ''
              )
              synced = true
              syncMessage = ' + synchronisée Odoo'
            } catch (syncError) {
              console.error('Erreur synchro Odoo feuille de temps ticket:', syncError)
              syncMessage = ' (⚠️ synchro Odoo en échec)'
            }
          }

          await db.addTimeEntry({
            ticketId: ticket.id,
            duration,
            date: this.newTimeEntry.date,
            description: this.newTimeEntry.description || '',
            userId: this.newTimeEntry.userId ?? this.currentUserId,
            synced,
            odooId: createdOdooId || undefined
          })

          this.showTimeEntryModal = false
          await this.loadData()
          alert(`✅ Feuille de temps ajoutée au ticket${syncMessage}`)
          return
        }

        if (this.newTimeEntry.targetType === 'localTask') {
          const task = this.allLocalTasks.find(t => t.id === this.newTimeEntry.localTaskId)
          if (!task) {
            alert('❌ Tâche locale introuvable')
            return
          }

          await db.updateLocalTask(task.id, {
            timeTotalMinutes: (task.timeTotalMinutes || 0) + duration
          })

          this.showTimeEntryModal = false
          await this.loadData()
          alert('✅ Temps ajouté à la tâche locale')
          return
        }

        if (this.newTimeEntry.targetType === 'odooTask') {
          const task = this.allOdooTasks.find(t => Number(t.odooId) === Number(this.newTimeEntry.odooTaskId))
          if (!task) {
            alert('❌ Tâche Odoo introuvable')
            return
          }

          if (!odooService.isConfigured()) {
            alert('❌ Odoo n\'est pas configuré')
            return
          }

          await odooService.createTaskTimeEntry(
            task.odooId,
            duration,
            this.newTimeEntry.date,
            this.newTimeEntry.description || ''
          )

          await db.updateOdooTaskByOdooId(task.odooId, {
            timeTotalMinutes: (task.timeTotalMinutes || 0) + duration
          })

          this.showTimeEntryModal = false
          await this.loadData()
          alert('✅ Temps ajouté à la tâche Odoo')
        }
      } catch (error) {
        console.error('Erreur lors de la création de la feuille de temps:', error)
        alert(`❌ ${error.message || 'Erreur lors de la création de la feuille de temps'}`)
      }
    },
    calculateStats() {
      // Stats projets
      this.stats.projects.total = this.projects.length
      this.stats.projects.active = this.projects.filter(p => p.status === 'Actif').length
      this.stats.projects.completed = this.projects.filter(p => p.status === 'Terminé').length
      this.stats.projects.paused = this.projects.filter(p => p.status === 'En pause').length

      // Stats tickets
      this.stats.tickets.total = this.tickets.length
      
      // Par statut - résoudre le label via les colonnes kanban du projet (custom ou standard)
      const fallbackStatusLabels = { 'todo': 'À faire', 'in-progress': 'En cours', 'done': 'Terminé' }
      const statusCounts = {}
      this.tickets.forEach(ticket => {
        const raw = ticket.status || 'Sans statut'
        let label = fallbackStatusLabels[raw] || raw
        // Chercher dans les colonnes kanban du projet associé
        const project = this.projects.find(p => p.id === ticket.projectId)
        if (project?.kanbanColumns) {
          const col = project.kanbanColumns.find(c => c.id === raw)
          if (col) label = col.label
        }
        statusCounts[label] = (statusCounts[label] || 0) + 1
      })
      this.stats.tickets.byStatus = statusCounts

      // Par priorité - utiliser les clés françaises attendues par le template
      this.stats.tickets.byPriority = {
        haute: this.tickets.filter(t => t.priority === 'high').length,
        moyenne: this.tickets.filter(t => t.priority === 'medium').length,
        basse: this.tickets.filter(t => t.priority === 'low').length
      }

      // Stats sprints
      this.stats.sprints.total = this.sprints.length
      this.stats.sprints.planned = this.sprints.filter(s => s.status === 'Planifié').length
      this.stats.sprints.active = this.sprints.filter(s => s.status === 'En cours').length
      this.stats.sprints.completed = this.sprints.filter(s => s.status === 'Terminé').length

      // Stats todos
      this.stats.todos.total = this.todos.length
      this.stats.todos.completed = this.todos.filter(t => t.completed).length
      this.stats.todos.pending = this.todos.filter(t => !t.completed).length
      this.stats.todos.completionRate = this.todos.length > 0 
        ? Math.round((this.stats.todos.completed / this.todos.length) * 100)
        : 0

      // Stats temps
      this.stats.timeEntries.count = this.timeEntries.length
      this.stats.timeEntries.total = this.timeEntries.reduce((sum, entry) => sum + entry.duration, 0)
      
      // Temps de cette semaine
      const now = new Date()
      const startOfWeek = new Date(now)
      const day = now.getDay()
      const diffToMonday = day === 0 ? -6 : 1 - day
      startOfWeek.setDate(now.getDate() + diffToMonday)
      startOfWeek.setHours(0, 0, 0, 0)
      
      this.stats.timeEntries.thisWeek = this.timeEntries
        .filter(entry => new Date(entry.date) >= startOfWeek)
        .reduce((sum, entry) => sum + entry.duration, 0)

      // Progression par projet
      this.projectsWithTickets = this.projects
        .map(project => {
          const projectTickets = this.tickets.filter(t => t.projectId === project.id)
          const completedTickets = projectTickets.filter(t => {
            // Utiliser les colonnes personnalisées du projet
            const columns = project.kanbanColumns || [
              { id: 'todo', label: 'À faire', color: '#fff3cd' },
              { id: 'in-progress', label: 'En cours', color: '#cfe2ff' },
              { id: 'done', label: 'Terminé', color: '#d1e7dd' }
            ]
            const lastColumn = columns[columns.length - 1]
            return t.status === lastColumn.id
          }).length
          
          return {
            id: project.id,
            name: project.name,
            totalTickets: projectTickets.length,
            completedTickets,
            completionRate: projectTickets.length > 0 
              ? Math.round((completedTickets / projectTickets.length) * 100)
              : 0
          }
        })
        .filter(p => p.totalTickets > 0)
        .sort((a, b) => b.completionRate - a.completionRate)

      // Tickets récents
      this.recentTickets = [...this.tickets]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
    },
    getStatusBadgeClass(status) {
      const lowerStatus = status.toLowerCase()
      if (lowerStatus.includes('termin') || lowerStatus.includes('fini') || lowerStatus.includes('résolu') || lowerStatus.includes('done')) return 'badge-completed'
      if (lowerStatus.includes('cours') || lowerStatus.includes('progress') || lowerStatus.includes('revue') || lowerStatus.includes('review') || lowerStatus.includes('test')) return 'badge-active'
      if (lowerStatus.includes('faire') || lowerStatus.includes('todo') || lowerStatus.includes('nouveau') || lowerStatus.includes('attente')) return 'badge-pending'
      return 'badge-default'
    },
    getPriorityBadgeClass(priority) {
      if (priority === 'high' || priority === 'haute') return 'badge-high'
      if (priority === 'medium' || priority === 'moyenne') return 'badge-medium'
      if (priority === 'low' || priority === 'basse') return 'badge-low'
      return 'badge-default'
    },
    getPriorityLabel(priority) {
      const labels = { 'high': 'Haute', 'medium': 'Moyenne', 'low': 'Basse' }
      return labels[priority] || priority
    },
    formatDate(dateString) {
      if (!dateString) return 'Date inconnue'
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now - date)
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) return "Aujourd'hui"
      if (diffDays === 1) return 'Hier'
      if (diffDays < 7) return `Il y a ${diffDays} jours`
      if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`
      return date.toLocaleDateString('fr-FR')
    },
    formatDuration(minutes) {
      if (!minutes || minutes === 0) return '0h'
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      if (hours === 0) return `${mins}min`
      if (mins === 0) return `${hours}h`
      return `${hours}h${mins.toString().padStart(2, '0')}`
    },
    viewTicket(ticketId) {
      this.$router.push(`/tickets/${ticketId}`)
    }
  }
}
</script>

<style scoped>
.dashboard {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 2rem;
  flex-wrap: wrap;
}

.dashboard-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e2e8f0;
  flex-wrap: wrap;
}

.dashboard-tab {
  padding: 0.65rem 1.3rem;
  border: none;
  border-bottom: 3px solid transparent;
  background: transparent;
  color: #718096;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: -2px;
  border-radius: 8px 8px 0 0;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.dashboard-tab:hover {
  background: #f7fafc;
  color: #4a5568;
}

.dashboard-tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: #f0f2ff;
  font-weight: 600;
}

.dashboard h2 {
  margin: 0;
  color: #2d3748;
  font-size: 2rem;
  font-weight: 700;
}

.quick-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn-quick-action {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  color: white;
}

.btn-quick-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-quick-action span {
  font-size: 1.2rem;
}

.btn-project {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.btn-ticket {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.btn-todo {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.btn-time {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

/* Modals */
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
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f7fafc;
  color: #2d3748;
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
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group textarea {
  resize: vertical;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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

/* Sélecteur de type de tâche */
.task-type-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.task-type-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: #4a5568;
}

.task-type-btn:hover {
  border-color: #cbd5e0;
  background: #f7fafc;
}

.task-type-btn.active {
  border-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.task-type-btn span {
  font-size: 1.2rem;
}

/* Filtres modernisés */
.filters-container {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.filters-header h3 {
  margin: 0;
  color: #2d3748;
  font-size: 1.2rem;
  font-weight: 600;
}

.btn-reset {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

.btn-reset:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
}

.btn-reset-active {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  box-shadow: 0 2px 4px rgba(56, 249, 215, 0.35);
}

.btn-reset span {
  font-size: 1.1rem;
  font-weight: 600;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.filter-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f7fafc;
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.filter-card:hover {
  border-color: rgba(102, 126, 234, 0.3);
  background: #fff;
}

.filter-card.filter-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.filter-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.filter-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.filter-content label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #718096;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-content select {
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
  color: #2d3748;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-content select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filter-content select:disabled {
  background: #f7fafc;
  cursor: not-allowed;
  opacity: 0.6;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.kpi-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.kpi-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08);
  border-color: rgba(102, 126, 234, 0.2);
}

.clickable-activity {
  cursor: pointer;
}

.kpi-header h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #333;
}

.kpi-stats {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.kpi-main {
  text-align: center;
  padding: 1rem 0;
  border-bottom: 2px solid #f0f0f0;
}

.kpi-number {
  font-size: 3rem;
  font-weight: bold;
  color: #007bff;
  line-height: 1;
}

.kpi-label {
  margin-top: 0.5rem;
  color: #666;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.kpi-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.kpi-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.badge {
  font-size: 1.2rem;
}

.badge-active { color: #28a745; }
.badge-completed { color: #6c757d; }
.badge-paused { color: #ffc107; }
.badge-planned { color: #17a2b8; }
.badge-pending { color: #ffc107; }
.badge-default { color: #6c757d; }
.badge-high { 
  background: #dc3545; 
  color: white; 
  padding: 2px 8px; 
  border-radius: 4px;
  font-size: 0.75rem;
}
.badge-medium { 
  background: #ffc107; 
  color: white; 
  padding: 2px 8px; 
  border-radius: 4px;
  font-size: 0.75rem;
}
.badge-low { 
  background: #28a745; 
  color: white; 
  padding: 2px 8px; 
  border-radius: 4px;
  font-size: 0.75rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  transition: width 0.3s ease;
}

.progress-complete {
  background: linear-gradient(90deg, #28a745, #1e7e34) !important;
}

.charts-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.charts-section h3 {
  margin: 0 0 1.5rem 0;
  font-size: 1.2rem;
  color: #333;
}

.projects-progress {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.project-progress {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  align-items: center;
}

.project-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  grid-column: 1 / -1;
}

.project-name {
  font-weight: 600;
  color: #333;
}

.project-stats {
  color: #666;
  font-size: 0.9rem;
}

.project-percentage {
  font-weight: bold;
  color: #007bff;
  min-width: 50px;
  text-align: right;
}

.priority-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.activity-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 1rem;
}

.priority-card {
  text-align: center;
  padding: 1.5rem;
  border-radius: 8px;
  background: #f8f9fa;
}

.activity-filter-card {
  border: 2px solid transparent;
  cursor: pointer;
  width: 100%;
  transition: all 0.2s;
}

.activity-filter-card:hover {
  transform: translateY(-2px);
  border-color: #cbd5e0;
}

.activity-filter-card.active {
  border-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.12);
}

.activity-filter-actions {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.activity-search-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.4rem 0.75rem;
  transition: border-color 0.2s;
}

.activity-search-bar:focus-within {
  border-color: #667eea;
  background: #fff;
}

.activity-search-icon {
  font-size: 1rem;
  flex-shrink: 0;
  opacity: 0.6;
}

.activity-search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.95rem;
  color: #2d3748;
  min-width: 0;
}

.activity-search-input::placeholder {
  color: #a0aec0;
}

.activity-search-clear {
  background: none;
  border: none;
  cursor: pointer;
  color: #a0aec0;
  font-size: 1rem;
  padding: 0 0.2rem;
  flex-shrink: 0;
  line-height: 1;
}

.activity-search-clear:hover {
  color: #e53e3e;
}

.activity-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.activity-section-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.activity-days-selector {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.days-btn {
  padding: 0.35rem 0.8rem;
  border: 2px solid #e2e8f0;
  border-radius: 20px;
  background: white;
  font-size: 0.82rem;
  font-weight: 600;
  color: #4a5568;
  cursor: pointer;
  transition: all 0.18s;
}

.days-btn:hover {
  border-color: #a3b0f5;
  color: #667eea;
}

.days-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  color: white;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.35);
}

.activity-filter-label {
  color: #4a5568;
  font-size: 0.9rem;
}

.activity-description {
  margin-top: 0.35rem;
  color: #555;
  font-size: 0.88rem;
  line-height: 1.5;
  word-break: break-word;
  overflow-wrap: break-word;
}

.activity-description :deep(p) { margin: 0.25rem 0; }
.activity-description :deep(ul),
.activity-description :deep(ol) { margin: 0.25rem 0; padding-left: 1.25rem; }
.activity-description :deep(li) { margin: 0.15rem 0; }
.activity-description :deep(strong) { color: #333; }
.activity-description :deep(h1),
.activity-description :deep(h2),
.activity-description :deep(h3) { font-size: 0.95rem; margin: 0.25rem 0; }
.activity-description :deep(pre),
.activity-description :deep(code) {
  background: #f1f3f5;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.82rem;
  white-space: pre-wrap;
}

.priority-high { border-left: 4px solid #dc3545; }
.priority-medium { border-left: 4px solid #ffc107; }
.priority-low { border-left: 4px solid #28a745; }

.priority-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.priority-count {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
}

.priority-label {
  margin-top: 0.5rem;
  color: #666;
  font-size: 0.9rem;
}

.recent-activity {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.project-time-groups {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.project-time-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  background: #f8fafc;
}

.project-time-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.ticket-time-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ticket-time-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  background: white;
  border: 1px solid #edf2f7;
}

.activity-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  transition: background 0.2s;
}

.activity-item:hover {
  background: #e9ecef;
}

.activity-icon {
  font-size: 1.5rem;
}

.activity-content {
  flex: 1;
}

.time-inline-edit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 1rem;
  align-items: end;
}

.time-inline-description {
  grid-column: span 2;
}

.entry-inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: flex-end;
}

.activity-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
}

.activity-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: #666;
}

.activity-date {
  color: #999;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #999;
  font-style: italic;
}

@media (max-width: 768px) {
  .project-time-header,
  .ticket-time-item {
    flex-direction: column;
    align-items: stretch;
  }

  .time-inline-description {
    grid-column: span 1;
  }

  .entry-inline-actions {
    justify-content: flex-start;
  }
}
</style>
