import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'tickets-db';
const DB_VERSION = 15;

// Types
export interface KanbanColumn {
  id: string;
  label: string;
  color: string;
}

export interface Project {
  id?: number;
  name: string;
  description?: string;
  status?: string;
  assignedUserId?: number | null;
  isFavorite?: boolean;
  kanbanColumns?: KanbanColumn[];
  odooId?: number;
  // Chiffrage pour les tâches locales
  chiffrageEnabled?: boolean;
  tjm?: number;
  hoursPerDay?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Note {
  id: number;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64
  uploadedAt: string;
}

export interface UserStory {
  id: number;
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  acceptanceCriteriaItems?: {
    id: number;
    text: string;
    checked: boolean;
    checkedAt?: string | null;
    checkedByUserId?: number | null;
  }[];
  status?: 'todo' | 'in-progress' | 'done';
  createdAt: string;
  updatedAt?: string;
}

export interface RecetteHistoryEntry {
  id: number;
  status: 'pending' | 'ready_for_test' | 'in_test' | 'blocked' | 'validated' | 'rejected';
  comment?: string;
  createdAt: string;
  byUserId?: number | null;
  coveragePercent?: number;
  checkedCriteria?: number;
  totalCriteria?: number;
}

export interface Ticket {
  id?: number;
  projectId: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  recetteStatus?: 'pending' | 'ready_for_test' | 'in_test' | 'blocked' | 'validated' | 'rejected';
  recetteComment?: string;
  recetteDate?: string;
  recetteByUserId?: number | null;
  recetteHistory?: RecetteHistoryEntry[];
  assignedUserId?: number | null;
  sprintId?: number | null;
  notes?: Note[];
  userStories?: UserStory[];
  attachments?: Attachment[];
  odooId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Todo {
  id?: number;
  text: string;
  description?: string;
  date: string;
  plannedDate: string;
  completed: boolean;
  assignedUserId?: number | null;
  createdAt?: string;
}

export interface MeetingNote {
  id: number;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Sprint {
  id?: number;
  projectId: number;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  meetingNotes?: MeetingNote[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TimeEntry {
  id?: number;
  ticketId: number;
  duration: number; // en minutes
  description?: string;
  date: string;
  userId?: number | null; // utilisateur lié à la saisie locale
  odooId?: number; // ID dans Odoo si synchronisé
  synced?: boolean; // Indique si synchronisé avec Odoo
  createdAt?: string;
  updatedAt?: string;
}

export interface OdooTaskLocal {
  id?: number;
  odooId: number;
  projectOdooId: number;
  localProjectId?: number;
  projectName?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  timeTotalMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
  syncedAt?: string;
}

export interface LocalTask {
  id?: number;
  projectId: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignedUserId?: number | null;
  timeTotalMinutes?: number;
  // Champs de chiffrage
  isChiffrage?: boolean;
  lotNumber?: string;
  difficulty?: string;
  estimatedTime?: number;
  attachments?: Attachment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PasswordEntry {
  id?: number;
  ownerUserId?: number | null;
  title: string;
  username?: string;
  password: string; // Sera chiffré
  url?: string;
  category?: string;
  notes?: string;
  favorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id?: number;
  username: string;
  displayName: string;
  email?: string;
  role: 'admin' | 'user';
  passwordHash: string;
  passwordSalt: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Colonnes kanban par défaut
const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'todo', label: 'À faire', color: '#fff3cd' },
  { id: 'in-progress', label: 'En cours', color: '#cfe2ff' },
  { id: 'done', label: 'Terminé', color: '#d1e7dd' }
];

class DatabaseService {
  db: IDBPDatabase | null = null;

  async init(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        // Store pour les projets
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
          projectStore.createIndex('name', 'name');
          projectStore.createIndex('isFavorite', 'isFavorite');
        }

        // Ajouter l'index isFavorite aux projets existants (v4)
        if (oldVersion < 4 && db.objectStoreNames.contains('projects')) {
          const projectStore = transaction.objectStore('projects');
          if (!projectStore.indexNames.contains('isFavorite')) {
            projectStore.createIndex('isFavorite', 'isFavorite');
          }
        }

        // Store pour les tickets
        if (!db.objectStoreNames.contains('tickets')) {
          const ticketStore = db.createObjectStore('tickets', { keyPath: 'id', autoIncrement: true });
          ticketStore.createIndex('projectId', 'projectId');
          ticketStore.createIndex('status', 'status');
        }

        // Store pour la todolist
        if (!db.objectStoreNames.contains('todos')) {
          const todoStore = db.createObjectStore('todos', { keyPath: 'id', autoIncrement: true });
          todoStore.createIndex('date', 'date');
          todoStore.createIndex('completed', 'completed');
          todoStore.createIndex('plannedDate', 'plannedDate');
        }

        // Ajouter l'index plannedDate aux todos existants (v6)
        if (oldVersion < 6 && db.objectStoreNames.contains('todos')) {
          const todoStore = transaction.objectStore('todos');
          if (!todoStore.indexNames.contains('plannedDate')) {
            todoStore.createIndex('plannedDate', 'plannedDate');
          }
        }

        // Store pour les sprints (nouveau en v2)
        if (!db.objectStoreNames.contains('sprints')) {
          const sprintStore = db.createObjectStore('sprints', { keyPath: 'id', autoIncrement: true });
          sprintStore.createIndex('projectId', 'projectId');
          sprintStore.createIndex('status', 'status');
        }

        // Ajouter l'index sprintId aux tickets si nécessaire
        if (oldVersion < 2 && db.objectStoreNames.contains('tickets')) {
          const ticketStore = transaction.objectStore('tickets');
          if (!ticketStore.indexNames.contains('sprintId')) {
            ticketStore.createIndex('sprintId', 'sprintId');
          }
        }

        // Store pour les time entries (nouveau en v7)
        if (!db.objectStoreNames.contains('timeEntries')) {
          const timeEntryStore = db.createObjectStore('timeEntries', { keyPath: 'id', autoIncrement: true });
          timeEntryStore.createIndex('ticketId', 'ticketId');
          timeEntryStore.createIndex('date', 'date');
        }

        // Store pour les tâches Odoo locales (nouveau en v8)
        if (!db.objectStoreNames.contains('odooTasks')) {
          const odooTaskStore = db.createObjectStore('odooTasks', { keyPath: 'id', autoIncrement: true });
          odooTaskStore.createIndex('odooId', 'odooId', { unique: true });
          odooTaskStore.createIndex('projectOdooId', 'projectOdooId');
          odooTaskStore.createIndex('localProjectId', 'localProjectId');
        }

        // Store pour les tâches locales (nouveau en v9)
        if (!db.objectStoreNames.contains('localTasks')) {
          const localTaskStore = db.createObjectStore('localTasks', { keyPath: 'id', autoIncrement: true });
          localTaskStore.createIndex('projectId', 'projectId');
          localTaskStore.createIndex('status', 'status');
        }

        // Store pour le gestionnaire de mots de passe (nouveau en v12)
        if (!db.objectStoreNames.contains('passwords')) {
          const passwordStore = db.createObjectStore('passwords', { keyPath: 'id', autoIncrement: true });
          passwordStore.createIndex('category', 'category');
          passwordStore.createIndex('ownerUserId', 'ownerUserId');
        }

        if (oldVersion < 15 && db.objectStoreNames.contains('passwords')) {
          const passwordStore = transaction.objectStore('passwords');
          if (!passwordStore.indexNames.contains('ownerUserId')) {
            passwordStore.createIndex('ownerUserId', 'ownerUserId');
          }
        }

        // Store pour les utilisateurs (nouveau en v14)
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('role', 'role');
          userStore.createIndex('active', 'active');
        }
      }
    });
  }

  // ===== PROJECTS =====
  async getAllProjects(): Promise<Project[]> {
    return await this.db!.getAll('projects');
  }

  async getProject(id: number): Promise<Project> {
    return await this.db!.get('projects', id);
  }

  async addProject(project: Project): Promise<IDBValidKey> {
    return await this.db!.add('projects', {
      ...project,
      assignedUserId: project.assignedUserId ?? null,
      isFavorite: project.isFavorite || false,
      kanbanColumns: project.kanbanColumns || DEFAULT_KANBAN_COLUMNS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  async updateProject(id: number, project: Partial<Project>): Promise<IDBValidKey> {
    const existing = await this.getProject(id);
    // Sérialiser pour éviter les problèmes de clonage avec IndexedDB
    const updated = JSON.parse(JSON.stringify({
      ...existing,
      ...project,
      id,
      updatedAt: new Date().toISOString()
    }));
    return await this.db!.put('projects', updated);
  }

  async deleteProject(id: number): Promise<void> {
    // Supprimer aussi les tickets associés
    const tickets = await this.getTicketsByProject(id);
    for (const ticket of tickets) {
      await this.deleteTicket(ticket.id!);
    }
    return await this.db!.delete('projects', id);
  }

  async toggleFavorite(id: number): Promise<IDBValidKey> {
    const project = await this.getProject(id);
    return await this.updateProject(id, {
      isFavorite: !project.isFavorite
    });
  }

  async getFavoriteProjects(): Promise<Project[]> {
    const allProjects = await this.getAllProjects();
    return allProjects.filter(p => p.isFavorite);
  }

  // ===== TICKETS =====
  async getAllTickets(): Promise<Ticket[]> {
    return await this.db!.getAll('tickets');
  }

  async getTicket(id: number): Promise<Ticket> {
    return await this.db!.get('tickets', id);
  }

  async getTicketsByProject(projectId: number): Promise<Ticket[]> {
    return await this.db!.getAllFromIndex('tickets', 'projectId', projectId);
  }

  async addTicket(ticket: Ticket): Promise<IDBValidKey> {
    const serialized = JSON.parse(JSON.stringify({
      ...ticket,
      recetteStatus: ticket.recetteStatus || 'pending',
      recetteComment: ticket.recetteComment || '',
      recetteDate: ticket.recetteDate || null,
      recetteByUserId: ticket.recetteByUserId ?? null,
      recetteHistory: ticket.recetteHistory || [],
      notes: ticket.notes || [],
      userStories: ticket.userStories || [],
      attachments: ticket.attachments || [],
      createdAt: ticket.createdAt || new Date().toISOString(),
      updatedAt: ticket.updatedAt || new Date().toISOString()
    }));
    return await this.db!.add('tickets', serialized);
  }

  async updateTicket(id: number, ticket: Partial<Ticket>): Promise<IDBValidKey> {
    const existing = await this.getTicket(id);
    const updated = JSON.parse(JSON.stringify({
      ...existing,
      ...ticket,
      id,
      updatedAt: new Date().toISOString()
    }));
    return await this.db!.put('tickets', updated);
  }

  async deleteTicket(id: number): Promise<void> {
    return await this.db!.delete('tickets', id);
  }

  async addTicketNote(ticketId: number, note: string): Promise<IDBValidKey> {
    const ticket = await this.getTicket(ticketId);
    const notes = ticket.notes || [];
    notes.push({
      id: Date.now(),
      content: note,
      createdAt: new Date().toISOString()
    });
    return await this.updateTicket(ticketId, { notes });
  }

  async deleteTicketNote(ticketId: number, noteId: number): Promise<IDBValidKey> {
    const ticket = await this.getTicket(ticketId);
    const notes = (ticket.notes || []).filter(n => n.id !== noteId);
    return await this.updateTicket(ticketId, { notes });
  }

  async updateTicketNote(ticketId: number, noteId: number, newContent: string): Promise<IDBValidKey> {
    const ticket = await this.getTicket(ticketId);
    const notes = (ticket.notes || []).map(note => {
      if (note.id === noteId) {
        return {
          ...note,
          content: newContent,
          updatedAt: new Date().toISOString()
        };
      }
      return note;
    });
    return await this.updateTicket(ticketId, { notes });
  }

  // ===== TODOS =====
  async getAllTodos(): Promise<Todo[]> {
    return await this.db!.getAll('todos');
  }

  async getTodosByDate(date: string): Promise<Todo[]> {
    return await this.db!.getAllFromIndex('todos', 'date', date);
  }

  async getTodayTodos(): Promise<Todo[]> {
    const today = new Date().toISOString().split('T')[0];
    return await this.getTodosByDate(today);
  }

  async getTodosByPlannedDate(date: string): Promise<Todo[]> {
    const allTodos = await this.getAllTodos();
    return allTodos.filter(t => t.plannedDate === date);
  }

  async getTodosForNext7Days(): Promise<Todo[]> {
    const allTodos = await this.getAllTodos();
    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return allTodos.filter(t => dates.includes(t.plannedDate));
  }

  async rolloverIncompleteTodos(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const allTodos = await this.getAllTodos();
    
    // Récupérer tous les todos non complétés avec une plannedDate dans le passé
    const incompletePastTodos = allTodos.filter(todo => {
      return !todo.completed && todo.plannedDate < today;
    });

    // Mettre à jour leur plannedDate pour aujourd'hui
    for (const todo of incompletePastTodos) {
      await this.updateTodo(todo.id!, { plannedDate: today });
    }

    return incompletePastTodos.length;
  }

  async addTodo(
    text: string | { text: string; description?: string; plannedDate?: string; date?: string; completed?: boolean; assignedUserId?: number | null },
    plannedDate: string | null = null,
    description: string = ''
  ): Promise<IDBValidKey> {
    const today = new Date().toISOString().split('T')[0];

    if (typeof text === 'string') {
      return await this.db!.add('todos', {
        text,
        description: description || '',
        date: today,
        plannedDate: plannedDate || today,
        completed: false,
        createdAt: new Date().toISOString()
      });
    }

    return await this.db!.add('todos', {
      text: text.text,
      description: text.description || description || '',
      date: text.date || today,
      plannedDate: text.plannedDate || plannedDate || today,
      completed: text.completed || false,
      assignedUserId: text.assignedUserId ?? null,
      createdAt: new Date().toISOString()
    });
  }

  async updateTodo(id: number, todo: Partial<Todo>): Promise<IDBValidKey> {
    const existing = await this.db!.get('todos', id);
    return await this.db!.put('todos', {
      ...existing,
      ...todo,
      id
    });
  }

  async deleteTodo(id: number): Promise<void> {
    return await this.db!.delete('todos', id);
  }

  async toggleTodo(id: number): Promise<IDBValidKey> {
    const todo = await this.db!.get('todos', id);
    return await this.updateTodo(id, { completed: !todo.completed });
  }

  // ===== SPRINTS =====
  async getAllSprints(): Promise<Sprint[]> {
    return await this.db!.getAll('sprints');
  }

  async getSprint(id: number): Promise<Sprint> {
    return await this.db!.get('sprints', id);
  }

  async getSprintsByProject(projectId: number): Promise<Sprint[]> {
    return await this.db!.getAllFromIndex('sprints', 'projectId', projectId);
  }

  async addSprint(sprint: Sprint): Promise<IDBValidKey> {
    return await this.db!.add('sprints', {
      ...sprint,
      status: sprint.status || 'planned',
      meetingNotes: sprint.meetingNotes || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  async updateSprint(id: number, sprint: Partial<Sprint>): Promise<IDBValidKey> {
    const existing = await this.getSprint(id);
    return await this.db!.put('sprints', {
      ...existing,
      ...sprint,
      id,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteSprint(id: number): Promise<void> {
    // Retirer le sprintId des tickets associés
    const tickets = await this.getTicketsBySprint(id);
    for (const ticket of tickets) {
      await this.updateTicket(ticket.id!, { sprintId: null });
    }
    return await this.db!.delete('sprints', id);
  }

  async getTicketsBySprint(sprintId: number): Promise<Ticket[]> {
    const allTickets = await this.getAllTickets();
    return allTickets.filter(t => t.sprintId === sprintId);
  }

  async addMeetingNote(sprintId: number, note: string): Promise<IDBValidKey> {
    const sprint = await this.getSprint(sprintId);
    const meetingNotes = sprint.meetingNotes || [];
    meetingNotes.push({
      id: Date.now(),
      content: note,
      createdAt: new Date().toISOString()
    });
    return await this.updateSprint(sprintId, { meetingNotes });
  }

  async deleteMeetingNote(sprintId: number, noteId: number): Promise<IDBValidKey> {
    const sprint = await this.getSprint(sprintId);
    const meetingNotes = (sprint.meetingNotes || []).filter(n => n.id !== noteId);
    return await this.updateSprint(sprintId, { meetingNotes });
  }

  async updateMeetingNote(sprintId: number, noteId: number, newContent: string): Promise<IDBValidKey> {
    const sprint = await this.getSprint(sprintId);
    const meetingNotes = (sprint.meetingNotes || []).map(note => {
      if (note.id === noteId) {
        return {
          ...note,
          content: newContent,
          updatedAt: new Date().toISOString()
        };
      }
      return note;
    });
    return await this.updateSprint(sprintId, { meetingNotes });
  }

  // ===== TIME ENTRIES =====
  async getAllTimeEntries(): Promise<TimeEntry[]> {
    return await this.db!.getAll('timeEntries');
  }

  // ===== ODOO TASKS (CACHE LOCAL) =====
  async getAllOdooTasks(): Promise<OdooTaskLocal[]> {
    return await this.db!.getAll('odooTasks');
  }

  async getOdooTasksByProjectOdooId(projectOdooId: number): Promise<OdooTaskLocal[]> {
    return await this.db!.getAllFromIndex('odooTasks', 'projectOdooId', projectOdooId);
  }

  async getOdooTaskByOdooId(odooId: number): Promise<OdooTaskLocal | undefined> {
    return await this.db!.getFromIndex('odooTasks', 'odooId', odooId);
  }

  async upsertOdooTask(task: OdooTaskLocal): Promise<IDBValidKey> {
    const existing = await this.getOdooTaskByOdooId(task.odooId);
    if (existing?.id) {
      return await this.db!.put('odooTasks', {
        ...existing,
        ...task,
        id: existing.id,
        syncedAt: new Date().toISOString(),
        updatedAt: task.updatedAt || new Date().toISOString(),
      });
    }

    return await this.db!.add('odooTasks', {
      ...task,
      syncedAt: new Date().toISOString(),
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: task.updatedAt || new Date().toISOString(),
    });
  }

  async updateOdooTaskByOdooId(odooId: number, updates: Partial<OdooTaskLocal>): Promise<IDBValidKey | null> {
    const existing = await this.getOdooTaskByOdooId(odooId);
    if (!existing?.id) return null;

    return await this.db!.put('odooTasks', {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    });
  }

  async replaceOdooTasksForProject(projectOdooId: number, tasks: OdooTaskLocal[]): Promise<void> {
    const existing = await this.getOdooTasksByProjectOdooId(projectOdooId);
    const tx = this.db!.transaction('odooTasks', 'readwrite');
    const store = tx.objectStore('odooTasks');

    for (const task of existing) {
      if (task.id) {
        await store.delete(task.id);
      }
    }

    for (const task of tasks) {
      await store.add({
        ...task,
        syncedAt: new Date().toISOString(),
        createdAt: task.createdAt || new Date().toISOString(),
        updatedAt: task.updatedAt || new Date().toISOString(),
      });
    }

    await tx.done;
  }

  async getTimeEntry(id: number): Promise<TimeEntry> {
    return await this.db!.get('timeEntries', id);
  }

  async getTimeEntriesByTicket(ticketId: number): Promise<TimeEntry[]> {
    const allEntries = await this.getAllTimeEntries();
    return allEntries.filter(e => e.ticketId === ticketId);
  }

  async addTimeEntry(timeEntry: TimeEntry): Promise<IDBValidKey> {
    return await this.db!.add('timeEntries', {
      ...timeEntry,
      userId: timeEntry.userId ?? null,
      synced: timeEntry.synced || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  async updateTimeEntry(id: number, timeEntry: Partial<TimeEntry>): Promise<IDBValidKey> {
    const existing = await this.getTimeEntry(id);
    return await this.db!.put('timeEntries', {
      ...existing,
      ...timeEntry,
      id,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteTimeEntry(id: number): Promise<void> {
    return await this.db!.delete('timeEntries', id);
  }

  async getTotalTimeForTicket(ticketId: number): Promise<number> {
    const entries = await this.getTimeEntriesByTicket(ticketId);
    return entries.reduce((total, entry) => total + entry.duration, 0);
  }

  async markTimeEntrySynced(id: number, odooId: number): Promise<IDBValidKey> {
    const entry = await this.getTimeEntry(id);
    return await this.db!.put('timeEntries', {
      ...entry,
      odooId,
      synced: true,
      updatedAt: new Date().toISOString()
    });
  }

  async getUnsyncedTimeEntries(ticketId?: number): Promise<TimeEntry[]> {
    const allEntries = await this.getAllTimeEntries();
    let filtered = allEntries.filter(e => !e.synced);
    if (ticketId !== undefined) {
      filtered = filtered.filter(e => e.ticketId === ticketId);
    }
    return filtered;
  }

  // Import/Export
  async exportDatabase(): Promise<string> {
    const data = {
      version: DB_VERSION,
      exportDate: new Date().toISOString(),
      projects: await this.getAllProjects(),
      tickets: await this.getAllTickets(),
      sprints: await this.getAllSprints(),
      todos: await this.getAllTodos(),
      timeEntries: await this.getAllTimeEntries(),
      odooTasks: await this.getAllOdooTasks(),
      localTasks: await this.getAllLocalTasks(),
      passwords: await this.getAllPasswords(),
      users: await this.getAllUsers()
    };
    return JSON.stringify(data, null, 2);
  }

  async importDatabase(jsonData: string, clearExisting: boolean = false): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.version || !data.projects) {
        throw new Error('Format de fichier invalide');
      }

      if (clearExisting) {
        // Vider toutes les tables
        const tx = this.db!.transaction(
          ['projects', 'tickets', 'sprints', 'todos', 'timeEntries', 'odooTasks', 'localTasks', 'passwords', 'users'],
          'readwrite'
        );
        await tx.objectStore('projects').clear();
        await tx.objectStore('tickets').clear();
        await tx.objectStore('sprints').clear();
        await tx.objectStore('todos').clear();
        await tx.objectStore('timeEntries').clear();
        await tx.objectStore('odooTasks').clear();
        await tx.objectStore('localTasks').clear();
        await tx.objectStore('passwords').clear();
        await tx.objectStore('users').clear();
        await tx.done;
      }

      // Importer les projets
      if (data.projects) {
        for (const project of data.projects) {
          if (clearExisting) {
            await this.db!.add('projects', project);
          } else {
            // En mode fusion, vérifier si le projet existe déjà
            const existing = await this.db!.get('projects', project.id);
            if (!existing) {
              await this.db!.add('projects', project);
            }
          }
        }
      }

      // Importer les tickets
      if (data.tickets) {
        for (const ticket of data.tickets) {
          if (clearExisting) {
            await this.db!.add('tickets', ticket);
          } else {
            const existing = await this.db!.get('tickets', ticket.id);
            if (!existing) {
              await this.db!.add('tickets', ticket);
            }
          }
        }
      }

      // Importer les sprints
      if (data.sprints) {
        for (const sprint of data.sprints) {
          if (clearExisting) {
            await this.db!.add('sprints', sprint);
          } else {
            const existing = await this.db!.get('sprints', sprint.id);
            if (!existing) {
              await this.db!.add('sprints', sprint);
            }
          }
        }
      }

      // Importer les todos
      if (data.todos) {
        for (const todo of data.todos) {
          if (clearExisting) {
            await this.db!.add('todos', todo);
          } else {
            const existing = await this.db!.get('todos', todo.id);
            if (!existing) {
              await this.db!.add('todos', todo);
            }
          }
        }
      }

      // Importer les timeEntries
      if (data.timeEntries) {
        for (const entry of data.timeEntries) {
          if (clearExisting) {
            await this.db!.add('timeEntries', entry);
          } else {
            const existing = await this.db!.get('timeEntries', entry.id);
            if (!existing) {
              await this.db!.add('timeEntries', entry);
            }
          }
        }
      }

      // Importer les tâches Odoo locales
      if (data.odooTasks) {
        for (const task of data.odooTasks) {
          if (clearExisting) {
            await this.db!.add('odooTasks', task);
          } else {
            const existing = await this.db!.getFromIndex('odooTasks', 'odooId', task.odooId);
            if (!existing) {
              await this.db!.add('odooTasks', task);
            }
          }
        }
      }

      // Importer les tâches locales
      if (data.localTasks) {
        for (const task of data.localTasks) {
          if (clearExisting) {
            await this.db!.add('localTasks', task);
          } else {
            const existing = await this.db!.get('localTasks', task.id);
            if (!existing) {
              await this.db!.add('localTasks', task);
            }
          }
        }
      }

      // Importer les utilisateurs
      if (data.users) {
        for (const user of data.users) {
          if (clearExisting) {
            await this.db!.add('users', user);
          } else {
            const existing = await this.db!.get('users', user.id);
            if (!existing) {
              await this.db!.add('users', user);
            }
          }
        }
      }

      // Importer les entrées de mots de passe
      if (data.passwords) {
        for (const entry of data.passwords) {
          if (clearExisting) {
            await this.db!.add('passwords', entry);
          } else {
            const existing = await this.db!.get('passwords', entry.id);
            if (!existing) {
              await this.db!.add('passwords', entry);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'importation:', error);
      throw error;
    }
  }

  // ===== LOCAL TASKS =====
  async getAllLocalTasks(): Promise<LocalTask[]> {
    return await this.db!.getAll('localTasks');
  }

  async getLocalTasksByProject(projectId: number): Promise<LocalTask[]> {
    return await this.db!.getAllFromIndex('localTasks', 'projectId', projectId);
  }

  async getLocalTask(id: number): Promise<LocalTask> {
    return await this.db!.get('localTasks', id);
  }

  async addLocalTask(task: LocalTask): Promise<IDBValidKey> {
    const serialized = JSON.parse(JSON.stringify({
      ...task,
      attachments: task.attachments || [],
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: task.updatedAt || new Date().toISOString()
    }));
    return await this.db!.add('localTasks', serialized);
  }

  async updateLocalTask(id: number, updates: Partial<LocalTask>): Promise<void> {
    const task = await this.getLocalTask(id);
    const updated = JSON.parse(JSON.stringify({
      ...task,
      ...updates,
      updatedAt: new Date().toISOString()
    }));
    await this.db!.put('localTasks', updated);
  }

  async deleteLocalTask(id: number): Promise<void> {
    await this.db!.delete('localTasks', id);
  }

  // ===== EXPORT CHIFFRAGE =====
  async exportChiffrage(projectId: number): Promise<{
    project: Project;
    tasks: LocalTask[];
    totalEstimatedTime: number;
    totalCost: number;
  }> {
    const project = await this.getProject(projectId);
    const localTasks = await this.getLocalTasksByProject(projectId);
    const chiffrageTasks = localTasks.filter(t => t.isChiffrage);
    const hoursPerDay = project.hoursPerDay || 8;

    return {
      project,
      tasks: chiffrageTasks,
      totalEstimatedTime: chiffrageTasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0),
      totalCost: chiffrageTasks.reduce((sum, t) => sum + (((t.estimatedTime || 0) / hoursPerDay) * (project.tjm || 0)), 0)
    };
  }
  // ===== PASSWORDS =====
  async getAllPasswords(): Promise<PasswordEntry[]> {
    return await this.db!.getAll('passwords');
  }

  async getPassword(id: number): Promise<PasswordEntry> {
    return await this.db!.get('passwords', id);
  }

  async getPasswordsByCategory(category: string): Promise<PasswordEntry[]> {
    return await this.db!.getAllFromIndex('passwords', 'category', category);
  }

  async getPasswordsByUser(userId: number): Promise<PasswordEntry[]> {
    return await this.db!.getAllFromIndex('passwords', 'ownerUserId', userId);
  }

  async getFavoritePasswords(): Promise<PasswordEntry[]> {
    const all = await this.getAllPasswords();
    return all.filter(p => p.favorite);
  }

  async addPassword(entry: PasswordEntry): Promise<IDBValidKey> {
    return await this.db!.add('passwords', {
      ...entry,
      createdAt: entry.createdAt || new Date().toISOString(),
      updatedAt: entry.updatedAt || new Date().toISOString()
    });
  }

  async updatePassword(id: number, updates: Partial<PasswordEntry>): Promise<void> {
    const entry = await this.getPassword(id);
    await this.db!.put('passwords', {
      ...entry,
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deletePassword(id: number): Promise<void> {
    await this.db!.delete('passwords', id);
  }

  // ===== USERS =====
  async getAllUsers(): Promise<User[]> {
    return await this.db!.getAll('users');
  }

  async getUser(id: number): Promise<User> {
    return await this.db!.get('users', id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return await this.db!.getFromIndex('users', 'username', username);
  }

  async getActiveUsers(): Promise<User[]> {
    const all = await this.getAllUsers();
    return all.filter(u => u.active !== false);
  }

  async addUser(user: User): Promise<IDBValidKey> {
    return await this.db!.add('users', {
      ...user,
      active: user.active !== false,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString()
    });
  }

  async updateUser(id: number, updates: Partial<User>): Promise<void> {
    const user = await this.getUser(id);
    await this.db!.put('users', {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteUser(id: number): Promise<void> {
    await this.db!.delete('users', id);
  }
}

export const db = new DatabaseService();
