class OdooService {
  constructor() {
    this.url = null;
    this.db = null;
    this.apiKey = null;
    this.username = null;
    this.password = null;
    this.uid = null;
    this.version = null;
    this.loadConfig();
  }

  loadConfig() {
    const config = localStorage.getItem('odoo-config');
    if (config) {
      const parsed = JSON.parse(config);
      this.url = parsed.url;
      this.db = parsed.db;
      this.apiKey = parsed.apiKey;
      this.username = parsed.username;
      this.password = parsed.password;
      this.version = parsed.version;
    }
  }

  saveConfig(url, db, apiKey = null, username = null, password = null) {
    this.url = url;
    this.db = db;
    this.apiKey = apiKey;
    this.username = username;
    this.password = password;
    
    localStorage.setItem('odoo-config', JSON.stringify({
      url, db, apiKey, username, password, version: this.version
    }));
  }

  clearConfig() {
    this.url = null;
    this.db = null;
    this.apiKey = null;
    this.username = null;
    this.password = null;
    this.uid = null;
    this.version = null;
    localStorage.removeItem('odoo-config');
  }

  stripHtml(html) {
    if (!html) return '';
    // Créer un élément temporaire pour parser le HTML
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    // Récupérer le texte sans balises
    return tmp.textContent || tmp.innerText || '';
  }

  async detectVersion() {
    // Ne plus faire de détection automatique à cause du CORS
    // La version doit être configurée manuellement dans l'interface
    return this.version || 18;
  }

  setVersion(version) {
    this.version = parseInt(version);
  }

  async testConnection() {
    if (!this.url) {
      throw new Error('URL Odoo manquante');
    }

    // Détecter la version
    await this.detectVersion();

    if (this.version >= 19) {
      // Odoo 19+ avec API Key
      if (!this.apiKey) {
        throw new Error('API Key requise pour Odoo 19+');
      }

      const response = await fetch(`${this.url}/json/2/res.users/context_get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `bearer ${this.apiKey}`,
          'X-Odoo-Database': this.db,
          'User-Agent': 'Tickets PWA'
        },
        body: JSON.stringify({ context: {} })
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

  async authenticateXmlRpc() {
    const body = this.buildXmlRpcCall('authenticate', [
      this.db,
      this.username,
      this.password || this.apiKey,
      {}
    ]);

    console.log('[XML-RPC Auth] Tentative d\'authentification:', { url: this.url, db: this.db, username: this.username });

    try {
      const response = await fetch(`${this.url}/xmlrpc/2/common`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'text/xml; charset=utf-8',
          'Content-Length': body.length.toString()
        },
        body: body,
        mode: 'cors',
        credentials: 'omit'
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
    } catch (error) {
      console.error('[XML-RPC Auth] Erreur:', error);
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Impossible de contacter le serveur Odoo. Vérifiez l\'URL ou utilisez un proxy CORS.');
      }
      throw error;
    }
  }

  escapeXml(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  buildXmlRpcCall(method, params) {
    const validParams = params.filter(p => p !== undefined);
    return `<?xml version="1.0" encoding="UTF-8"?>
<methodCall>
  <methodName>${this.escapeXml(method)}</methodName>
  <params>
    ${validParams.map(p => this.xmlRpcValue(p)).join('\n    ')}
  </params>
</methodCall>`;
  }

  xmlRpcValue(value) {
    if (value === null || value === undefined) {
      return `<param><value><boolean>0</boolean></value></param>`;
    }
    if (typeof value === 'string') {
      return `<param><value><string>${this.escapeXml(value)}</string></value></param>`;
    } else if (typeof value === 'number') {
      return `<param><value><int>${value}</int></value></param>`;
    } else if (typeof value === 'boolean') {
      return `<param><value><boolean>${value ? 1 : 0}</boolean></value></param>`;
    } else if (Array.isArray(value)) {
      return `<param><value><array><data>${value.map(v => this.xmlRpcValue(v).replace(/<\/?param>/g, ''))}</data></array></value></param>`;
    } else if (typeof value === 'object') {
      const members = Object.entries(value)
        .filter(([k, v]) => v !== undefined)
        .map(([k, v]) => 
          `<member><name>${this.escapeXml(k)}</name>${this.xmlRpcValue(v).replace(/<\/?param>/g, '')}</member>`
        ).join('');
      return `<param><value><struct>${members}</struct></value></param>`;
    }
    return `<param><value><string>${this.escapeXml(String(value))}</string></value></param>`;
  }

  parseXmlRpcValueFromElement(valueEl) {
    // Chercher le type de valeur
    const intEl = valueEl.querySelector('int');
    if (intEl) return parseInt(intEl.textContent);
    
    const boolEl = valueEl.querySelector('boolean');
    if (boolEl) return boolEl.textContent.trim() === '1';
    
    const stringEl = valueEl.querySelector('string');
    if (stringEl) return stringEl.textContent;
    
    const arrayEl = valueEl.querySelector('array');
    if (arrayEl) {
      const values = [];
      const valueElements = arrayEl.querySelectorAll(':scope > data > value');
      for (const ve of valueElements) {
        values.push(this.parseXmlRpcValueFromElement(ve));
      }
      return values;
    }
    
    // Double
    const doubleEl = valueEl.querySelector('double');
    if (doubleEl) return parseFloat(doubleEl.textContent);
    
    // Valeur vide ou null
    return null;
  }

  parseXmlRpcValue(valueContent) {
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
      const values = [];
      const valueMatches = arrayMatch[1].matchAll(/<value>(.*?)<\/value>/gs);
      for (const vm of valueMatches) {
        values.push(this.parseXmlRpcValue(vm[1]));
      }
      return values;
    }
    
    // Valeur vide ou null
    return null;
  }

  parseXmlRpcResponse(xml) {
    const valueMatch = xml.match(/<value>.*?<(int|string|boolean)>(.*?)<\/\1>.*?<\/value>/s);
    if (!valueMatch) return null;
    
    const type = valueMatch[1];
    const value = valueMatch[2];
    
    if (type === 'int') return parseInt(value);
    if (type === 'boolean') return value === '1';
    return value;
  }

  async callMethod(model, method, params = {}) {
    if (!this.version) {
      await this.detectVersion();
    }

    if (this.version >= 19) {
      // API JSON-2
      return await this.callMethodJson2(model, method, params);
    } else {
      // API XML-RPC
      return await this.callMethodXmlRpc(model, method, params);
    }
  }

  async callMethodJson2(model, method, params = {}) {
    if (!this.url || !this.apiKey) {
      throw new Error('Configuration Odoo manquante');
    }

    const response = await fetch(`${this.url}/json/2/${model}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `bearer ${this.apiKey}`,
        'X-Odoo-Database': this.db,
        'User-Agent': 'Tickets PWA'
      },
      body: JSON.stringify(params)
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

  async callMethodXmlRpc(model, method, params = {}) {
    if (!this.uid) {
      await this.authenticateXmlRpc();
    }

    const args = params.ids ? [params.ids] : [];
    const kwargs = { ...params };
    delete kwargs.ids;

    const body = this.buildXmlRpcCall('execute_kw', [
      this.db,
      this.uid,
      this.password || this.apiKey,
      model,
      method,
      args,
      kwargs
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
          'Content-Length': body.length.toString()
        },
        body: body,
        mode: 'cors',
        credentials: 'omit'
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
        
        const items = [];
        const structs = xmlDoc.querySelectorAll('array > data > value > struct');
        
        console.log('[XML-RPC] Nombre de structs trouvés:', structs.length);
        
        for (const struct of structs) {
          const item = {};
          const members = struct.querySelectorAll(':scope > member');
          
          for (const member of members) {
            const nameEl = member.querySelector('name');
            const valueEl = member.querySelector('value');
            
            if (nameEl && valueEl) {
              const name = nameEl.textContent.trim();
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
    } catch (error) {
      console.error('[XML-RPC] Erreur lors de l\'appel:', error);
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Impossible de contacter le serveur Odoo. Problème CORS détecté - utilisez un proxy (voir ODOO_PROXY.md)');
      }
      throw error;
    }
  }

  async searchRead(model, domain = [], fields = [], limit = 0) {
    const result = await this.callMethod(model, 'search_read', {
      domain: domain,
      fields: fields,
      limit: limit > 0 ? limit : undefined,
      context: {}
    });
    
    // S'assurer de toujours retourner un tableau
    return Array.isArray(result) ? result : [];
  }

  async getProjects() {
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

      return projects.map(p => ({
        odooId: p.id,
        name: p.name,
        description: this.stripHtml(p.description) || '',
        status: this.mapProjectStatus(p),
        createdAt: p.date_start || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des projets:', error);
      return [];
    }
  }

  mapProjectStatus(project) {
    // Mapper le statut Odoo vers notre app
    if (!project.active) return 'completed';
    if (project.stage_id && project.stage_id[1]) {
      const stage = project.stage_id[1].toLowerCase();
      if (stage.includes('done') || stage.includes('terminé')) return 'completed';
      if (stage.includes('hold') || stage.includes('pause')) return 'on-hold';
    }
    return 'active';
  }

  async getTasks(projectIds = null) {
    try {
      let domain;
      
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
      
      const tickets = await this.searchRead(
        'helpdesk.ticket',
        domain,
        ['id', 'name', 'description', 'project_id', 'team_id', 'stage_id', 'priority', 'partner_id', 'create_date', 'write_date']
      );

      console.log('[Odoo] Helpdesk tickets received:', tickets);
      
      if (tickets.length > 0) {
        console.log('[Odoo] Premier ticket structure:', tickets[0]);
      }

      if (!Array.isArray(tickets)) {
        console.error('[Odoo] tickets is not an array:', typeof tickets, tickets);
        return [];
      }

      return tickets.map(t => {
        // project_id peut être un nombre ou un tableau [id, name]
        let projectId = null;
        let projectName = null;
        
        if (t.project_id) {
          if (Array.isArray(t.project_id)) {
            projectId = t.project_id[0];
            projectName = t.project_id[1];
          } else {
            projectId = t.project_id;
            projectName = null;
          }
        }
        
        const mapped = {
          odooId: t.id,
          title: t.name,
          description: this.stripHtml(t.description) || '',
          projectOdooId: projectId,
          projectName: projectName,
          status: this.mapTicketStatus(t),
          priority: this.mapTicketPriority(t.priority),
          createdAt: t.create_date || new Date().toISOString(),
          updatedAt: t.write_date || new Date().toISOString()
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

  mapTicketStatus(ticket) {
    if (!ticket.stage_id || !ticket.stage_id[1]) return 'todo';
    
    const stage = ticket.stage_id[1].toLowerCase();
    if (stage.includes('done') || stage.includes('terminé') || stage.includes('closed') || stage.includes('solved') || stage.includes('résolu')) {
      return 'done';
    }
    if (stage.includes('progress') || stage.includes('cours') || stage.includes('doing') || stage.includes('assigned') || stage.includes('assigné')) {
      return 'in-progress';
    }
    return 'todo';
  }

  mapTicketPriority(priority) {
    // Odoo Helpdesk: 0=Low, 1=Medium, 2=High, 3=Urgent
    if (priority === '3' || priority === 3) return 'high';
    if (priority === '2' || priority === 2) return 'high';
    if (priority === '1' || priority === 1) return 'medium';
    return 'low';
  }

  mapTaskStatus(task) {
    if (!task.stage_id || !task.stage_id[1]) return 'todo';
    
    const stage = task.stage_id[1].toLowerCase();
    if (stage.includes('done') || stage.includes('terminé') || stage.includes('closed')) {
      return 'done';
    }
    if (stage.includes('progress') || stage.includes('cours') || stage.includes('doing')) {
      return 'in-progress';
    }
    return 'todo';
  }

  mapTaskPriority(priority) {
    // Odoo: 0=Normal, 1=Important
    // Notre app: low, medium, high
    if (priority === '2' || priority === 2) return 'high';
    if (priority === '1' || priority === 1) return 'medium';
    return 'low';
  }

  async getTicketMessages(ticketId) {
    try {
      // Récupérer les messages liés au ticket helpdesk
      const messages = await this.searchRead(
        'mail.message',
        [
          ['model', '=', 'helpdesk.ticket'],
          ['res_id', '=', ticketId]
        ],
        ['id', 'body', 'date', 'author_id', 'message_type', 'subtype_id'],
        0
      );

      console.log('[Odoo] Messages received for ticket', ticketId, ':', messages);

      if (!Array.isArray(messages)) {
        console.error('[Odoo] messages is not an array:', typeof messages, messages);
        return [];
      }

      return messages.map(m => ({
        id: m.id,
        body: this.stripHtml(m.body) || '',
        bodyHtml: m.body || '',
        date: m.date || new Date().toISOString(),
        author: Array.isArray(m.author_id) ? m.author_id[1] : 'Système',
        messageType: m.message_type || 'notification',
        subtype: Array.isArray(m.subtype_id) ? m.subtype_id[1] : null
      })).sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      return [];
    }
  }

  async sendTicketMessage(ticketId, messageData) {
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
        attachment_ids: attachmentIds
      });

      console.log('[Odoo] Message envoyé avec succès:', result);
      return result;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      throw error;
    }
  }

  async searchPartners(searchTerm) {
    try {
      // Rechercher des partenaires (contacts) par nom ou email
      const domain = searchTerm 
        ? ['|', ['name', 'ilike', searchTerm], ['email', 'ilike', searchTerm]]
        : [];

      const partners = await this.searchRead(
        'res.partner',
        domain,
        ['id', 'name', 'email'],
        20
      );

      console.log('[Odoo] Partners found:', partners);

      if (!Array.isArray(partners)) {
        console.error('[Odoo] partners is not an array:', typeof partners, partners);
        return [];
      }

      return partners.map(p => ({
        id: p.id,
        name: p.name || '',
        email: p.email || ''
      }));
    } catch (error) {
      console.error('Erreur lors de la recherche de partenaires:', error);
      return [];
    }
  }

  isConfigured() {
    // Odoo 19+ : API Key requise
    // Odoo 18 : login/password requis
    return !!(this.url && (this.apiKey || (this.username && this.password)));
  }
}

export const odooService = new OdooService();