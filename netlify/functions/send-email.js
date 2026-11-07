const nodemailer = require('nodemailer');

const MAX_BODY_BYTES = 32 * 1024;
const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
};

function response(statusCode, body, headers = {}) {
  return { statusCode, headers: { ...HEADERS, ...headers }, body: JSON.stringify(body) };
}

function escapeHtml(value) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]
  );
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  }

  const headers = Object.fromEntries(
    Object.entries(event.headers || {}).map(([key, value]) => [key.toLowerCase(), value])
  );
  const allowedOrigins = new Set(['https://fintechnav.com', 'https://www.fintechnav.com']);
  // Netlify supplies these trusted URLs; the local server supplies its loopback URLs.
  for (const origin of [process.env.URL, process.env.DEPLOY_PRIME_URL]) {
    if (origin) allowedOrigins.add(origin);
  }
  if (headers.origin && !allowedOrigins.has(headers.origin)) {
    return response(403, { error: 'Origin not allowed' });
  }
  if (!/^application\/json(?:\s*;|$)/i.test(headers['content-type'] || '')) {
    return response(415, { error: 'Expected application/json' });
  }
  if (event.isBase64Encoded || typeof event.body !== 'string') {
    return response(400, { error: 'Invalid request body' });
  }
  if (Buffer.byteLength(event.body, 'utf8') > MAX_BODY_BYTES) {
    return response(413, { error: 'Message is too large' });
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return response(400, { error: 'Invalid JSON' });
  }
  if (!data || Array.isArray(data) || typeof data !== 'object') {
    return response(400, { error: 'Invalid contact details' });
  }
  if (![data.name, data.email, data.message].every((value) => typeof value === 'string')) {
    return response(400, { error: 'Name, email and message are required' });
  }
  const name = data.name.trim();
  const email = data.email.trim();
  const message = data.message.trim();
  // Accept one plain address; lists, quoted addresses and controls are unnecessary here.
  const plainEmail =
    /^[^\s<>()\[\],;:"\\@]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/;
  if (
    !name ||
    name.length > 120 ||
    /[\u0000-\u001f\u007f]/.test(name) ||
    !email ||
    email.length > 254 ||
    /[\u0000-\u0020\u007f]/.test(email) ||
    !plainEmail.test(email) ||
    !message ||
    message.length > 10000 ||
    message.includes('\u0000')
  ) {
    return response(400, { error: 'Invalid contact details or message length' });
  }
  if (!process.env.ZOHO_EMAIL || !process.env.ZOHO_APP_PASSWORD) {
    return response(503, { error: 'Contact email is temporarily unavailable' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 587,
      secure: false,
      requireTLS: true,
      tls: { minVersion: 'TLSv1.2' },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      disableFileAccess: true,
      disableUrlAccess: true,
      auth: { user: process.env.ZOHO_EMAIL, pass: process.env.ZOHO_APP_PASSWORD },
    });
    await transporter.sendMail({
      from: { name: 'Brad Jensen Website', address: process.env.ZOHO_EMAIL },
      to: 'brad@fintechnav.com',
      replyTo: { name, address: email },
      subject: `Website Contact from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `<h3>Website Contact Form Submission</h3>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Message:</strong></p><p>${escapeHtml(message).replace(/\r?\n/g, '<br>')}</p>`,
    });
    return response(200, { message: 'Email sent successfully!' });
  } catch {
    // SMTP errors can include addresses and server details; keep these out of responses/logs.
    console.error('Contact email delivery failed');
    return response(500, { error: 'Failed to send email' });
  }
};
