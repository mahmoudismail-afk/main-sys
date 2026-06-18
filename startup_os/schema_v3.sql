-- ==========================================
-- SCHEMA V3: Startup OS & CFO Expansion
-- ==========================================

-- 1. Projects & Deliverables
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'planning',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    due_date DATE,
    owner TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    engagement_id UUID REFERENCES engagements(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'todo',
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CFO Operations
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    meeting_date TIMESTAMPTZ,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT,
    status TEXT DEFAULT 'needs_update',
    last_reviewed DATE,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sales & Marketing
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'planned',
    channel TEXT,
    budget NUMERIC,
    spent NUMERIC DEFAULT 0,
    roi NUMERIC DEFAULT 0,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. HR & Team
CREATE TABLE IF NOT EXISTS employee_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT,
    salary NUMERIC,
    start_date DATE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_applicants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_applied TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    status TEXT DEFAULT 'sourced',
    resume_url TEXT,
    applied_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Legal & Compliance
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    effective_date DATE,
    expiration_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    due_date DATE,
    last_checked DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Investor Relations
CREATE TABLE IF NOT EXISTS investors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    firm TEXT,
    status TEXT DEFAULT 'prospect',
    commitment_amount NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS funding_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    target_amount NUMERIC,
    raised_amount NUMERIC DEFAULT 0,
    target_date DATE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Customer Support
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'medium',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Enforcement
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Founders Full Access Policies
DO $$ 
DECLARE 
    t TEXT;
    tables TEXT[] := ARRAY['projects', 'deliverables', 'tasks', 'meetings', 'documents', 'marketing_campaigns', 'employee_records', 'job_applicants', 'contracts', 'compliance_logs', 'investors', 'funding_milestones', 'support_tickets'];
BEGIN 
    FOREACH t IN ARRAY tables 
    LOOP 
        EXECUTE format('CREATE POLICY "Founders full access %I" ON %I FOR ALL USING (auth.is_business_founder() OR auth.is_dev_founder())', t, t);
    END LOOP; 
END $$;
