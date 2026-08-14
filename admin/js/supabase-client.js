// Diani Bikes — Supabase client (used for admin auth + data).
//
// The anon/public key is designed to be exposed in client-side code —
// Supabase verifies credentials on their server, this key alone grants
// no access to anything protected by Row Level Security. Every rule that
// actually protects data lives in the database (supabase/schema.sql), not
// in this file or in any page script, so a tampered client gains nothing.
//
// Auth session storage: this is a static site with no server of its own, so
// there is no way to use an httpOnly cookie — the token has to live somewhere
// JavaScript can reach. sessionStorage is used instead of the library default
// (localStorage) so the session dies when the tab closes rather than sitting
// on disk indefinitely on a shared or stolen machine.
(function () {
  var storage = window.sessionStorage;
  try {
    storage.setItem('__probe__', '1');
    storage.removeItem('__probe__');
  } catch (e) {
    storage = undefined; // private mode / storage blocked — fall back to in-memory
  }

  window.sb = supabase.createClient(
    'https://gaitiaxwbmzdgrejgren.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhaXRpYXh3Ym16ZGdyZWpncmVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NjMxODMsImV4cCI6MjEwMjIzOTE4M30.6qcdV3EnRRElj0nF88EOEhAXQKpC2ruyuydLkv6FADg',
    {
      auth: {
        storage: storage,
        persistSession: true,
        autoRefreshToken: true,
        // Left on the implicit flow deliberately. PKCE would be preferable in
        // general, but it stores a code_verifier at request time and requires
        // it back at redemption time — and a reset email opens in a brand new
        // tab, where sessionStorage is empty. PKCE + sessionStorage would mean
        // every password reset fails. reset-password.html strips the token
        // from the URL instead (see the history.replaceState there).
        flowType: 'implicit',
        detectSessionInUrl: true
      }
    }
  );

  // Purge content cached by the pre-Supabase localStorage build. Those keys
  // held real booking records (names, emails, phone numbers) in plain text and
  // are never read any more, so clear them from every browser that still has
  // them sitting on disk.
  try {
    Object.keys(window.localStorage).forEach(function (key) {
      if (key.indexOf('dianibikes_admin_') === 0) window.localStorage.removeItem(key);
    });
    // and any auth token left behind by the previous localStorage default
    Object.keys(window.localStorage).forEach(function (key) {
      if (/^sb-.*-auth-token/.test(key)) window.localStorage.removeItem(key);
    });
  } catch (e) { /* storage unavailable — nothing to clean */ }
})();
