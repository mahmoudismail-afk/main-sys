-- ==========================================
-- SCHEMA V16: System Health & Table Restore
-- ==========================================

-- 1. Ensure columns exist (to fix schema cache errors)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE deployments 
ADD COLUMN IF NOT EXISTS cloudflare_route_id TEXT,
ADD COLUMN IF NOT EXISTS version TEXT;

-- 2. Command Center (AgencyHQ) Tables
CREATE TABLE IF NOT EXISTS okrs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT,
    status TEXT DEFAULT 'not_started',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS decisions_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    context TEXT,
    rationale TEXT,
    outcome TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Engineering Tables
CREATE TABLE IF NOT EXISTS roadmap_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    area TEXT,
    priority TEXT,
    status TEXT DEFAULT 'planned',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deployment_id UUID REFERENCES deployments(id) ON DELETE CASCADE,
    status TEXT,
    details TEXT,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Executive Dashboard Tables
CREATE TABLE IF NOT EXISTS deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Open Access Policy Application
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access" ON okrs;
DROP POLICY IF EXISTS "Allow all access" ON decisions_log;
DROP POLICY IF EXISTS "Allow all access" ON roadmap_tasks;
DROP POLICY IF EXISTS "Allow all access" ON sync_logs;
DROP POLICY IF EXISTS "Allow all access" ON deliverables;

CREATE POLICY "Allow all access" ON okrs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON decisions_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON roadmap_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON sync_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON deliverables FOR ALL USING (true) WITH CHECK (true);

-- Force PostgREST cache to completely reload
NOTIFY pgrst, 'reload schema';
