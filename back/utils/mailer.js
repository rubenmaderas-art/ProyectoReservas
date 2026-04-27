let cachedTransporter = null;
let cachedMode = null;

const normalize = (value) => String(value ?? '').trim();

const hasSmtpEndpoint = () => {
  const host = normalize(process.env.MAIL_HOST);
  const port = normalize(process.env.MAIL_PORT);
  return Boolean(host && port);
};

const getTransportMode = () => {
  if (cachedMode) return cachedMode;

  const requestedMode = normalize(process.env.MAIL_TRANSPORT).toLowerCase();
  if (requestedMode === 'smtp' && hasSmtpEndpoint()) {
    cachedMode = 'smtp';
    return cachedMode;
  }

  if (requestedMode === 'json' || requestedMode === 'mock') {
    cachedMode = requestedMode;
    return cachedMode;
  }

  cachedMode = hasSmtpEndpoint() ? 'smtp' : 'json';
  return cachedMode;
};

const buildTransporter = () => {
  const mode = getTransportMode();

  if (mode === 'smtp') {
    let nodemailer;
    try {
      // Cargamos nodemailer solo cuando realmente vamos a usar SMTP.
      nodemailer = require('nodemailer');
    } catch (error) {
      console.warn('Nodemailer no está instalado, usando transporte JSON temporal:', error.message);
      cachedMode = 'json';
      return {
        sendMail: async (message) => ({
          messageId: `preview-${Date.now()}`,
          response: 'nodemailer_missing',
          message: JSON.stringify(message),
        }),
      };
    }

    return nodemailer.createTransport({
      host: normalize(process.env.MAIL_HOST),
      port: Number.parseInt(process.env.MAIL_PORT || '587', 10),
      secure: String(process.env.MAIL_SECURE || 'false').toLowerCase() === 'true',
      ...(normalize(process.env.MAIL_USER) && normalize(process.env.MAIL_PASS) ? {
        auth: {
          user: normalize(process.env.MAIL_USER),
          pass: normalize(process.env.MAIL_PASS),
        },
      } : {}),
    });
  }

  return {
    sendMail: async (message) => ({
      messageId: `json-${Date.now()}`,
      response: 'json_transport',
      message: JSON.stringify(message),
    }),
  };
};

const getTransporter = () => {
  if (!cachedTransporter) {
    cachedTransporter = buildTransporter();
  }
  return cachedTransporter;
};

const getMailFrom = () => {
  const from = normalize(process.env.MAIL_FROM);
  if (from) return from;

  const user = normalize(process.env.MAIL_USER);
  if (user) return user;

  return 'no-reply@reservas.local';
};

const isEmailAddress = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalize(value));

const resolveRecipient = (candidate, { allowTestRecipient = false } = {}) => {
  const useOverride = String(process.env.MAIL_USE_OVERRIDE || '').toLowerCase() === 'true';
  const override = useOverride ? normalize(process.env.MAIL_TO_OVERRIDE) : '';
  const forcedRecipient = override || (allowTestRecipient ? normalize(process.env.MAIL_TEST_RECIPIENT) : '');
  const nextRecipient = forcedRecipient || normalize(candidate);
  return isEmailAddress(nextRecipient) ? nextRecipient : null;
};

const sendMail = async ({ to, subject, text, html, replyTo }) => {
  const resolvedRecipient = resolveRecipient(to);
  if (!resolvedRecipient) {
    return {
      skipped: true,
      reason: 'missing_recipient',
      transportMode: getTransportMode(),
    };
  }

  const info = await getTransporter().sendMail({
    from: getMailFrom(),
    to: resolvedRecipient,
    subject,
    text,
    html,
    replyTo: replyTo || undefined,
  });

  return {
    skipped: false,
    transportMode: getTransportMode(),
    recipient: resolvedRecipient,
    messageId: info.messageId || null,
    response: info.response || null,
    preview: info.message ? String(info.message) : null,
  };
};

module.exports = {
  isEmailAddress,
  resolveRecipient,
  sendMail,
  getTransportMode,
  getMailFrom,
};
