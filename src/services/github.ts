export interface GithubRepoRef {
  owner: string
  repo: string
}

export interface GithubRepoDetails {
  owner: string
  name: string
  fullName: string
  htmlUrl: string
  defaultBranch: string
  private: boolean
  description?: string
  stars: number
  openIssues: number
}

export interface GithubCommitItem {
  sha: string
  message: string
  author: string
  date: string
  htmlUrl: string
}

export interface GithubCommitFileChange {
  filename: string
  status: string
  additions: number
  deletions: number
  changes: number
  patch?: string
}

export interface GithubCommitDetails {
  sha: string
  message: string
  author: string
  date: string
  htmlUrl: string
  files: GithubCommitFileChange[]
}

export interface GithubBranchItem {
  name: string
  protected?: boolean
}

function buildGithubHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json'
  }

  const trimmedToken = String(token || '').trim()
  if (trimmedToken) {
    headers.Authorization = `Bearer ${trimmedToken}`
  }

  return headers
}

async function githubRequest<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      ...buildGithubHeaders(token),
      ...(init?.headers || {})
    }
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Ressource GitHub introuvable ou inaccessible')
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('Token GitHub invalide ou droits insuffisants')
    }

    let details = ''
    try {
      const payload = await response.json()
      details = payload?.message ? ` (${payload.message})` : ''
    } catch {
      // ignore parse errors
    }
    throw new Error(`Erreur GitHub ${response.status}${details}`)
  }

  return response.json()
}

export function parseGithubRepoRef(input: string): GithubRepoRef {
  const raw = String(input || '').trim()
  if (!raw) {
    throw new Error('URL ou dépôt GitHub requis')
  }

  const cleaned = raw.replace(/\.git$/i, '')

  const fullUrlMatch = cleaned.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s?#]+)(?:[/?#].*)?$/i)
  if (fullUrlMatch) {
    return { owner: fullUrlMatch[1], repo: fullUrlMatch[2] }
  }

  const shortMatch = cleaned.match(/^([^/\s]+)\/([^/\s]+)$/)
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] }
  }

  throw new Error('Format invalide. Utilisez https://github.com/owner/repo ou owner/repo')
}

export async function fetchGithubRepository(
  ref: GithubRepoRef,
  token?: string
): Promise<GithubRepoDetails> {
  const repo = await githubRequest<any>(
    `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`,
    token,
    { method: 'GET' }
  )

  return {
    owner: String(repo?.owner?.login || ref.owner),
    name: String(repo?.name || ref.repo),
    fullName: String(repo?.full_name || `${ref.owner}/${ref.repo}`),
    htmlUrl: String(repo?.html_url || `https://github.com/${ref.owner}/${ref.repo}`),
    defaultBranch: String(repo?.default_branch || 'main'),
    private: Boolean(repo?.private),
    description: repo?.description ? String(repo.description) : '',
    stars: Number(repo?.stargazers_count || 0),
    openIssues: Number(repo?.open_issues_count || 0)
  }
}

export async function listGithubCommits(
  ref: GithubRepoRef,
  token?: string,
  limit = 10,
  page = 1,
  branch?: string
): Promise<GithubCommitItem[]> {
  const safeBranch = String(branch || '').trim()
  const branchQuery = safeBranch ? `&sha=${encodeURIComponent(safeBranch)}` : ''
  const commits = await githubRequest<any[]>(
    `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/commits?per_page=${Math.min(Math.max(Number(limit) || 10, 1), 100)}&page=${Math.max(Number(page) || 1, 1)}${branchQuery}`,
    token,
    { method: 'GET' }
  )

  return (commits || []).map(commit => ({
    sha: String(commit?.sha || ''),
    message: String(commit?.commit?.message || '').split('\n')[0],
    author: String(commit?.commit?.author?.name || commit?.author?.login || 'Unknown'),
    date: String(commit?.commit?.author?.date || ''),
    htmlUrl: String(commit?.html_url || '')
  }))
}

export async function listGithubBranches(
  ref: GithubRepoRef,
  token?: string,
  limit = 100,
  page = 1
): Promise<GithubBranchItem[]> {
  const branches = await githubRequest<any[]>(
    `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/branches?per_page=${Math.min(Math.max(Number(limit) || 100, 1), 100)}&page=${Math.max(Number(page) || 1, 1)}`,
    token,
    { method: 'GET' }
  )

  return (branches || []).map(branch => ({
    name: String(branch?.name || ''),
    protected: Boolean(branch?.protected)
  })).filter(branch => branch.name)
}

export async function createGithubBranch(
  ref: GithubRepoRef,
  branchName: string,
  token: string,
  baseSha?: string,
  defaultBranch?: string
): Promise<string> {
  const safeToken = String(token || '').trim()
  if (!safeToken) {
    throw new Error('Token GitHub requis pour créer une branche')
  }

  const safeBranchName = String(branchName || '').trim().replace(/^refs\/heads\//, '')
  if (!safeBranchName) {
    throw new Error('Nom de branche invalide')
  }

  let sha = String(baseSha || '').trim()
  if (!sha) {
    const refName = String(defaultBranch || 'main').trim() || 'main'
    const refData = await githubRequest<any>(
      `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/git/ref/heads/${encodeURIComponent(refName)}`,
      safeToken,
      { method: 'GET' }
    )
    sha = String(refData?.object?.sha || '')
  }

  if (!sha) {
    throw new Error('Impossible de déterminer le commit de base')
  }

  await githubRequest<any>(
    `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/git/refs`,
    safeToken,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: `refs/heads/${safeBranchName}`,
        sha
      })
    }
  )

  return `https://github.com/${ref.owner}/${ref.repo}/tree/${encodeURIComponent(safeBranchName)}`
}

export async function fetchGithubCommitDetails(
  ref: GithubRepoRef,
  sha: string,
  token?: string
): Promise<GithubCommitDetails> {
  const safeSha = String(sha || '').trim()
  if (!safeSha) {
    throw new Error('SHA GitHub invalide')
  }

  const commit = await githubRequest<any>(
    `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/commits/${encodeURIComponent(safeSha)}`,
    token,
    { method: 'GET' }
  )

  return {
    sha: String(commit?.sha || safeSha),
    message: String(commit?.commit?.message || '').trim(),
    author: String(commit?.commit?.author?.name || commit?.author?.login || 'Unknown'),
    date: String(commit?.commit?.author?.date || ''),
    htmlUrl: String(commit?.html_url || `https://github.com/${ref.owner}/${ref.repo}/commit/${safeSha}`),
    files: (commit?.files || []).map((file: any) => ({
      filename: String(file?.filename || ''),
      status: String(file?.status || ''),
      additions: Number(file?.additions || 0),
      deletions: Number(file?.deletions || 0),
      changes: Number(file?.changes || 0),
      patch: file?.patch ? String(file.patch) : ''
    }))
  }
}
