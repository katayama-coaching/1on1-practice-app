import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: '有効なメールアドレスを入力してください' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();

  if (!stripeSecretKey) {
    return res.status(200).json({ status: 'trial', customerId: null });
  }

  const stripe = new Stripe(stripeSecretKey);

  try {
    const customers = await stripe.customers.list({ email: normalizedEmail, limit: 1 });

    if (customers.data.length === 0) {
      return res.status(200).json({ status: 'trial', customerId: null });
    }

    const customer = customers.data[0];
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      return res.status(200).json({ status: 'subscribed', customerId: customer.id });
    }

    return res.status(200).json({ status: 'trial', customerId: customer.id });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(200).json({ status: 'trial', customerId: null });
  }
}
