-- 1. Add Unique Constraints for PayPal transactions to prevent duplicates
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS paypal_order_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS paypal_transaction_id VARCHAR(255) UNIQUE;

-- 2. Setup Automatic Cleanup for Unpaid Pending Orders (older than 30 minutes)
-- Ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a secure cleanup function
CREATE OR REPLACE FUNCTION cleanup_stale_pending_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark orders as 'Cancelled' instead of deleting to keep a record,
  -- OR you can choose to DELETE them if you prefer. 
  -- We will mark them Cancelled to be safe and restore stock if necessary.
  
  UPDATE public.orders
  SET 
      status = 'Cancelled',
      payment_status = 'Failed',
      updated_at = NOW()
  WHERE 
      status = 'Pending' 
      AND payment_status = 'Pending'
      AND created_at < NOW() - INTERVAL '30 minutes';
      
  -- Note: If stock was reserved upon creation, we would need to restore it here.
  -- In PrajCraft, stock is currently only reduced upon 'Confirmed', 
  -- so we don't need to refund stock for abandoned Pending orders.
END;
$$;

-- Schedule the cron job to run every 5 minutes
SELECT cron.schedule('cleanup-stale-orders', '*/5 * * * *', 'SELECT cleanup_stale_pending_orders()');
