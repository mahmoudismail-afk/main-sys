-- Add an end_date column to the expenses table for tracking subscription expirations
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='end_date') THEN
        ALTER TABLE expenses ADD COLUMN end_date DATE;
    END IF;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
