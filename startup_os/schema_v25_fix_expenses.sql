-- Fix for the expenses table to add missing columns and support recurring subscriptions
DO $$ 
BEGIN 
    -- 1. Add description column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='description') THEN
        ALTER TABLE expenses ADD COLUMN description TEXT;
    END IF;

    -- 2. Rename expense_date to date if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='expense_date') THEN
        ALTER TABLE expenses RENAME COLUMN expense_date TO date;
    END IF;

    -- 3. Add recurring payment columns for subscriptions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='is_recurring') THEN
        ALTER TABLE expenses ADD COLUMN is_recurring BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='billing_cycle') THEN
        ALTER TABLE expenses ADD COLUMN billing_cycle TEXT;
    END IF;
END $$;

-- Drop the old constraint that prevents 'subscriptions' from being a valid category
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
