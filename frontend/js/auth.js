document.addEventListener('DOMContentLoaded', () => {

  // ── LOGIN ──────────────────────────────────────────────
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) {
        showError(loginForm, 'please enter your email and password.');
        return;
      }

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (data.success) {
          window.location.href = data.role === 'coach' ? '/coach-dashboard' : '/player-dashboard';
        } else {
          showError(loginForm, data.error);
        }
      } catch (err) {
        showError(loginForm, 'something went wrong. please try again.');
      }
    });
  }

  // ── SIGNUP ─────────────────────────────────────────────
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const role = document.getElementById('role').value;

      if (!email || !password || !role) {
        showError(signupForm, 'please fill out all fields.');
        return;
      }

      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role })
        });

        const data = await res.json();

        if (data.success) {
          window.location.href = data.role === 'coach' ? '/coach-dashboard' : '/player-dashboard';
        } else {
          showError(signupForm, data.error);
        }
      } catch (err) {
        showError(signupForm, 'something went wrong. please try again.');
      }
    });
  }

  // ── HELPER ─────────────────────────────────────────────
  function showError(form, message) {
    let errorDiv = form.querySelector('.auth-error');
    if (!errorDiv) {
      errorDiv = document.createElement('p');
      errorDiv.className = 'auth-error';
      form.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
  }

});