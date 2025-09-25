// Environment variables should be stored in a .env file
// and loaded using a library like dotenv.
// For this example, we'll define them here.
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL || 'your_shiprocket_api_user_email';
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD || 'your_shiprocket_api_user_password';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your_shiprocket_webhook_secret';

let shiprocketToken = null;

/**
 * ==============================================================================
 * SHIPROCKET API AUTHENTICATION
 * ==============================================================================
 * This function authenticates with the Shiprocket API to get a token.
 * The token is required for all subsequent API calls.
 * Shiprocket tokens expire, so in a production app, you should refresh
 * this token periodically or before it expires.
 */
async function getShiprocketToken() {
    // If we already have a token, you might want to check its expiry
    // before re-authenticating. For simplicity, we'll re-authenticate each time
    // the server starts or when the token is null.
    if (shiprocketToken) {
        return shiprocketToken;
    }

    try {
        console.log("Attempting to authenticate with Shiprocket...");
        const response = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: SHIPROCKET_EMAIL,
                password: SHIPROCKET_PASSWORD
            })
        });

        const data = await response.json();

        if (response.ok && data.token) {
            shiprocketToken = data.token;
            console.log('Successfully authenticated with Shiprocket!');
            return shiprocketToken;
        } else {
            console.error('Shiprocket authentication failed:', data);
            return null;
        }
    } catch (error) {
        console.error('Error during Shiprocket authentication:', error);
        return null;
    }
}


/**
 * ==============================================================================
 * API ROUTES
 * ==============================================================================
 */

// Health check route
app.get('/', (req, res) => {
    res.status(200).json({
        message: ' backend is running.'
    });
});


/**
 * Route to create a new order in Shiprocket.
 * This is an example of how you would push an order from your
 * e-commerce system to Shiprocket for fulfillment.
 * after payment is confirmed.
 */
app.post('/api/create-order', async (req, res) => {
    const token = await getShiprocketToken();
    if (!token) {
        return res.status(500).json({
            error: 'Could not authenticate with Shiprocket.'
        });
    }


    const orderData = req.body;

    // Basic validation: Check if the request body is empty.
    // In a production application, you should add more robust validation here
    // using a library like Joi or Zod to ensure all required fields are present.
    if (!orderData || Object.keys(orderData).length === 0) {
        return res.status(400).json({ error: 'Order data is missing or empty in the request body.' });
    }

    // Automatically generate order_id and order_date if not provided by the frontend,
    // which is a good practice.
    if (!orderData.order_id) {
        orderData.order_id = `ORD-${Date.now()}`;
    }
    if (!orderData.order_date) {
        orderData.order_date = new Date().toISOString().slice(0, 10);
    }


    try {
        const response = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });

        const responseData = await response.json();

        if (response.ok) {
            console.log('Order created successfully:', responseData);
            res.status(200).json({
                message: 'Order created successfully in Shiprocket!',
                data: responseData
            });
        } else {
            console.error('Failed to create Shiprocket order:', responseData);
            res.status(response.status).json({
                error: 'Failed to create order.',
                details: responseData
            });
        }
    } catch (error) {
        console.error('Error creating Shiprocket order:', error);
        res.status(500).json({
            error: 'An internal server error occurred.'
        });
    }
});


/**
 * ==============================================================================
 * SHIPROCKET WEBHOOK HANDLER
 * ==============================================================================
 * This endpoint receives real-time updates from Shiprocket about order statuses.
 * Shiprocket sends an 'X-Shiprocket-Hmacsha256' header for verification.
 */
app.post('/webhook/shiprocket', (req, res) => {
    const receivedHmac = req.headers['x-shiprocket-hmacsha256'];

    if (!receivedHmac) {
        return res.status(401).send('HMAC signature is missing.');
    }

    try {
        // Create an HMAC SHA256 hash of the request body
        const generatedHmac = crypto
            .createHmac('sha256', WEBHOOK_SECRET)
            .update(JSON.stringify(req.body))
            .digest('base64');

        // Compare the generated HMAC with the one received from Shiprocket
        if (generatedHmac !== receivedHmac) {
            console.warn('HMAC verification failed. Webhook may not be from Shiprocket.');
            return res.status(401).send('HMAC signature verification failed.');
        }

        // HMAC is verified. Now you can process the webhook payload.
        const webhookData = req.body;
        console.log('Received valid webhook from Shiprocket:', JSON.stringify(webhookData, null, 2));

        // ------------ YOUR BUSINESS LOGIC HERE ------------
        // For example, update the order status in your e-commerce database.
        //
        // const { order_id, current_status } = webhookData;
        // db.orders.update({ _id: order_id }, { $set: { status: current_status } });
        //
        // ----------------------------------------------------

        // Respond to Shiprocket to acknowledge receipt of the webhook
        res.status(200).json({
            message: 'Webhook received successfully.'
        });

    } catch (error) {
        console.error('Error processing Shiprocket webhook:', error);
        res.status(500).send('An error occurred while processing the webhook.');
    }
});