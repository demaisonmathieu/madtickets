// Types et interfaces
export interface OdooConfig {
  url: string;
  db: string;
  apiKey?: string | null;
  username?: string | null;
  password?: string | null;
  version?: number | null;
}

export interface OdooProject {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  stage_id?: [number, string] | false;
  user_id?: [number, string] | false;
  date_start?: string;
  date?: string;
}

export interface OdooTicket {
  id: number;
  name: string;
  description?: string;
  project_id?: number | [number, string] | false;
  team_id?: [number, string] | false;
  stage_id?: [number, string] | false;
  active?: boolean;
  state?: string;
  close_date?: string | false;
  kanban_state?: string;
  priority?: string | number;
  partner_id?: [number, string] | false;
  create_date?: string;
  write_date?: string;
}

export interface OdooMessage {
  id: number;
  body?: string;
  date?: string;
  author_id?: [number, string] | false;
  message_type?: string;
  subtype_id?: [number, string] | false;
}

export interface OdooPartner {
  id: number;
  name?: string;
  email?: string;
}

export interface MessageData {
  subject?: string;
  body: string;
  partnerIds?: number[];
  attachmentIds?: number[];
}

export interface MappedProject {
  odooId: number;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on-hold';
  createdAt: string;
  updatedAt: string;
}

export interface MappedTicket {
  odooId: number;
  sourceModel?: 'helpdesk.ticket' | 'project.task';
  title: string;
  description: string;
  projectOdooId: number | null;
  projectName: string | null;
  stageOdooId?: number | null;
  stageName?: string | null;
  stageIsClosed?: boolean;
  active?: boolean;
  rawKanbanState?: string | null;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

export interface OdooProjectStage {
  id: number;
  name: string;
  sequence?: number;
  is_close?: boolean;
  is_closed?: boolean;
  fold?: boolean;
}

export interface MappedKanbanColumn {
  id: string;
  label: string;
  color: string;
  odooStageId?: number;
}

export interface OdooProjectTask {
  id: number;
  name: string;
  description?: string;
  project_id?: number | [number, string] | false;
  stage_id?: [number, string] | false;
  state?: string;
  active?: boolean;
  kanban_state?: string;
  priority?: string | number;
  create_date?: string;
  write_date?: string;
}

export interface MappedProjectTask {
  odooId: number;
  title: string;
  description: string;
  projectOdooId: number | null;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

export interface MappedMessage {
  id: number;
  body: string;
  bodyHtml: string;
  date: string;
  author: string;
  messageType: string;
  subtype: string | null;
}

export interface MappedPartner {
  id: number;
  name: string;
  email: string;
}

export interface AuthResult {
  uid: number;
}

export interface CallMethodParams {
  ids?: number[];
  domain?: any[];
  fields?: string[];
  limit?: number;
  context?: Record<string, any>;
  [key: string]: any;
}

class OdooService {
  private url: string | null = null;
  private db: string | null = null;
  private apiKey: string | null = null;
  private username: string | null = null;
  private password: string | null = null;
  private uid: number | null = null;
  private version: number | null = null;

  constructor() {
    this.loadConfig();
  }

  private getStorageKey(): string {
    try {
      const raw = localStorage.getItem('tickets.auth.session');
      if (raw) {
        const session = JSON.parse(raw);
        if (session?.userId) {
          return `odoo-config-${session.userId}`;
        }
      }
    } catch {}
    return 'odoo-config';
  }

  loadConfig(): void {
    const config = localStorage.getItem(this.getStorageKey());
    if (config) {
      const parsed: OdooConfig = JSON.parse(config);
      this.url = parsed.url;
      this.db = parsed.db;
      this.apiKey = parsed.apiKey ?? null;
      this.username = parsed.username ?? null;
      this.password = parsed.password ?? null;
      this.version = parsed.version ?? null;
    } else {
      // Réinitialiser si aucune config pour cet utilisateur
      this.url = null;
      this.db = null;
      this.apiKey = null;
      this.username = null;
      this.password = null;
      this.version = null;
    }
  }

  saveConfig(
    url: string,
    db: string,
    apiKey: string | null = null,
    username: string | null = null,
    password: string | null = null
  ): void {
    this.url = url;
    this.db = db;
    this.apiKey = apiKey;
    this.username = username;
    this.password = password;

    localStorage.setItem(
      this.getStorageKey(),
      JSON.stringify({
        url,
        db,
        apiKey,
        username,
        password,
        version: this.version,
      })
    );
  }

  clearConfig(): void {
    this.url = null;
    this.db = null;
    this.apiKey = null;
    this.username = null;
    this.password = null;
    this.uid = null;
    this.version = null;
    localStorage.removeItem(this.getStorageKey());
  }

  stripHtml(html: string | null | undefined): string {
    if (!html) return '';
    // Créer un élément temporaire pour parser le HTML
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    // Récupérer le texte sans balises
    return tmp.textContent || tmp.innerText || '';
  }

  async detectVersion(): Promise<number> {
    // Ne plus faire de détection automatique à cause du CORS
    // La version doit être configurée manuellement dans l'interface
    return this.version || 18;
  }

  setVersion(version: number): void {
    this.version = parseInt(String(version));
  }

  async testConnection(): Promise<AuthResult | any> {
    if (!this.url) {
      throw new Error('URL Odoo manquante');
    }

    // Détecter la version
    await this.detectVersion();

    if (this.version && this.version >= 19) {
      // Odoo 19+ avec API Key
      if (!this.apiKey) {
        throw new Error('API Key requise pour Odoo 19+');
      }

      const response = await fetch(`${this.url}/json/2/res.users/context_get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `bearer ${this.apiKey}`,
          'X-Odoo-Database': this.db!,
          'User-Agent': 'Tickets PWA',
        },
        body: JSON.stringify({ context: {} }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('API Key invalide');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } else {
      // Odoo 18 et antérieurs avec login/password
      if (!this.username || !this.password) {
        throw new Error('Login et mot de passe requis pour Odoo 18 et antérieurs');
      }

      return await this.authenticateXmlRpc();
    }
  }

  async authenticateXmlRpc(): Promise<AuthResult> {
    const body = this.buildXmlRpcCall('authenticate', [
      this.db,
      this.username,
      this.password || this.apiKey,
      {},
    ]);

    console.log('[XML-RPC Auth] Tentative d\'authentification:', {
      url: this.url,
      db: this.db,
      username: this.username,
    });

    try {
      const response = await fetch(`${this.url}/xmlrpc/2/common`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Content-Length': body.length.toString(),
        },
        body: body,
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[XML-RPC Auth] Erreur HTTP:', response.status, errorText);
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      console.log('[XML-RPC Auth] Réponse reçue, longueur:', text.length);

      if (!text || text.trim().length === 0) {
        throw new Error('Réponse vide du serveur Odoo lors de l\'authentification');
      }

      const uid = this.parseXmlRpcResponse(text);

      if (!uid) {
        throw new Error('Authentification échouée - Vérifiez vos identifiants');
      }

      this.uid = uid;
      console.log('[XML-RPC Auth] Authentification réussie, UID:', uid);
      return { uid };
    } catch (error: any) {
      console.error('[XML-RPC Auth] Erreur:', error);
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error(
          'Impossible de contacter le serveur Odoo. Vérifiez l\'URL ou utilisez un proxy CORS.'
        );
      }
      throw error;
    }
  }

  escapeXml(str: string | number | boolean): string | number | boolean {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  buildXmlRpcCall(method: string, params: any[]): string {
    const validParams = params.filter((p) => p !== undefined);
    return `<?xml version="1.0" encoding="UTF-8"?>
<methodCall>
  <methodName>${this.escapeXml(method)}</methodName>
  <params>
    ${validParams.map((p) => this.xmlRpcValue(p)).join('\n    ')}
  </params>
</methodCall>`;
  }

  xmlRpcValue(value: any): string {
    if (value === null || value === undefined) {
      return `<param><value><boolean>0</boolean></value></param>`;
    }
    if (typeof value === 'string') {
      return `<param><value><string>${this.escapeXml(value)}</string></value></param>`;
    } else if (typeof value === 'number') {
      // Utiliser <double> pour les nombres décimaux, <int> pour les entiers
      if (Number.isInteger(value)) {
        return `<param><value><int>${value}</int></value></param>`;
      } else {
        return `<param><value><double>${value}</double></value></param>`;
      }
    } else if (typeof value === 'boolean') {
      return `<param><value><boolean>${value ? 1 : 0}</boolean></value></param>`;
    } else if (Array.isArray(value)) {
      return `<param><value><array><data>${value
        .map((v) => this.xmlRpcValue(v).replace(/<\/?param>/g, ''))
        .join('')}</data></array></value></param>`;
    } else if (typeof value === 'object') {
      const members = Object.entries(value)
        .filter(([_, v]) => v !== undefined)
        .map(
          ([k, v]) =>
            `<member><name>${this.escapeXml(k)}</name>${this.xmlRpcValue(v).replace(
              /<\/?param>/g,
              ''
            )}</member>`
        )
        .join('');
      return `<param><value><struct>${members}</struct></value></param>`;
    }
    return `<param><value><string>${this.escapeXml(String(value))}</string></value></param>`;
  }

  parseXmlRpcValueFromElement(valueEl: Element): any {
    const firstChild = valueEl.firstElementChild;

    // Certains serveurs XML-RPC renvoient directement du texte dans <value>
    if (!firstChild) {
      const raw = (valueEl.textContent || '').trim();
      return raw.length > 0 ? raw : null;
    }

    const tag = firstChild.tagName.toLowerCase();

    if (tag === 'int' || tag === 'i4') {
      return parseInt(firstChild.textContent || '0');
    }

    if (tag === 'boolean') {
      return (firstChild.textContent || '').trim() === '1';
    }

    if (tag === 'string') {
      return firstChild.textContent || '';
    }

    if (tag === 'double') {
      return parseFloat(firstChild.textContent || '0');
    }

    if (tag === 'datetime.iso8601') {
      return firstChild.textContent || '';
    }

    if (tag === 'nil') {
      return null;
    }

    if (tag === 'array') {
      const values: any[] = [];
      const dataEl = firstChild.querySelector('data');
      if (!dataEl) return values;

      const directValues = Array.from(dataEl.children).filter(
        (child) => child.tagName.toLowerCase() === 'value'
      ) as Element[];

      for (const ve of directValues) {
        values.push(this.parseXmlRpcValueFromElement(ve));
      }
      return values;
    }

    if (tag === 'struct') {
      const obj: Record<string, any> = {};
      const members = Array.from(firstChild.children).filter(
        (child) => child.tagName.toLowerCase() === 'member'
      ) as Element[];

      for (const member of members) {
        const nameEl = Array.from(member.children).find(
          (child) => child.tagName.toLowerCase() === 'name'
        );
        const memberValueEl = Array.from(member.children).find(
          (child) => child.tagName.toLowerCase() === 'value'
        ) as Element | undefined;

        const key = (nameEl?.textContent || '').trim();
        if (!key || !memberValueEl) continue;
        obj[key] = this.parseXmlRpcValueFromElement(memberValueEl);
      }

      return obj;
    }

    // Fallback robuste
    const raw = (firstChild.textContent || '').trim();
    return raw.length > 0 ? raw : null;
  }

  parseXmlRpcValue(valueContent: string): any {
    // Nettoyer le contenu
    const content = valueContent.trim();

    // Integer
    const intMatch = content.match(/<int>(.*?)<\/int>/s);
    if (intMatch) return parseInt(intMatch[1]);

    // Boolean
    const boolMatch = content.match(/<boolean>(.*?)<\/boolean>/s);
    if (boolMatch) return boolMatch[1].trim() === '1';

    // String
    const stringMatch = content.match(/<string>(.*?)<\/string>/s);
    if (stringMatch) return stringMatch[1];

    // Array (pour les relations many2one: [id, name])
    const arrayMatch = content.match(/<array><data>(.*?)<\/data><\/array>/s);
    if (arrayMatch) {
      const values: any[] = [];
      const valueMatches = arrayMatch[1].matchAll(/<value>(.*?)<\/value>/gs);
      for (const vm of valueMatches) {
        values.push(this.parseXmlRpcValue(vm[1]));
      }
      return values;
    }

    // Valeur vide ou null
    return null;
  }

  parseXmlRpcResponse(xml: string): any {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, 'text/xml');

      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        console.error('[XML-RPC] Erreur de parsing XML:', parserError.textContent);
        return null;
      }

      const faultValueEl = xmlDoc.querySelector('methodResponse > fault > value');
      if (faultValueEl) {
        const faultData = this.parseXmlRpcValueFromElement(faultValueEl) || {};
        const faultMessage =
          faultData?.faultString ||
          faultData?.message ||
          'Erreur XML-RPC Odoo';
        throw new Error(String(faultMessage));
      }

      const valueEl = xmlDoc.querySelector('methodResponse > params > param > value');
      if (!valueEl) return null;

      return this.parseXmlRpcValueFromElement(valueEl);
    } catch (error) {
      console.error('[XML-RPC] parseXmlRpcResponse échoué:', error);
      throw error;
    }
  }

  async callMethod(model: string, method: string, params: CallMethodParams = {}): Promise<any> {
    if (!this.version) {
      await this.detectVersion();
    }

    if (this.version && this.version >= 19) {
      // API JSON-2
      return await this.callMethodJson2(model, method, params);
    } else {
      // API XML-RPC
      return await this.callMethodXmlRpc(model, method, params);
    }
  }

  async callMethodJson2(model: string, method: string, params: CallMethodParams = {}): Promise<any> {
    if (!this.url || !this.apiKey) {
      throw new Error('Configuration Odoo manquante');
    }

    const response = await fetch(`${this.url}/json/2/${model}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `bearer ${this.apiKey}`,
        'X-Odoo-Database': this.db!,
        'User-Agent': 'Tickets PWA',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('API Key invalide');
      }
      const errorData = await response.json().catch(() => null);
      if (errorData && errorData.message) {
        throw new Error(errorData.message);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  async callMethodXmlRpc(model: string, method: string, params: CallMethodParams = {}): Promise<any> {
    if (!this.uid) {
      await this.authenticateXmlRpc();
    }

    // Construction des arguments XML-RPC selon la méthode Odoo
    let args: any[] = [];
    let kwargs: CallMethodParams = {};

    if (method === 'create' && params.vals) {
      // create : args = [vals] (vals peut être dict ou liste de dict)
      args = Array.isArray(params.vals) ? params.vals : [params.vals];
    } else if (method === 'write') {
      // write : args = [ids, vals] (PAS vals dans kwargs)
      if (!params.ids || !params.vals) {
        throw new Error('Paramètres manquants pour write: ids et vals sont requis');
      }
      args = [params.ids, params.vals];
      kwargs = { ...params };
      delete kwargs.ids;
      delete kwargs.vals;
    } else if (method === 'unlink') {
      // unlink : args = [ids]
      if (!params.ids) {
        throw new Error('Paramètres manquants pour unlink: ids est requis');
      }
      args = [params.ids];
      kwargs = { ...params };
      delete kwargs.ids;
    } else if (params.ids) {
      // read et autres méthodes basées sur ids
      args = [params.ids];
      kwargs = { ...params };
      delete kwargs.ids;
    } else {
      // Autres méthodes : tout dans kwargs
      kwargs = { ...params };
    }

    const body = this.buildXmlRpcCall('execute_kw', [
      this.db,
      this.uid,
      this.password || this.apiKey,
      model,
      method,
      args,
      kwargs,
    ]);

    console.log('[XML-RPC] Requête:', { model, method, bodyLength: body.length });

    if (!body || body.trim().length === 0) {
      throw new Error('Corps de la requête XML-RPC vide');
    }

    try {
      const response = await fetch(`${this.url}/xmlrpc/2/object`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Content-Length': body.length.toString(),
        },
        body: body,
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[XML-RPC] Erreur HTTP:', response.status, errorText);
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      console.log('[XML-RPC] Réponse reçue, longueur:', text.length);
      console.log('[XML-RPC] Réponse brute:', text.substring(0, 500)); // Premiers 500 caractères

      if (!text || text.trim().length === 0) {
        throw new Error('Réponse vide du serveur Odoo');
      }

      // Gestion explicite des fautes XML-RPC (permissions, modèle absent, etc.)
      if (text.includes('<fault>')) {
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, 'text/xml');
          const faultValueEl = xmlDoc.querySelector('methodResponse > fault > value');
          const parsedFault = faultValueEl
            ? this.parseXmlRpcValueFromElement(faultValueEl)
            : null;
          const faultString =
            parsedFault?.faultString ||
            parsedFault?.message ||
            'Erreur XML-RPC Odoo (fault sans détail)';
          throw new Error(String(faultString));
        } catch (faultError: any) {
          throw new Error(faultError?.message || 'Erreur XML-RPC Odoo');
        }
      }

      // Parser la réponse XML-RPC avec DOMParser
      const arrayMatch = text.match(/<array><data>(.*?)<\/data><\/array>/s);
      if (arrayMatch) {
        console.log('[XML-RPC] Array match trouvé, parsing avec DOMParser');

        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, 'text/xml');

          // Vérifier les erreurs de parsing
          const parserError = xmlDoc.querySelector('parsererror');
          if (parserError) {
            console.error('[XML-RPC] Erreur de parsing XML:', parserError.textContent);
            return [];
          }

          const items: any[] = [];
          const structs = xmlDoc.querySelectorAll('array > data > value > struct');

          console.log('[XML-RPC] Nombre de structs trouvés:', structs.length);

          for (const struct of structs) {
            const item: Record<string, any> = {};
            const members = struct.querySelectorAll(':scope > member');

            for (const member of members) {
              const nameEl = member.querySelector('name');
              const valueEl = member.querySelector('value');

              if (nameEl && valueEl) {
                const name = nameEl.textContent?.trim() || '';
                const value = this.parseXmlRpcValueFromElement(valueEl);
                item[name] = value;
              }
            }
            items.push(item);
          }

          console.log('[XML-RPC] Items parsés:', items.length, items);
          return items;
        } catch (error) {
          console.error('[XML-RPC] Erreur lors du parsing DOM:', error);
          return [];
        }
      }

      console.log('[XML-RPC] Pas de array match, tentative de parse simple');
      return this.parseXmlRpcResponse(text);
    } catch (error: any) {
      console.error('[XML-RPC] Erreur lors de l\'appel:', error);
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error(
          'Impossible de contacter le serveur Odoo. Problème CORS détecté - utilisez un proxy (voir ODOO_PROXY.md)'
        );
      }
      throw error;
    }
  }

  async searchRead(
    model: string,
    domain: any[] = [],
    fields: string[] = [],
    limit: number = 0
  ): Promise<any[]> {
    const result = await this.callMethod(model, 'search_read', {
      domain: domain,
      fields: fields,
      limit: limit > 0 ? limit : undefined,
      context: {},
    });

    // S'assurer de toujours retourner un tableau
    return Array.isArray(result) ? result : [];
  }

  async getProjects(): Promise<MappedProject[]> {
    try {
      // Filtrer uniquement les projets où l'utilisateur est follower
      const domain = [['message_is_follower', '=', true]];

      const projects = await this.searchRead(
        'project.project',
        domain,
        ['id', 'name', 'description', 'active', 'stage_id', 'user_id', 'date_start', 'date']
      );

      console.log('[Odoo] Projects received:', projects);

      if (!Array.isArray(projects)) {
        console.error('[Odoo] projects is not an array:', typeof projects, projects);
        return [];
      }

      return projects.map((p: OdooProject) => ({
        odooId: p.id,
        name: p.name,
        description: this.stripHtml(p.description) || '',
        status: this.mapProjectStatus(p),
        createdAt: p.date_start || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des projets:', error);
      return [];
    }
  }

  mapProjectStatus(project: OdooProject): 'active' | 'completed' | 'on-hold' {
    // Mapper le statut Odoo vers notre app
    if (!project.active) return 'completed';
    if (project.stage_id && Array.isArray(project.stage_id) && project.stage_id[1]) {
      const stage = project.stage_id[1].toLowerCase();
      if (stage.includes('done') || stage.includes('terminé')) return 'completed';
      if (stage.includes('hold') || stage.includes('pause')) return 'on-hold';
    }
    return 'active';
  }

  async getTasks(projectIds: number[] | null = null): Promise<MappedTicket[]> {
    try {
      let domain: any[];

      if (projectIds && Array.isArray(projectIds) && projectIds.length > 0) {
        // Filtrer par les IDs de projets fournis
        domain = [['project_id', 'in', projectIds]];
      } else if (projectIds === null) {
        // Aucun filtre - récupérer tous les tickets (avec project_id)
        console.warn('[Odoo] Récupération de tous les tickets helpdesk avec project_id');
        domain = [['project_id', '!=', false]];
      } else {
        // projectIds est vide, ne rien récupérer
        console.log('[Odoo] Aucun projet spécifié, aucun ticket récupéré');
        return [];
      }

      const helpdeskFields = [
        'id',
        'name',
        'description',
        'project_id',
        'team_id',
        'stage_id',
        'active',
        'state',
        'close_date',
        'kanban_state',
        'priority',
        'partner_id',
        'create_date',
        'write_date',
      ];

      const tickets = await this.searchReadWithFieldFallback(
        'helpdesk.ticket',
        domain,
        helpdeskFields
      );

      console.log('[Odoo] Helpdesk tickets received:', tickets);

      if (tickets.length > 0) {
        console.log('[Odoo] Premier ticket structure:', tickets[0]);
      }

      if (!Array.isArray(tickets)) {
        console.error('[Odoo] tickets is not an array:', typeof tickets, tickets);
        return [];
      }

      const stageIds = this.uniquePositiveNumbers(
        tickets.map((t: OdooTicket) => this.extractMany2OneId(t.stage_id))
      );

      const stageMap = new Map<number, OdooProjectStage>();
      if (stageIds.length > 0) {
        try {
          const stages = await this.callMethod('helpdesk.stage', 'read', {
            ids: stageIds,
            fields: ['id', 'name', 'is_close', 'is_closed', 'fold'],
          });

          if (Array.isArray(stages)) {
            for (const stage of stages) {
              const stageId = Number((stage as any).id);
              if (Number.isFinite(stageId) && stageId > 0) {
                stageMap.set(stageId, stage as OdooProjectStage);
              }
            }
          }
        } catch (error) {
          console.warn('[Odoo] Impossible de lire les étapes helpdesk:', error);
        }
      }

      return tickets.map((t: OdooTicket) => {
        // project_id peut être un nombre ou un tableau [id, name]
        let projectId: number | null = null;
        let projectName: string | null = null;
        let stageOdooId: number | null = null;
        let stageName: string | null = null;

        projectId = this.extractMany2OneId(t.project_id);
        projectName = this.extractMany2OneName(t.project_id);
        stageOdooId = this.extractMany2OneId(t.stage_id);
        stageName = this.extractMany2OneName(t.stage_id) || null;

        if (!stageName && stageOdooId && stageMap.get(stageOdooId)?.name) {
          stageName = String(stageMap.get(stageOdooId)?.name || '');
        }

        const mapped: MappedTicket = {
          odooId: t.id,
          sourceModel: 'helpdesk.ticket',
          title: t.name,
          description: t.description || '',
          projectOdooId: projectId,
          projectName: projectName,
          stageOdooId,
          stageName,
          stageIsClosed: !!(stageOdooId && stageMap.get(stageOdooId) && (
            stageMap.get(stageOdooId)!.is_close === true ||
            stageMap.get(stageOdooId)!.is_closed === true ||
            stageMap.get(stageOdooId)!.fold === true
          )),
          active: t.active,
          rawKanbanState: t.kanban_state || null,
          status: this.mapTicketStatus(t, stageOdooId ? stageMap.get(stageOdooId) : undefined, stageName),
          priority: this.mapTicketPriority(t.priority),
          createdAt: t.create_date || new Date().toISOString(),
          updatedAt: t.write_date || new Date().toISOString(),
        };

        if (!mapped.projectOdooId) {
          console.warn('[Odoo] Ticket sans project_id:', t.name, 'project_id:', t.project_id);
        }

        return mapped;
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des tickets helpdesk:', error);
      return [];
    }
  }

  async getTicketsByIds(ticketIds: number[]): Promise<MappedTicket[]> {
    try {
      const ids = this.uniquePositiveNumbers(ticketIds || []);
      if (ids.length === 0) return [];

      const helpdeskFields = [
        'id',
        'name',
        'description',
        'project_id',
        'team_id',
        'stage_id',
        'active',
        'state',
        'close_date',
        'kanban_state',
        'priority',
        'partner_id',
        'create_date',
        'write_date',
      ];

      const tickets = await this.readWithFieldFallback('helpdesk.ticket', ids, helpdeskFields);

      if (!Array.isArray(tickets)) return [];

      const stageIds = this.uniquePositiveNumbers(
        tickets.map((t: OdooTicket) => this.extractMany2OneId(t.stage_id))
      );

      const stageMap = new Map<number, OdooProjectStage>();
      if (stageIds.length > 0) {
        try {
          const stages = await this.callMethod('helpdesk.stage', 'read', {
            ids: stageIds,
            fields: ['id', 'name', 'is_close', 'is_closed', 'fold'],
          });

          if (Array.isArray(stages)) {
            for (const stage of stages) {
              const stageId = Number((stage as any).id);
              if (Number.isFinite(stageId) && stageId > 0) {
                stageMap.set(stageId, stage as OdooProjectStage);
              }
            }
          }
        } catch (error) {
          console.warn('[Odoo] Impossible de lire les étapes helpdesk (by ids):', error);
        }
      }

      return tickets.map((t: OdooTicket) => {
        let projectId: number | null = null;
        let projectName: string | null = null;
        let stageOdooId: number | null = null;
        let stageName: string | null = null;

        projectId = this.extractMany2OneId(t.project_id);
        projectName = this.extractMany2OneName(t.project_id);
        stageOdooId = this.extractMany2OneId(t.stage_id);
        stageName = this.extractMany2OneName(t.stage_id) || null;

        if (!stageName && stageOdooId && stageMap.get(stageOdooId)?.name) {
          stageName = String(stageMap.get(stageOdooId)?.name || '');
        }

        return {
          odooId: t.id,
          sourceModel: 'helpdesk.ticket',
          title: t.name,
          description: t.description || '',
          projectOdooId: projectId,
          projectName,
          stageOdooId,
          stageName,
          stageIsClosed: !!(stageOdooId && stageMap.get(stageOdooId) && (
            stageMap.get(stageOdooId)!.is_close === true ||
            stageMap.get(stageOdooId)!.is_closed === true ||
            stageMap.get(stageOdooId)!.fold === true
          )),
          active: t.active,
          rawKanbanState: t.kanban_state || null,
          status: this.mapTicketStatus(t, stageOdooId ? stageMap.get(stageOdooId) : undefined, stageName),
          priority: this.mapTicketPriority(t.priority),
          createdAt: t.create_date || new Date().toISOString(),
          updatedAt: t.write_date || new Date().toISOString(),
        } as MappedTicket;
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des tickets helpdesk par IDs:', error);
      return [];
    }
  }

  async getProjectTasksByIds(taskIds: number[]): Promise<MappedTicket[]> {
    try {
      const ids = this.uniquePositiveNumbers(taskIds || []);
      if (ids.length === 0) return [];

      const tasks = await this.callMethod('project.task', 'read', {
        ids,
        fields: [
          'id',
          'name',
          'description',
          'project_id',
          'stage_id',
          'state',
          'active',
          'kanban_state',
          'priority',
          'create_date',
          'write_date',
        ],
      });

      if (!Array.isArray(tasks)) return [];

      const stageIds = this.uniquePositiveNumbers(
        tasks.map((t: OdooProjectTask) => this.extractMany2OneId(t.stage_id))
      );

      const stageMap = new Map<number, { id: number; name?: string; fold?: boolean }>();
      if (stageIds.length > 0) {
        try {
          const stages = await this.callMethod('project.task.type', 'read', {
            ids: stageIds,
            fields: ['id', 'name', 'fold'],
          });

          if (Array.isArray(stages)) {
            for (const stage of stages) {
              const stageId = Number((stage as any).id);
              if (Number.isFinite(stageId) && stageId > 0) {
                stageMap.set(stageId, stage as any);
              }
            }
          }
        } catch (error) {
          console.warn('[Odoo] Impossible de lire les étapes project.task.type:', error);
        }
      }

      return tasks.map((t: OdooProjectTask) => {
        const projectId = this.extractMany2OneId(t.project_id);
        const projectName = this.extractMany2OneName(t.project_id);
        const stageOdooId = this.extractMany2OneId(t.stage_id);
        let stageName = this.extractMany2OneName(t.stage_id) || null;

        if (!stageName && stageOdooId && stageMap.get(stageOdooId)?.name) {
          stageName = String(stageMap.get(stageOdooId)?.name || '');
        }

        const stageFold = !!(stageOdooId && stageMap.get(stageOdooId)?.fold);
        const rawState = String(t.state || t.kanban_state || '').toLowerCase();
        const stageLower = String(stageName || '').toLowerCase();

        let status: 'todo' | 'in-progress' | 'done' = 'todo';
        if (
          t.active === false ||
          stageFold ||
          rawState.includes('done') ||
          rawState.includes('close') ||
          rawState.includes('closed') ||
          rawState.includes('solved') ||
          rawState.includes('resolved') ||
          rawState.includes('cancel') ||
          rawState.includes('finish') ||
          rawState.includes('complete') ||
          stageLower.includes('done') ||
          stageLower.includes('ferm') ||
          stageLower.includes('clos') ||
          stageLower.includes('termin')
        ) {
          status = 'done';
        } else if (
          rawState.includes('progress') ||
          rawState.includes('open') ||
          rawState.includes('wip') ||
          stageLower.includes('progress') ||
          stageLower.includes('cours') ||
          stageLower.includes('doing')
        ) {
          status = 'in-progress';
        }

        return {
          odooId: Number(t.id),
          sourceModel: 'project.task',
          title: t.name || `Tâche ${t.id}`,
          description: t.description || '',
          projectOdooId: projectId,
          projectName,
          stageOdooId,
          stageName,
          stageIsClosed: stageFold,
          active: t.active,
          rawKanbanState: (t.kanban_state || t.state || null) as string | null,
          status,
          priority: this.mapTaskPriority(t.priority),
          createdAt: t.create_date || new Date().toISOString(),
          updatedAt: t.write_date || new Date().toISOString(),
        } as MappedTicket;
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des project.task par IDs:', error);
      return [];
    }
  }

  async getProjectTasks(projectId: number): Promise<MappedProjectTask[]> {
    try {
      const tasks = await this.searchRead(
        'project.task',
        [['project_id', '=', projectId]],
        ['id', 'name', 'description', 'project_id', 'stage_id', 'state', 'active', 'kanban_state', 'priority', 'create_date', 'write_date'],
        200
      );

      if (!Array.isArray(tasks)) {
        return [];
      }

      return tasks.map((t: OdooProjectTask) => {
        let mappedProjectId: number | null = null;
        if (t.project_id) {
          mappedProjectId = Array.isArray(t.project_id) ? t.project_id[0] : t.project_id;
        }

        return {
          odooId: t.id,
          title: t.name,
          description: t.description || '',
          projectOdooId: mappedProjectId,
          status: this.mapTaskStatus(t as unknown as OdooTicket),
          priority: this.mapTaskPriority(t.priority),
          createdAt: t.create_date || new Date().toISOString(),
          updatedAt: t.write_date || new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des tâches projet Odoo:', error);
      return [];
    }
  }

  mapTicketStatus(
    ticket: OdooTicket,
    stageInfo?: OdooProjectStage,
    stageNameInput?: string | null
  ): 'todo' | 'in-progress' | 'done' {
    if (ticket.active === false) return 'done';

    if (ticket.close_date) return 'done';

    if (stageInfo && (stageInfo.is_close === true || stageInfo.is_closed === true || stageInfo.fold === true)) {
      return 'done';
    }

    const rawState = String(ticket.state || '').toLowerCase();
    if (
      rawState.includes('done') ||
      rawState.includes('close') ||
      rawState.includes('closed') ||
      rawState.includes('solved') ||
      rawState.includes('resolved') ||
      rawState.includes('cancel') ||
      rawState.includes('finish') ||
      rawState.includes('complete')
    ) {
      return 'done';
    }

    const kanbanState = String(ticket.kanban_state || '').toLowerCase();
    if (
      kanbanState === 'done' ||
      kanbanState === 'closed' ||
      kanbanState === 'solved' ||
      kanbanState === 'resolved'
    ) {
      return 'done';
    }

    const stageName = String(stageNameInput || this.extractMany2OneName(ticket.stage_id) || '').toLowerCase();
    if (!stageName) return 'todo';

    if (
      stageName.includes('done') ||
      stageName.includes('fermé') ||
      stageName.includes('ferme') ||
      stageName.includes('terminé') ||
      stageName.includes('termine') ||
      stageName.includes('closed') ||
      stageName.includes('close') ||
      stageName.includes('solved') ||
      stageName.includes('résolu') ||
      stageName.includes('resolu')
    ) {
      return 'done';
    }
    if (
      stageName.includes('progress') ||
      stageName.includes('cours') ||
      stageName.includes('doing') ||
      stageName.includes('assigned') ||
      stageName.includes('assigné')
    ) {
      return 'in-progress';
    }
    return 'todo';
  }

  mapTicketPriority(priority: string | number | undefined): 'low' | 'medium' | 'high' {
    // Odoo Helpdesk: 0=Low, 1=Medium, 2=High, 3=Urgent
    if (priority === '3' || priority === 3) return 'high';
    if (priority === '2' || priority === 2) return 'high';
    if (priority === '1' || priority === 1) return 'medium';
    return 'low';
  }

  mapTaskStatus(task: OdooTicket): 'todo' | 'in-progress' | 'done' {
    const anyTask = task as any;

    if (anyTask.active === false) return 'done';

    const rawState = String(anyTask.state || anyTask.kanban_state || '').toLowerCase();
    if (
      rawState.includes('done') ||
      rawState.includes('close') ||
      rawState.includes('closed') ||
      rawState.includes('solved') ||
      rawState.includes('resolved') ||
      rawState.includes('cancel')
    ) {
      return 'done';
    }

    if (!task.stage_id || !Array.isArray(task.stage_id) || !task.stage_id[1]) return 'todo';

    const stage = task.stage_id[1].toLowerCase();
    if (
      stage.includes('done') ||
      stage.includes('fermé') ||
      stage.includes('ferme') ||
      stage.includes('terminé') ||
      stage.includes('termine') ||
      stage.includes('closed') ||
      stage.includes('close') ||
      stage.includes('solved') ||
      stage.includes('résolu') ||
      stage.includes('resolu')
    ) {
      return 'done';
    }
    if (stage.includes('progress') || stage.includes('cours') || stage.includes('doing')) {
      return 'in-progress';
    }
    return 'todo';
  }

  mapTaskPriority(priority: string | number | undefined): 'low' | 'medium' | 'high' {
    // Odoo: 0=Normal, 1=Important
    // Notre app: low, medium, high
    if (priority === '2' || priority === 2) return 'high';
    if (priority === '1' || priority === 1) return 'medium';
    return 'low';
  }

  private mapLocalPriorityToOdoo(priority: 'low' | 'medium' | 'high' | string | undefined): string {
    // helpdesk.ticket.priority est un champ selection (string)
    if (priority === 'high') return '2';
    if (priority === 'medium') return '1';
    return '0';
  }

  private getStageColor(index: number, isDone: boolean = false): string {
    if (isDone) return '#d1e7dd';
    const palette = ['#fff3cd', '#cfe2ff', '#e2d9f3', '#f8d7da', '#d1ecf1', '#ffe5d0'];
    return palette[index % palette.length];
  }

  private extractMany2OneId(value: any): number | null {
    if (!value) return null;
    if (Array.isArray(value) && value.length > 0) {
      const id = Number(value[0]);
      return Number.isFinite(id) && id > 0 ? id : null;
    }
    if (typeof value === 'object') {
      const id = Number((value as any).id ?? (value as any).res_id ?? (value as any)[0]);
      return Number.isFinite(id) && id > 0 ? id : null;
    }
    const id = Number(value);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private extractMany2OneName(value: any): string | null {
    if (!value) return null;
    if (Array.isArray(value) && value.length > 1) {
      const name = String(value[1] || '').trim();
      return name || null;
    }
    if (typeof value === 'object') {
      const name = String(
        (value as any).display_name ??
        (value as any).name ??
        (value as any).label ??
        (value as any)[1] ??
        ''
      ).trim();
      return name || null;
    }
    return null;
  }

  private uniquePositiveNumbers(values: any[]): number[] {
    return Array.from(
      new Set(
        (values || [])
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n) && n > 0)
      )
    );
  }

  private extractInvalidFieldFromError(error: any): string | null {
    const message = String(error?.message || error || '');
    const match = message.match(/Invalid field '([^']+)' on model '[^']+'/i);
    return match?.[1] || null;
  }

  private async searchReadWithFieldFallback(
    model: string,
    domain: any[],
    fields: string[],
    limit: number = 0
  ): Promise<any[]> {
    const currentFields = [...fields];

    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        return await this.searchRead(model, domain, currentFields, limit);
      } catch (error: any) {
        const invalidField = this.extractInvalidFieldFromError(error);
        if (!invalidField || !currentFields.includes(invalidField)) {
          throw error;
        }

        console.warn(
          `[Odoo] Champ invalide ignoré pour ${model}: ${invalidField} (search_read)`
        );
        const idx = currentFields.indexOf(invalidField);
        currentFields.splice(idx, 1);

        if (currentFields.length === 0) {
          throw error;
        }
      }
    }

    return [];
  }

  private async readWithFieldFallback(
    model: string,
    ids: number[],
    fields: string[]
  ): Promise<any[]> {
    const currentFields = [...fields];

    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const result = await this.callMethod(model, 'read', {
          ids,
          fields: currentFields,
        });
        return Array.isArray(result) ? result : [];
      } catch (error: any) {
        const invalidField = this.extractInvalidFieldFromError(error);
        if (!invalidField || !currentFields.includes(invalidField)) {
          throw error;
        }

        console.warn(`[Odoo] Champ invalide ignoré pour ${model}: ${invalidField} (read)`);
        const idx = currentFields.indexOf(invalidField);
        currentFields.splice(idx, 1);

        if (currentFields.length === 0) {
          throw error;
        }
      }
    }

    return [];
  }

  async resolveHelpdeskTeamIdsByProject(projectOdooId: number): Promise<number[]> {
    const teamIds: number[] = [];

    // 1) Source principale: équipe(s) liée(s) au projet
    try {
      const teamsByProject = await this.searchRead(
        'helpdesk.team',
        [['project_id', '=', projectOdooId]],
        ['id'],
        0
      );

      for (const team of teamsByProject || []) {
        const id = Number(team.id);
        if (Number.isFinite(id) && id > 0) {
          teamIds.push(id);
        }
      }
    } catch (_error) {
      // Le champ project_id peut ne pas exister selon les modules installés
    }

    try {
      const teamsByProjects = await this.searchRead(
        'helpdesk.team',
        [['project_ids', 'in', [projectOdooId]]],
        ['id'],
        0
      );

      for (const team of teamsByProjects || []) {
        const id = Number(team.id);
        if (Number.isFinite(id) && id > 0) {
          teamIds.push(id);
        }
      }
    } catch (_error) {
      // Le champ project_ids peut ne pas exister selon les modules installés
    }

    // 2) Fallback: déduction depuis tickets existants
    if (teamIds.length === 0) {
      try {
        const existingTickets = await this.searchRead(
          'helpdesk.ticket',
          [
            ['project_id', '=', projectOdooId],
            ['team_id', '!=', false],
          ],
          ['team_id'],
          200
        );

        for (const t of existingTickets || []) {
          const teamId = this.extractMany2OneId(t.team_id);
          if (teamId) {
            teamIds.push(teamId);
          }
        }
      } catch (error) {
        console.warn('[Odoo] Impossible de déduire team_id depuis helpdesk.ticket:', error);
      }
    }

    return this.uniquePositiveNumbers(teamIds);
  }

  async resolveHelpdeskTeamIdByProject(projectOdooId: number): Promise<number | null> {
    const teamIds = await this.resolveHelpdeskTeamIdsByProject(projectOdooId);
    return teamIds.length > 0 ? teamIds[0] : null;
  }

  async getProjectStages(projectOdooId: number): Promise<MappedKanbanColumn[]> {
    try {
      const teamIds = await this.resolveHelpdeskTeamIdsByProject(projectOdooId);
      let stages: OdooProjectStage[] = [];

      if (teamIds.length > 0) {
        // Source principale: étapes explicitement configurées sur les équipes d'assistance
        try {
          const teams = await this.callMethod('helpdesk.team', 'read', {
            ids: teamIds,
            fields: ['id', 'name', 'stage_ids'],
          });

          if (Array.isArray(teams) && teams.length > 0) {
            const stageIds = this.uniquePositiveNumbers(
              teams.flatMap((team: any) => (Array.isArray(team.stage_ids) ? team.stage_ids : []))
            );

            if (stageIds.length > 0) {
              const stagesFromTeams = await this.callMethod('helpdesk.stage', 'read', {
                ids: stageIds,
                fields: ['id', 'name', 'sequence', 'is_close', 'fold'],
              });

              if (Array.isArray(stagesFromTeams) && stagesFromTeams.length > 0) {
                stages = stagesFromTeams;
              }
            }
          }
        } catch (error) {
          console.warn('[Odoo] Impossible de lire stage_ids depuis helpdesk.team:', error);
        }

        // Fallback technique: filtrage direct des étapes par équipe
        if (!Array.isArray(stages) || stages.length === 0) {
          const primaryTeamId = teamIds[0];
          try {
            stages = await this.searchRead(
              'helpdesk.stage',
              [['team_ids', 'in', [primaryTeamId]]],
              ['id', 'name', 'sequence', 'is_close', 'fold'],
              0
            );
          } catch (_error) {
            // Selon versions/modules, team_ids peut varier
          }
        }

        if (!Array.isArray(stages) || stages.length === 0) {
          const primaryTeamId = teamIds[0];
          try {
            stages = await this.searchRead(
              'helpdesk.stage',
              [['team_id', '=', primaryTeamId]],
              ['id', 'name', 'sequence', 'is_close', 'fold'],
              0
            );
          } catch (_error) {
            // Fallback ci-dessous
          }
        }
      }

      if (!Array.isArray(stages) || stages.length === 0) {
        // Fallback final: déduire les étapes depuis les tickets du projet
        try {
          const tickets = await this.searchRead(
            'helpdesk.ticket',
            [
              ['project_id', '=', projectOdooId],
              ['stage_id', '!=', false],
            ],
            ['stage_id'],
            200
          );

          const stageIds = this.uniquePositiveNumbers(
            tickets.map((t: any) => this.extractMany2OneId(t.stage_id))
          );

          if (stageIds.length > 0) {
            stages = await this.callMethod('helpdesk.stage', 'read', {
              ids: stageIds,
              fields: ['id', 'name', 'sequence', 'is_close', 'fold'],
            });
          }
        } catch (_error) {
          // Aucun fallback supplémentaire
        }
      }

      if (!Array.isArray(stages) || stages.length === 0) {
        return [];
      }

      const sortedStages = [...stages].sort(
        (a, b) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0)
      );

      return sortedStages.map((stage, index) => ({
        id: `odoo-stage-${stage.id}`,
        label: stage.name,
        color: this.getStageColor(index, !!stage.is_close || !!stage.fold),
        odooStageId: stage.id,
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des étapes du projet Odoo:', error);
      return [];
    }
  }

  async isHelpdeskStageClosed(stageId: number): Promise<boolean> {
    try {
      const numericStageId = Number(stageId);
      if (!Number.isFinite(numericStageId) || numericStageId <= 0) return false;

      const stages = await this.callMethod('helpdesk.stage', 'read', {
        ids: [numericStageId],
        fields: ['id', 'name', 'is_close', 'fold'],
      });

      if (!Array.isArray(stages) || stages.length === 0) return false;

      const stage = stages[0] as any;
      if (stage.is_close === true || stage.fold === true) return true;

      const name = String(stage.name || '').toLowerCase();
      return (
        name.includes('done') ||
        name.includes('fermé') ||
        name.includes('ferme') ||
        name.includes('clos') ||
        name.includes('terminé') ||
        name.includes('termine') ||
        name.includes('closed') ||
        name.includes('solved') ||
        name.includes('résolu') ||
        name.includes('resolu')
      );
    } catch (error) {
      console.warn('[Odoo] Impossible de vérifier si l\'étape est fermée:', stageId, error);
      return false;
    }
  }

  async getClosedStageIdsByProject(projectOdooId: number): Promise<number[]> {
    try {
      const teamIds = await this.resolveHelpdeskTeamIdsByProject(projectOdooId);
      if (!teamIds || teamIds.length === 0) return [];

      const teams = await this.callMethod('helpdesk.team', 'read', {
        ids: teamIds,
        fields: ['id', 'stage_ids'],
      });

      if (!Array.isArray(teams) || teams.length === 0) return [];

      const stageIds = this.uniquePositiveNumbers(
        teams.flatMap((team: any) => (Array.isArray(team.stage_ids) ? team.stage_ids : []))
      );

      if (stageIds.length === 0) return [];

      const stages = await this.callMethod('helpdesk.stage', 'read', {
        ids: stageIds,
        fields: ['id', 'name', 'is_close', 'fold'],
      });

      if (!Array.isArray(stages) || stages.length === 0) return [];

      const closedStageIds = stages
        .filter((stage: any) => {
          if (stage.is_close === true || stage.fold === true) return true;
          const name = String(stage.name || '').toLowerCase();
          return (
            name.includes('done') ||
            name.includes('fermé') ||
            name.includes('ferme') ||
            name.includes('clos') ||
            name.includes('terminé') ||
            name.includes('termine') ||
            name.includes('closed') ||
            name.includes('solved') ||
            name.includes('résolu') ||
            name.includes('resolu')
          );
        })
        .map((stage: any) => Number(stage.id))
        .filter((id: number) => Number.isFinite(id) && id > 0);

      return this.uniquePositiveNumbers(closedStageIds);
    } catch (error) {
      console.warn('[Odoo] Impossible de récupérer les étapes fermées du projet:', projectOdooId, error);
      return [];
    }
  }

  async createHelpdeskTicketForProject(
    projectOdooId: number,
    title: string,
    description: string = '',
    priority: 'low' | 'medium' | 'high' | string = 'medium'
  ): Promise<number> {
    try {
      const cleanTitle = (title || '').trim();
      if (!cleanTitle) {
        throw new Error('Le titre du ticket est requis pour la synchronisation Odoo');
      }

      const vals: Record<string, any> = {
        name: cleanTitle,
        description: description || '',
        project_id: projectOdooId,
        priority: this.mapLocalPriorityToOdoo(priority),
      };

      const teamId = await this.resolveHelpdeskTeamIdByProject(projectOdooId);
      if (teamId) {
        vals.team_id = teamId;
      }

      const result = await this.callMethod('helpdesk.ticket', 'create', {
        vals: [vals],
      });

      const createdId = Array.isArray(result) ? result[0] : result;
      const numericId = Number(createdId);

      if (!Number.isFinite(numericId) || numericId <= 0) {
        throw new Error(`ID Odoo invalide retourné après création de ticket: ${JSON.stringify(result)}`);
      }

      return numericId;
    } catch (error) {
      console.error('Erreur lors de la création du ticket dans Odoo:', error);
      throw error;
    }
  }

  async getTicketMessages(ticketId: number): Promise<MappedMessage[]> {
    try {
      // Récupérer les messages liés au ticket helpdesk
      const messages = await this.searchRead(
        'mail.message',
        [
          ['model', '=', 'helpdesk.ticket'],
          ['res_id', '=', ticketId],
        ],
        ['id', 'body', 'date', 'author_id', 'message_type', 'subtype_id'],
        0
      );

      console.log('[Odoo] Messages received for ticket', ticketId, ':', messages);

      if (!Array.isArray(messages)) {
        console.error('[Odoo] messages is not an array:', typeof messages, messages);
        return [];
      }

      return messages
        .map((m: OdooMessage) => ({
          id: m.id,
          body: this.stripHtml(m.body) || '',
          bodyHtml: m.body || '',
          date: m.date || new Date().toISOString(),
          author: Array.isArray(m.author_id) ? m.author_id[1] : 'Système',
          messageType: m.message_type || 'notification',
          subtype: Array.isArray(m.subtype_id) ? m.subtype_id[1] : null,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      return [];
    }
  }

  async sendTicketMessage(ticketId: number, messageData: MessageData): Promise<any> {
    try {
      const { subject, body, partnerIds = [], attachmentIds = [] } = messageData;

      // Appeler la méthode message_post sur le ticket
      const result = await this.callMethod('helpdesk.ticket', 'message_post', {
        ids: [ticketId],
        body: body,
        subject: subject || false,
        message_type: 'comment',
        subtype_xmlid: 'mail.mt_comment',
        partner_ids: partnerIds,
        attachment_ids: attachmentIds,
      });

      console.log('[Odoo] Message envoyé avec succès:', result);
      return result;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      throw error;
    }
  }

  async searchPartners(searchTerm: string): Promise<MappedPartner[]> {
    try {
      // Rechercher des partenaires (contacts) par nom ou email
      const domain = searchTerm
        ? ['|', ['name', 'ilike', searchTerm], ['email', 'ilike', searchTerm]]
        : [];

      const partners = await this.searchRead('res.partner', domain, ['id', 'name', 'email'], 20);

      console.log('[Odoo] Partners found:', partners);

      if (!Array.isArray(partners)) {
        console.error('[Odoo] partners is not an array:', typeof partners, partners);
        return [];
      }

      return partners.map((p: OdooPartner) => ({
        id: p.id,
        name: p.name || '',
        email: p.email || '',
      }));
    } catch (error) {
      console.error('Erreur lors de la recherche de partenaires:', error);
      return [];
    }
  }

  async createTimeEntry(ticketId: number, duration: number, date: string, description: string): Promise<any> {
    try {
      // Créer une entrée de temps dans Odoo (module hr_timesheet)
      // Le modèle est account.analytic.line

      if (!this.version) {
        await this.detectVersion();
      }

      if ((!this.version || this.version < 19) && !this.uid) {
        await this.authenticateXmlRpc();
      }

      const currentUid = this.uid;
      if ((!this.version || this.version < 19) && !currentUid) {
        throw new Error('Impossible de déterminer l\'utilisateur Odoo connecté');
      }
      
      console.log('createTimeEntry - uid:', this.uid);
      console.log('createTimeEntry - version:', this.version);
      
      // Chercher un employé associé à cet utilisateur
      // Essayer plusieurs méthodes car le champ peut varier selon la version
      let employeeId = null;
      
      // Méthode 1 : Lire directement depuis res.users
      try {
        const userInfo = await this.callMethod('res.users', 'read', {
          ids: [currentUid as number],
          fields: ['employee_id', 'employee_ids']
        });
        
        console.log('createTimeEntry - userInfo:', userInfo);
        
        if (userInfo && userInfo.length > 0) {
          const userData = Array.isArray(userInfo) ? userInfo[0] : userInfo;
          
          // Essayer employee_id
          if (userData.employee_id && userData.employee_id !== false) {
            employeeId = Array.isArray(userData.employee_id) ? userData.employee_id[0] : userData.employee_id;
            console.log('createTimeEntry - employeeId from employee_id:', employeeId);
          }
          // Sinon essayer employee_ids
          else if (userData.employee_ids && Array.isArray(userData.employee_ids) && userData.employee_ids.length > 0) {
            employeeId = userData.employee_ids[0];
            console.log('createTimeEntry - employeeId from employee_ids:', employeeId);
          }
        }
      } catch (err) {
        console.error('createTimeEntry - Erreur lecture user:', err);
      }
      
      // Méthode 2 : Si pas trouvé, chercher dans hr.employee
      if (!employeeId) {
        try {
          const employees = await this.searchRead(
            'hr.employee',
            [['user_id', '=', currentUid as number]],
            ['id', 'name'],
            1
          );
          
          console.log('createTimeEntry - employees found:', employees);
          
          if (employees && employees.length > 0) {
            employeeId = employees[0].id;
            console.log('createTimeEntry - employeeId from hr.employee:', employeeId);
          }
        } catch (err) {
          console.error('createTimeEntry - Erreur recherche employé:', err);
        }
      }
      
      if (!employeeId) {
        throw new Error(
          `Aucun employé trouvé pour votre utilisateur Odoo (uid: ${this.uid}).\n\n` +
          `Pour utiliser les feuilles de temps, un administrateur doit :\n` +
          `1. Aller dans Employés > Tous les employés\n` +
          `2. Créer ou modifier votre fiche employé\n` +
          `3. Associer votre utilisateur Odoo à cette fiche employé`
        );
      }

      // Récupérer les infos du ticket pour obtenir le projet
      const ticket = await this.searchRead(
        'helpdesk.ticket',
        [['id', '=', ticketId]],
        ['project_id'],
        1
      );

      if (!ticket || ticket.length === 0) {
        throw new Error(`Ticket ${ticketId} non trouvé dans Odoo`);
      }

      const projectId = Array.isArray(ticket[0].project_id) ? ticket[0].project_id[0] : ticket[0].project_id;
      
      if (!projectId) {
        throw new Error(`Le ticket ${ticketId} n'a pas de projet associé dans Odoo`);
      }

      // Créer l'entrée de temps
      const timeEntryData = {
        name: description || '/',
        unit_amount: duration / 60, // Convertir minutes en heures
        date: date,
        project_id: projectId,
        employee_id: employeeId,
        helpdesk_ticket_id: ticketId  // Champ spécifique helpdesk si disponible
      };

      console.log('[Odoo] Création time entry avec:', timeEntryData);

      // Pour create(), les données doivent être dans args, pas dans kwargs
      const result = await this.callMethod('account.analytic.line', 'create', {
        vals: [timeEntryData]  // create() attend une liste de dictionnaires dans args[0]
      });

      const createdId = Array.isArray(result) ? result[0] : result;
      const numericId = Number(createdId);
      if (!Number.isFinite(numericId) || numericId <= 0) {
        throw new Error(`ID Odoo invalide retourné après création de feuille de temps: ${JSON.stringify(result)}`);
      }

      console.log('[Odoo] Time entry créée avec succès:', numericId);
      return numericId;
    } catch (error) {
      console.error('Erreur lors de la création de l\'entrée de temps dans Odoo:', error);
      throw error;
    }
  }

  async updateTimeEntry(odooId: number, duration: number, date: string, description: string): Promise<void> {
    try {
      const timeEntryData = {
        name: description || '/',
        unit_amount: duration / 60,
        date: date
      };

      console.log('[Odoo] Mise à jour time entry', odooId, 'avec:', timeEntryData);

      await this.callMethod('account.analytic.line', 'write', {
        ids: [odooId],
        vals: timeEntryData
      });

      console.log('[Odoo] Time entry mise à jour avec succès');
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour de l\'entrée de temps dans Odoo:', error);
      // Si l'entrée n'existe plus dans Odoo, on ne lance pas d'erreur fatale
      if (error.message?.includes('does not exist') || error.message?.includes('not found')) {
        console.warn('L\'entrée n\'existe plus dans Odoo, elle sera désynchronisée localement');
        return;
      }
      throw error;
    }
  }

  async deleteTimeEntry(odooId: number): Promise<void> {
    try {
      console.log('[Odoo] Suppression time entry:', odooId);

      await this.callMethod('account.analytic.line', 'unlink', {
        ids: [odooId]
      });

      console.log('[Odoo] Time entry supprimée avec succès');
    } catch (error: any) {
      console.error('Erreur lors de la suppression de l\'entrée de temps dans Odoo:', error);
      // Si l'entrée n'existe plus dans Odoo, on considère que c'est OK
      if (error.message?.includes('does not exist') || error.message?.includes('not found')) {
        console.warn('L\'entrée n\'existe plus dans Odoo, suppression locale seulement');
        return;
      }
      throw error;
    }
  }

  async getTicketTimeEntries(ticketId: number): Promise<any[]> {
    try {
      // Récupérer les entrées de temps depuis Odoo pour ce ticket
      // Utiliser helpdesk_ticket_id pour les tickets helpdesk
      const timeEntries = await this.searchRead(
        'account.analytic.line',
        [['helpdesk_ticket_id', '=', ticketId]],
        ['id', 'name', 'unit_amount', 'date', 'project_id', 'employee_id'],
        100
      );

      console.log('[Odoo] Time entries récupérées:', timeEntries);
      return timeEntries || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des entrées de temps:', error);
      throw error;
    }
  }

  async getTaskTimeEntries(taskId: number): Promise<any[]> {
    try {
      const timeEntries = await this.searchRead(
        'account.analytic.line',
        [['task_id', '=', taskId]],
        ['id', 'name', 'unit_amount', 'date', 'project_id', 'employee_id', 'task_id'],
        100
      );

      return timeEntries || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des entrées de temps de tâche:', error);
      throw error;
    }
  }

  async createTaskTimeEntry(taskId: number, duration: number, date: string, description: string): Promise<any> {
    try {
      if (!this.version) {
        await this.detectVersion();
      }

      if ((!this.version || this.version < 19) && !this.uid) {
        await this.authenticateXmlRpc();
      }

      const currentUid = this.uid;
      if ((!this.version || this.version < 19) && !currentUid) {
        throw new Error('Impossible de déterminer l\'utilisateur Odoo connecté');
      }

      let employeeId = null;

      try {
        const userInfo = await this.callMethod('res.users', 'read', {
          ids: [currentUid as number],
          fields: ['employee_id', 'employee_ids']
        });

        if (userInfo && userInfo.length > 0) {
          const userData = Array.isArray(userInfo) ? userInfo[0] : userInfo;

          if (userData.employee_id && userData.employee_id !== false) {
            employeeId = Array.isArray(userData.employee_id) ? userData.employee_id[0] : userData.employee_id;
          } else if (userData.employee_ids && Array.isArray(userData.employee_ids) && userData.employee_ids.length > 0) {
            employeeId = userData.employee_ids[0];
          }
        }
      } catch (err) {
        console.error('createTaskTimeEntry - Erreur lecture user:', err);
      }

      if (!employeeId) {
        try {
          const employees = await this.searchRead(
            'hr.employee',
            [['user_id', '=', currentUid as number]],
            ['id', 'name'],
            1
          );

          if (employees && employees.length > 0) {
            employeeId = employees[0].id;
          }
        } catch (err) {
          console.error('createTaskTimeEntry - Erreur recherche employé:', err);
        }
      }

      if (!employeeId) {
        throw new Error('Aucun employé Odoo associé à votre utilisateur pour la saisie des temps.');
      }

      const task = await this.searchRead(
        'project.task',
        [['id', '=', taskId]],
        ['project_id'],
        1
      );

      if (!task || task.length === 0) {
        throw new Error(`Tâche ${taskId} non trouvée dans Odoo`);
      }

      const projectId = Array.isArray(task[0].project_id) ? task[0].project_id[0] : task[0].project_id;
      if (!projectId) {
        throw new Error(`La tâche ${taskId} n'a pas de projet associé dans Odoo`);
      }

      const timeEntryData = {
        name: description || '/',
        unit_amount: duration / 60,
        date,
        project_id: projectId,
        task_id: taskId,
        employee_id: employeeId,
      };

      const result = await this.callMethod('account.analytic.line', 'create', {
        vals: [timeEntryData]
      });

      const createdId = Array.isArray(result) ? result[0] : result;
      const numericId = Number(createdId);
      if (!Number.isFinite(numericId) || numericId <= 0) {
        throw new Error(`ID Odoo invalide retourné après création de feuille de temps tâche: ${JSON.stringify(result)}`);
      }

      return numericId;
    } catch (error) {
      console.error('Erreur lors de la création de l\'entrée de temps de tâche dans Odoo:', error);
      throw error;
    }
  }

  async syncTimeEntry(timeEntryId: number, ticketOdooId: number, duration: number, date: string, description: string): Promise<boolean> {
    try {
      await this.createTimeEntry(ticketOdooId, duration, date, description);
      return true;
    } catch (error) {
      console.error(`Erreur lors de la synchronisation de l'entrée de temps ${timeEntryId}:`, error);
      return false;
    }
  }

  isConfigured(): boolean {
    // Odoo 19+ : API Key requise
    // Odoo 18 : login/password requis
    return !!(this.url && (this.apiKey || (this.username && this.password)));
  }
}

export const odooService = new OdooService();
