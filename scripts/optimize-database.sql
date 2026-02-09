-- Performance Optimization: Add Database Indexes
-- Run this script to improve query performance

-- Users
CREATE INDEX IF NOT EXISTS idx_users_username 
ON users(username);

CREATE INDEX IF NOT EXISTS idx_users_organization_id 
ON users(organization_id);

CREATE INDEX IF NOT EXISTS idx_users_role 
ON users(organization_id, role);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_organization_id 
ON projects(organization_id);

CREATE INDEX IF NOT EXISTS idx_projects_created_at 
ON projects(created_at DESC);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_project_id 
ON tasks(project_id);

CREATE INDEX IF NOT EXISTS idx_tasks_organization_id 
ON tasks(organization_id);

CREATE INDEX IF NOT EXISTS idx_tasks_status 
ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id 
ON tasks(assignee_id);

CREATE INDEX IF NOT EXISTS idx_tasks_project_status 
ON tasks(project_id, status);

CREATE INDEX IF NOT EXISTS idx_tasks_created_at 
ON tasks(created_at DESC);

-- Refresh tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
ON refresh_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash
ON refresh_tokens(token_hash);

-- Analyze tables for query optimization
ANALYZE organizations;
ANALYZE users;
ANALYZE projects;
ANALYZE tasks;

-- Verify indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
