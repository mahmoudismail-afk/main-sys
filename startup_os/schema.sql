-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Enable Supabase Vault for secure storage of credentials
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

-- ==========================================
-- 1. Agency HQ & Strategy
-- ==========================================
CREATE TABLE okrs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('objective', 'key_result')),
    parent_id UUID REFERENCES okrs(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'not_started',
    progress INTEGER DEFAULT 0,
    target_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE decisions_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    context TEXT,
    rationale TEXT,
    decision_maker_id UUID,
    outcome TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. CRM & Client Operations
-- ==========================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'onboarding' CHECK (status IN ('active', 'onboarding', 'churned')),
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    onboarding_step TEXT,
    gdrive_folder_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leads_pipeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name TEXT NOT NULL,
    channel TEXT,
    stage TEXT,
    value NUMERIC(10, 2),
    close_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contract_value NUMERIC(10, 2),
    start_date DATE,
    end_date DATE,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL UNIQUE,
    subject TEXT,
    snippet TEXT,
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. Engineering & Deployments
-- ==========================================
CREATE TABLE roadmap_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT,
    priority TEXT,
    area TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    cloudflare_route_id TEXT,
    version TEXT,
    supabase_url_secret_id UUID, -- References vault.secrets via business logic
    supabase_anon_key_secret_id UUID, -- References vault.secrets via business logic
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hardware_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deployment_id UUID REFERENCES deployments(id) ON DELETE CASCADE,
    hardware_type TEXT NOT NULL,
    mac_address TEXT,
    status TEXT CHECK (status IN ('active', 'maintenance', 'offline')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deployment_id UUID REFERENCES deployments(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('success', 'error')),
    details TEXT,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. Finance & Profitability
-- ==========================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engagement_id UUID REFERENCES engagements(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
    due_date DATE,
    issued_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT CHECK (category IN ('infrastructure', 'capital', 'hardware', 'other')),
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE,
    deployment_id UUID REFERENCES deployments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profitability View
CREATE OR REPLACE VIEW client_profitability_view AS
SELECT 
    c.id AS client_id,
    c.name AS client_name,
    COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'paid'), 0) AS total_revenue,
    COALESCE(SUM(e.amount), 0) AS total_infrastructure_costs,
    (COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'paid'), 0) - COALESCE(SUM(e.amount), 0)) AS net_margin
FROM 
    clients c
LEFT JOIN 
    invoices i ON c.id = i.client_id
LEFT JOIN 
    deployments d ON c.id = d.client_id
LEFT JOIN 
    expenses e ON d.id = e.deployment_id
GROUP BY 
    c.id, c.name;


-- ==========================================
-- RPC for Cloudflare Worker to Get Keys
-- ==========================================
CREATE OR REPLACE FUNCTION get_deployment_keys(p_client_id UUID)
RETURNS json AS $$
DECLARE
    deployment_rec RECORD;
    v_url TEXT;
    v_anon_key TEXT;
BEGIN
    -- Secure function: allow only service role to call it to fetch keys
    IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
        RAISE EXCEPTION 'Unauthorized: Only service_role can access deployment keys';
    END IF;

    SELECT * INTO deployment_rec 
    FROM deployments 
    WHERE client_id = p_client_id 
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Decrypt the Supabase URL secret
    SELECT decrypted_secret INTO v_url 
    FROM vault.decrypted_secrets 
    WHERE id = deployment_rec.supabase_url_secret_id;

    -- Decrypt the Supabase Anon Key secret
    SELECT decrypted_secret INTO v_anon_key 
    FROM vault.decrypted_secrets 
    WHERE id = deployment_rec.supabase_anon_key_secret_id;

    RETURN json_build_object('url', v_url, 'anon_key', v_anon_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

ALTER TABLE roadmap_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Helper function to check roles via custom claims
CREATE OR REPLACE FUNCTION auth.is_business_founder() RETURNS BOOLEAN AS $$
BEGIN
    RETURN (current_setting('request.jwt.claims', true)::json->>'role') = 'business_founder';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.is_dev_founder() RETURNS BOOLEAN AS $$
BEGIN
    RETURN (current_setting('request.jwt.claims', true)::json->>'role') = 'dev_founder';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agency HQ Policies (Both can ALL)
CREATE POLICY "Both founders full access okrs" ON okrs FOR ALL USING (auth.is_business_founder() OR auth.is_dev_founder());
CREATE POLICY "Both founders full access decisions_log" ON decisions_log FOR ALL USING (auth.is_business_founder() OR auth.is_dev_founder());
CREATE POLICY "Both founders full access knowledge_base" ON knowledge_base FOR ALL USING (auth.is_business_founder() OR auth.is_dev_founder());

-- CRM & Client Operations (Business ALL, Dev SELECT)
CREATE POLICY "Business founder full access clients" ON clients FOR ALL USING (auth.is_business_founder());
CREATE POLICY "Dev founder read access clients" ON clients FOR SELECT USING (auth.is_dev_founder());

CREATE POLICY "Business founder full access leads_pipeline" ON leads_pipeline FOR ALL USING (auth.is_business_founder());
CREATE POLICY "Dev founder read access leads_pipeline" ON leads_pipeline FOR SELECT USING (auth.is_dev_founder());

CREATE POLICY "Business founder full access engagements" ON engagements FOR ALL USING (auth.is_business_founder());
CREATE POLICY "Dev founder read access engagements" ON engagements FOR SELECT USING (auth.is_dev_founder());

CREATE POLICY "Business founder full access communications" ON communications FOR ALL USING (auth.is_business_founder());
CREATE POLICY "Dev founder read access communications" ON communications FOR SELECT USING (auth.is_dev_founder());

-- Engineering & Deployments (Dev ALL, Business SELECT)
CREATE POLICY "Dev founder full access roadmap_tasks" ON roadmap_tasks FOR ALL USING (auth.is_dev_founder());
CREATE POLICY "Business founder read access roadmap_tasks" ON roadmap_tasks FOR SELECT USING (auth.is_business_founder());

CREATE POLICY "Dev founder full access deployments" ON deployments FOR ALL USING (auth.is_dev_founder());
CREATE POLICY "Business founder read access deployments" ON deployments FOR SELECT USING (auth.is_business_founder());

CREATE POLICY "Dev founder full access hardware_inventory" ON hardware_inventory FOR ALL USING (auth.is_dev_founder());
CREATE POLICY "Business founder read access hardware_inventory" ON hardware_inventory FOR SELECT USING (auth.is_business_founder());

CREATE POLICY "Dev founder full access sync_logs" ON sync_logs FOR ALL USING (auth.is_dev_founder());
CREATE POLICY "Business founder read access sync_logs" ON sync_logs FOR SELECT USING (auth.is_business_founder());

-- Finance & Profitability (Business ALL, Dev SELECT)
CREATE POLICY "Business founder full access invoices" ON invoices FOR ALL USING (auth.is_business_founder());
CREATE POLICY "Dev founder read access invoices" ON invoices FOR SELECT USING (auth.is_dev_founder());

CREATE POLICY "Business founder full access expenses" ON expenses FOR ALL USING (auth.is_business_founder());
CREATE POLICY "Dev founder read access expenses" ON expenses FOR SELECT USING (auth.is_dev_founder());
