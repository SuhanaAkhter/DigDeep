document.addEventListener('DOMContentLoaded', async () => {

  // ── LOAD CURRENT USER INFO ──────────────────────────────
  try {
    const res  = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.error) {
      window.location.href = '/login';
      return;
    }
    document.getElementById('displayEmail').textContent     = data.email || '—';
    document.getElementById('displayRole').textContent      = data.role  || '—';
    document.getElementById('displayRole').textContent      = data.role  || '—';

    // Load player name if available
    if (data.role === 'player') {
      try {
        const pRes  = await fetch('/api/player/me');
        const pData = await pRes.json();
        if (pData.name) {
          document.getElementById('displayName').textContent       = pData.name;
          document.getElementById('displayNameInline').textContent = pData.name;
        }
        if (pData.picture) {
          showProfilePic(pData.picture);
        }
      } catch { /* player info optional */ }
    }
  } catch {
    window.location.href = '/login';
  }

  // ── PROFILE PICTURE ─────────────────────────────────────
  const picInput = document.getElementById('profilePicInput');
  const picBtn   = document.getElementById('profilePicBtn');
  const picCircle = document.getElementById('profilePicDisplay');

  picBtn.addEventListener('click',    () => picInput.click());
  picCircle.addEventListener('click', () => picInput.click());

  picInput.addEventListener('change', async () => {
    const file = picInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('picture', file);

    picBtn.textContent = 'uploading...';
    picBtn.disabled    = true;

    try {
      const res  = await fetch('/api/player/upload-picture', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.picture_url) {
        showProfilePic(data.picture_url);
        picBtn.textContent = 'photo saved!';
        setTimeout(() => {
          picBtn.textContent = 'upload photo';
          picBtn.disabled    = false;
        }, 2000);
      } else {
        picBtn.textContent = data.error || 'upload failed';
        picBtn.disabled    = false;
      }
    } catch {
      picBtn.textContent = 'upload failed';
      picBtn.disabled    = false;
    }
  });

  function showProfilePic(url) {
    const img  = document.getElementById('profilePicImg');
    const icon = document.getElementById('profilePicUploadIcon');
    img.src            = url;
    img.style.display  = 'block';
    icon.style.display = 'none';
  }

  // ── EDIT MODAL ───────────────────────────────────────────
  const modal      = document.getElementById('editModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalFields = document.getElementById('modalFields');
  const modalError = document.getElementById('modalError');
  const modalSave  = document.getElementById('modalSave');
  const closeModal = document.getElementById('closeModal');

  let currentField = null;

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.field));
  });

  closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.addEventListener('click', e => {
    if (e.target === modal) modal.style.display = 'none';
  });

  function openModal(field) {
    currentField      = field;
    modalError.textContent = '';
    modalSave.disabled = false;
    modalSave.textContent = 'save';

    if (field === 'email') {
      modalTitle.textContent = 'change email';
      modalFields.innerHTML = `
        <input type="email" id="modalInput1" placeholder="new email">
        <input type="email" id="modalInput2" placeholder="confirm new email">
      `;
    } else if (field === 'name') {
      modalTitle.textContent = 'change name';
      modalFields.innerHTML = `
        <input type="text" id="modalInput1" placeholder="new name">
      `;
    } else if (field === 'password') {
      modalTitle.textContent = 'change password';
      modalFields.innerHTML = `
        <input type="password" id="modalInput1" placeholder="current password">
        <input type="password" id="modalInput2" placeholder="new password">
        <input type="password" id="modalInput3" placeholder="confirm new password">
      `;
    }

    modal.style.display = 'flex';
    document.getElementById('modalInput1').focus();
  }

  modalSave.addEventListener('click', async () => {
    modalError.textContent = '';
    const input1 = document.getElementById('modalInput1')?.value.trim();
    const input2 = document.getElementById('modalInput2')?.value.trim();
    const input3 = document.getElementById('modalInput3')?.value.trim();

    // Validate
    if (currentField === 'email') {
      if (!input1) { modalError.textContent = 'please enter a new email.'; return; }
      if (input1 !== input2) { modalError.textContent = 'emails do not match.'; return; }
    } else if (currentField === 'name') {
      if (!input1) { modalError.textContent = 'please enter a name.'; return; }
    } else if (currentField === 'password') {
      if (!input1) { modalError.textContent = 'please enter your current password.'; return; }
      if (!input2) { modalError.textContent = 'please enter a new password.'; return; }
      if (input2.length < 8) { modalError.textContent = 'password must be at least 8 characters.'; return; }
      if (input2 !== input3) { modalError.textContent = 'new passwords do not match.'; return; }
    }

    modalSave.disabled    = true;
    modalSave.textContent = 'saving...';

    try {
      let res, data;

      if (currentField === 'email') {
        res  = await fetch('/api/auth/update-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_email: input1 })
        });
        data = await res.json();
        if (data.success) {
          document.getElementById('displayEmail').textContent = input1;
        }

      } else if (currentField === 'name') {
        res  = await fetch('/api/player/update-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: input1 })
        });
        data = await res.json();
        if (data.success) {
          document.getElementById('displayName').textContent       = input1;
          document.getElementById('displayNameInline').textContent = input1;
        }

      } else if (currentField === 'password') {
        res  = await fetch('/api/auth/update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_password: input1, new_password: input2 })
        });
        data = await res.json();
      }

      if (data.success) {
        modal.style.display = 'none';
      } else {
        modalError.textContent = data.error || 'could not save changes.';
        modalSave.disabled    = false;
        modalSave.textContent = 'save';
      }
    } catch {
      modalError.textContent = 'network error — please try again.';
      modalSave.disabled    = false;
      modalSave.textContent = 'save';
    }
  });

  // Allow Enter key to submit modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && modal.style.display === 'flex') {
      modalSave.click();
    }
  });

});