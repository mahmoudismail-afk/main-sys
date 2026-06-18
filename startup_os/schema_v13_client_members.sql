-- ==========================================
-- SCHEMA V13: Restore Client Members
-- ==========================================

CREATE TABLE IF NOT EXISTS client_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apply the same open policy as the rest of the database
ALTER TABLE client_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON client_members;
CREATE POLICY "Allow all access" ON client_members FOR ALL USING (true) WITH CHECK (true);
