document.addEventListener('DOMContentLoaded', () => {

  let confirmedEmail = '';
  let confirmedCode  = '';

  function showError(form, message) {
    let el = form.querySelector('.auth-error');
    if (!el) {
      el = document.createElement('p');
      el.className = 'auth-error';
      form.appendChild(el);
    }
    el.textContent = message;
  }

  function goTo(stepId) {
    ['step1','step2','step3','step4'].forEach(id => {
      document.getElementById(id).style.display = id === stepId ? 'block' : 'none';
    });
  }

  // ── STEP 1: send code ──────────────────────────────────
  document.getElementById('forgotForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value.trim();
    if (!email) return;

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
      showError(document.getElementById('forgotForm'), data.error);
    }
  });

  // ── STEP 2: verify code ────────────────────────────────
  document.getElementById('codeForm').addEventListener('submit', async e => {
    e.preventDefault();
    const code = document.getElementById('resetCode').value.trim();

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
      showError(document.getElementById('codeForm'), data.error);
    }
  });

  // ── STEP 3: new password ───────────────────────────────
  document.getElementById('newPasswordForm').addEventListener('submit', async e => {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    if (!newPassword) return;

    const res  = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: confirmedEmail, code: confirmedCode, new_password: newPassword })
    });
    const data = await res.json();

    if (data.success) {
      goTo('step4');
    } else {
      showError(document.getElementById('newPasswordForm'), data.error);
    }
  });

});