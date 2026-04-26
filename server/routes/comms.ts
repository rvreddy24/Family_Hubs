/**
 * Outbound comms (WhatsApp, SMS) — stub endpoints for v1.0
 */
import { Router } from 'express';

export const commsRouter = Router();

/**
 * Enqueue an SOS message to a WhatsApp template (Meta Cloud API, Twilio, etc.)
 */
commsRouter.post('/sos/relay', (req, res) => {
  const { parentName, hubId, toE164, locale } = req.body ?? {};
  if (!toE164) {
    return res.status(400).json({ error: 'toE164 (recipient phone) required' });
  }
  return res.status(202).json({
    ok: true,
    message: 'Stub: register WhatsApp Business template and call provider API from worker.',
    queued: {
      parentName: parentName ?? 'parent',
      hubId: hubId ?? 'unknown',
      toE164,
      locale: locale ?? 'en',
    },
  });
});
