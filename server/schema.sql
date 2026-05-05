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

CREATE TABLE IF NOT EXISTS user_menu_preferences (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  client_email TEXT,
  prod_url TEXT,
  preprod_url TEXT,
  github_repo_url TEXT,
  github_repo_owner TEXT,
  github_repo_name TEXT,
  github_default_branch TEXT,
  github_private BOOLEAN NOT NULL DEFAULT FALSE,
  gitlab_repo_url TEXT,
  gitlab_project_path TEXT,
  gitlab_project_id BIGINT,
  gitlab_default_branch TEXT,
  gitlab_private BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT,
  assigned_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  use_default_kanban_template BOOLEAN NOT NULL DEFAULT TRUE,
  kanban_columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  odoo_id BIGINT,
  chiffrage_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  tjm NUMERIC(10,2),
  hours_per_day NUMERIC(5,2),
  recette_share_token TEXT,
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
  email_history JSONB NOT NULL DEFAULT '[]'::jsonb,
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
  story_points NUMERIC(10,2),
  estimated_time NUMERIC(10,2),
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  gantt_assignments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS gantt_assignments JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS email_history JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE local_tasks ADD COLUMN IF NOT EXISTS gantt_assignments JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE local_tasks ADD COLUMN IF NOT EXISTS story_points NUMERIC(10,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS use_default_kanban_template BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS prod_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS preprod_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_repo_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_repo_owner TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_repo_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_default_branch TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_private BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS gitlab_repo_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS gitlab_project_path TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS gitlab_project_id BIGINT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS gitlab_default_branch TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS gitlab_private BOOLEAN NOT NULL DEFAULT FALSE;

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

-- ============================================================
-- Étapes Kanban relationnelles (objet relationnel comme project.task.type dans Odoo)
-- ============================================================
CREATE TABLE IF NOT EXISTS kanban_stages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 10,
  color TEXT NOT NULL DEFAULT '#cfe2ff',
  folded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relation many-to-many : un projet peut avoir plusieurs étapes, une étape peut être partagée
CREATE TABLE IF NOT EXISTS project_stage_rel (
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_id BIGINT NOT NULL REFERENCES kanban_stages(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL DEFAULT 10,
  PRIMARY KEY (project_id, stage_id)
);

-- Lien relationnel vers l'étape kanban sur les tickets et tâches locales
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS stage_id BIGINT REFERENCES kanban_stages(id) ON DELETE SET NULL;
ALTER TABLE local_tasks ADD COLUMN IF NOT EXISTS stage_id BIGINT REFERENCES kanban_stages(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS test_accounts JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS recette_id BIGINT REFERENCES recettes(id) ON DELETE SET NULL;
ALTER TABLE local_tasks ADD COLUMN IF NOT EXISTS recette_id BIGINT REFERENCES recettes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_kanban_stages_sequence ON kanban_stages(sequence);
CREATE INDEX IF NOT EXISTS idx_project_stage_rel_project ON project_stage_rel(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_stage_id ON tickets(stage_id);
CREATE INDEX IF NOT EXISTS idx_local_tasks_stage_id ON local_tasks(stage_id);
CREATE INDEX IF NOT EXISTS idx_recettes_project_id ON recettes(project_id);
CREATE INDEX IF NOT EXISTS idx_recettes_sprint_id ON recettes(sprint_id);
CREATE INDEX IF NOT EXISTS idx_recettes_share_token ON recettes(share_token);
CREATE INDEX IF NOT EXISTS idx_tickets_recette_id ON tickets(recette_id);
CREATE INDEX IF NOT EXISTS idx_local_tasks_recette_id ON local_tasks(recette_id);

-- Permissions API (évite: "permission denied for table kanban_stages")
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tickets_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE kanban_stages TO tickets_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE project_stage_rel TO tickets_app;
    GRANT USAGE, SELECT ON SEQUENCE kanban_stages_id_seq TO tickets_app;
  END IF;
END $$;
