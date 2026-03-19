# Proxy simple pour Odoo (si vous ne pouvez pas modifier odoo.conf)

Si vous ne pouvez pas modifier la configuration Odoo, créez ce proxy Node.js :

## Installation

```bash
npm init -y
npm install express cors node-fetch
```

## Fichier proxy.js

```javascript
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// Activer CORS pour toutes les origines
app.use(cors());
app.use(express.json());

// Configuration Odoo (à adapter)
const ODOO_URL = 'https://votre-instance.odoo.com';

// Proxy pour toutes les requêtes Odoo
app.post('/odoo/*', async (req, res) => {
  try {
    const odooPath = req.path.replace('/odoo', '');
    const odooEndpoint = `${ODOO_URL}${odooPath}`;
    
    const response = await fetch(odooEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy Odoo démarré sur http://localhost:${PORT}`);
});
```

## Utilisation

1. Lancez le proxy : `node proxy.js`
2. Dans votre app, utilisez `http://localhost:3000/odoo` comme URL Odoo

## Alternative avec Nginx

```nginx
server {
    listen 8080;
    server_name localhost;

    location /odoo/ {
        # Activer CORS
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'Content-Type';
        
        # Gérer les requêtes OPTIONS
        if ($request_method = 'OPTIONS') {
            return 204;
        }

        # Proxy vers Odoo
        proxy_pass https://votre-instance.odoo.com/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Puis utilisez `http://localhost:8080/odoo` comme URL Odoo.
