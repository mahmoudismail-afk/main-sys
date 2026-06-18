-- ==========================================
-- SCHEMA V12: Security Invoker Fix
-- ==========================================
-- This resolves the Supabase warning about SECURITY DEFINER on views.
-- By setting security_invoker = true, the view will correctly enforce Row Level Security (RLS) 
-- based on the user querying the view, rather than the user who created it.

DROP VIEW IF EXISTS client_profitability_view;

CREATE OR REPLACE VIEW client_profitability_view WITH (security_invoker = true) AS
SELECT 
    c.id AS client_id,
    c.name AS client_name,
    COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'paid'), 0) AS total_revenue,
    0 AS total_infrastructure_cost,
    (COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'paid'), 0)) AS net_margin,
    100 AS margin_percentage
FROM 
    clients c
LEFT JOIN 
    invoices i ON c.id = i.client_id
GROUP BY 
    c.id, c.name;
