import { db, User } from './database-new'

export interface AuthSession {
  userId: number
  username: string
  displayName: string
  role: 'admin' | 'user'
}

const SESSION_KEY = 'tickets.auth.session'

class AuthService {
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, Array.from(chunk))
    }
    return btoa(binary)
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  private async hashPassword(password: string, saltBase64?: string): Promise<{ hash: string; salt: string }> {
    const enc = new TextEncoder()
    const salt = saltBase64
      ? new Uint8Array(this.base64ToArrayBuffer(saltBase64))
      : crypto.getRandomValues(new Uint8Array(16))

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    )

    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 200000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    )

    return {
      hash: this.arrayBufferToBase64(bits),
      salt: this.arrayBufferToBase64(salt.buffer)
    }
  }

  private setSession(session: AuthSession): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }

  getSession(): AuthSession | null {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  isLoggedIn(): boolean {
    return !!this.getSession()
  }

  isAdmin(): boolean {
    return this.getSession()?.role === 'admin'
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY)
  }

  async hasUsers(): Promise<boolean> {
    const users = await db.getAllUsers()
    return users.length > 0
  }

  async createFirstAdmin(displayName: string, username: string, password: string): Promise<void> {
    const users = await db.getAllUsers()
    if (users.length > 0) {
      throw new Error('Des utilisateurs existent déjà')
    }

    const usernameLower = username.trim().toLowerCase()
    const { hash, salt } = await this.hashPassword(password)

    const user: User = {
      username: usernameLower,
      displayName: displayName.trim(),
      role: 'admin',
      passwordHash: hash,
      passwordSalt: salt,
      active: true
    }

    const id = await db.addUser(user)
    this.setSession({
      userId: Number(id),
      username: user.username,
      displayName: user.displayName,
      role: user.role
    })
  }

  async createUser(displayName: string, username: string, password: string, role: 'admin' | 'user' = 'user'): Promise<void> {
    const usernameLower = username.trim().toLowerCase()
    const existing = await db.getUserByUsername(usernameLower)
    if (existing) {
      throw new Error('Nom d\'utilisateur déjà utilisé')
    }

    const { hash, salt } = await this.hashPassword(password)

    await db.addUser({
      username: usernameLower,
      displayName: displayName.trim(),
      role,
      passwordHash: hash,
      passwordSalt: salt,
      active: true
    })
  }

  async login(username: string, password: string): Promise<void> {
    const usernameLower = username.trim().toLowerCase()
    const user = await db.getUserByUsername(usernameLower)

    if (!user || user.active === false) {
      throw new Error('Utilisateur introuvable ou inactif')
    }

    const { hash } = await this.hashPassword(password, user.passwordSalt)
    if (hash !== user.passwordHash) {
      throw new Error('Identifiants invalides')
    }

    this.setSession({
      userId: Number(user.id),
      username: user.username,
      displayName: user.displayName,
      role: user.role
    })
  }

  async changeUserPassword(userId: number, newPassword: string): Promise<void> {
    const { hash, salt } = await this.hashPassword(newPassword)
    await db.updateUser(userId, {
      passwordHash: hash,
      passwordSalt: salt
    })
  }
}

export const auth = new AuthService()
