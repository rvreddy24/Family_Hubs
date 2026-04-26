/**
 * Placeholder for escrow and payout flows (Razorpay, Stripe, etc.)
 */
import { Router } from 'express';

export const paymentsRouter = Router();

/**
 * Create an escrow hold intent (stub: returns mock client secret).
 * Integrate: Razorpay order | Stripe PaymentIntent with application fee
 */
paymentsRouter.post('/escrow/hold', (req, res) => {
  const { amount, currency = 'INR', taskId, userId } = req.body ?? {};
  if (!taskId) {
    return res.status(400).json({ error: 'taskId required' });
  }
  return res.status(201).json({
    ok: true,
    message: 'Stub: wire Razorpay/Stripe here. No charge created.',
    mock: {
      amount: amount ?? 0,
      currency,
      taskId,
      userId: userId ?? 'unknown',
    },
  });
});

paymentsRouter.get('/config', (_req, res) => {
  return res.json({
    razorpayKeyId: process.env.RAZORPAY_KEY_ID ? '(set)' : null,
    stripePublishable: process.env.STRIPE_PUBLISHABLE_KEY ? '(set)' : null,
  });
});
