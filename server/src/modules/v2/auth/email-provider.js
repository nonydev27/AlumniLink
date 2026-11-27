import { config } from '../../../config.js';

/**
 * Email delivery adapters. A null provider means "no delivery capability":
 * callers must leave work queued and never report an email as delivered.
 *
 * - console: writes the whole message to the worker log (local development only).
 * - http: posts a JSON message to a configured HTTP mail API with a bearer key.
 * - none: no adapter selected.
 */
const consoleProvider = {
  name: 'console',
  async send(message) {
    console.info('[email:console]', JSON.stringify({
      to: message.to,
      subject: message.subject,
      text: message.text,
      idempotencyKey: message.idempotencyKey,
    }));
    return { acknowledged: true, providerReference: `console:${message.idempotencyKey}` };
  },
};

const httpProvider = {
  name: 'http',
  async send(message) {
    const response = await fetch(config.emailApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.emailApiKey}`,
      },
      body: JSON.stringify({
        from: config.emailFrom,
        to: message.to,
        subject: message.subject,
        text: message.text,
        idempotencyKey: message.idempotencyKey,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const error = new Error(`Email provider returned ${response.status}.`);
      error.code = 'provider_delivery_failed';
      throw error;
    }
    const body = await response.json().catch(() => ({}));
    if (body.acknowledged === false) return { acknowledged: false };
    return {
      acknowledged: true,
      providerReference: String(body.id || body.providerReference || body.messageId || `http:${message.idempotencyKey}`),
    };
  },
};

export function getEmailDeliveryProvider() {
  if (config.emailProvider === 'console') return consoleProvider;
  if (config.emailProvider === 'http' && config.emailApiUrl && config.emailApiKey) return httpProvider;
  return null;
}
