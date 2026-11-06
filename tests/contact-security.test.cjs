const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const nodemailer = require('nodemailer');

function loadHandler({ fail = false, env = {} } = {}) {
  const deliveries = [];
  const configurations = [];
  const logs = [];
  const sandbox = {
    exports: {},
    Buffer,
    process: { env: { ZOHO_EMAIL: 'sender@example.com', ZOHO_APP_PASSWORD: 'test-only', ...env } },
    console: { error: (...args) => logs.push(args.join(' ')) },
    require: (name) => {
      assert.equal(name, 'nodemailer');
      return {
        createTransport: (config) => {
          configurations.push(config);
          return {
            sendMail: async (mail) => {
              if (fail) throw new Error('SMTP credential-private-value');
              deliveries.push(mail);
            },
          };
        },
      };
    },
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '../netlify/functions/send-email.js'), 'utf8'),
    sandbox
  );
  return { handler: sandbox.exports.handler, deliveries, configurations, logs };
}

function event(data = {}, overrides = {}) {
  return {
    httpMethod: 'POST',
    headers: { origin: 'https://fintechnav.com', 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Test visitor',
      email: 'visitor+contact@example.com',
      message: 'Hello',
      ...data,
    }),
    ...overrides,
  };
}

test('contact endpoint rejects malformed, oversized and cross-origin requests before creating SMTP transport', async () => {
  const { handler, configurations } = loadHandler();
  const cases = [
    [event({}, { httpMethod: 'GET' }), 405],
    [event({}, { httpMethod: 'OPTIONS' }), 405],
    [
      event(
        {},
        { headers: { origin: 'https://attacker.example', 'content-type': 'application/json' } }
      ),
      403,
    ],
    [event({}, { headers: { 'content-type': 'text/plain' } }), 415],
    [event({}, { body: '{invalid' }), 400],
    [event({}, { body: 'null' }), 400],
    [event({}, { body: '[]' }), 400],
    [event({ name: { value: 'Test' } }), 400],
    [event({ name: 'Visitor\r\nBcc: victim@example.com' }), 400],
    [event({ email: 'visitor@example.com, victim@example.com' }), 400],
    [event({ email: 'Visitor <visitor@example.com>' }), 400],
    [event({ email: 'visitor@example.com\r\nBcc: victim@example.com' }), 400],
    [event({ email: 'visitor\u0000@example.com' }), 400],
    [event({ message: 'x'.repeat(10001) }), 400],
    [event({ message: 'x'.repeat(33000) }), 413],
    [event({}, { isBase64Encoded: true }), 400],
  ];
  for (const [request, expectedStatus] of cases) {
    const result = await handler(request);
    assert.equal(result.statusCode, expectedStatus);
    assert.equal(result.headers['Access-Control-Allow-Origin'], undefined);
    assert.match(result.headers['Cache-Control'], /no-store/);
  }
  assert.equal(configurations.length, 0);
});

test('contact email escapes untrusted HTML and fixes delivery to the owner with TLS and content-access restrictions', async () => {
  const { handler, deliveries, configurations } = loadHandler();
  const result = await handler(
    event({
      name: 'Visitor <b>test</b>',
      message: '<img src="https://attacker.example/x">\nHello & goodbye',
      to: 'attacker@example.com',
      attachments: [{ path: '/etc/passwd' }],
    })
  );
  assert.equal(result.statusCode, 200);
  const mail = deliveries[0];
  assert.equal(mail.to, 'brad@fintechnav.com');
  assert.equal(mail.replyTo.address, 'visitor+contact@example.com');
  assert.equal(mail.attachments, undefined);
  assert.match(mail.html, /&lt;img/);
  assert.match(mail.html, /Hello &amp; goodbye/);
  assert.match(mail.html, /&lt;b&gt;test&lt;\/b&gt;/);
  assert.doesNotMatch(mail.html, /<img|<b>test/);
  assert.equal(configurations[0].requireTLS, true);
  assert.equal(configurations[0].tls.minVersion, 'TLSv1.2');
  assert.equal(configurations[0].disableFileAccess, true);
  assert.equal(configurations[0].disableUrlAccess, true);

  // Exercise the upgraded package's CommonJS API and MIME composition without a network connection.
  const transport = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  const composed = await transport.sendMail(mail);
  assert.deepEqual(composed.envelope.to, ['brad@fintechnav.com']);
  assert.match(composed.message.toString(), /Reply-To:.*visitor\+contact@example.com/);
  assert.match(composed.message.toString(), /&lt;img/);
});

test('contact endpoint accepts its own deploy preview and does not disclose SMTP failures', async () => {
  const { handler, logs } = loadHandler({
    fail: true,
    env: { DEPLOY_PRIME_URL: 'https://deploy-preview-2--fintechnav.netlify.app' },
  });
  const result = await handler(
    event(
      {},
      {
        headers: {
          origin: 'https://deploy-preview-2--fintechnav.netlify.app',
          'content-type': 'application/json; charset=utf-8',
        },
      }
    )
  );
  assert.equal(result.statusCode, 500);
  assert.doesNotMatch(
    JSON.stringify({ result, logs }),
    /credential-private-value|test-only|sender@example/
  );
  assert.deepEqual(logs, ['Contact email delivery failed']);
});

test('missing contact-mail configuration fails without opening an SMTP connection', async () => {
  const { handler, configurations } = loadHandler({ env: { ZOHO_APP_PASSWORD: '' } });
  assert.equal((await handler(event())).statusCode, 503);
  assert.equal(configurations.length, 0);
});
