import { openDB } from 'idb';
import { db as dbNew } from './database-new';

const DB_NAME = 'tickets-db';
const DB_VERSION = 10;

// Colonnes kanban par défaut
const DEFAULT_KANBAN_COLUMNS = [
  { id: 'todo', label: 'À faire', color: '#fff3cd' },
  { id: 'in-progress', label: 'En cours', color: '#cfe2ff' },
  { id: 'done', label: 'Terminé', color: '#d1e7dd' }
];

class DatabaseService {
  constructor() {
    this.db = null;
  }

  async init() {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
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
      }
    });
  }

  // ===== PROJECTS =====
  async getAllProjects() {
    return await this.db.getAll('projects');
  }

  async getProject(id) {
    return await this.db.get('projects', id);
  }

  async addProject(project) {
    return await this.db.add('projects', {
      ...project,
      isFavorite: project.isFavorite || false,
      kanbanColumns: project.kanbanColumns || DEFAULT_KANBAN_COLUMNS,
      chiffrageEnabled: project.chiffrageEnabled || false,
      tjm: project.tjm || 0,
      hoursPerDay: project.hoursPerDay || 8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  async updateProject(id, project) {
    const existing = await this.getProject(id);
    // Sérialiser pour éviter les problèmes de clonage avec IndexedDB
    const updated = JSON.parse(JSON.stringify({
      ...existing,
      ...project,
      id,
      updatedAt: new Date().toISOString()
    }));
    return await this.db.put('projects', updated);
  }

  async deleteProject(id) {
    // Supprimer aussi les tickets associés
    const tickets = await this.getTicketsByProject(id);
    for (const ticket of tickets) {
      await this.deleteTicket(ticket.id);
    }
    return await this.db.delete('projects', id);
  }

  async toggleFavorite(id) {
    const project = await this.getProject(id);
    return await this.updateProject(id, {
      isFavorite: !project.isFavorite
    });
  }

  async getFavoriteProjects() {
    const allProjects = await this.getAllProjects();
    return allProjects.filter(p => p.isFavorite);
  }

  // ===== TICKETS =====
  async getAllTickets() {
    return await this.db.getAll('tickets');
  }

  async getTicket(id) {
    return await this.db.get('tickets', id);
  }

  async getTicketsByProject(projectId) {
    return await this.db.getAllFromIndex('tickets', 'projectId', projectId);
  }

  async addTicket(ticket) {
    const serialized = JSON.parse(JSON.stringify({
      ...ticket,
      notes: ticket.notes || [],
      attachments: ticket.attachments || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    return await this.db.add('tickets', serialized);
  }

  async updateTicket(id, ticket) {
    const existing = await this.getTicket(id);
    const updated = JSON.parse(JSON.stringify({
      ...existing,
      ...ticket,
      id,
      updatedAt: new Date().toISOString()
    }));
    return await this.db.put('tickets', updated);
  }

  async deleteTicket(id) {
    return await this.db.delete('tickets', id);
  }

  async addTicketNote(ticketId, note) {
    const ticket = await this.getTicket(ticketId);
    const notes = ticket.notes || [];
    notes.push({
      id: Date.now(),
      content: note,
      createdAt: new Date().toISOString()
    });
    return await this.updateTicket(ticketId, { notes });
  }

  async deleteTicketNote(ticketId, noteId) {
    const ticket = await this.getTicket(ticketId);
    const notes = (ticket.notes || []).filter(n => n.id !== noteId);
    return await this.updateTicket(ticketId, { notes });
  }

  async updateTicketNote(ticketId, noteId, newContent) {
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
  async getAllTodos() {
    return await this.db.getAll('todos');
  }

  async getTodosByDate(date) {
    return await this.db.getAllFromIndex('todos', 'date', date);
  }

  async getTodayTodos() {
    const today = new Date().toISOString().split('T')[0];
    return await this.getTodosByDate(today);
  }

  async getTodosByPlannedDate(date) {
    const allTodos = await this.getAllTodos();
    return allTodos.filter(t => t.plannedDate === date);
  }

  async getTodosForNext7Days() {
    const allTodos = await this.getAllTodos();
    const today = new Date();
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return allTodos.filter(t => dates.includes(t.plannedDate));
  }

  async rolloverIncompleteTodos() {
    const today = new Date().toISOString().split('T')[0];
    const allTodos = await this.getAllTodos();
    
    // Récupérer tous les todos non complétés avec une plannedDate dans le passé
    const incompletePastTodos = allTodos.filter(todo => {
      return !todo.completed && todo.plannedDate < today;
    });

    // Mettre à jour leur plannedDate pour aujourd'hui
    for (const todo of incompletePastTodos) {
      await this.updateTodo(todo.id, { plannedDate: today });
    }

    return incompletePastTodos.length;
  }

  async addTodo(text, plannedDate = null) {
    const today = new Date().toISOString().split('T')[0];
    return await this.db.add('todos', {
      text: typeof text === 'string' ? text : text.text,
      date: today,
      plannedDate: plannedDate || today,
      completed: false,
      createdAt: new Date().toISOString()
    });
  }

  async updateTodo(id, todo) {
    const existing = await this.db.get('todos', id);
    return await this.db.put('todos', {
      ...existing,
      ...todo,
      id
    });
  }

  async deleteTodo(id) {
    return await this.db.delete('todos', id);
  }

  async toggleTodo(id) {
    const todo = await this.db.get('todos', id);
    return await this.updateTodo(id, { completed: !todo.completed });
  }

  // ===== SPRINTS =====
  async getAllSprints() {
    return await this.db.getAll('sprints');
  }

  async getSprint(id) {
    return await this.db.get('sprints', id);
  }

  async getSprintsByProject(projectId) {
    return await this.db.getAllFromIndex('sprints', 'projectId', projectId);
  }

  async addSprint(sprint) {
    return await this.db.add('sprints', {
      ...sprint,
      status: sprint.status || 'planned',
      meetingNotes: sprint.meetingNotes || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  async updateSprint(id, sprint) {
    const existing = await this.getSprint(id);
    return await this.db.put('sprints', {
      ...existing,
      ...sprint,
      id,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteSprint(id) {
    // Retirer le sprintId des tickets associés
    const tickets = await this.getTicketsBySprint(id);
    for (const ticket of tickets) {
      await this.updateTicket(ticket.id, { sprintId: null });
    }
    return await this.db.delete('sprints', id);
  }

  async getTicketsBySprint(sprintId) {
    const allTickets = await this.getAllTickets();
    return allTickets.filter(t => t.sprintId === sprintId);
  }

  async addMeetingNote(sprintId, note) {
    const sprint = await this.getSprint(sprintId);
    const meetingNotes = sprint.meetingNotes || [];
    meetingNotes.push({
      id: Date.now(),
      content: note,
      createdAt: new Date().toISOString()
    });
    return await this.updateSprint(sprintId, { meetingNotes });
  }

  async deleteMeetingNote(sprintId, noteId) {
    const sprint = await this.getSprint(sprintId);
    const meetingNotes = (sprint.meetingNotes || []).filter(n => n.id !== noteId);
    return await this.updateSprint(sprintId, { meetingNotes });
  }

  async updateMeetingNote(sprintId, noteId, newContent) {
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

  // ===== CHIFFRAGE (pour tâches locales uniquement) =====
  async exportChiffrage(projectId) {
    const project = await this.getProject(projectId);
    const localTasks = await dbNew.getLocalTasksByProject(projectId);
    const chiffrageTasks = localTasks.filter(t => t.isChiffrage);
    const hoursPerDay = project.hoursPerDay || 8;

    return {
      project,
      tasks: chiffrageTasks,
      totalEstimatedTime: chiffrageTasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0),
      totalCost: chiffrageTasks.reduce((sum, t) => sum + (((t.estimatedTime || 0) / hoursPerDay) * (project.tjm || 0)), 0)
    };
  }
}

export const db = new DatabaseService();
