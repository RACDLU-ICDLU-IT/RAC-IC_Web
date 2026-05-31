-- 1. Add tenant_id to all relevant tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE page_content ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE board_members ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE form_responses ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE fee_ledger ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE fee_templates ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- 2. Update existing rows to default 'icdlu' tenant
UPDATE users SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE events SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE projects SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE gallery SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE attendance SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE announcements SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE page_content SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE settings SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE documents SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE news SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE board_members SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE sponsors SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE forms SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE form_responses SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE reminders SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE resources SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE fee_ledger SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE fee_templates SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE contact_messages SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;

-- Make existing form sections and fields compatible
ALTER TABLE form_sections ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE form_sections SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;
UPDATE form_fields SET tenant_id = 'icdlu' WHERE tenant_id IS NULL;

-- 3. Duplicate and rename existing settings for both tenants

-- ICDLU Theme
UPDATE settings SET id = 'icdlu-theme' WHERE id = 'theme';
-- RACDLU Theme
INSERT INTO settings (id, data, tenant_id)
SELECT 'racdlu-theme', data, 'racdlu' FROM settings WHERE id = 'icdlu-theme'
ON CONFLICT DO NOTHING;

-- ICDLU Global
UPDATE settings SET id = 'icdlu-global' WHERE id = 'global';
-- RACDLU Global
INSERT INTO settings (id, data, tenant_id)
SELECT 'racdlu-global', data, 'racdlu' FROM settings WHERE id = 'icdlu-global'
ON CONFLICT DO NOTHING;


-- 4. Enable RLS and add Policies for multi-tenancy

-- Helper function to get the current user's tenant_id quickly
CREATE OR REPLACE FUNCTION get_user_tenant_id() RETURNS TEXT AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Let's define policies that enforce tenant boundary

DO $$
DECLARE
  table_name record;
BEGIN
  FOR table_name IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    -- If the table has tenant_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = table_name.tablename AND column_name = 'tenant_id') THEN
      
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', table_name.tablename);
      
      -- Remove vulnerable isolation policy
      EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Select" ON %I;', table_name.tablename);
      
      -- 1. Authenticated users can read their own tenant's data:
      EXECUTE format(
        'CREATE POLICY "Tenant Auth Read" ON %I FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());',
        table_name.tablename
      );
      
      -- 2. Public (unauthenticated) read for specific tables only (whitelist approach)
      IF table_name.tablename IN ('events', 'news', 'gallery', 'board_members', 'sponsors', 'page_content', 'settings') THEN
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Public Read" ON %I;', table_name.tablename);
        EXECUTE format('CREATE POLICY "Tenant Public Read" ON %I FOR SELECT TO anon USING (true);', table_name.tablename);
      END IF;
      
      EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Modify" ON %I;', table_name.tablename);
      EXECUTE format('CREATE POLICY "Tenant Isolation Modify" ON %I FOR ALL USING (tenant_id = public.get_user_tenant_id() AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN (''admin'', ''master_admin'')));', table_name.tablename);
      
    END IF;
  END LOOP;
END;
$$;
