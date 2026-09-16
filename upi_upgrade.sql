-- 1. ADD NEW STATUSES TO ENUMS
-- In PostgreSQL, you cannot just ALTER TYPE to add multiple values in one statement safely if they might exist.
-- To make this safe to run multiple times, we use DO blocks.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'Verification Pending') THEN
        ALTER TYPE order_status ADD VALUE 'Verification Pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'Payment Failed') THEN
        ALTER TYPE order_status ADD VALUE 'Payment Failed';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'payment_status' AND e.enumlabel = 'Verification Pending') THEN
        ALTER TYPE payment_status ADD VALUE 'Verification Pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'payment_status' AND e.enumlabel = 'Rejected') THEN
        ALTER TYPE payment_status ADD VALUE 'Rejected';
    END IF;
END $$;

-- 2. ADD COLUMNS TO ORDERS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'utr') THEN
        ALTER TABLE orders ADD COLUMN utr VARCHAR(100) UNIQUE;
    ELSE
        BEGIN
            ALTER TABLE orders ADD CONSTRAINT unique_utr UNIQUE (utr);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore if constraint already exists or unique violation occurs
        END;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'screenshot_url') THEN
        ALTER TABLE orders ADD COLUMN screenshot_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) DEFAULT 'Manual UPI';
    END IF;
END $$;
