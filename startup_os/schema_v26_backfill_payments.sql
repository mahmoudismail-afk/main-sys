-- Backfill missing payment records for invoices that are already marked as "Paid"
-- This ensures they appear in the Payments Ledger

DO $$ 
DECLARE 
    inv RECORD;
BEGIN 
    -- Loop through all invoices that are 'paid' but don't have a corresponding payment record
    FOR inv IN 
        SELECT id, client_id, amount, due_date, issued_at
        FROM invoices 
        WHERE status = 'paid' 
          AND id NOT IN (SELECT invoice_id FROM payments WHERE invoice_id IS NOT NULL)
    LOOP 
        -- Insert a payment record to reconcile the paid invoice
        -- We use the invoice's due_date or issued_at as the payment_date if available, otherwise today
        INSERT INTO payments (invoice_id, client_id, amount, payment_method, payment_date)
        VALUES (
            inv.id, 
            inv.client_id, 
            inv.amount, 
            'Main Cash', 
            COALESCE(inv.due_date, inv.issued_at, CURRENT_DATE)
        );
    END LOOP; 
END $$;
