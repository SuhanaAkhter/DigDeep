/**
 * @file auth.js
 * @description Handles form submission for the login and signup pages.
 *
 * Both forms are optional — this script is loaded on pages that may contain
 * either or both forms, and guards each block with a null-check so it is
 * safe to include on any auth page.
 *
 * Login flow
 * ----------
 * 1. Validates that email and password fields are non-empty.
 * 2. POSTs credentials to /api/auth/login.
 * 3. On success, redirects to the coach or player dashboard based on the
 *    role returned by the server.
 * 4. On failure, displays the server error message below the form.
 *
 * Signup flow
 * -----------
 * 1. Validates that all required fields are present and that the password
 *    meets the 8-character minimum (mirroring the server-side rule).
 * 2. POSTs the new account data (including name) to /api/auth/signup.
 * 3. On success, redirects to the appropriate dashboard.
 * 4. On failure, displays the server error message below the form.
 *
 * In both cases the submit button is disabled while the request is in-flight
 * to prevent duplicate submissions.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── LOGIN ─────────────────────────────────────────────────────────────────

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
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (data.success) {
          window.location.href = data.role === 'coach'
            ? '/coach-dashboard'
            : '/player-dashboard';
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

  // ── SIGNUP ────────────────────────────────────────────────────────────────

  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name     = document.getElementById('name')?.value.trim() || '';
      const email    = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const role     = document.getElementById('role').value;

      if (!email || !password || !role) {
        showError(signupForm, 'please fill out all fields.');
        return;
      }

      if (password.length < 8) {
        showError(signupForm, 'password must be at least 8 characters.');
        return;
      }

      const btn = signupForm.querySelector('button[type="submit"]');
      setLoading(btn, true);

      try {
        const res  = await fetch('/api/auth/signup', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name, email, password, role }),
        });
        const data = await res.json();

        if (data.success) {
          window.location.href = data.role === 'coach'
            ? '/coach-dashboard'
            : '/player-dashboard';
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

  // ── HELPERS ───────────────────────────────────────────────────────────────

  /**
   * Display an error message beneath a form.
   *
   * Reuses an existing `.auth-error` paragraph if one is already present in
   * the DOM so repeated calls do not stack multiple error elements.
   *
   * @param {HTMLFormElement} form    - The form to attach the error to.
   * @param {string}          message - The error text to display.
   */
  function showError(form, message) {
    let errorDiv = form.querySelector('.auth-error');
    if (!errorDiv) {
      errorDiv           = document.createElement('p');
      errorDiv.className = 'auth-error';
      form.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
  }

  /**
   * Toggle the loading state of a submit button.
   *
   * Disables the button and reduces its opacity while a request is in-flight,
   * preventing the user from submitting the form more than once.
   *
   * @param {HTMLButtonElement|null} btn     - The button to update.
   * @param {boolean}                loading - True to enter loading state.
   */
  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled      = loading;
    btn.style.opacity = loading ? '0.5' : '1';
  }

});