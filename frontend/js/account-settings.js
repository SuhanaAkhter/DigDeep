/**
 * @file account-settings.js
 * @description Handles all interactive behaviour on the Account Settings page.
 *
 * Responsibilities
 * ----------------
 * - Loads and displays the current user's email, role, display name, and
 *   profile picture from the API on page load.
 * - Handles profile picture uploads via a hidden file input, posting the
 *   image to /api/player/upload-picture and updating the UI on success.
 * - Manages a shared edit modal that is reused for changing the user's
 *   email, display name, or password.  The modal's contents are rendered
 *   dynamically based on which field the user clicked to edit.
 * - Submits each field change to the appropriate API endpoint and reflects
 *   the updated value in the displayed text on success.
 * - Supports keyboard confirmation: pressing Enter while the modal is open
 *   triggers the save action.
 *
 * API endpoints used
 * ------------------
 *   GET  /api/auth/me              Fetch current user's email and role.
 *   GET  /api/player/me            Fetch current user's name and picture.
 *   POST /api/player/upload-picture Upload a new profile picture.
 *   POST /api/auth/update-email    Change the account email address.
 *   POST /api/player/update-name   Change the display name.
 *   POST /api/auth/update-password Change the account password.
 */


document.addEventListener('DOMContentLoaded', async () => {

  // ── LOAD CURRENT USER INFO ──────────────────────────────
  let currentRole = null;

  try {
    const res  = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.error) { window.location.href = '/login'; return; }

    currentRole = data.role;
    document.getElementById('displayEmail').textContent = data.email || '—';
    document.getElementById('displayRole').textContent  = data.role  || '—';

    // Load name and picture for both roles
    try {
      const pRes  = await fetch('/api/player/me');
      const pData = await pRes.json();

      if (pData.name) {
        document.getElementById('displayName').textContent       = pData.name;
        document.getElementById('displayNameInline').textContent = pData.name;
      }
      if (pData.picture) showProfilePic(pData.picture);

      // Show player-only profile fields
      if (data.role === 'player') {
        document.getElementById('playerProfileFields').style.display = 'block';

        // Load grade, position, jersey from /api/player/profile
        try {
          const prRes  = await fetch('/api/player/profile');
          const prData = await prRes.json();
          if (prData.grade)        document.getElementById('displayGrade').textContent    = prData.grade;
          if (prData.position)     document.getElementById('displayPosition').textContent = prData.position;
          if (prData.jersey_number) document.getElementById('displayJersey').textContent = prData.jersey_number;
        } catch {}
      }

    } catch {}

  } catch {
    window.location.href = '/login';
  }

  // ── PROFILE PICTURE ─────────────────────────────────────
  const picInput  = document.getElementById('profilePicInput');
  const picBtn    = document.getElementById('profilePicBtn');
  const picCircle = document.getElementById('profilePicDisplay');

  // Both the button and the picture circle trigger the hidden file picker.
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
      // Content-Type must NOT be set manually here; the browser sets the
      // correct multipart/form-data boundary automatically for FormData.
      const res  = await fetch('/api/player/upload-picture', {
        method: 'POST',
        body:   formData
        // No Content-Type header — browser sets multipart boundary automatically
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

  /**
   * Replace the placeholder icon with the user's profile picture.
   *
   * @param {string} url - Relative URL of the uploaded image.
   */
  function showProfilePic(url) {
    const img  = document.getElementById('profilePicImg');
    const icon = document.getElementById('profilePicUploadIcon');
    img.src            = url;
    img.style.display  = 'block';
    icon.style.display = 'none';
  }

  // ── EDIT MODAL ───────────────────────────────────────────
  const modal       = document.getElementById('editModal');
  const modalTitle  = document.getElementById('modalTitle');
  const modalFields = document.getElementById('modalFields');
  const modalError  = document.getElementById('modalError');
  const modalSave   = document.getElementById('modalSave');
  const closeModal  = document.getElementById('closeModal');

  /** The field currently being edited: 'email' | 'name' | 'password'. */
  let currentField = null;

  // Open the modal when any edit button is clicked; each button carries a
  // data-field attribute identifying which field it edits.
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.field));
  });

  // Close the modal on the close button or a backdrop click.
  closeModal.addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.style.display = 'none';
  });

  /**
   * Open the edit modal and render the appropriate input fields for the
   * given field type.
   *
   * @param {'email'|'name'|'password'} field - The field to edit.
   */
  function openModal(field) {
    currentField           = field;
    modalError.textContent = '';
    modalSave.disabled     = false;
    modalSave.textContent  = 'save';

    if (field === 'email') {
      modalTitle.textContent = 'change email';
      modalFields.innerHTML  = `
        <input type="email" id="modalInput1" placeholder="new email">
        <input type="email" id="modalInput2" placeholder="confirm new email">
      `;
    } else if (field === 'name') {
      modalTitle.textContent = 'change name';
      modalFields.innerHTML  = `
        <input type="text" id="modalInput1" placeholder="new name">
      `;
    } else if (field === 'password') {
      modalTitle.textContent = 'change password';
      modalFields.innerHTML  = `
        <input type="password" id="modalInput1" placeholder="current password">
        <input type="password" id="modalInput2" placeholder="new password">
        <input type="password" id="modalInput3" placeholder="confirm new password">
      `;
    } else if (field === 'grade') {
      modalTitle.textContent = 'change grade';
      modalFields.innerHTML  = `
        <input type="text" id="modalInput1"
               placeholder="e.g. 11"
               value="${document.getElementById('displayGrade').textContent.replace('—','')}">
      `;
    } else if (field === 'position') {
      modalTitle.textContent = 'change position';
      modalFields.innerHTML  = `
        <input type="text" id="modalInput1"
               placeholder="e.g. Middle, Setter"
               value="${document.getElementById('displayPosition').textContent.replace('—','')}">
      `;
    } else if (field === 'jersey') {
      modalTitle.textContent = 'change jersey #';
      modalFields.innerHTML  = `
        <input type="number" id="modalInput1"
               placeholder="e.g. 7"
               value="${document.getElementById('displayJersey').textContent.replace('—','')}">
      `;
    }

    modal.style.display = 'flex';
    document.getElementById('modalInput1').focus();
  }

  /**
   * Validate the modal's inputs and POST the change to the relevant endpoint.
   *
   * Validation rules per field:
   *  - email:    both fields required; values must match.
   *  - name:     field must be non-empty.
   *  - password: all three fields required; new password ≥ 8 characters;
   *              new password and confirmation must match.
   *
   * On success, updates the displayed value on the page and closes the modal.
   * On failure, shows the server-returned error message inside the modal.
   */
  modalSave.addEventListener('click', async () => {
    modalError.textContent = '';
    const input1 = document.getElementById('modalInput1')?.value.trim();
    const input2 = document.getElementById('modalInput2')?.value.trim();
    const input3 = document.getElementById('modalInput3')?.value.trim();

    // ── Validation ──
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
    } else if (currentField === 'grade' || currentField === 'position' || currentField === 'jersey') {
      if (!input1) { modalError.textContent = 'please enter a value.'; return; }
    }

    modalSave.disabled    = true;
    modalSave.textContent = 'saving...';

    try {
      let res, data;

      if (currentField === 'email') {
        res  = await fetch('/api/auth/update-email', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ new_email: input1 })
        });
        data = await res.json();
        if (data.success) {
          document.getElementById('displayEmail').textContent = input1;
        }

      } else if (currentField === 'name') {
        res  = await fetch('/api/player/update-name', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name: input1 })
        });
        data = await res.json();
        if (data.success) {
          document.getElementById('displayName').textContent       = input1;
          document.getElementById('displayNameInline').textContent = input1;
        }

      } else if (currentField === 'password') {
        res  = await fetch('/api/auth/update-password', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ current_password: input1, new_password: input2 })
        });
        data = await res.json();

      } else if (currentField === 'grade' || currentField === 'position' || currentField === 'jersey') {
        // Player profile fields — POST to /api/player/update-profile
        const payload = {};
        if (currentField === 'grade')    payload.grade          = input1;
        if (currentField === 'position') payload.position       = input1;
        if (currentField === 'jersey')   payload.jersey_number  = input1;

        res  = await fetch('/api/player/update-profile', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload)
        });
        data = await res.json();

        if (data.success) {
          if (currentField === 'grade')
            document.getElementById('displayGrade').textContent    = input1;
          if (currentField === 'position')
            document.getElementById('displayPosition').textContent = input1;
          if (currentField === 'jersey')
            document.getElementById('displayJersey').textContent   = input1;
        }
      }

      if (data.success) {
        modal.style.display = 'none';
      } else {
        modalError.textContent = data.error || 'could not save changes.';
        modalSave.disabled     = false;
        modalSave.textContent  = 'save';
      }
    } catch {
      modalError.textContent = 'network error — please try again.';
      modalSave.disabled     = false;
      modalSave.textContent  = 'save';
    }
  });

  // Allow the user to confirm the modal by pressing Enter.
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && modal.style.display === 'flex') modalSave.click();
  });

});