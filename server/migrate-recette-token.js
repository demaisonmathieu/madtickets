import dotenv from 'dotenv'
import { query } from './db.js';

dotenv.config({
  path: '/home/ubuntu/tickets-api.env'
});

async function migrate() {
  try {
    await query(
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS recette_share_token TEXT;`
    );
    console.log('✅ Migration terminée: colonne recette_share_token ajoutée');
  } catch (err) {
    console.error('❌ Erreur migration:', err);
  }
}

migrate().then(() => process.exit(0));
