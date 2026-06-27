-- ==========================================
-- SCHEMA V35: Client Expenses
-- ==========================================
-- This migration adds the client_id column to expenses 
-- and updates the client_profitability_view to properly calculate margins
-- using subqueries to prevent SQL fan-out.

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

DROP VIEW IF EXISTS client_profitability_view;

CREATE OR REPLACE VIEW client_profitability_view WITH (security_invoker = true) AS
SELECT 
    c.id AS client_id,
    c.name AS client_name,
    COALESCE(
        (SELECT SUM(amount) FROM invoices i WHERE i.client_id = c.id AND i.status = 'paid'), 
    0) AS total_revenue,
    COALESCE(
        (SELECT SUM(e.amount) 
         FROM expenses e 
         LEFT JOIN deployments d ON e.deployment_id = d.id 
         WHERE e.client_id = c.id OR d.client_id = c.id), 
    0) AS total_infrastructure_cost,
    (
        COALESCE((SELECT SUM(amount) FROM invoices i WHERE i.client_id = c.id AND i.status = 'paid'), 0)
        - 
        COALESCE((SELECT SUM(e.amount) FROM expenses e LEFT JOIN deployments d ON e.deployment_id = d.id WHERE e.client_id = c.id OR d.client_id = c.id), 0)
    ) AS net_margin,
    CASE 
        WHEN COALESCE((SELECT SUM(amount) FROM invoices i WHERE i.client_id = c.id AND i.status = 'paid'), 0) = 0 THEN 0
        ELSE 
            (
                (COALESCE((SELECT SUM(amount) FROM invoices i WHERE i.client_id = c.id AND i.status = 'paid'), 0) - 
                 COALESCE((SELECT SUM(e.amount) FROM expenses e LEFT JOIN deployments d ON e.deployment_id = d.id WHERE e.client_id = c.id OR d.client_id = c.id), 0))
                / COALESCE((SELECT SUM(amount) FROM invoices i WHERE i.client_id = c.id AND i.status = 'paid'), 0)
            ) * 100
    END AS margin_percentage
FROM 
    clients c;
