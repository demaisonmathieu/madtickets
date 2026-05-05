export interface GitlabRepoRef {
  host: string
  projectPath: string
  projectId?: number | string
}

export interface GitlabRepoDetails {
  host: string
  projectPath: string
  projectId: number
  htmlUrl: string
  defaultBranch: string
  private: boolean
  description?: string
  stars: number
  openIssues: number
}

export interface GitlabCommitItem {
  sha: string
  message: string
  author: string
  date: string
  htmlUrl: string
}

export interface GitlabCommitFileChange {
  filename: string
  oldPath?: string
  newPath?: string
  status: string
  additions?: number
  deletions?: number
  patch?: string
}

export interface GitlabCommitDetails {
  sha: string
  message: string
  author: string
  date: string
  htmlUrl: string
  files: GitlabCommitFileChange[]
}

export interface GitlabBranchItem {
  name: string
  merged?: boolean
  protected?: boolean
}

function normalizeGitlabHost(host?: string): string {
  const raw = String(host || 'gitlab.com').trim().replace(/^https?:\/\//i, '').replace(/\/$/, '')
  return raw || 'gitlab.com'
}

type GitlabAuthMode = 'private-token' | 'bearer'

function buildGitlabHeaders(token?: string, authMode: GitlabAuthMode = 'private-token'): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json'
  }

  const trimmedToken = String(token || '').trim()
  if (trimmedToken) {
    if (authMode === 'bearer') {
      headers.Authorization = `Bearer ${trimmedToken}`
    } else {
      headers['PRIVATE-TOKEN'] = trimmedToken
    }
  }

  return headers
}

async function performGitlabRequest(host: string, path: string, token?: string, init?: RequestInit, authMode: GitlabAuthMode = 'private-token'): Promise<Response> {
  return fetch(`https://${normalizeGitlabHost(host)}/api/v4${path}`, {
    ...init,
    headers: {
      ...buildGitlabHeaders(token, authMode),
      ...(init?.headers || {})
    }
  })
}

async function gitlabRequest<T>(host: string, path: string, token?: string, init?: RequestInit): Promise<T> {
  let response = await performGitlabRequest(host, path, token, init, 'private-token')

  const hasToken = Boolean(String(token || '').trim())
  if (hasToken && (response.status === 401 || response.status === 403)) {
    response = await performGitlabRequest(host, path, token, init, 'bearer')
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Projet GitLab introuvable ou inaccessible')
    }
    if (response.status === 401 || response.status === 403) {
      let details = ''
      try {
        const payload = await response.json()
        details = payload?.message ? ` (${typeof payload.message === 'string' ? payload.message : JSON.stringify(payload.message)})` : ''
      } catch {
        // ignore parse errors
      }
      throw new Error(`Token GitLab invalide ou droits insuffisants sur ${normalizeGitlabHost(host)}. Vérifiez les scopes \`read_api\` ou \`read_repository\` pour lire les commits, et \`api\` pour créer une branche${details}`)
    }

    let details = ''
    try {
      const payload = await response.json()
      details = payload?.message ? ` (${typeof payload.message === 'string' ? payload.message : JSON.stringify(payload.message)})` : ''
    } catch {
      // ignore parse errors
    }
    throw new Error(`Erreur GitLab ${response.status}${details}`)
  }

  return response.json()
}

function getProjectIdentifier(ref: GitlabRepoRef): string {
  const projectId = String(ref?.projectId ?? '').trim()
  const numericProjectId = Number(projectId)
  if (projectId && Number.isFinite(numericProjectId) && numericProjectId > 0) {
    return encodeURIComponent(projectId)
  }
  return encodeURIComponent(ref.projectPath)
}

export function parseGitlabRepoRef(input: string): GitlabRepoRef {
  const raw = String(input || '').trim()
  if (!raw) {
    throw new Error('URL ou projet GitLab requis')
  }

  const cleaned = raw.replace(/\.git$/i, '')

  const fullUrlMatch = cleaned.match(/^https?:\/\/([^/]+)\/([^?#]+)$/i)
  if (fullUrlMatch) {
    const host = normalizeGitlabHost(fullUrlMatch[1])
    const projectPath = String(fullUrlMatch[2] || '').replace(/^\/+|\/+$/g, '')
    if (!projectPath) {
      throw new Error('Projet GitLab invalide')
    }
    return { host, projectPath }
  }

  const shortMatch = cleaned.match(/^([^/\s]+\/[^\s]+(?:\/[^\s]+)*)$/)
  if (shortMatch) {
    return { host: 'gitlab.com', projectPath: shortMatch[1].replace(/^\/+|\/+$/g, '') }
  }

  throw new Error('Format invalide. Utilisez https://gitlab.com/groupe/projet ou groupe/projet')
}

export async function fetchGitlabRepository(ref: GitlabRepoRef, token?: string): Promise<GitlabRepoDetails> {
  const projectIdentifier = getProjectIdentifier(ref)
  const project = await gitlabRequest<any>(ref.host, `/projects/${projectIdentifier}`, token, { method: 'GET' })

  const visibility = String(project?.visibility || '').toLowerCase()
  return {
    host: normalizeGitlabHost(ref.host),
    projectPath: String(project?.path_with_namespace || ref.projectPath),
    projectId: Number(project?.id || 0),
    htmlUrl: String(project?.web_url || `https://${normalizeGitlabHost(ref.host)}/${ref.projectPath}`),
    defaultBranch: String(project?.default_branch || 'main'),
    private: visibility === 'private',
    description: project?.description ? String(project.description) : '',
    stars: Number(project?.star_count || 0),
    openIssues: Number(project?.open_issues_count || 0)
  }
}

export async function listGitlabCommits(
  ref: GitlabRepoRef,
  token?: string,
  limit = 20,
  page = 1,
  branch?: string
): Promise<GitlabCommitItem[]> {
  const projectIdentifier = getProjectIdentifier(ref)
  const safeBranch = String(branch || '').trim()
  const branchQuery = safeBranch ? `&ref_name=${encodeURIComponent(safeBranch)}` : ''
  const commits = await gitlabRequest<any[]>(
    ref.host,
    `/projects/${projectIdentifier}/repository/commits?per_page=${Math.min(Math.max(Number(limit) || 20, 1), 100)}&page=${Math.max(Number(page) || 1, 1)}${branchQuery}`,
    token,
    { method: 'GET' }
  )

  return (commits || []).map(commit => ({
    sha: String(commit?.id || ''),
    message: String(commit?.title || commit?.message || ''),
    author: String(commit?.author_name || 'Unknown'),
    date: String(commit?.created_at || commit?.committed_date || ''),
    htmlUrl: `https://${normalizeGitlabHost(ref.host)}/${ref.projectPath}/-/commit/${String(commit?.id || '')}`
  }))
}

export async function listGitlabBranches(
  ref: GitlabRepoRef,
  token?: string,
  limit = 100,
  page = 1
): Promise<GitlabBranchItem[]> {
  const projectIdentifier = getProjectIdentifier(ref)
  const branches = await gitlabRequest<any[]>(
    ref.host,
    `/projects/${projectIdentifier}/repository/branches?per_page=${Math.min(Math.max(Number(limit) || 100, 1), 100)}&page=${Math.max(Number(page) || 1, 1)}`,
    token,
    { method: 'GET' }
  )

  return (branches || []).map(branch => ({
    name: String(branch?.name || ''),
    merged: Boolean(branch?.merged),
    protected: Boolean(branch?.protected)
  })).filter(branch => branch.name)
}

export async function createGitlabBranch(
  ref: GitlabRepoRef,
  branchName: string,
  token: string,
  baseShaOrBranch?: string,
  defaultBranch?: string
): Promise<string> {
  const safeToken = String(token || '').trim()
  if (!safeToken) {
    throw new Error('Token GitLab requis pour créer une branche')
  }

  const safeBranchName = String(branchName || '').trim().replace(/^refs\/heads\//, '')
  if (!safeBranchName) {
    throw new Error('Nom de branche invalide')
  }

  const refName = String(baseShaOrBranch || defaultBranch || 'main').trim() || 'main'
  const projectIdentifier = getProjectIdentifier(ref)

  await gitlabRequest<any>(
    ref.host,
    `/projects/${projectIdentifier}/repository/branches`,
    safeToken,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        branch: safeBranchName,
        ref: refName
      })
    }
  )

  return `https://${normalizeGitlabHost(ref.host)}/${ref.projectPath}/-/tree/${encodeURIComponent(safeBranchName)}`
}

export async function fetchGitlabCommitDetails(
  ref: GitlabRepoRef,
  sha: string,
  token?: string
): Promise<GitlabCommitDetails> {
  const safeSha = String(sha || '').trim()
  if (!safeSha) {
    throw new Error('SHA GitLab invalide')
  }

  const projectIdentifier = getProjectIdentifier(ref)
  const [commit, diff] = await Promise.all([
    gitlabRequest<any>(ref.host, `/projects/${projectIdentifier}/repository/commits/${encodeURIComponent(safeSha)}`, token, { method: 'GET' }),
    gitlabRequest<any[]>(ref.host, `/projects/${projectIdentifier}/repository/commits/${encodeURIComponent(safeSha)}/diff`, token, { method: 'GET' })
  ])

  return {
    sha: String(commit?.id || safeSha),
    message: String(commit?.message || commit?.title || '').trim(),
    author: String(commit?.author_name || 'Unknown'),
    date: String(commit?.created_at || commit?.committed_date || ''),
    htmlUrl: `https://${normalizeGitlabHost(ref.host)}/${ref.projectPath}/-/commit/${safeSha}`,
    files: (diff || []).map((file: any) => ({
      filename: String(file?.new_path || file?.old_path || ''),
      oldPath: file?.old_path ? String(file.old_path) : '',
      newPath: file?.new_path ? String(file.new_path) : '',
      status: file?.new_file ? 'added' : file?.deleted_file ? 'removed' : file?.renamed_file ? 'renamed' : 'modified',
      patch: file?.diff ? String(file.diff) : ''
    }))
  }
}
