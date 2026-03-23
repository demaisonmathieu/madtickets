CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT,
  assigned_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  kanban_columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  odoo_id BIGINT,
  chiffrage_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  tjm NUMERIC(10,2),
  hours_per_day NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sprints (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  meeting_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  start_date DATE,
  estimated_time NUMERIC(10,2),
  recette_status TEXT DEFAULT 'pending',
  recette_comment TEXT,
  recette_date TIMESTAMPTZ,
  recette_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  recette_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  assigned_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  sprint_id BIGINT REFERENCES sprints(id) ON DELETE SET NULL,
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_stories JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  gantt_assignments JSONB NOT NULL DEFAULT '[]'::jsonb,
  odoo_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS todos (
  id BIGSERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  planned_date DATE NOT NULL,
  follower_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS time_entries (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  duration INTEGER NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  odoo_id BIGINT,
  synced BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS local_tasks (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id BIGINT REFERENCES sprints(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  start_date DATE,
  assigned_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  time_total_minutes INTEGER NOT NULL DEFAULT 0,
  is_chiffrage BOOLEAN NOT NULL DEFAULT FALSE,
  lot_number TEXT,
  difficulty TEXT,
  estimated_time NUMERIC(10,2),
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  gantt_assignments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS gantt_assignments JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE local_tasks ADD COLUMN IF NOT EXISTS gantt_assignments JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS odoo_tasks (
  id BIGSERIAL PRIMARY KEY,
  odoo_id BIGINT NOT NULL UNIQUE,
  project_odoo_id BIGINT NOT NULL,
  local_project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
  project_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  time_total_minutes INTEGER NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS passwords (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  username TEXT,
  password TEXT NOT NULL,
  url TEXT,
  category TEXT,
  notes TEXT,
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_assigned_user_id ON projects(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_project_id ON tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_user_id ON tickets(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_sprint_id ON tickets(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_todos_date ON todos(date);
CREATE INDEX IF NOT EXISTS idx_todos_planned_date ON todos(planned_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_ticket_id ON time_entries(ticket_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_local_tasks_project_id ON local_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_local_tasks_sprint_id ON local_tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_odoo_tasks_project_odoo_id ON odoo_tasks(project_odoo_id);
