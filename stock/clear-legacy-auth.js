// Run before external scripts. Never transfer old brokerage tokens to a server
// or a different origin; a fresh, state-bound Schwab sign-in replaces them.
for (const storage of [localStorage, sessionStorage]) {
  for (const key of ['redday_ai_auth_session_v1', 'redday_ai_custom_pass_sha256'])
    storage.removeItem(key);
  const key = 'redday_ai_pwa_state_v2';
  try {
    const saved = JSON.parse(storage.getItem(key) || 'null');
    if (saved) {
      delete saved.schwabAuth;
      storage.setItem(key, JSON.stringify(saved));
    }
  } catch {
    storage.removeItem(key);
  }
}
