import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { query, withTransaction } from './db.js'

dotenv.config()

const app = express()
const port = Number(process.env.API_PORT || 4000)
const frontendOrigin = process.env.FRONTEND_ORIGIN || '*'

app.use(cors({ origin: frontendOrigin === '*' ? true : frontendOrigin }))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

const projectFields = {
  id: 'id',
  name: 'name',
  description: 'description',
  status: 'status',
  assignedUserId: 'assigned_user_id',
  isFavorite: 'is_favorite',
  kanbanColumns: 'kanban_columns',
  odooId: 'odoo_id',
  chiffrageEnabled: 'chiffrage_enabled',
  tjm: 'tjm',
  hoursPerDay: 'hours_per_day',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const ticketFields = {
  id: 'id',
  projectId: 'project_id',
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  startDate: 'start_date',
  estimatedTime: 'estimated_time',
  recetteStatus: 'recette_status',
  recetteComment: 'recette_comment',
  recetteDate: 'recette_date',
  recetteByUserId: 'recette_by_user_id',
  recetteHistory: 'recette_history',
  assignedUserId: 'assigned_user_id',
  sprintId: 'sprint_id',
  notes: 'notes',
  userStories: 'user_stories',
  attachments: 'attachments',
  ganttAssignments: 'gantt_assignments',
  odooId: 'odoo_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const todoFields = {
  id: 'id',
  text: 'text',
  description: 'description',
  date: 'date',
  plannedDate: 'planned_date',
  completed: 'completed',
  assignedUserId: 'assigned_user_id',
  createdAt: 'created_at',
}

const sprintFields = {
  id: 'id',
  projectId: 'project_id',
  name: 'name',
  description: 'description',
  status: 'status',
  startDate: 'start_date',
  endDate: 'end_date',
  meetingNotes: 'meeting_notes',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const timeEntryFields = {
  id: 'id',
  ticketId: 'ticket_id',
  duration: 'duration',
  description: 'description',
  date: 'date',
  userId: 'user_id',
  odooId: 'odoo_id',
  synced: 'synced',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const odooTaskFields = {
  id: 'id',
  odooId: 'odoo_id',
  projectOdooId: 'project_odoo_id',
  localProjectId: 'local_project_id',
  projectName: 'project_name',
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  timeTotalMinutes: 'time_total_minutes',
  syncedAt: 'synced_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const localTaskFields = {
  id: 'id',
  projectId: 'project_id',
  sprintId: 'sprint_id',
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  startDate: 'start_date',
  assignedUserId: 'assigned_user_id',
  timeTotalMinutes: 'time_total_minutes',
  isChiffrage: 'is_chiffrage',
  lotNumber: 'lot_number',
  difficulty: 'difficulty',
  estimatedTime: 'estimated_time',
  attachments: 'attachments',
  ganttAssignments: 'gantt_assignments',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const passwordFields = {
  id: 'id',
  ownerUserId: 'owner_user_id',
  title: 'title',
  username: 'username',
  password: 'password',
  url: 'url',
  category: 'category',
  notes: 'notes',
  favorite: 'favorite',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const userFields = {
  id: 'id',
  username: 'username',
  displayName: 'display_name',
  email: 'email',
  role: 'role',
  passwordHash: 'password_hash',
  passwordSalt: 'password_salt',
  active: 'active',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const jsonProjectFields = ['kanbanColumns']
const jsonTicketFields = ['recetteHistory', 'notes', 'userStories', 'attachments', 'ganttAssignments']
const jsonSprintFields = ['meetingNotes']
const jsonLocalTaskFields = ['attachments', 'ganttAssignments']
const sequenceTables = ['users', 'projects', 'sprints', 'tickets', 'todos', 'time_entries', 'local_tasks', 'odoo_tasks', 'passwords']

function makeError(message, status = 400) {
  const error = new Error(message)
  error.status = status
  return error
}

function mapProject(row) {
  return {
  followerUserIds: 'follower_user_ids',
    id: Number(row.id),
    name: row.name,
    description: row.description,
    status: row.status,
    assignedUserId: row.assigned_user_id ? Number(row.assigned_user_id) : null,
    isFavorite: row.is_favorite,
    kanbanColumns: row.kanban_columns || [],
    odooId: row.odoo_id ? Number(row.odoo_id) : null,
    chiffrageEnabled: row.chiffrage_enabled,
    tjm: row.tjm !== null ? Number(row.tjm) : null,
    hoursPerDay: row.hours_per_day !== null ? Number(row.hours_per_day) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapTicket(row) {
  return {
    id: Number(row.id),
    followerUserIds: row.follower_user_ids || [],
    projectId: Number(row.project_id),
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    startDate: toDateString(row.start_date),
    estimatedTime: row.estimated_time !== null ? Number(row.estimated_time) : null,
    recetteStatus: row.recette_status,
    recetteComment: row.recette_comment,
    recetteDate: row.recette_date,
    recetteByUserId: row.recette_by_user_id ? Number(row.recette_by_user_id) : null,
    recetteHistory: row.recette_history || [],
    assignedUserId: row.assigned_user_id ? Number(row.assigned_user_id) : null,
    sprintId: row.sprint_id ? Number(row.sprint_id) : null,
    notes: row.notes || [],
    userStories: row.user_stories || [],
    attachments: row.attachments || [],
    ganttAssignments: row.gantt_assignments || [],
    odooId: row.odoo_id ? Number(row.odoo_id) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toDateString(val) {
  if (!val) return val
  if (val instanceof Date) return val.toISOString().split('T')[0]
  const s = String(val)
  return s.includes('T') ? s.split('T')[0] : s
}

function mapTodo(row) {
  return {
    id: Number(row.id),
    text: row.text,
    description: row.description,
    date: toDateString(row.date),
    plannedDate: toDateString(row.planned_date),
    completed: row.completed,
    assignedUserId: row.assigned_user_id ? Number(row.assigned_user_id) : null,
    createdAt: row.created_at,
  }
}

function mapSprint(row) {
  return {
    id: Number(row.id),
    projectId: Number(row.project_id),
    name: row.name,
    description: row.description,
    status: row.status,
    startDate: toDateString(row.start_date),
    endDate: toDateString(row.end_date),
    meetingNotes: row.meeting_notes || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapTimeEntry(row) {
  return {
    id: Number(row.id),
    ticketId: Number(row.ticket_id),
    duration: Number(row.duration),
    description: row.description,
    date: toDateString(row.date),
    userId: row.user_id ? Number(row.user_id) : null,
    odooId: row.odoo_id ? Number(row.odoo_id) : null,
    synced: row.synced,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapOdooTask(row) {
  return {
    id: Number(row.id),
    odooId: Number(row.odoo_id),
    projectOdooId: Number(row.project_odoo_id),
    localProjectId: row.local_project_id ? Number(row.local_project_id) : null,
    projectName: row.project_name,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    timeTotalMinutes: Number(row.time_total_minutes || 0),
    syncedAt: row.synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapLocalTask(row) {
  return {
    id: Number(row.id),
    projectId: Number(row.project_id),
    sprintId: row.sprint_id ? Number(row.sprint_id) : null,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    startDate: toDateString(row.start_date),
    assignedUserId: row.assigned_user_id ? Number(row.assigned_user_id) : null,
    timeTotalMinutes: Number(row.time_total_minutes || 0),
    isChiffrage: row.is_chiffrage,
    lotNumber: row.lot_number,
    difficulty: row.difficulty,
    estimatedTime: row.estimated_time !== null ? Number(row.estimated_time) : null,
    attachments: row.attachments || [],
    ganttAssignments: row.gantt_assignments || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapPassword(row) {
  return {
    id: Number(row.id),
    ownerUserId: row.owner_user_id ? Number(row.owner_user_id) : null,
    title: row.title,
    username: row.username,
    password: row.password,
    url: row.url,
    category: row.category,
    notes: row.notes,
    favorite: row.favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapUser(row) {
  return {
    id: Number(row.id),
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function buildInsertParts(fieldMap, payload, jsonFields = []) {
  const columns = []
  const placeholders = []
  const values = []

  for (const [inputKey, columnName] of Object.entries(fieldMap)) {
    if (!(inputKey in payload)) continue
    columns.push(columnName)
    if (jsonFields.includes(inputKey)) {
      values.push(JSON.stringify(payload[inputKey] || []))
      placeholders.push(`$${values.length}::jsonb`)
    } else {
      values.push(payload[inputKey])
      placeholders.push(`$${values.length}`)
    }
  }

  if (!columns.length) {
    throw makeError('No fields provided for insert', 400)
  }

  return { columns, placeholders, values }
}

function buildUpdateParts(fieldMap, payload, jsonFields = []) {
  const setClauses = []
  const values = []

  for (const [inputKey, columnName] of Object.entries(fieldMap)) {
    if (!(inputKey in payload) || inputKey === 'id') continue
    // `updated_at` est géré côté serveur via NOW() dans updateRow
    if (inputKey === 'updatedAt') continue
    if (jsonFields.includes(inputKey)) {
      values.push(JSON.stringify(payload[inputKey] || []))
      setClauses.push(`${columnName} = $${values.length}::jsonb`)
    } else {
      values.push(payload[inputKey])
      setClauses.push(`${columnName} = $${values.length}`)
    }
  }

  if (!setClauses.length) {
    throw makeError('No fields provided for update', 400)
  }

  return { setClauses, values }
}

async function insertRow(executor, tableName, fieldMap, payload, mapper, jsonFields = []) {
  const { columns, placeholders, values } = buildInsertParts(fieldMap, payload, jsonFields)
  const run = typeof executor === 'function' ? executor : executor.query.bind(executor)
  const result = await run(
    `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values
  )
  return mapper(result.rows[0])
}

async function updateRow(tableName, id, fieldMap, payload, mapper, jsonFields = []) {
  const { setClauses, values } = buildUpdateParts(fieldMap, payload, jsonFields)
  values.push(id)
  const result = await query(
    `UPDATE ${tableName} SET ${setClauses.join(', ')}${fieldMap.updatedAt ? ', updated_at = NOW()' : ''} WHERE id = $${values.length} RETURNING *`,
    values
  )
  if (!result.rows.length) {
    throw makeError(`${tableName} row not found`, 404)
  }
  return mapper(result.rows[0])
}

async function getRowById(tableName, id, mapper) {
  const result = await query(`SELECT * FROM ${tableName} WHERE id = $1`, [id])
  if (!result.rows.length) {
    throw makeError(`${tableName} row not found`, 404)
  }
  return mapper(result.rows[0])
}

async function deleteRow(tableName, id) {
  const result = await query(`DELETE FROM ${tableName} WHERE id = $1 RETURNING id`, [id])
  if (!result.rows.length) {
    throw makeError(`${tableName} row not found`, 404)
  }
  return true
}

async function resetSequences(executor = { query }) {
  const run = typeof executor === 'function' ? executor : executor.query.bind(executor)
  for (const tableName of sequenceTables) {
    await run(
      `SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), COALESCE((SELECT MAX(id) FROM ${tableName}), 1), true)`
    )
  }
}

async function getAllProjects() {
  const result = await query('SELECT * FROM projects ORDER BY updated_at DESC, id DESC')
  return result.rows.map(mapProject)
}

async function getProject(id) {
  return getRowById('projects', id, mapProject)
}

async function addProject(project) {
  return insertRow(query, 'projects', projectFields, project, mapProject, jsonProjectFields)
}

async function updateProject(id, updates) {
  return updateRow('projects', id, projectFields, updates, mapProject, jsonProjectFields)
}

async function deleteProject(id) {
  await deleteRow('projects', id)
  return true
}

async function getAllTickets() {
  const result = await query('SELECT * FROM tickets ORDER BY updated_at DESC, id DESC')
  return result.rows.map(mapTicket)
}

async function getTicketsByProject(projectId) {
  const result = await query('SELECT * FROM tickets WHERE project_id = $1 ORDER BY updated_at DESC, id DESC', [projectId])
  return result.rows.map(mapTicket)
}

async function getTicket(id) {
  return getRowById('tickets', id, mapTicket)
}

async function addTicket(ticket) {
  return insertRow(query, 'tickets', ticketFields, ticket, mapTicket, jsonTicketFields)
}

async function updateTicket(id, updates) {
  return updateRow('tickets', id, ticketFields, updates, mapTicket, jsonTicketFields)
}

async function deleteTicket(id) {
  await deleteRow('tickets', id)
  return true
}

async function getAllTodos() {
  const result = await query('SELECT * FROM todos ORDER BY planned_date ASC, id DESC')
  return result.rows.map(mapTodo)
}

async function addTodo(todo) {
  return insertRow(query, 'todos', todoFields, todo, mapTodo)
}

async function updateTodo(id, updates) {
  const { setClauses, values } = buildUpdateParts(todoFields, updates)
  values.push(id)
  const result = await query(`UPDATE todos SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`, values)
  if (!result.rows.length) {
    throw makeError('Todo not found', 404)
  }
  return mapTodo(result.rows[0])
}

async function deleteTodo(id) {
  await deleteRow('todos', id)
  return true
}

async function getAllSprints() {
  const result = await query('SELECT * FROM sprints ORDER BY updated_at DESC, id DESC')
  return result.rows.map(mapSprint)
}

async function getSprint(id) {
  return getRowById('sprints', id, mapSprint)
}

async function getSprintsByProject(projectId) {
  const result = await query('SELECT * FROM sprints WHERE project_id = $1 ORDER BY updated_at DESC, id DESC', [projectId])
  return result.rows.map(mapSprint)
}

async function addSprint(sprint) {
  return insertRow(query, 'sprints', sprintFields, sprint, mapSprint, jsonSprintFields)
}

async function updateSprint(id, updates) {
  return updateRow('sprints', id, sprintFields, updates, mapSprint, jsonSprintFields)
}

async function deleteSprint(id) {
  await withTransaction(async (client) => {
    await client.query('UPDATE tickets SET sprint_id = NULL, updated_at = NOW() WHERE sprint_id = $1', [id])
    const result = await client.query('DELETE FROM sprints WHERE id = $1 RETURNING id', [id])
    if (!result.rows.length) {
      throw makeError('Sprint not found', 404)
    }
  })
  return true
}

async function getAllTimeEntries() {
  const result = await query('SELECT * FROM time_entries ORDER BY date DESC, created_at DESC')
  return result.rows.map(mapTimeEntry)
}

async function getTimeEntry(id) {
  return getRowById('time_entries', id, mapTimeEntry)
}

async function getTimeEntriesByTicket(ticketId) {
  const result = await query('SELECT * FROM time_entries WHERE ticket_id = $1 ORDER BY date DESC, created_at DESC', [ticketId])
  return result.rows.map(mapTimeEntry)
}

async function addTimeEntry(entry) {
  return insertRow(query, 'time_entries', timeEntryFields, entry, mapTimeEntry)
}

async function updateTimeEntry(id, updates) {
  return updateRow('time_entries', id, timeEntryFields, updates, mapTimeEntry)
}

async function deleteTimeEntry(id) {
  await deleteRow('time_entries', id)
  return true
}

async function getAllOdooTasks() {
  const result = await query('SELECT * FROM odoo_tasks ORDER BY updated_at DESC, id DESC')
  return result.rows.map(mapOdooTask)
}

async function getOdooTasksByProjectOdooId(projectOdooId) {
  const result = await query('SELECT * FROM odoo_tasks WHERE project_odoo_id = $1 ORDER BY updated_at DESC, id DESC', [projectOdooId])
  return result.rows.map(mapOdooTask)
}

async function getOdooTaskByOdooId(odooId) {
  const result = await query('SELECT * FROM odoo_tasks WHERE odoo_id = $1 LIMIT 1', [odooId])
  return result.rows.length ? mapOdooTask(result.rows[0]) : null
}

async function upsertOdooTask(task) {
  const payload = {
    ...task,
    syncedAt: task.syncedAt || new Date().toISOString(),
    createdAt: task.createdAt || new Date().toISOString(),
    updatedAt: task.updatedAt || new Date().toISOString(),
  }
  const { columns, placeholders, values } = buildInsertParts(odooTaskFields, payload)
  const result = await query(
    `INSERT INTO odoo_tasks (${columns.join(', ')}) VALUES (${placeholders.join(', ')})
     ON CONFLICT (odoo_id) DO UPDATE SET
       project_odoo_id = EXCLUDED.project_odoo_id,
       local_project_id = EXCLUDED.local_project_id,
       project_name = EXCLUDED.project_name,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       status = EXCLUDED.status,
       priority = EXCLUDED.priority,
       time_total_minutes = EXCLUDED.time_total_minutes,
       synced_at = EXCLUDED.synced_at,
       updated_at = EXCLUDED.updated_at
     RETURNING *`,
    values
  )
  return mapOdooTask(result.rows[0])
}

async function updateOdooTaskByOdooId(odooId, updates) {
  const { setClauses, values } = buildUpdateParts(odooTaskFields, updates)
  values.push(odooId)
  const result = await query(
    `UPDATE odoo_tasks SET ${setClauses.join(', ')}, updated_at = NOW() WHERE odoo_id = $${values.length} RETURNING *`,
    values
  )
  if (!result.rows.length) {
    return null
  }
  return mapOdooTask(result.rows[0])
}

async function replaceOdooTasksForProject(projectOdooId, tasks) {
  await withTransaction(async (client) => {
    await client.query('DELETE FROM odoo_tasks WHERE project_odoo_id = $1', [projectOdooId])
    for (const task of tasks) {
      const payload = {
        ...task,
        syncedAt: task.syncedAt || new Date().toISOString(),
        createdAt: task.createdAt || new Date().toISOString(),
        updatedAt: task.updatedAt || new Date().toISOString(),
      }
      await insertRow(client, 'odoo_tasks', odooTaskFields, payload, mapOdooTask)
    }
  })
  return true
}

async function getAllLocalTasks() {
  const result = await query('SELECT * FROM local_tasks ORDER BY updated_at DESC, id DESC')
  return result.rows.map(mapLocalTask)
}

async function getLocalTasksByProject(projectId) {
  const result = await query('SELECT * FROM local_tasks WHERE project_id = $1 ORDER BY updated_at DESC, id DESC', [projectId])
  return result.rows.map(mapLocalTask)
}

async function getLocalTask(id) {
  return getRowById('local_tasks', id, mapLocalTask)
}

async function addLocalTask(task) {
  return insertRow(query, 'local_tasks', localTaskFields, task, mapLocalTask, jsonLocalTaskFields)
}

async function updateLocalTask(id, updates) {
  return updateRow('local_tasks', id, localTaskFields, updates, mapLocalTask, jsonLocalTaskFields)
}

async function deleteLocalTask(id) {
  await deleteRow('local_tasks', id)
  return true
}

async function getAllPasswords() {
  const result = await query('SELECT * FROM passwords ORDER BY updated_at DESC, id DESC')
  return result.rows.map(mapPassword)
}

async function getPassword(id) {
  return getRowById('passwords', id, mapPassword)
}

async function addPassword(entry) {
  return insertRow(query, 'passwords', passwordFields, entry, mapPassword)
}

async function updatePassword(id, updates) {
  return updateRow('passwords', id, passwordFields, updates, mapPassword)
}

async function deletePassword(id) {
  await deleteRow('passwords', id)
  return true
}

async function getAllUsers() {
  const result = await query('SELECT * FROM users ORDER BY created_at ASC, id ASC')
  return result.rows.map(mapUser)
}

async function getUser(id) {
  return getRowById('users', id, mapUser)
}

async function getUserByUsername(username) {
  const result = await query('SELECT * FROM users WHERE username = $1 LIMIT 1', [username])
  return result.rows.length ? mapUser(result.rows[0]) : null
}

async function addUser(user) {
  return insertRow(query, 'users', userFields, user, mapUser)
}

async function updateUser(id, updates) {
  return updateRow('users', id, userFields, updates, mapUser)
}

async function deleteUser(id) {
  await deleteRow('users', id)
  return true
}

async function clearAllData() {
  await withTransaction(async (client) => {
    await client.query('TRUNCATE TABLE time_entries, tickets, sprints, todos, local_tasks, odoo_tasks, passwords, projects, users RESTART IDENTITY CASCADE')
  })
  return true
}

async function exportDatabaseSnapshot() {
  return {
    version: 1,
    exportDate: new Date().toISOString(),
    projects: await getAllProjects(),
    tickets: await getAllTickets(),
    sprints: await getAllSprints(),
    todos: await getAllTodos(),
    timeEntries: await getAllTimeEntries(),
    odooTasks: await getAllOdooTasks(),
    localTasks: await getAllLocalTasks(),
    passwords: await getAllPasswords(),
    users: await getAllUsers(),
  }
}

async function importDatabaseSnapshot(jsonData, clearExisting = true) {
  const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData

  if (!data || !data.projects) {
    throw makeError('Format de snapshot invalide', 400)
  }

  if (!clearExisting) {
    throw makeError('importDatabase sans clearExisting n\'est pas supporté', 400)
  }

  await withTransaction(async (client) => {
    await client.query('TRUNCATE TABLE time_entries, tickets, sprints, todos, local_tasks, odoo_tasks, passwords, projects, users RESTART IDENTITY CASCADE')

    if (Array.isArray(data.users)) {
      for (const user of data.users) {
        await insertRow(client, 'users', userFields, user, mapUser)
      }
    }

    if (Array.isArray(data.projects)) {
      for (const project of data.projects) {
        await insertRow(client, 'projects', projectFields, project, mapProject, jsonProjectFields)
      }
    }

    if (Array.isArray(data.sprints)) {
      for (const sprint of data.sprints) {
        await insertRow(client, 'sprints', sprintFields, sprint, mapSprint, jsonSprintFields)
      }
    }

    if (Array.isArray(data.tickets)) {
      for (const ticket of data.tickets) {
        await insertRow(client, 'tickets', ticketFields, ticket, mapTicket, jsonTicketFields)
      }
    }

    if (Array.isArray(data.todos)) {
      for (const todo of data.todos) {
        await insertRow(client, 'todos', todoFields, todo, mapTodo)
      }
    }

    if (Array.isArray(data.timeEntries)) {
      for (const timeEntry of data.timeEntries) {
        await insertRow(client, 'time_entries', timeEntryFields, timeEntry, mapTimeEntry)
      }
    }

    if (Array.isArray(data.odooTasks)) {
      for (const odooTask of data.odooTasks) {
        await insertRow(client, 'odoo_tasks', odooTaskFields, odooTask, mapOdooTask)
      }
    }

    if (Array.isArray(data.localTasks)) {
      for (const localTask of data.localTasks) {
        await insertRow(client, 'local_tasks', localTaskFields, localTask, mapLocalTask, jsonLocalTaskFields)
      }
    }

    if (Array.isArray(data.passwords)) {
      for (const password of data.passwords) {
        await insertRow(client, 'passwords', passwordFields, password, mapPassword)
      }
    }

    await resetSequences(client)
  })

  return {
    ok: true,
    importedAt: new Date().toISOString()
  }
}

app.get('/api/health', async (_req, res, next) => {
  try {
    const result = await query('SELECT NOW() AS now')
    res.json({ ok: true, database: 'postgresql', now: result.rows[0].now })
  } catch (error) {
    next(error)
  }
})

app.post('/api/rpc', async (req, res, next) => {
  try {
    const { method, params = [] } = req.body || {}

    switch (method) {
      case 'init': res.json(true); return
      case 'getAllProjects': res.json(await getAllProjects()); return
      case 'getProject': res.json(await getProject(params[0])); return
      case 'addProject': res.json(await addProject(params[0])); return
      case 'updateProject': res.json(await updateProject(params[0], params[1])); return
      case 'deleteProject': res.json(await deleteProject(params[0])); return
      case 'getAllTickets': res.json(await getAllTickets()); return
      case 'getTicketsByProject': res.json(await getTicketsByProject(params[0])); return
      case 'getTicket': res.json(await getTicket(params[0])); return
      case 'addTicket': res.json(await addTicket(params[0])); return
      case 'updateTicket': res.json(await updateTicket(params[0], params[1])); return
      case 'deleteTicket': res.json(await deleteTicket(params[0])); return
      case 'getAllTodos': res.json(await getAllTodos()); return
      case 'addTodo': res.json(await addTodo(params[0])); return
      case 'updateTodo': res.json(await updateTodo(params[0], params[1])); return
      case 'deleteTodo': res.json(await deleteTodo(params[0])); return
      case 'getAllSprints': res.json(await getAllSprints()); return
      case 'getSprint': res.json(await getSprint(params[0])); return
      case 'getSprintsByProject': res.json(await getSprintsByProject(params[0])); return
      case 'addSprint': res.json(await addSprint(params[0])); return
      case 'updateSprint': res.json(await updateSprint(params[0], params[1])); return
      case 'deleteSprint': res.json(await deleteSprint(params[0])); return
      case 'getAllTimeEntries': res.json(await getAllTimeEntries()); return
      case 'getTimeEntry': res.json(await getTimeEntry(params[0])); return
      case 'getTimeEntriesByTicket': res.json(await getTimeEntriesByTicket(params[0])); return
      case 'addTimeEntry': res.json(await addTimeEntry(params[0])); return
      case 'updateTimeEntry': res.json(await updateTimeEntry(params[0], params[1])); return
      case 'deleteTimeEntry': res.json(await deleteTimeEntry(params[0])); return
      case 'getAllOdooTasks': res.json(await getAllOdooTasks()); return
      case 'getOdooTasksByProjectOdooId': res.json(await getOdooTasksByProjectOdooId(params[0])); return
      case 'getOdooTaskByOdooId': res.json(await getOdooTaskByOdooId(params[0])); return
      case 'upsertOdooTask': res.json(await upsertOdooTask(params[0])); return
      case 'updateOdooTaskByOdooId': res.json(await updateOdooTaskByOdooId(params[0], params[1])); return
      case 'replaceOdooTasksForProject': res.json(await replaceOdooTasksForProject(params[0], params[1] || [])); return
      case 'getAllLocalTasks': res.json(await getAllLocalTasks()); return
      case 'getLocalTasksByProject': res.json(await getLocalTasksByProject(params[0])); return
      case 'getLocalTask': res.json(await getLocalTask(params[0])); return
      case 'addLocalTask': res.json(await addLocalTask(params[0])); return
      case 'updateLocalTask': res.json(await updateLocalTask(params[0], params[1])); return
      case 'deleteLocalTask': res.json(await deleteLocalTask(params[0])); return
      case 'getAllPasswords': res.json(await getAllPasswords()); return
      case 'getPassword': res.json(await getPassword(params[0])); return
      case 'addPassword': res.json(await addPassword(params[0])); return
      case 'updatePassword': res.json(await updatePassword(params[0], params[1])); return
      case 'deletePassword': res.json(await deletePassword(params[0])); return
      case 'getAllUsers': res.json(await getAllUsers()); return
      case 'getUser': res.json(await getUser(params[0])); return
      case 'getUserByUsername': res.json(await getUserByUsername(params[0])); return
      case 'addUser': res.json(await addUser(params[0])); return
      case 'updateUser': res.json(await updateUser(params[0], params[1])); return
      case 'deleteUser': res.json(await deleteUser(params[0])); return
      case 'clearAllData': res.json(await clearAllData()); return
      case 'exportDatabase': res.json(await exportDatabaseSnapshot()); return
      case 'importDatabase': res.json(await importDatabaseSnapshot(params[0], params[1] !== false)); return
      case 'resetSequences': await resetSequences(); res.json(true); return
      default: throw makeError(`Unknown RPC method: ${method}`, 400)
    }
  } catch (error) {
    next(error)
  }
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(error.status || 500).json({ error: error.message || 'Internal server error' })
})

app.listen(port, () => {
  console.log(`✅ PostgreSQL API listening on http://localhost:${port}`)
})
