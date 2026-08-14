// Diani Bikes — Admin console access gate (Supabase Auth).
// Hides the page until a valid Supabase session is confirmed, then reveals
// it; redirects to the login page otherwise. Runs synchronously in <head>,
// before the rest of the page parses, so gated content never flashes.
(function () {
  'use strict';
  document.documentElement.style.visibility = 'hidden';

  function goToLogin() {
    var next = encodeURIComponent(location.pathname.split('/').pop() || 'index.html');
    location.replace('login.html?next=' + next);
  }

  if (!window.sb) { goToLogin(); return; }

  window.sb.auth.getSession().then(function (result) {
    if (result.data && result.data.session) {
      document.documentElement.style.visibility = 'visible';
    } else {
      goToLogin();
    }
  }).catch(goToLogin);
})();
