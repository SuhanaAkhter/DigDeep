document.addEventListener('DOMContentLoaded', () => {

  let confirmedEmail = '';
  let confirmedCode  = '';

  // ── HELPERS ────────────────────────────────────────────
  function showError(form, message) {
    let el = form.querySelector('.auth-error');
    if (!el) {
      el = document.createElement('p');
      el.className = 'auth-error';
      form.appendChild(el);
    }
    el.textContent = message;
  }

  // FIX: clear any previous error before each new submission
  function clearError(form) {
    const el = form.querySelector('.auth-error');
    if (el) el.textContent = '';
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled    = loading;
    btn.style.opacity = loading ? '0.5' : '1';
  }

  function goTo(stepId) {
    ['step1', 'step2', 'step3', 'step4'].forEach(id => {
      document.getElementById(id).style.display = id === stepId ? 'block' : 'none';
    });
  }

  // ── STEP 1: send code ──────────────────────────────────
  const forgotForm = document.getElementById('forgotForm');
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

    // FIX: wrap in try/catch — was missing, so network errors caused an unhandled rejection
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

  // ── STEP 2: verify code ────────────────────────────────
  const codeForm = document.getElementById('codeForm');
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

  // ── STEP 3: new password ───────────────────────────────
  const newPasswordForm = document.getElementById('newPasswordForm');
  newPasswordForm.addEventListener('submit', async e => {
    e.preventDefault();
    clearError(newPasswordForm);

    const newPassword = document.getElementById('newPassword').value;
    if (!newPassword) {
      showError(newPasswordForm, 'please enter a new password.');
      return;
    }

    // FIX: enforce minimum length on the reset form too, matching signup
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