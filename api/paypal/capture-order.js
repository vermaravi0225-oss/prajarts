import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PAYPAL_API_URL = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';

// PayPal access token generator
async function getPayPalAccessToken() {
    const auth = Buffer.from(PAYPAL_CLIENT_ID + ':' + PAYPAL_SECRET).toString('base64');
    const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
        method: 'POST',
        body: 'grant_type=client_credentials',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    const data = await response.json();
    if (!response.ok) throw new Error('Failed to get PayPal token: ' + data.error_description);
    return data.access_token;
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { paypalOrderId, supabaseOrderId, token } = req.body;
        
        if (!paypalOrderId || !supabaseOrderId || !token) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // 1. Verify User Session securely
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) {
            return res.status(401).json({ error: 'Unauthorized user session' });
        }

        // 2. Fetch the existing pending order to ensure it belongs to the user and is still Pending
        const { data: order, error: fetchErr } = await supabase
            .from('orders')
            .select('id, status, payment_status, paypal_order_id, user_id')
            .eq('id', supabaseOrderId)
            .single();

        if (fetchErr || !order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.user_id !== user.id) {
            return res.status(403).json({ error: 'Order belongs to another user' });
        }

        if (order.paypal_order_id !== paypalOrderId) {
            return res.status(400).json({ error: 'PayPal Order ID mismatch' });
        }

        if (order.status === 'Confirmed' || order.payment_status === 'Paid') {
            return res.status(400).json({ error: 'Order already processed' });
        }

        // 3. Capture PayPal Order securely from backend
        const accessToken = await getPayPalAccessToken();
        const ppResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${paypalOrderId}/capture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        const ppData = await ppResponse.json();
        
        // Handle unprocessable entity (e.g., already captured)
        if (!ppResponse.ok && ppData.name !== 'ORDER_ALREADY_CAPTURED') {
            throw new Error('PayPal Capture Failed: ' + JSON.stringify(ppData));
        }

        // If it was already captured previously but our DB didn't update, we check the actual order status
        let transactionId = null;
        let isCompleted = false;

        if (ppData.name === 'ORDER_ALREADY_CAPTURED') {
             const checkResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${paypalOrderId}`, {
                 method: 'GET',
                 headers: { 'Authorization': `Bearer ${accessToken}` }
             });
             const checkData = await checkResponse.json();
             isCompleted = checkData.status === 'COMPLETED';
             if (isCompleted && checkData.purchase_units[0].payments.captures.length > 0) {
                 transactionId = checkData.purchase_units[0].payments.captures[0].id;
             }
        } else {
             isCompleted = ppData.status === 'COMPLETED';
             if (isCompleted && ppData.purchase_units[0].payments.captures.length > 0) {
                 transactionId = ppData.purchase_units[0].payments.captures[0].id;
             }
        }

        if (!isCompleted) {
            // Update order to Failed
            await supabase.from('orders').update({
                payment_status: 'Failed',
                status: 'Payment Failed'
            }).eq('id', supabaseOrderId);
            return res.status(400).json({ error: 'Payment was not successfully completed.' });
        }

        // 4. Verification Successful. Update Supabase Database securely using Service Role
        const { error: updateErr } = await supabase.from('orders').update({
            payment_status: 'Paid',
            status: 'Confirmed',
            paypal_transaction_id: transactionId,
            updated_at: new Date().toISOString()
        }).eq('id', supabaseOrderId);

        if (updateErr) {
            // Check if error is due to duplicate transaction ID constraint
            if (updateErr.code === '23505') {
                return res.status(400).json({ error: 'This transaction was already processed.' });
            }
            throw updateErr;
        }

        // 5. Safely Reduce Stock for this order
        const { data: orderItems } = await supabase.from('order_items').select('product_id, quantity').eq('order_id', supabaseOrderId);
        if (orderItems) {
            for (let item of orderItems) {
                await supabase.rpc('reduce_stock', {
                    p_product_id: item.product_id,
                    quantity_to_reduce: item.quantity
                });
            }
        }

        // Return success to frontend
        return res.status(200).json({ success: true, orderId: supabaseOrderId });

    } catch (err) {
        console.error('Capture Order Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
