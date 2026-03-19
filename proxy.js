import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Activer CORS pour toutes les origines
app.use(cors());
app.use(express.text({ type: 'text/xml' }));
app.use(express.json());

// Log toutes les requêtes
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// Configuration Odoo (à adapter)
const ODOO_URL = process.env.ODOO_URL || 'https://cogitime.odoo.com/';

// Proxy pour les APIs IA (Anthropic, OpenAI, Google)
app.post('/api/ai/anthropic', async (req, res) => {
  try {
    console.log('📤 Appel Anthropic avec modèle:', req.body.model);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': req.headers.authorization?.replace('Bearer ', ''),
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    console.log('📥 Réponse Anthropic:', response.status, data.type || 'success');
    
    if (!response.ok) {
      console.error('❌ Erreur Anthropic:', data);
    }
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Erreur proxy Anthropic:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/openai', async (req, res) => {
  try {
    console.log('📤 Appel OpenAI avec modèle:', req.body.model);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    console.log('📥 Réponse OpenAI:', response.status, data.error ? 'erreur' : 'success');
    
    if (!response.ok) {
      console.error('❌ Erreur OpenAI:', data);
    }
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Erreur proxy OpenAI:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/grok', async (req, res) => {
  try {
    console.log('📤 Appel Grok avec modèle:', req.body.model);
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    console.log('📥 Réponse Grok:', response.status, data.error ? 'erreur' : 'success');
    
    if (!response.ok) {
      console.error('❌ Erreur Grok:', data);
    }
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Erreur proxy Grok:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/google', async (req, res) => {
  try {
    const apiKey = req.query.key;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Erreur proxy Google:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy pour les requêtes XML-RPC
app.post('/xmlrpc/:version/:service', async (req, res) => {
  try {
    const odooPath = `/xmlrpc/${req.params.version}/${req.params.service}`;
    const odooEndpoint = `${ODOO_URL}${odooPath}`;
    
    console.log(`\n[Proxy] ${req.method} ${odooPath}`);
    console.log('[Proxy] 📤 Requête vers:', odooEndpoint);
    console.log('[Proxy] 📏 Body length:', req.body.length);
    
    // Extraire le nom de la méthode pour le debug
    const methodMatch = req.body.match(/<methodName>(.*?)<\/methodName>/);
    if (methodMatch) {
      console.log('[Proxy] 🔧 Méthode:', methodMatch[1]);
    }
    
    const response = await fetch(odooEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Content-Length': Buffer.byteLength(req.body).toString()
      },
      body: req.body
    });

    const text = await response.text();
    console.log('[Proxy] 📥 Réponse:', response.status, 'longueur:', text.length);
    
    // Logger les erreurs XML-RPC
    if (text.includes('<fault>')) {
      console.error('[Proxy] ⚠️ Erreur XML-RPC détectée:');
      const faultMatch = text.match(/<string>(.*?)<\/string>/);
      if (faultMatch) {
        console.error('[Proxy] 💥', faultMatch[1]);
      }
    }
    
    res.set('Content-Type', 'text/xml; charset=utf-8');
    res.send(text);
  } catch (error) {
    console.error('[Proxy] Erreur:', error);
    res.status(500).send(`<?xml version="1.0"?>
<methodResponse>
  <fault>
    <value>
      <struct>
        <member>
          <name>faultString</name>
          <value><string>${error.message}</string></value>
        </member>
      </struct>
    </value>
  </fault>
</methodResponse>`);
  }
});

// Proxy pour les requêtes JSON (Odoo 19+)
app.post('/json/:version/:model/:method', async (req, res) => {
  try {
    const odooPath = `/json/${req.params.version}/${req.params.model}/${req.params.method}`;
    const odooEndpoint = `${ODOO_URL}${odooPath}`;
    
    console.log(`[Proxy] ${req.method} ${odooPath}`);
    
    const response = await fetch(odooEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': req.headers.authorization,
        'X-Odoo-Database': req.headers['x-odoo-database']
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Proxy] Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxy Odoo démarré sur http://localhost:${PORT}`);
  console.log(`📡 Redirection vers: ${ODOO_URL}`);
  console.log(`\n💡 Dans votre app, utilisez: http://localhost:${PORT}`);
});
