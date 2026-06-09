-- =============================================================================
-- Seed: grant all known users access to "Prefeitura de Novo Hamburgo"
-- Workspace ID: a914211b-f27a-432f-a2e7-ed510e2cdfd0
--
-- Pulls every unique user (keycloak_sub) found in ANY other workspace and
-- inserts them as a member here.  ON CONFLICT DO NOTHING makes the script
-- safe to re-run; existing rows are left untouched.
--
-- Role logic:
--   - Users who are 'admin' in at least one other workspace → 'admin'
--   - Everyone else                                         → 'member'
--
-- Usage:
--   docker compose exec db psql -U <user> -d <db> \
--     -f /scripts/db/seed_prefeitura_members.sql
-- =============================================================================

INSERT INTO workspace_members (
    id,
    workspace_id,
    keycloak_sub,
    email,
    name,
    avatar_url,
    role,
    is_active,
    joined_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    'a914211b-f27a-432f-a2e7-ed510e2cdfd0',
    keycloak_sub,
    email,
    name,
    avatar_url,
    -- promote to admin if the user holds that role in any other workspace
    CASE WHEN bool_or(role = 'admin') THEN 'admin' ELSE 'member' END,
    TRUE,
    NOW(),
    NOW()
FROM workspace_members
WHERE workspace_id != 'a914211b-f27a-432f-a2e7-ed510e2cdfd0'
GROUP BY keycloak_sub, email, name, avatar_url
ON CONFLICT (workspace_id, keycloak_sub) DO NOTHING;
