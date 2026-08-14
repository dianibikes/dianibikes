// Diani Bikes — Supabase client for the public site (read-only content +
// public booking inserts, both governed by Row Level Security — see
// supabase/schema.sql). Same anon/public key used in admin/js/supabase-client.js;
// it is designed to be exposed in client-side code.
//
// The public site never signs anyone in, so this client is configured to hold
// no session at all: nothing to persist, nothing to refresh, and no token
// parsing from the URL.
window.sb = supabase.createClient(
  'https://gaitiaxwbmzdgrejgren.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhaXRpYXh3Ym16ZGdyZWpncmVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NjMxODMsImV4cCI6MjEwMjIzOTE4M30.6qcdV3EnRRElj0nF88EOEhAXQKpC2ruyuydLkv6FADg',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

// Purge content cached by the pre-Supabase localStorage build. Those keys held
// real booking records (names, emails, phone numbers) in plain text and are
// never read any more, so clear them from every browser that still has them.
try {
  Object.keys(window.localStorage).forEach(function (key) {
    if (key.indexOf('dianibikes_admin_') === 0) window.localStorage.removeItem(key);
  });
} catch (e) { /* storage unavailable — nothing to clean */ }
