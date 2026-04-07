document.addEventListener('DOMContentLoaded', () => {

  // ── LOGIN ──────────────────────────────────────────────
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email    = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) {
        showError(loginForm, 'please enter your email and password.');
        return;
      }

      const btn = loginForm.querySelector('button[type="submit"]');
      setLoading(btn, true);

      try {
        const res  = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
          window.location.href = data.role === 'coach' ? '/coach-dashboard' : '/player-dashboard';
        } else {
          showError(loginForm, data.error || 'invalid email or password.');
          setLoading(btn, false);
        }
      } catch {
        showError(loginForm, 'something went wrong. please try again.');
        setLoading(btn, false);
      }
    });
  }

  // ── SIGNUP ─────────────────────────────────────────────
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // FIX: read name field (was missing — caused NULL names in the database)
      const name     = document.getElementById('name')?.value.trim() || '';
      const email    = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const role     = document.getElementById('role').value;

      if (!email || !password || !role) {
        showError(signupForm, 'please fill out all fields.');
        return;
      }

      // FIX: client-side minimum password length check
      if (password.length < 8) {
        showError(signupForm, 'password must be at least 8 characters.');
        return;
      }

      const btn = signupForm.querySelector('button[type="submit"]');
      setLoading(btn, true);

      try {
        const res  = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // FIX: include name in the request body
          body: JSON.stringify({ name, email, password, role })
        });
        const data = await res.json();

        if (data.success) {
          window.location.href = data.role === 'coach' ? '/coach-dashboard' : '/player-dashboard';
        } else {
          showError(signupForm, data.error || 'could not create account.');
          setLoading(btn, false);
        }
      } catch {
        showError(signupForm, 'something went wrong. please try again.');
        setLoading(btn, false);
      }
    });
  }

  // ── HELPERS ────────────────────────────────────────────
  function showError(form, message) {
    let errorDiv = form.querySelector('.auth-error');
    if (!errorDiv) {
      errorDiv = document.createElement('p');
      errorDiv.className = 'auth-error';
      form.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
  }

  // FIX: disable submit button while request is in-flight to prevent double-submit
  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.style.opacity = loading ? '0.5' : '1';
  }

});