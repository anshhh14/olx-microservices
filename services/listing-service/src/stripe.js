const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn(
    'STRIPE_SECRET_KEY is not set — checkout endpoints will fail until it is configured.'
  );
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

module.exports = { stripe, FRONTEND_URL };
