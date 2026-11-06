// Netlify's default invitation/recovery links land on the public homepage.
// Move the fragment directly to the stock app before analytics can observe it.
if (/^#(?:invite_token|recovery_token|confirmation_token)=/.test(window.location.hash)) {
  window.location.replace('/stock/' + window.location.hash);
}
