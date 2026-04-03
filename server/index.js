import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import nodemailer from 'nodemailer'
import Mailjet from 'node-mailjet'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
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
  clientName: 'client_name',
  clientEmail: 'client_email',
  prodUrl: 'prod_url',
  preprodUrl: 'preprod_url',
  githubRepoUrl: 'github_repo_url',
  githubRepoOwner: 'github_repo_owner',
  githubRepoName: 'github_repo_name',
  githubDefaultBranch: 'github_default_branch',
  githubPrivate: 'github_private',
  gitlabRepoUrl: 'gitlab_repo_url',
  gitlabProjectPath: 'gitlab_project_path',
  gitlabProjectId: 'gitlab_project_id',
  gitlabDefaultBranch: 'gitlab_default_branch',
  gitlabPrivate: 'gitlab_private',
  status: 'status',
  assignedUserId: 'assigned_user_id',
  isFavorite: 'is_favorite',
  useDefaultKanbanTemplate: 'use_default_kanban_template',
  kanbanColumns: 'kanban_columns',
  odooId: 'odoo_id',
  chiffrageEnabled: 'chiffrage_enabled',
  tjm: 'tjm',
  hoursPerDay: 'hours_per_day',
  recetteShareToken: 'recette_share_token',
  testAccounts: 'test_accounts',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const recetteFields = {
  id: 'id',
  name: 'name',
  description: 'description',
  projectId: 'project_id',
  sprintId: 'sprint_id',
  preprodUrl: 'preprod_url',
  prodUrl: 'prod_url',
  testAccounts: 'test_accounts',
  shareToken: 'share_token',
  createdByUserId: 'created_by_user_id',
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
  stageId: 'stage_id',
  recetteStatus: 'recette_status',
  recetteComment: 'recette_comment',
  recetteDate: 'recette_date',
  recetteByUserId: 'recette_by_user_id',
  recetteHistory: 'recette_history',
  assignedUserId: 'assigned_user_id',
  sprintId: 'sprint_id',
  recetteId: 'recette_id',
  notes: 'notes',
  emailHistory: 'email_history',
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

const kanbanStageFields = {
  id: 'id',
  name: 'name',
  sequence: 'sequence',
  color: 'color',
  folded: 'folded',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const localTaskFields = {
  id: 'id',
  projectId: 'project_id',
  sprintId: 'sprint_id',
  recetteId: 'recette_id',
  stageId: 'stage_id',
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

const jsonProjectFields = ['kanbanColumns', 'testAccounts']
const jsonRecetteFields = ['testAccounts']
const jsonTicketFields = ['recetteHistory', 'notes', 'emailHistory', 'userStories', 'attachments', 'ganttAssignments']
const jsonSprintFields = ['meetingNotes']
const jsonLocalTaskFields = ['attachments', 'ganttAssignments']
const sequenceTables = ['users', 'projects', 'recettes', 'sprints', 'tickets', 'todos', 'time_entries', 'local_tasks', 'odoo_tasks', 'passwords', 'kanban_stages']

function makeError(message, status = 400) {
  const error = new Error(message)
  error.status = status
  return error
}

function parseEmailList(input) {
  if (Array.isArray(input)) {
    return input.map(v => String(v || '').trim()).filter(Boolean)
  }

  return String(input || '')
    .split(/[;,\s]+/)
    .map(v => v.trim())
    .filter(Boolean)
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function textToHtml(input) {
  return escapeHtml(input).replace(/\n/g, '<br>')
}

function buildImapClientConfig(config = {}) {
  const secureMode = String(config.security || 'ssl').toLowerCase()
  const useSsl = secureMode === 'ssl'
  const useStarttls = secureMode === 'starttls'

  const clientConfig = {
    host: String(config.host || '').trim(),
    port: Number(config.port || (useSsl ? 993 : 143)),
    secure: useSsl,
    auth: {
      user: String(config.username || '').trim(),
      pass: String(config.password || '').trim(),
    },
    tls: {
      rejectUnauthorized: config.rejectUnauthorized !== false,
    },
    logger: false,
  }

  // Pour les serveurs qui exigent STARTTLS explicite (ex: port 143)
  if (useStarttls) {
    clientConfig.doSTARTTLS = true
  }

  return clientConfig
}

function normalizeImapConfig(config = {}) {
  return {
    host: String(config.host || '').trim(),
    port: Number(config.port || 993),
    username: String(config.username || '').trim(),
    password: String(config.password || '').trim(),
    security: String(config.security || 'ssl').toLowerCase(),
    mailbox: String(config.mailbox || 'INBOX').trim() || 'INBOX',
    rejectUnauthorized: config.rejectUnauthorized !== false,
    maxMessages: Number(config.maxMessages || 20),
  }
}

function ensureImapConfig(config = {}) {
  if (!config.host || !config.username || !config.password) {
    throw makeError('Configuration IMAP incomplète (host, username, password requis)', 400)
  }
}

function mapImapError(error) {
  const responseText = String(error?.responseText || '').trim()
  const responseCode = String(error?.serverResponseCode || '').trim()
  const message = String(error?.message || '').trim()

  if (error?.authenticationFailed || responseCode === 'AUTHENTICATIONFAILED') {
    const details = [
      '• identifiants invalides',
      '• mot de passe d\'application requis (Gmail/Outlook)',
      '• mode de sécurité IMAP incorrect (essayer SSL 993 ou STARTTLS 143)',
      '• authentification basic non supportée par ce serveur'
    ].join('\n')
    return makeError(`Échec authentification IMAP\n${details}`, 400)
  }

  if (responseCode === 'NONEXISTENT') {
    return makeError('Boîte IMAP introuvable : vérifiez le nom du dossier (ex: INBOX)', 400)
  }

  if (responseText.includes('Invalid credentials')) {
    return makeError('Échec authentification IMAP : identifiants invalides', 400)
  }

  if (responseText.includes('Connection closed')) {
    return makeError('Connexion IMAP interrompue par le serveur', 502)
  }

  if (message && message !== 'Command failed') {
    return makeError(`Erreur IMAP : ${message}`, 500)
  }

  return makeError('Erreur IMAP : commande refusée par le serveur', 500)
}

function buildImapFallbackConfigs(config = {}) {
  const mailbox = String(config.mailbox || 'INBOX').trim() || 'INBOX'
  const rejectUnauthorized = config.rejectUnauthorized !== false
  const host = String(config.host || '').trim()
  const username = String(config.username || '').trim()
  const password = String(config.password || '').trim()

  const candidates = [
    { security: 'ssl', port: 993 },
    { security: 'starttls', port: 143 },
    { security: 'none', port: 143 },
  ]

  const primaryKey = `${String(config.security || '').toLowerCase()}:${Number(config.port || 0)}`

  return candidates
    .map(candidate => ({
      host,
      port: candidate.port,
      username,
      password,
      security: candidate.security,
      mailbox,
      rejectUnauthorized,
      maxMessages: Number(config.maxMessages || 20),
      _key: `${candidate.security}:${candidate.port}`,
    }))
    .filter(candidate => candidate._key !== primaryKey)
}

async function withImapClient(config, callback) {
  const client = new ImapFlow(buildImapClientConfig(config))
  try {
    await client.connect()
    const lock = await client.getMailboxLock(config.mailbox)
    try {
      return await callback(client)
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => {})
  }
}

async function runImapWithFallback(normalizedConfig, callback) {
  try {
    const result = await withImapClient(normalizedConfig, callback)
    return { result, effectiveConfig: normalizedConfig }
  } catch (error) {
    console.error('[IMAP DEBUG]', {
      authFailed: error?.authenticationFailed,
      responseCode: error?.serverResponseCode,
      responseText: error?.responseText,
      message: error?.message,
      config: { host: normalizedConfig.host, port: normalizedConfig.port, security: normalizedConfig.security, username: '***' }
    })
    const isAuthFailure = !!(error?.authenticationFailed || String(error?.serverResponseCode || '').trim() === 'AUTHENTICATIONFAILED')
    if (!isAuthFailure) {
      throw error
    }

    const candidates = buildImapFallbackConfigs(normalizedConfig)
    for (const candidate of candidates) {
      try {
        const result = await withImapClient(candidate, callback)
        return { result, effectiveConfig: candidate }
      } catch {
        // on essaie le mode suivant
      }
    }

    throw error
  }
}

async function testImapConnection(config = {}) {
  const normalized = normalizeImapConfig(config)
  ensureImapConfig(normalized)

  try {
    const { result, effectiveConfig } = await runImapWithFallback(normalized, async (client) => {
      return {
        mailbox: normalized.mailbox,
        exists: client.mailbox?.exists || 0,
      }
    })

    return {
      ok: true,
      mailbox: result.mailbox,
      exists: result.exists,
      effectiveSecurity: effectiveConfig.security,
      effectivePort: effectiveConfig.port,
      usedFallback: effectiveConfig.security !== normalized.security || Number(effectiveConfig.port) !== Number(normalized.port),
    }
  } catch (error) {
    throw mapImapError(error)
  }
}

async function listImapMessages(config = {}) {
  const normalized = normalizeImapConfig(config)
  ensureImapConfig(normalized)

  try {
    const { result, effectiveConfig } = await runImapWithFallback(normalized, async (client) => {
      const exists = client.mailbox?.exists || 0
      if (!exists) {
        return { mailbox: normalized.mailbox, messages: [] }
      }

      const start = Math.max(1, exists - normalized.maxMessages + 1)
      const messages = []

      for await (const message of client.fetch(`${start}:${exists}`, { uid: true, envelope: true, flags: true, source: true })) {
        const parsed = message.source ? await simpleParser(message.source) : null
        const text = String(parsed?.text || parsed?.html || '').trim()
        const preview = text.replace(/\s+/g, ' ').slice(0, 400)
        const fromAddress = message.envelope?.from?.[0]
        const sender = [fromAddress?.name, fromAddress?.address].filter(Boolean).join(' <').replace(/<([^>]+)$/, '<$1>')

        messages.push({
          uid: message.uid,
          messageId: parsed?.messageId || message.envelope?.messageId || null,
          subject: message.envelope?.subject || '(Sans objet)',
          from: sender || fromAddress?.address || '',
          fromEmail: fromAddress?.address || '',
          to: (message.envelope?.to || []).map(item => item.address).filter(Boolean),
          date: message.envelope?.date || null,
          preview,
          body: text,
          flags: Array.from(message.flags || []),
        })
      }

      messages.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      return { mailbox: normalized.mailbox, messages }
    })

    return {
      ok: true,
      mailbox: result.mailbox,
      messages: result.messages,
      effectiveSecurity: effectiveConfig.security,
      effectivePort: effectiveConfig.port,
      usedFallback: effectiveConfig.security !== normalized.security || Number(effectiveConfig.port) !== Number(normalized.port),
    }
  } catch (error) {
    throw mapImapError(error)
  }
}

async function sendMailViaSmtp(config, mail) {
  const secure = config.security === 'ssl'
  const port = Number(config.port || (secure ? 465 : 587))

  let auth
  if (config.authMode === 'oauth2') {
    auth = {
      type: 'OAuth2',
      user: config.user,
      clientId: config.oauth2ClientId,
      clientSecret: config.oauth2ClientSecret,
      refreshToken: config.oauth2RefreshToken,
    }
  } else {
    auth = config.user && config.password ? { user: config.user, pass: config.password } : undefined
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port,
    secure,
    auth,
    tls: { rejectUnauthorized: config.rejectUnauthorized !== false },
  })

  if (config.verifyBeforeSend) {
    await transporter.verify()
  }

  const info = await transporter.sendMail({
    from: config.fromName ? `"${config.fromName}" <${config.from}>` : config.from,
    to: mail.to,
    cc: mail.cc,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  })

  return {
    ok: true,
    provider: 'smtp',
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  }
}

async function sendMailViaMailjet(config, mail) {
  const mailjet = Mailjet.apiConnect(config.mailjetApiKey, config.mailjetApiSecret)

  const toList = parseEmailList(mail.to)
  const ccList = parseEmailList(mail.cc)

  const response = await mailjet
    .post('send', { version: 'v3.1' })
    .request({
      Messages: [
        {
          From: {
            Email: config.from,
            Name: config.fromName || undefined,
          },
          To: toList.map(email => ({ Email: email })),
          Cc: ccList.length ? ccList.map(email => ({ Email: email })) : undefined,
          Subject: mail.subject,
          TextPart: mail.text,
          HTMLPart: mail.html,
        }
      ]
    })

  const first = response?.body?.Messages?.[0] || {}
  return {
    ok: true,
    provider: 'mailjet',
    messageId: first.To?.[0]?.MessageUUID || null,
    accepted: (first.To || []).map(item => item.Email).filter(Boolean),
    rejected: [],
    raw: response?.body || null,
  }
}

async function sendClientEmail(payload) {
  const toList = parseEmailList(payload?.to)
  const ccList = parseEmailList(payload?.cc)
  const subject = String(payload?.subject || '').trim()
  const body = String(payload?.body || '').trim()

  if (!toList.length) {
    throw makeError('Destinataire manquant', 400)
  }

  const invalidEmails = [...toList, ...ccList].filter(email => !isValidEmail(email))
  if (invalidEmails.length > 0) {
    throw makeError(`Adresse(s) invalide(s): ${invalidEmails.join(', ')}`, 400)
  }

  if (!subject) {
    throw makeError('Sujet manquant', 400)
  }

  if (!body) {
    throw makeError('Message manquant', 400)
  }

  const requestConfig = payload?.config && typeof payload.config === 'object'
    ? payload.config
    : null
  const provider = String(requestConfig?.provider || process.env.MAIL_PROVIDER || 'smtp').toLowerCase()

  const ticketContext = [
    payload?.ticketId ? `Ticket #${payload.ticketId}` : '',
    payload?.ticketTitle ? `Titre: ${payload.ticketTitle}` : '',
    payload?.projectName ? `Projet: ${payload.projectName}` : '',
  ].filter(Boolean).join('\n')

  const textBody = ticketContext ? `${body}\n\n---\n${ticketContext}` : body
  const htmlBody = textToHtml(textBody)

  if (provider === 'mailjet') {
    const mailjetApiKey = String(requestConfig?.mailjetApiKey || process.env.MAILJET_API_KEY || '').trim()
    const mailjetApiSecret = String(requestConfig?.mailjetApiSecret || process.env.MAILJET_API_SECRET || '').trim()
    const from = String(requestConfig?.from || process.env.MAILJET_FROM_EMAIL || process.env.SMTP_FROM || '').trim()
    const fromName = String(requestConfig?.fromName || process.env.MAILJET_FROM_NAME || 'Gestion Tickets').trim()

    if (!mailjetApiKey || !mailjetApiSecret || !from) {
      throw makeError('Mailjet non configuré: définir MAILJET_API_KEY, MAILJET_API_SECRET et MAILJET_FROM_EMAIL', 500)
    }

    return sendMailViaMailjet(
      { mailjetApiKey, mailjetApiSecret, from, fromName },
      {
        to: toList.join(', '),
        cc: ccList.length ? ccList.join(', ') : undefined,
        subject,
        text: textBody,
        html: htmlBody,
      }
    )
  }

  const host = String(requestConfig?.host || process.env.SMTP_HOST || '').trim()
  const port = Number(requestConfig?.port || process.env.SMTP_PORT || 587)
  const requestSecurity = String(requestConfig?.security || '').toLowerCase()
  const secure = requestSecurity
    ? requestSecurity === 'ssl'
    : String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true'
  const user = String(requestConfig?.user || process.env.SMTP_USER || '').trim()
  const pass = String(requestConfig?.password || process.env.SMTP_PASS || '').trim()
  const from = String(requestConfig?.from || process.env.SMTP_FROM || user).trim()

  if (!host || !from) {
    throw makeError('SMTP non configuré: définir SMTP_HOST et SMTP_FROM (ou SMTP_USER)', 500)
  }

  return sendMailViaSmtp(
    {
      host,
      port,
      security: secure ? 'ssl' : 'starttls',
      authMode: requestConfig?.authMode || 'password',
      user,
      password: pass,
      oauth2ClientId: requestConfig?.oauth2ClientId,
      oauth2ClientSecret: requestConfig?.oauth2ClientSecret,
      oauth2RefreshToken: requestConfig?.oauth2RefreshToken,
      from,
      fromName: requestConfig?.fromName || process.env.SMTP_FROM_NAME || 'Gestion Tickets',
      rejectUnauthorized: requestConfig?.rejectUnauthorized,
      verifyBeforeSend: false,
    },
    {
      to: toList.join(', '),
      cc: ccList.length ? ccList.join(', ') : undefined,
      subject,
      text: textBody,
      html: htmlBody,
    }
  )
}

function mapProject(row) {
  return {
    followerUserIds: row.follower_user_ids || [],
    id: Number(row.id),
    name: row.name,
    description: row.description,
    clientName: row.client_name || '',
    clientEmail: row.client_email || '',
    prodUrl: row.prod_url || '',
    preprodUrl: row.preprod_url || '',
    githubRepoUrl: row.github_repo_url || '',
    githubRepoOwner: row.github_repo_owner || '',
    githubRepoName: row.github_repo_name || '',
    githubDefaultBranch: row.github_default_branch || '',
    githubPrivate: row.github_private === true,
    gitlabRepoUrl: row.gitlab_repo_url || '',
    gitlabProjectPath: row.gitlab_project_path || '',
    gitlabProjectId: row.gitlab_project_id ? Number(row.gitlab_project_id) : null,
    gitlabDefaultBranch: row.gitlab_default_branch || '',
    gitlabPrivate: row.gitlab_private === true,
    status: row.status,
    assignedUserId: row.assigned_user_id ? Number(row.assigned_user_id) : null,
    isFavorite: row.is_favorite,
    useDefaultKanbanTemplate: row.use_default_kanban_template !== false,
    kanbanColumns: row.kanban_columns || [],
    odooId: row.odoo_id ? Number(row.odoo_id) : null,
    chiffrageEnabled: row.chiffrage_enabled,
    tjm: row.tjm !== null ? Number(row.tjm) : null,
    hoursPerDay: row.hours_per_day !== null ? Number(row.hours_per_day) : null,
    recetteShareToken: row.recette_share_token || null,
    testAccounts: row.test_accounts || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapRecette(row) {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description || '',
    projectId: row.project_id ? Number(row.project_id) : null,
    sprintId: row.sprint_id ? Number(row.sprint_id) : null,
    preprodUrl: row.preprod_url || '',
    prodUrl: row.prod_url || '',
    testAccounts: row.test_accounts || [],
    shareToken: row.share_token,
    createdByUserId: row.created_by_user_id ? Number(row.created_by_user_id) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapKanbanStage(row) {
  return {
    id: Number(row.id),
    name: row.name,
    sequence: Number(row.sequence || 10),
    color: row.color || '#cfe2ff',
    folded: row.folded || false,
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
    stageId: row.stage_id ? Number(row.stage_id) : null,
    recetteStatus: row.recette_status,
    recetteComment: row.recette_comment,
    recetteDate: row.recette_date,
    recetteByUserId: row.recette_by_user_id ? Number(row.recette_by_user_id) : null,
    recetteHistory: row.recette_history || [],
    assignedUserId: row.assigned_user_id ? Number(row.assigned_user_id) : null,
    sprintId: row.sprint_id ? Number(row.sprint_id) : null,
    recetteId: row.recette_id ? Number(row.recette_id) : null,
    notes: row.notes || [],
    emailHistory: row.email_history || [],
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
    recetteId: row.recette_id ? Number(row.recette_id) : null,
    stageId: row.stage_id ? Number(row.stage_id) : null,
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

function normalizeMenuPreferences(input = {}) {
  const safeInput = input && typeof input === 'object' ? input : {}
  return {
    customMainMenuItems: Array.isArray(safeInput.customMainMenuItems) ? safeInput.customMainMenuItems : [],
    menuOrder: Array.isArray(safeInput.menuOrder) ? safeInput.menuOrder : [],
    hiddenMenuItemIds: Array.isArray(safeInput.hiddenMenuItemIds) ? safeInput.hiddenMenuItemIds : [],
    submenuOrder: safeInput.submenuOrder && typeof safeInput.submenuOrder === 'object' ? safeInput.submenuOrder : {},
    hiddenSubmenuItemIds: Array.isArray(safeInput.hiddenSubmenuItemIds) ? safeInput.hiddenSubmenuItemIds : [],
    menuParentMap: safeInput.menuParentMap && typeof safeInput.menuParentMap === 'object' ? safeInput.menuParentMap : {},
  }
}

function mapUserMenuPreferences(row) {
  const preferences = normalizeMenuPreferences(row?.preferences || {})
  return {
    userId: Number(row.user_id),
    ...preferences,
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

async function getAllRecettes() {
  const result = await query('SELECT * FROM recettes ORDER BY updated_at DESC, id DESC')
  return result.rows.map(mapRecette)
}

async function getRecette(id) {
  return getRowById('recettes', id, mapRecette)
}

async function addRecette(recette) {
  const payload = {
    ...recette,
    testAccounts: Array.isArray(recette?.testAccounts) ? recette.testAccounts : [],
    shareToken: String(recette?.shareToken || '').trim() || crypto.randomUUID(),
  }
  return insertRow(query, 'recettes', recetteFields, payload, mapRecette, jsonRecetteFields)
}

async function updateRecette(id, updates) {
  const payload = {
    ...updates,
  }
  if (Object.prototype.hasOwnProperty.call(updates || {}, 'testAccounts')) {
    payload.testAccounts = Array.isArray(updates?.testAccounts) ? updates.testAccounts : []
  }
  if (Object.prototype.hasOwnProperty.call(updates || {}, 'shareToken')) {
    payload.shareToken = String(updates?.shareToken || '').trim() || crypto.randomUUID()
  }
  return updateRow('recettes', id, recetteFields, payload, mapRecette, jsonRecetteFields)
}

async function deleteRecette(id) {
  await query('UPDATE tickets SET recette_id = NULL WHERE recette_id = $1', [id])
  await query('UPDATE local_tasks SET recette_id = NULL WHERE recette_id = $1', [id])
  await deleteRow('recettes', id)
  return true
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

async function getRecetteByShareToken(token) {
  const result = await query('SELECT * FROM recettes WHERE share_token = $1 LIMIT 1', [token])
  if (!result.rows.length) {
    throw makeError('Lien de recette invalide', 404)
  }
  return mapRecette(result.rows[0])
}

async function getRecetteScopeByToken(token) {
  const normalizedToken = String(token || '').trim()
  if (!normalizedToken) {
    throw makeError('Lien de recette invalide', 404)
  }

  try {
    const recette = await getRecetteByShareToken(normalizedToken)
    return {
      recette,
      project: recette.projectId ? await getProject(recette.projectId) : null,
      isLegacyProjectToken: false,
    }
  } catch (_error) {
    const legacy = await query('SELECT * FROM projects WHERE recette_share_token = $1 LIMIT 1', [normalizedToken])
    if (!legacy.rows.length) {
      throw makeError('Lien de recette invalide', 404)
    }
    const project = mapProject(legacy.rows[0])
    const virtualRecette = {
      id: null,
      name: `Recette ${project.name}`,
      description: project.description || '',
      projectId: project.id,
      sprintId: null,
      preprodUrl: project.preprodUrl || '',
      prodUrl: project.prodUrl || '',
      testAccounts: project.testAccounts || [],
      shareToken: normalizedToken,
      createdByUserId: null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }
    return {
      recette: virtualRecette,
      project,
      isLegacyProjectToken: true,
    }
  }
}

async function getPublicRecetteByToken(token) {
  const scope = await getRecetteScopeByToken(token)
  const recette = scope.recette

  let result
  if (scope.isLegacyProjectToken) {
    result = await query(
      `SELECT *
       FROM tickets
       WHERE project_id = $1
         AND (
           COALESCE(recette_status, 'pending') <> 'pending'
           OR COALESCE(jsonb_array_length(user_stories), 0) > 0
         )
       ORDER BY updated_at DESC, id DESC`,
      [recette.projectId]
    )
  } else {
    result = await query(
      `SELECT *
       FROM tickets
       WHERE recette_id = $1
       ORDER BY updated_at DESC, id DESC`,
      [recette.id]
    )
  }

  return {
    recette: {
      id: recette.id,
      name: recette.name,
      description: recette.description || '',
      projectId: recette.projectId,
      sprintId: recette.sprintId,
      preprodUrl: recette.preprodUrl || '',
      prodUrl: recette.prodUrl || '',
      testAccounts: recette.testAccounts || [],
      shareToken: recette.shareToken,
    },
    project: scope.project ? {
      id: scope.project.id,
      name: scope.project.name,
      description: scope.project.description,
    } : null,
    source: {
      legacyProjectToken: scope.isLegacyProjectToken,
    },
    tickets: result.rows.map(mapTicket),
  }
}

async function updatePublicRecetteCriterion(token, ticketId, payload) {
  const scope = await getRecetteScopeByToken(token)
  const recette = scope.recette
  const normalizedTicketId = Number(ticketId)

  if (!Number.isFinite(normalizedTicketId) || normalizedTicketId <= 0) {
    throw makeError('Ticket invalide', 400)
  }

  const storyId = payload?.storyId
  const criterionId = payload?.criterionId
  const hasResultUpdate = Object.prototype.hasOwnProperty.call(payload || {}, 'result') || Object.prototype.hasOwnProperty.call(payload || {}, 'checked')
  const normalizedResult = payload?.result === 'ok' || payload?.result === 'ko'
    ? payload.result
    : (payload?.checked === true ? 'ok' : null)
  const attachmentAdd = payload?.attachmentAdd && typeof payload.attachmentAdd === 'object'
    ? payload.attachmentAdd
    : null
  const removeAttachmentId = payload?.removeAttachmentId !== undefined && payload?.removeAttachmentId !== null
    ? String(payload.removeAttachmentId)
    : null

  if (storyId === undefined || storyId === null || criterionId === undefined || criterionId === null) {
    throw makeError('Paramètres manquants pour la mise à jour du critère', 400)
  }

  const result = scope.isLegacyProjectToken
    ? await query('SELECT * FROM tickets WHERE id = $1 AND project_id = $2 LIMIT 1', [normalizedTicketId, recette.projectId])
    : await query('SELECT * FROM tickets WHERE id = $1 AND recette_id = $2 LIMIT 1', [normalizedTicketId, recette.id])
  if (!result.rows.length) {
    throw makeError('Ticket introuvable pour ce lien de recette', 404)
  }

  const ticket = mapTicket(result.rows[0])
  const stories = Array.isArray(ticket.userStories) ? [...ticket.userStories] : []

  let criterionUpdated = false
  const updatedStories = stories.map((story) => {
    const sameStory = String(story?.id) === String(storyId)
    if (!sameStory) return story

    let criteria = Array.isArray(story?.acceptanceCriteriaItems)
      ? [...story.acceptanceCriteriaItems]
      : []

    if (!criteria.length) {
      const legacyLines = String(story?.acceptanceCriteria || '')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
      criteria = legacyLines.map((text, idx) => ({
        id: `${String(story?.id || 'story')}-${idx + 1}`,
        text,
        result: null,
        checked: false,
        attachments: [],
      }))
    }

    const newCriteria = criteria.map((criterion) => {
      if (String(criterion?.id) !== String(criterionId)) {
        return criterion
      }
      criterionUpdated = true
      let nextAttachments = Array.isArray(criterion?.attachments) ? [...criterion.attachments] : []

      if (attachmentAdd && attachmentAdd.data && attachmentAdd.name) {
        nextAttachments.push({
          id: attachmentAdd.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: attachmentAdd.name,
          type: attachmentAdd.type || '',
          size: Number(attachmentAdd.size || 0),
          data: attachmentAdd.data,
          uploadedAt: attachmentAdd.uploadedAt || new Date().toISOString(),
        })
      }

      if (removeAttachmentId) {
        nextAttachments = nextAttachments.filter(att => String(att?.id) !== removeAttachmentId)
      }

      const currentResult = criterion?.result === 'ok' || criterion?.result === 'ko'
        ? criterion.result
        : (criterion?.checked === true ? 'ok' : null)
      const nextResult = hasResultUpdate ? normalizedResult : currentResult

      return {
        ...criterion,
        result: nextResult,
        checked: nextResult === 'ok',
        checkedAt: hasResultUpdate ? (nextResult === 'ok' ? new Date().toISOString() : null) : (criterion?.checkedAt || null),
        checkedByUserId: hasResultUpdate ? (nextResult === 'ok' ? (criterion?.checkedByUserId || null) : null) : (criterion?.checkedByUserId || null),
        attachments: nextAttachments,
      }
    })

    return {
      ...story,
      acceptanceCriteriaItems: newCriteria,
    }
  })

  if (!criterionUpdated) {
    throw makeError('Critère introuvable', 404)
  }

  const updateResult = await query(
    `UPDATE tickets
     SET user_stories = $1::jsonb,
         recette_date = NOW(),
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [JSON.stringify(updatedStories), normalizedTicketId]
  )

  return mapTicket(updateResult.rows[0])
}

async function addPublicRecetteUserStory(token, ticketId, payload) {
  const scope = await getRecetteScopeByToken(token)
  const recette = scope.recette
  const normalizedTicketId = Number(ticketId)
  if (!Number.isFinite(normalizedTicketId) || normalizedTicketId <= 0) {
    throw makeError('Ticket invalide', 400)
  }

  const title = String(payload?.title || '').trim()
  const phase = String(payload?.phase || '').trim() || 'Phase 1'
  const description = String(payload?.description || '').trim()
  const comment = String(payload?.comment || '').trim()
  const acceptanceCriteria = String(payload?.acceptanceCriteria || '').trim()

  if (!title) {
    throw makeError('Le titre de la user story est requis', 400)
  }

  const result = scope.isLegacyProjectToken
    ? await query('SELECT * FROM tickets WHERE id = $1 AND project_id = $2 LIMIT 1', [normalizedTicketId, recette.projectId])
    : await query('SELECT * FROM tickets WHERE id = $1 AND recette_id = $2 LIMIT 1', [normalizedTicketId, recette.id])
  if (!result.rows.length) {
    throw makeError('Ticket introuvable pour ce lien de recette', 404)
  }

  const ticket = mapTicket(result.rows[0])
  const stories = Array.isArray(ticket.userStories) ? [...ticket.userStories] : []

  const criteriaItems = acceptanceCriteria
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: Date.now() + index,
      text,
      result: null,
      checked: false,
      checkedAt: null,
      checkedByUserId: null,
      attachments: [],
    }))

  stories.push({
    id: Date.now(),
    title,
    recettePhase: phase,
    description,
    comment,
    acceptanceCriteria,
    acceptanceCriteriaItems: criteriaItems,
    status: 'todo',
    createdByUserId: null,
    updatedByUserId: null,
    createdAt: new Date().toISOString(),
  })

  const updateResult = await query(
    `UPDATE tickets
     SET user_stories = $1::jsonb,
         recette_date = NOW(),
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [JSON.stringify(stories), normalizedTicketId]
  )

  return mapTicket(updateResult.rows[0])
}

async function updatePublicRecetteStoryComment(token, ticketId, payload) {
  const scope = await getRecetteScopeByToken(token)
  const recette = scope.recette
  const normalizedTicketId = Number(ticketId)
  if (!Number.isFinite(normalizedTicketId) || normalizedTicketId <= 0) {
    throw makeError('Ticket invalide', 400)
  }

  const storyId = payload?.storyId
  const comment = String(payload?.comment || '').trim()

  if (storyId === undefined || storyId === null) {
    throw makeError('storyId manquant', 400)
  }

  const result = scope.isLegacyProjectToken
    ? await query('SELECT * FROM tickets WHERE id = $1 AND project_id = $2 LIMIT 1', [normalizedTicketId, recette.projectId])
    : await query('SELECT * FROM tickets WHERE id = $1 AND recette_id = $2 LIMIT 1', [normalizedTicketId, recette.id])

  if (!result.rows.length) {
    throw makeError('Ticket introuvable pour ce lien de recette', 404)
  }

  const ticket = mapTicket(result.rows[0])
  const stories = Array.isArray(ticket.userStories) ? [...ticket.userStories] : []

  let found = false
  const updatedStories = stories.map(story => {
    if (String(story?.id) !== String(storyId)) return story
    found = true
    return {
      ...story,
      comment,
      commentUpdatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  })

  if (!found) {
    throw makeError('User story introuvable', 404)
  }

  const updateResult = await query(
    `UPDATE tickets
     SET user_stories = $1::jsonb,
         recette_date = NOW(),
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [JSON.stringify(updatedStories), normalizedTicketId]
  )

  return mapTicket(updateResult.rows[0])
}

async function updatePublicRecetteStatus(token, ticketId, payload) {
  const scope = await getRecetteScopeByToken(token)
  const recette = scope.recette
  const normalizedTicketId = Number(ticketId)
  if (!Number.isFinite(normalizedTicketId) || normalizedTicketId <= 0) {
    throw makeError('Ticket invalide', 400)
  }

  const { status, comment } = payload || {}

  const result = scope.isLegacyProjectToken
    ? await query('SELECT * FROM tickets WHERE id = $1 AND project_id = $2 LIMIT 1', [normalizedTicketId, recette.projectId])
    : await query('SELECT * FROM tickets WHERE id = $1 AND recette_id = $2 LIMIT 1', [normalizedTicketId, recette.id])
  if (!result.rows.length) {
    throw makeError('Ticket introuvable pour ce lien de recette', 404)
  }

  const ticket = mapTicket(result.rows[0])
  const history = Array.isArray(ticket.recetteHistory) ? [...ticket.recetteHistory] : []
  history.unshift({
    id: Date.now(),
    status: status || 'pending',
    comment: comment || '',
    createdAt: new Date().toISOString(),
    byUserId: null,
    coveragePercent: 0,
    checkedCriteria: 0,
    totalCriteria: 0
  })

  const updateResult = await query(
    `UPDATE tickets
     SET recette_status = $1,
         recette_comment = $2,
         recette_date = NOW(),
         recette_history = $3::jsonb,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [status || 'pending', comment || null, JSON.stringify(history), normalizedTicketId]
  )

  return mapTicket(updateResult.rows[0])
}

async function updatePublicHistoryEntry(token, ticketId, historyId, payload) {
  const scope = await getRecetteScopeByToken(token)
  const recette = scope.recette
  const normalizedTicketId = Number(ticketId)
  if (!Number.isFinite(normalizedTicketId) || normalizedTicketId <= 0) {
    throw makeError('Ticket invalide', 400)
  }

  const result = scope.isLegacyProjectToken
    ? await query('SELECT * FROM tickets WHERE id = $1 AND project_id = $2 LIMIT 1', [normalizedTicketId, recette.projectId])
    : await query('SELECT * FROM tickets WHERE id = $1 AND recette_id = $2 LIMIT 1', [normalizedTicketId, recette.id])
  if (!result.rows.length) {
    throw makeError('Ticket introuvable', 404)
  }

  const ticket = mapTicket(result.rows[0])
  const history = Array.isArray(ticket.recetteHistory) ? [...ticket.recetteHistory] : []
  const normalizedHistoryId = Number(historyId)

  const updatedHistory = history.map(entry => {
    if (Number(entry.id) === normalizedHistoryId) {
      return {
        ...entry,
        status: payload?.status !== undefined ? payload.status : entry.status,
        comment: payload?.comment !== undefined ? payload.comment : entry.comment,
        updatedAt: new Date().toISOString()
      }
    }
    return entry
  })

  const updateResult = await query(
    `UPDATE tickets
     SET recette_history = $1::jsonb,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [JSON.stringify(updatedHistory), normalizedTicketId]
  )

  return mapTicket(updateResult.rows[0])
}

async function deletePublicHistoryEntry(token, ticketId, historyId) {
  const scope = await getRecetteScopeByToken(token)
  const recette = scope.recette
  const normalizedTicketId = Number(ticketId)
  if (!Number.isFinite(normalizedTicketId) || normalizedTicketId <= 0) {
    throw makeError('Ticket invalide', 400)
  }

  const result = scope.isLegacyProjectToken
    ? await query('SELECT * FROM tickets WHERE id = $1 AND project_id = $2 LIMIT 1', [normalizedTicketId, recette.projectId])
    : await query('SELECT * FROM tickets WHERE id = $1 AND recette_id = $2 LIMIT 1', [normalizedTicketId, recette.id])
  if (!result.rows.length) {
    throw makeError('Ticket introuvable', 404)
  }

  const ticket = mapTicket(result.rows[0])
  const history = Array.isArray(ticket.recetteHistory) ? [...ticket.recetteHistory] : []
  const normalizedHistoryId = Number(historyId)
  const updatedHistory = history.filter(entry => Number(entry.id) !== normalizedHistoryId)

  const updateResult = await query(
    `UPDATE tickets
     SET recette_history = $1::jsonb,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [JSON.stringify(updatedHistory), normalizedTicketId]
  )

  return mapTicket(updateResult.rows[0])
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

// ===== KANBAN STAGES =====
async function getAllKanbanStages() {
  const result = await query('SELECT * FROM kanban_stages ORDER BY sequence ASC, id ASC')
  return result.rows.map(mapKanbanStage)
}

async function getKanbanStage(id) {
  return getRowById('kanban_stages', id, mapKanbanStage)
}

async function addKanbanStage(stage) {
  return insertRow(query, 'kanban_stages', kanbanStageFields, stage, mapKanbanStage)
}

async function updateKanbanStage(id, updates) {
  return updateRow('kanban_stages', id, kanbanStageFields, updates, mapKanbanStage)
}

async function deleteKanbanStage(id) {
  await query('UPDATE tickets SET stage_id = NULL WHERE stage_id = $1', [id])
  await query('UPDATE local_tasks SET stage_id = NULL WHERE stage_id = $1', [id])
  await query('DELETE FROM project_stage_rel WHERE stage_id = $1', [id])
  await deleteRow('kanban_stages', id)
  return true
}

async function getStagesByProject(projectId) {
  const result = await query(
    `SELECT ks.*, psr.sequence AS project_sequence
     FROM kanban_stages ks
     JOIN project_stage_rel psr ON psr.stage_id = ks.id
     WHERE psr.project_id = $1
     ORDER BY psr.sequence ASC, ks.sequence ASC, ks.id ASC`,
    [projectId]
  )
  return result.rows.map(row => ({ ...mapKanbanStage(row), sequence: Number(row.project_sequence) }))
}

async function setProjectStages(projectId, stageItems) {
  // stageItems: [{stageId, sequence}] ou [stageId, ...]
  await withTransaction(async (client) => {
    await client.query('DELETE FROM project_stage_rel WHERE project_id = $1', [projectId])
    for (let i = 0; i < stageItems.length; i++) {
      const item = stageItems[i]
      const stageId = typeof item === 'object' ? item.stageId : item
      const seq = typeof item === 'object' ? (item.sequence ?? (i + 1) * 10) : (i + 1) * 10
      await client.query(
        'INSERT INTO project_stage_rel (project_id, stage_id, sequence) VALUES ($1, $2, $3)',
        [projectId, stageId, seq]
      )
    }
  })
  return true
}

async function addStageToProject(projectId, stageId, sequence = 10) {
  await query(
    'INSERT INTO project_stage_rel (project_id, stage_id, sequence) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    [projectId, stageId, sequence]
  )
  return true
}

async function removeStageFromProject(projectId, stageId) {
  await query('DELETE FROM project_stage_rel WHERE project_id = $1 AND stage_id = $2', [projectId, stageId])
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

async function getUserMenuPreferences(userId) {
  const normalizedUserId = Number(userId)
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    throw makeError('Utilisateur invalide', 400)
  }

  const result = await query('SELECT * FROM user_menu_preferences WHERE user_id = $1 LIMIT 1', [normalizedUserId])
  if (!result.rows.length) return null
  return mapUserMenuPreferences(result.rows[0])
}

async function getAllUserMenuPreferences() {
  const result = await query('SELECT * FROM user_menu_preferences ORDER BY user_id ASC')
  return result.rows.map(mapUserMenuPreferences)
}

async function saveUserMenuPreferences(userId, preferences) {
  const normalizedUserId = Number(userId)
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    throw makeError('Utilisateur invalide', 400)
  }

  const normalizedPreferences = normalizeMenuPreferences(preferences)

  const result = await query(
    `INSERT INTO user_menu_preferences (user_id, preferences, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET preferences = EXCLUDED.preferences, updated_at = NOW()
     RETURNING *`,
    [normalizedUserId, JSON.stringify(normalizedPreferences)]
  )

  return mapUserMenuPreferences(result.rows[0])
}

async function clearAllData() {
  await withTransaction(async (client) => {
    await client.query('TRUNCATE TABLE user_menu_preferences, time_entries, tickets, sprints, todos, local_tasks, odoo_tasks, passwords, recettes, projects, users RESTART IDENTITY CASCADE')
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
    recettes: await getAllRecettes(),
    passwords: await getAllPasswords(),
    users: await getAllUsers(),
    menuPreferences: await getAllUserMenuPreferences(),
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
    await client.query('TRUNCATE TABLE user_menu_preferences, time_entries, tickets, sprints, todos, local_tasks, odoo_tasks, passwords, recettes, projects, users RESTART IDENTITY CASCADE')

    if (Array.isArray(data.users)) {
      for (const user of data.users) {
        await insertRow(client, 'users', userFields, user, mapUser)
      }
    }

    if (Array.isArray(data.menuPreferences)) {
      for (const menuPreference of data.menuPreferences) {
        const normalizedUserId = Number(menuPreference.userId)
        if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) continue
        await client.query(
          `INSERT INTO user_menu_preferences (user_id, preferences, updated_at)
           VALUES ($1, $2::jsonb, NOW())
           ON CONFLICT (user_id)
           DO UPDATE SET preferences = EXCLUDED.preferences, updated_at = NOW()`,
          [normalizedUserId, JSON.stringify(normalizeMenuPreferences(menuPreference))]
        )
      }
    }

    if (Array.isArray(data.projects)) {
      for (const project of data.projects) {
        await insertRow(client, 'projects', projectFields, project, mapProject, jsonProjectFields)
      }
    }

    if (Array.isArray(data.recettes)) {
      for (const recette of data.recettes) {
        await insertRow(client, 'recettes', recetteFields, recette, mapRecette, jsonRecetteFields)
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

app.get('/api/public/recette/:token', async (req, res, next) => {
  try {
    const token = String(req.params.token || '').trim()
    if (!token) {
      throw makeError('Token manquant', 400)
    }
    res.json(await getPublicRecetteByToken(token))
  } catch (error) {
    next(error)
  }
})

app.patch('/api/public/recette/:token/tickets/:ticketId/criteria', async (req, res, next) => {
  try {
    const token = String(req.params.token || '').trim()
    if (!token) {
      throw makeError('Token manquant', 400)
    }
    res.json(await updatePublicRecetteCriterion(token, req.params.ticketId, req.body || {}))
  } catch (error) {
    next(error)
  }
})

app.post('/api/public/recette/:token/tickets/:ticketId/criteria', async (req, res, next) => {
  try {
    const token = String(req.params.token || '').trim()
    if (!token) {
      throw makeError('Token manquant', 400)
    }
    res.json(await updatePublicRecetteCriterion(token, req.params.ticketId, req.body || {}))
  } catch (error) {
    next(error)
  }
})

app.post('/api/public/recette/:token/tickets/:ticketId/status', async (req, res, next) => {
  try {
    const token = String(req.params.token || '').trim()
    if (!token) throw makeError('Token manquant', 400)
    res.json(await updatePublicRecetteStatus(token, req.params.ticketId, req.body || {}))
  } catch (error) {
    next(error)
  }
})

app.post('/api/public/recette/:token/tickets/:ticketId/stories', async (req, res, next) => {
  try {
    const token = String(req.params.token || '').trim()
    if (!token) throw makeError('Token manquant', 400)
    res.json(await addPublicRecetteUserStory(token, req.params.ticketId, req.body || {}))
  } catch (error) {
    next(error)
  }
})

app.post('/api/public/recette/:token/tickets/:ticketId/stories/comment', async (req, res, next) => {
  try {
    const token = String(req.params.token || '').trim()
    if (!token) throw makeError('Token manquant', 400)
    res.json(await updatePublicRecetteStoryComment(token, req.params.ticketId, req.body || {}))
  } catch (error) {
    next(error)
  }
})

app.post('/api/email/send', async (req, res, next) => {
  try {
    res.json(await sendClientEmail(req.body || {}))
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/mail/test', async (req, res, next) => {
  try {
    const { to, config } = req.body || {}

    if (!to) {
      return res.status(400).json({ message: 'Adresse destinataire manquante' })
    }

    const provider = String(config?.provider || 'smtp').toLowerCase()

    if (provider === 'mailjet') {
      if (!config?.mailjetApiKey || !config?.mailjetApiSecret || !config?.from) {
        return res.status(400).json({ message: 'Configuration Mailjet incomplète (API Key, API Secret et From requis)' })
      }

      const result = await sendMailViaMailjet(
        {
          mailjetApiKey: String(config.mailjetApiKey || '').trim(),
          mailjetApiSecret: String(config.mailjetApiSecret || '').trim(),
          from: String(config.from || '').trim(),
          fromName: String(config.fromName || 'Gestion Tickets').trim(),
        },
        {
          to,
          subject: '✅ Test de configuration mail — Gestion Tickets (Mailjet)',
          text: `Bonjour,\n\nCe mail confirme que votre configuration Mailjet est opérationnelle dans Gestion Tickets.\n\nProvider : Mailjet API\nExpéditeur : ${config.from}\n\nBonne journée !`,
          html: `<p>Bonjour,</p><p>Ce mail confirme que votre configuration <strong>Mailjet</strong> est opérationnelle dans Gestion Tickets.</p><ul><li>Provider : <code>Mailjet API</code></li><li>Expéditeur : <code>${escapeHtml(config.from)}</code></li></ul><p>Bonne journée !</p>`,
        }
      )

      return res.json({ ok: true, provider: 'mailjet', messageId: result.messageId, accepted: result.accepted })
    }

    if (!config || !config.host || !config.from) {
      return res.status(400).json({ message: 'Configuration SMTP incomplète (host et from requis)' })
    }

    const port = Number(config.port || (config.security === 'ssl' ? 465 : 587))

    if (config.authMode === 'oauth2') {
      if (!config.user || !config.oauth2ClientId || !config.oauth2ClientSecret || !config.oauth2RefreshToken) {
        return res.status(400).json({ message: 'OAuth2 incomplet : user, clientId, clientSecret et refreshToken sont requis' })
      }
    }

    const result = await sendMailViaSmtp(
      {
        host: config.host,
        port,
        security: config.security,
        authMode: config.authMode,
        user: config.user,
        password: config.password,
        oauth2ClientId: config.oauth2ClientId,
        oauth2ClientSecret: config.oauth2ClientSecret,
        oauth2RefreshToken: config.oauth2RefreshToken,
        from: config.from,
        fromName: config.fromName,
        rejectUnauthorized: config.rejectUnauthorized,
        verifyBeforeSend: true,
      },
      {
        to,
        subject: '✅ Test de configuration mail — Gestion Tickets',
        text: `Bonjour,\n\nCe mail confirme que votre serveur SMTP est correctement configuré dans Gestion Tickets.\n\nServeur : ${config.host}:${port}\nSécurité : ${config.security}\nAuthentification : ${config.authMode === 'oauth2' ? 'OAuth2' : 'Mot de passe'}\nExpéditeur : ${config.from}\n\nBonne journée !`,
        html: `<p>Bonjour,</p><p>Ce mail confirme que votre serveur SMTP est correctement configuré dans <strong>Gestion Tickets</strong>.</p><ul><li>Serveur : <code>${escapeHtml(config.host)}:${port}</code></li><li>Sécurité : <code>${escapeHtml(config.security)}</code></li><li>Authentification : <code>${config.authMode === 'oauth2' ? 'OAuth2' : 'Mot de passe'}</code></li><li>Expéditeur : <code>${escapeHtml(config.from)}</code></li></ul><p>Bonne journée !</p>`,
      }
    )

    res.json({ ok: true, provider: 'smtp', messageId: result.messageId, accepted: result.accepted })
  } catch (error) {
    const errorMessage = String(error?.message || '')
    const errorCode = String(error?.code || '')

    if (errorMessage.includes('invalid_client')) {
      return res.status(400).json({
        error: 'OAuth2 invalide: client introuvable',
        message: 'Le Client ID/Client Secret ne correspond pas à un client OAuth Google valide dans le projet sélectionné.',
        hint: 'Vérifiez le projet Google Cloud actif et recopiez exactement Client ID + Client Secret du même client OAuth 2.0.'
      })
    }

    if (errorMessage.includes('unauthorized_client')) {
      return res.status(400).json({
        error: 'OAuth2 refusé: unauthorized_client',
        message: 'Le client OAuth n\'est pas autorisé pour ce flux.',
        hint: 'Dans Google Cloud: OAuth consent screen en mode Testing avec votre compte en Test users, et sur OAuth Playground utilisez vos propres credentials puis regénérez un refresh token.'
      })
    }

    if (errorCode === 'EAUTH') {
      return res.status(400).json({
        error: 'Échec authentification SMTP',
        message: errorMessage || 'Authentification refusée par le serveur SMTP',
      })
    }

    next(error)
  }
})

app.post('/api/admin/imap/test', async (req, res, next) => {
  try {
    res.json(await testImapConnection(req.body?.config || {}))
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/imap/messages', async (req, res, next) => {
  try {
    res.json(await listImapMessages(req.body?.config || {}))
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
      case 'getAllRecettes': res.json(await getAllRecettes()); return
      case 'getRecette': res.json(await getRecette(params[0])); return
      case 'addRecette': res.json(await addRecette(params[0])); return
      case 'updateRecette': res.json(await updateRecette(params[0], params[1])); return
      case 'deleteRecette': res.json(await deleteRecette(params[0])); return
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
      case 'getAllKanbanStages': res.json(await getAllKanbanStages()); return
      case 'getKanbanStage': res.json(await getKanbanStage(params[0])); return
      case 'addKanbanStage': res.json(await addKanbanStage(params[0])); return
      case 'updateKanbanStage': res.json(await updateKanbanStage(params[0], params[1])); return
      case 'deleteKanbanStage': res.json(await deleteKanbanStage(params[0])); return
      case 'getStagesByProject': res.json(await getStagesByProject(params[0])); return
      case 'setProjectStages': res.json(await setProjectStages(params[0], params[1] || [])); return
      case 'addStageToProject': res.json(await addStageToProject(params[0], params[1], params[2])); return
      case 'removeStageFromProject': res.json(await removeStageFromProject(params[0], params[1])); return
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
      case 'getUserMenuPreferences': res.json(await getUserMenuPreferences(params[0])); return
      case 'saveUserMenuPreferences': res.json(await saveUserMenuPreferences(params[0], params[1] || {})); return
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

async function ensureProjectExtraColumns() {
  await query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name TEXT`)
  await query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_email TEXT`)
  await query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS prod_url TEXT`)
  await query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS preprod_url TEXT`)
  await query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS test_accounts JSONB NOT NULL DEFAULT '[]'::jsonb`)
  await query(`
    CREATE TABLE IF NOT EXISTS recettes (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
      sprint_id BIGINT REFERENCES sprints(id) ON DELETE SET NULL,
      preprod_url TEXT,
      prod_url TEXT,
      test_accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
      share_token TEXT NOT NULL UNIQUE,
      created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS recette_id BIGINT REFERENCES recettes(id) ON DELETE SET NULL`)
  await query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS email_history JSONB NOT NULL DEFAULT '[]'::jsonb`)
  await query(`ALTER TABLE local_tasks ADD COLUMN IF NOT EXISTS recette_id BIGINT REFERENCES recettes(id) ON DELETE SET NULL`)
  await query(`CREATE INDEX IF NOT EXISTS idx_recettes_project_id ON recettes(project_id)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_recettes_sprint_id ON recettes(sprint_id)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_recettes_share_token ON recettes(share_token)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_tickets_recette_id ON tickets(recette_id)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_local_tasks_recette_id ON local_tasks(recette_id)`)
  await query(`
    CREATE TABLE IF NOT EXISTS user_menu_preferences (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function startServer() {
  try {
    await ensureProjectExtraColumns()
    app.listen(port, () => {
      console.log(`✅ PostgreSQL API listening on http://localhost:${port}`)
    })
  } catch (error) {
    console.error('❌ Impossible de démarrer l\'API:', error)
    process.exit(1)
  }
}

startServer()
