/**
 * @file reset-password.js
 * @description Manages the multi-step password reset flow.
 *
 * The flow consists of four sequential steps rendered as separate DOM sections:
 *  - Step 1: User submits their email address to request a reset code
 *  - Step 2: User enters the verification code sent to their email
 *  - Step 3: User chooses and submits a new password (minimum 8 characters)
 *  - Step 4: Confirmation screen shown on successful reset
 *
 * Each step validates its inputs inline, disables the submit button during
 * API requests, and displays user-facing error messages on failure.
 */

document.addEventListener('DOMContentLoaded', () => {

  /**
   * The email address confirmed at step 1; reused in subsequent API calls.
   * @type {string}
   */
  let confirmedEmail = '';

  /**
   * The reset code confirmed at step 2; reused in the step 3 API call.
   * @type {string}
   */
  let confirmedCode  = '';

  // ── HELPERS ───────────────────────────────────────────────────────────────

  /**
   * Displays an error message inside the given form. Creates the error
   * element if it does not already exist.
   *
   * @param {HTMLFormElement} form    - The form to attach the error to.
   * @param {string}          message - The error text to display.
   */
  function showError(form, message) {
    let el = form.querySelector('.auth-error');
    if (!el) {
      el = document.createElement('p');
      el.className = 'auth-error';
      form.appendChild(el);
    }
    el.textContent = message;
  }

  /**
   * Clears any existing error message inside the given form.
   *
   * @param {HTMLFormElement} form - The form whose error should be cleared.
   */
  function clearError(form) {
    const el = form.querySelector('.auth-error');
    if (el) el.textContent = '';
  }

  /**
   * Enables or disables a button and adjusts its opacity to indicate state.
   *
   * @param {HTMLButtonElement|null} btn     - The button to update.
   * @param {boolean}                loading - `true` to disable, `false` to enable.
   */
  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled      = loading;
    btn.style.opacity = loading ? '0.5' : '1';
  }

  /**
   * Hides all step sections and reveals only the specified step.
   *
   * @param {'step1'|'step2'|'step3'|'step4'} stepId - The ID of the step to display.
   */
  function goTo(stepId) {
    ['step1', 'step2', 'step3', 'step4'].forEach(id => {
      document.getElementById(id).style.display = id === stepId ? 'block' : 'none';
    });
  }

  // ── STEP 1: REQUEST RESET CODE ────────────────────────────────────────────

  const forgotForm = document.getElementById('forgotForm');

  /**
   * Submits the user's email to the forgot-password endpoint.
   * On success, stores the email and advances to step 2.
   */
  forgotForm.addEventListener('submit', async e => {
    e.preventDefault();
    clearError(forgotForm);

    const email = document.getElementById('resetEmail').value.trim();
    if (!email) {
      showError(forgotForm, 'please enter your email.');
      return;
    }

    const btn = forgotForm.querySelector('button[type="submit"]');
    setLoading(btn, true);

    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (data.success) {
        confirmedEmail = email;
        goTo('step2');
      } else {
        showError(forgotForm, data.error || 'something went wrong.');
      }
    } catch {
      showError(forgotForm, 'network error — please try again.');
    } finally {
      setLoading(btn, false);
    }
  });

  // ── STEP 2: VERIFY RESET CODE ─────────────────────────────────────────────

  const codeForm = document.getElementById('codeForm');

  /**
   * Submits the verification code entered by the user.
   * On success, stores the code and advances to step 3.
   */
  codeForm.addEventListener('submit', async e => {
    e.preventDefault();
    clearError(codeForm);

    const code = document.getElementById('resetCode').value.trim();
    if (!code) {
      showError(codeForm, 'please enter the code we sent you.');
      return;
    }

    const btn = codeForm.querySelector('button[type="submit"]');
    setLoading(btn, true);

    try {
      const res  = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: confirmedEmail, code })
      });
      const data = await res.json();

      if (data.success) {
        confirmedCode = code;
        goTo('step3');
      } else {
        showError(codeForm, data.error || 'invalid or expired code.');
      }
    } catch {
      showError(codeForm, 'network error — please try again.');
    } finally {
      setLoading(btn, false);
    }
  });

  // ── STEP 3: SET NEW PASSWORD ──────────────────────────────────────────────

  const newPasswordForm = document.getElementById('newPasswordForm');

  /**
   * Validates and submits the user's new password.
   * Enforces a minimum length of 8 characters before sending the request.
   * On success, advances to the confirmation screen (step 4).
   */
  newPasswordForm.addEventListener('submit', async e => {
    e.preventDefault();
    clearError(newPasswordForm);

    const newPassword = document.getElementById('newPassword').value;
    if (!newPassword) {
      showError(newPasswordForm, 'please enter a new password.');
      return;
    }

    if (newPassword.length < 8) {
      showError(newPasswordForm, 'password must be at least 8 characters.');
      return;
    }

    const btn = newPasswordForm.querySelector('button[type="submit"]');
    setLoading(btn, true);

    try {
      const res  = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: confirmedEmail, code: confirmedCode, new_password: newPassword })
      });
      const data = await res.json();

      if (data.success) {
        goTo('step4');
      } else {
        showError(newPasswordForm, data.error || 'could not reset password.');
      }
    } catch {
      showError(newPasswordForm, 'network error — please try again.');
    } finally {
      setLoading(btn, false);
    }
  });

});