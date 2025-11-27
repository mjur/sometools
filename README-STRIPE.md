# Stripe Donation Setup

This document explains how to set up Stripe for the donation functionality.

## Frontend Configuration

1. **Get your Stripe Publishable Key:**
   - Sign up at [stripe.com](https://stripe.com)
   - Go to Developers → API keys
   - Copy your **Publishable key** (starts with `pk_test_` for test mode or `pk_live_` for production)

2. **Update the JavaScript file:**
   - Open `js/donate.js`
   - Replace `STRIPE_PUBLISHABLE_KEY` with your publishable key:
     ```javascript
     const STRIPE_PUBLISHABLE_KEY = 'pk_test_your_key_here';
     ```

## Backend Setup

The donation feature requires a backend endpoint to create Stripe Checkout sessions. You need to create an API endpoint at `/api/create-checkout-session`.

### Example Backend Implementation

#### Node.js/Express Example:

```javascript
const express = require('express');
const stripe = require('stripe')('sk_test_your_secret_key_here'); // Your secret key
const app = express();

app.use(express.json());

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: 'DevTools Donation',
              description: 'Thank you for supporting DevTools!',
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/?donation=success`,
      cancel_url: `${req.headers.origin}/?donation=cancelled`,
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

#### Python/Flask Example:

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import stripe

app = Flask(__name__)
CORS(app)

stripe.api_key = 'sk_test_your_secret_key_here'  # Your secret key

@app.route('/api/create-checkout-session', methods=['POST'])
def create_checkout_session():
    try:
        data = request.json
        amount = data.get('amount')
        currency = data.get('currency', 'usd')

        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': currency,
                    'product_data': {
                        'name': 'DevTools Donation',
                        'description': 'Thank you for supporting DevTools!',
                    },
                    'unit_amount': amount,  # Amount in cents
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=request.headers.get('Origin', '') + '/?donation=success',
            cancel_url=request.headers.get('Origin', '') + '/?donation=cancelled',
        )

        return jsonify({'id': session.id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=3000)
```

## Security Notes

1. **Never expose your Secret Key** - Only use the publishable key in frontend code
2. **Use HTTPS** - Stripe requires HTTPS in production
3. **Validate amounts** - Add server-side validation for donation amounts
4. **Rate limiting** - Consider adding rate limiting to prevent abuse

## Testing

1. Use Stripe test mode keys (`pk_test_` and `sk_test_`)
2. Use test card numbers from [Stripe's testing documentation](https://stripe.com/docs/testing)
3. Common test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

## Production Deployment

1. Switch to live keys (`pk_live_` and `sk_live_`)
2. Ensure your backend endpoint is accessible via HTTPS
3. Update CORS settings if needed
4. Test the full donation flow

## Alternative: Stripe Payment Links

If you don't want to set up a backend, you can use Stripe Payment Links:

1. Create a Payment Link in Stripe Dashboard
2. Replace the donation button to redirect directly to the Payment Link
3. This is simpler but less flexible (fixed amounts, no custom amounts)

