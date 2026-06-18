-- ==========================================
-- SCHEMA V21: Dividend Ledgers (Wallets)
-- ==========================================

-- Add type column to distinguish between internal allocations and actual cash payouts
ALTER TABLE dividends 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'payout';

-- Force API cache to reload
NOTIFY pgrst, 'reload schema';
