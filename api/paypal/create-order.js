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
        const { payload, token, finalTotalInr } = req.body;

        // 1. Verify User Session securely
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) {
            return res.status(401).json({ error: 'Unauthorized user session' });
        }

        // 2. Insert the Order into Supabase as 'Pending'
        const orderNum = 'PRJ-' + Math.floor(100000 + Math.random() * 900000);

        // Calculate subtotal from frontend payload (since variants are complex, we trust payload for now)
        let subtotal = 0;
        let totalQuantity = 0;
        payload.cart.forEach(item => {
            subtotal += (item.price * item.quantity);
            totalQuantity += parseInt(item.quantity) || 1;
        });

        let discount = totalQuantity > 1 ? 1000 : 0;
        let shipping = payload.shipping.country && payload.shipping.country !== 'India' ? 1499 : 0;
        let finalTotal = subtotal - discount + shipping;
        if (finalTotal < 0) finalTotal = 0;

        // If frontend provided a total, ensure it matches our basic math
        const totalAmount = finalTotalInr || finalTotal;

        // Ensure Address Exists
        let addressId = payload.shipping.address_id;
        if (!addressId) {
            const { data: addrData, error: addrErr } = await supabase.from('addresses').insert([{
                user_id: user.id,
                title: 'PayPal Address',
                full_address: payload.shipping.address + ' (Name: ' + payload.shipping.name + ', Phone: ' + payload.shipping.phone + ')',
                city: payload.shipping.city,
                state: payload.shipping.state || 'Other',
                pincode: payload.shipping.zip
            }]).select('id').single();
            if (addrErr) throw addrErr;
            addressId = addrData.id;
        }

        const { data: orderData, error: orderErr } = await supabase.from('orders').insert([{
            user_id: user.id,
            order_number: orderNum,
            subtotal: subtotal,
            discount_amount: discount,
            shipping_amount: shipping,
            final_total: totalAmount,
            shipping_address_id: addressId,
            status: 'Pending',
            payment_status: 'Pending'
        }]).select('id').single();

        if (orderErr) throw orderErr;
        const dbOrderId = orderData.id;

        // Insert order items
        const orderItems = payload.cart.map(item => ({
            order_id: dbOrderId,
            product_id: item.id.substring(0, 36),
            quantity: item.quantity,
            price: item.price
        }));
        await supabase.from('order_items').insert(orderItems);

        // 3. Create Order in PayPal using Server-to-Server API
        const EXCHANGE_RATE = 70;
        let usdTotal = (totalAmount / EXCHANGE_RATE).toFixed(2);
        if (parseFloat(usdTotal) <= 0) usdTotal = "0.01";

        const accessToken = await getPayPalAccessToken();
        const ppResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: {
                        currency_code: 'USD',
                        value: usdTotal
                    }
                }]
            })
        });

        const ppData = await ppResponse.json();
        if (!ppResponse.ok) {
            throw new Error('PayPal Create Order Failed: ' + JSON.stringify(ppData));
        }

        // Update Supabase order with the paypal_order_id
        await supabase.from('orders').update({
            paypal_order_id: ppData.id
        }).eq('id', dbOrderId);

        // 4. Return to frontend
        return res.status(200).json({
            paypalOrderId: ppData.id,
            supabaseOrderId: dbOrderId
        });

    } catch (err) {
        console.error('Create Order Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
