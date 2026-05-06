/**
 * player.js
 * ---------
 * Handles all player management UI on the coach's manage-players page:
 *   - Fetching and displaying the player grid from the API
 *   - Search (by name) and filter (by position) with no server round-trips
 *   - Selecting a player to view their detail sidebar
 *   - Toggling a season stat preview in the sidebar
 *   - Adding a new player (profile only, no account yet)
 *   - Editing a player's profile AND their linked account credentials
 *   - Deleting a player with a confirmation modal
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── DOM REFERENCES ─────────────────────────────────────
  const playersGrid        = document.getElementById('playersGrid');
  const playerDetailCard   = document.getElementById('playerDetailCard');
  const playerNameEl       = document.getElementById('playerName');
  const playerInfoEl       = document.getElementById('playerInfo');
  const playerPicDisplay   = document.getElementById('playerPicDisplay');
  const viewStatsBtn       = document.getElementById('viewStatsBtn');
  const editPlayerBtn      = document.getElementById('editPlayerBtn');
  const deletePlayerBtn    = document.getElementById('deletePlayerBtn');
  const playerStatsPreview = document.getElementById('playerStatsPreview');
  const searchInput        = document.getElementById('searchInput');
  const checkboxes         = document.querySelectorAll('.position-filter');

  // Add player modal
  const addModal       = document.getElementById('addPlayerModal');
  const closeAddPlayer = document.getElementById('closeAddPlayer');
  const saveAddPlayer  = document.getElementById('saveAddPlayer');
  const addPlayerError = document.getElementById('addPlayerError');

  // Edit player modal
  const editModal         = document.getElementById('editPlayerModal');
  const closeEditPlayer   = document.getElementById('closeEditPlayer');
  const saveEditPlayer    = document.getElementById('saveEditPlayer');
  const editPlayerError   = document.getElementById('editPlayerError');
  const editPlayerSuccess = document.getElementById('editPlayerSuccess');
  const editAccountSection = document.getElementById('editAccountSection');

  // Delete player modal
  const deleteModal         = document.getElementById('deletePlayerModal');
  const closeDeletePlayer   = document.getElementById('closeDeletePlayer');
  const confirmDeletePlayer = document.getElementById('confirmDeletePlayer');
  const cancelDeletePlayer  = document.getElementById('cancelDeletePlayer');
  const deletePlayerName    = document.getElementById('deletePlayerName');

  // ── STATE ──────────────────────────────────────────────
  let playersData    = [];  // full list from API
  let selectedPlayer = null; // currently shown in detail sidebar

  // ── MODAL HELPERS ──────────────────────────────────────
  function showModal(el) { el.style.display = 'flex'; }
  function hideModal(el) { el.style.display = 'none'; }

  // Close modals by clicking backdrop or close button
  [addModal, editModal, deleteModal].forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) hideModal(modal);
    });
  });
  if (closeAddPlayer)   closeAddPlayer.addEventListener('click',   () => hideModal(addModal));
  if (closeEditPlayer)  closeEditPlayer.addEventListener('click',  () => hideModal(editModal));
  if (closeDeletePlayer) closeDeletePlayer.addEventListener('click', () => hideModal(deleteModal));
  if (cancelDeletePlayer) cancelDeletePlayer.addEventListener('click', () => hideModal(deleteModal));

  // ── FETCH & DISPLAY PLAYERS ────────────────────────────

  async function fetchPlayers() {
    try {
      const res  = await fetch('/api/players/');
      if (!res.ok) throw new Error();
      const data = await res.json();
      playersData = data.map(p => ({
        id:       p.id,
        name:     p.name          || 'unnamed',
        grade:    p.grade         || '—',
        position: p.position      || '',
        jersey:   p.jersey_number || '—',
        picture:  p.picture       || null,
        user_id:  p.user_id       || null,  // null = no linked account yet
        email:    p.email         || null
      }));
      displayPlayers(playersData);
    } catch {
      playersGrid.innerHTML = '<p class="text-danger">unable to load players.</p>';
    }
  }

  function displayPlayers(players) {
    playersGrid.innerHTML = '';

    // "Add player" card — CSS-drawn plus circle, no image file needed
    const addCol = document.createElement('div');
    addCol.className = 'col text-center';
    addCol.innerHTML = `
      <div class="player-square-add" id="addPlayerTrigger" style="cursor:pointer;">
        <span style="font-size:2.5rem; font-weight:300; color:var(--pill-pink); line-height:1;">+</span>
      </div>
      <p class="m-0 fw-bold" style="font-size:0.9rem;">add player</p>
    `;
    addCol.querySelector('#addPlayerTrigger').addEventListener('click', openAddModal);
    playersGrid.appendChild(addCol);

    if (!players.length) {
      const msg = document.createElement('p');
      msg.className   = 'text-muted mt-2';
      msg.textContent = 'no players match the filter.';
      playersGrid.appendChild(msg);
      return;
    }

    players.forEach(player => {
      const col = document.createElement('div');
      col.className    = 'col text-center';
      col.style.cursor = 'pointer';

      // Show profile picture inside the square if one exists
      const picHtml = player.picture
        ? `<img src="${player.picture}"
               style="width:100%;height:100%;object-fit:cover;border-radius:20px;">`
        : '';

      col.innerHTML = `
        <div class="player-square">${picHtml}</div>
        <p class="m-0 fw-bold" style="font-size:0.9rem;">${player.name}</p>
        <small style="opacity:0.7;">${player.position || '—'}</small>
      `;
      col.addEventListener('click', () => showPlayerDetail(player));
      playersGrid.appendChild(col);
    });
  }

  // ── PLAYER DETAIL SIDEBAR ──────────────────────────────

  function showPlayerDetail(player) {
    selectedPlayer = player;
    playerDetailCard.style.display = 'block';
    playerNameEl.textContent = player.name.toUpperCase();

    playerInfoEl.innerHTML = `
      <p style="margin:0;">player</p>
      <p style="margin:0;">gr. ${player.grade}</p>
      <p style="margin:0;">#${player.jersey}</p>
      <p style="margin-top:12px;">
        <strong>position:</strong><br>${player.position || '—'}
      </p>
      ${player.email
        ? `<p style="margin-top:8px;font-size:0.8rem;opacity:0.7;">${player.email}</p>`
        : `<p style="margin-top:8px;font-size:0.8rem;opacity:0.5;">no linked account</p>`}
    `;

    // Profile picture or placeholder
    if (player.picture) {
      playerPicDisplay.innerHTML = `
        <img src="${player.picture}"
             style="width:70px;height:70px;border-radius:50%;object-fit:cover;">`;
    } else {
      playerPicDisplay.innerHTML = `
        <img src="/assets/icons/upload_arrow.png" style="width:30px;">`;
    }

    // Reset stats preview state
    playerStatsPreview.style.display = 'none';
    viewStatsBtn.textContent = 'view stats';
  }

  // ── VIEW STATS TOGGLE ──────────────────────────────────

  if (viewStatsBtn) {
    viewStatsBtn.addEventListener('click', async () => {
      if (!selectedPlayer) return;

      if (playerStatsPreview.style.display === 'none') {
        viewStatsBtn.textContent = 'loading...';
        try {
          const res    = await fetch(`/api/stats/player/${selectedPlayer.id}/totals`);
          const totals = await res.json();
          document.getElementById('previewKills').textContent  = totals.total_kills  ?? '—';
          document.getElementById('previewAces').textContent   = totals.total_aces   ?? '—';
          document.getElementById('previewBlocks').textContent = totals.total_blocks ?? '—';
          document.getElementById('previewDigs').textContent   = totals.total_digs   ?? '—';
          playerStatsPreview.style.display = 'block';
          viewStatsBtn.textContent = 'hide stats';
        } catch {
          viewStatsBtn.textContent = 'could not load';
        }
      } else {
        playerStatsPreview.style.display = 'none';
        viewStatsBtn.textContent = 'view stats';
      }
    });
  }

  // ── ADD PLAYER ─────────────────────────────────────────

  function openAddModal() {
    addPlayerError.textContent = '';
    document.getElementById('newPlayerName').value     = '';
    document.getElementById('newPlayerGrade').value    = '';
    document.getElementById('newPlayerPosition').value = '';
    document.getElementById('newPlayerJersey').value   = '';
    showModal(addModal);
  }

  if (saveAddPlayer) {
    saveAddPlayer.addEventListener('click', async () => {
      const name     = document.getElementById('newPlayerName').value.trim();
      const grade    = document.getElementById('newPlayerGrade').value.trim();
      const position = document.getElementById('newPlayerPosition').value.trim();
      const jersey   = document.getElementById('newPlayerJersey').value.trim();

      if (!name) { addPlayerError.textContent = 'name is required.'; return; }

      try {
        const res  = await fetch('/api/players/add', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name, grade, position, jersey_number: jersey || null })
        });
        const data = await res.json();
        if (data.success) {
          hideModal(addModal);
          fetchPlayers();
        } else {
          addPlayerError.textContent = data.error || 'could not add player.';
        }
      } catch {
        addPlayerError.textContent = 'network error — please try again.';
      }
    });
  }

  // ── EDIT PLAYER ────────────────────────────────────────
  // Flow:
  //   1. Coach clicks "edit" in the detail sidebar
  //   2. Modal opens pre-filled with current profile values
  //   3. Account section shown only if the player has a linked user account
  //   4. On save:
  //      a. Always PUT /api/players/<id> with profile fields
  //      b. If email or password provided, POST /api/players/<id>/account
  //   5. Sidebar and grid refresh on success

  if (editPlayerBtn) {
    editPlayerBtn.addEventListener('click', () => {
      if (!selectedPlayer) return;

      // Pre-fill profile fields with current values
      document.getElementById('editPlayerTitle').textContent =
        selectedPlayer.name.toLowerCase();
      document.getElementById('editName').value     = selectedPlayer.name     === '—' ? '' : selectedPlayer.name;
      document.getElementById('editGrade').value    = selectedPlayer.grade    === '—' ? '' : selectedPlayer.grade;
      document.getElementById('editPosition').value = selectedPlayer.position || '';
      document.getElementById('editJersey').value   = selectedPlayer.jersey   === '—' ? '' : selectedPlayer.jersey;
      document.getElementById('editEmail').value    = '';
      document.getElementById('editPassword').value = '';
      editPlayerError.textContent   = '';
      editPlayerSuccess.textContent = '';

      // Only show account section if there is a linked user
      editAccountSection.style.display = selectedPlayer.user_id ? 'block' : 'none';

      showModal(editModal);
    });
  }

  if (saveEditPlayer) {
    saveEditPlayer.addEventListener('click', async () => {
      if (!selectedPlayer) return;

      editPlayerError.textContent   = '';
      editPlayerSuccess.textContent = '';
      saveEditPlayer.disabled       = true;
      saveEditPlayer.textContent    = 'saving...';

      const name     = document.getElementById('editName').value.trim();
      const grade    = document.getElementById('editGrade').value.trim();
      const position = document.getElementById('editPosition').value.trim();
      const jersey   = document.getElementById('editJersey').value.trim();
      const email    = document.getElementById('editEmail').value.trim();
      const password = document.getElementById('editPassword').value;

      if (!name) {
        editPlayerError.textContent = 'name is required.';
        saveEditPlayer.disabled     = false;
        saveEditPlayer.textContent  = 'save changes';
        return;
      }

      try {
        // Step 1: always save profile fields
        const profileRes = await fetch(`/api/players/${selectedPlayer.id}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            name,
            grade:         grade    || null,
            position:      position || null,
            jersey_number: jersey   || null
          })
        });
        if (!profileRes.ok) throw new Error('profile save failed');

        // Step 2: save account fields only if something was provided
        if (selectedPlayer.user_id && (email || password)) {
          const accountRes = await fetch(
            `/api/players/${selectedPlayer.id}/account`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email: email || undefined,
                                      password: password || undefined })
          });
          const accountData = await accountRes.json();
          if (!accountData.success) {
            editPlayerError.textContent = accountData.error || 'account update failed.';
            saveEditPlayer.disabled     = false;
            saveEditPlayer.textContent  = 'save changes';
            return;
          }
        }

        // Update local state so sidebar refreshes without a full reload
        selectedPlayer.name     = name;
        selectedPlayer.grade    = grade    || '—';
        selectedPlayer.position = position || '';
        selectedPlayer.jersey   = jersey   || '—';
        if (email) selectedPlayer.email = email;

        editPlayerSuccess.textContent = 'saved!';
        setTimeout(() => {
          hideModal(editModal);
          fetchPlayers();          // refresh grid
          showPlayerDetail(selectedPlayer); // refresh sidebar
        }, 800);

      } catch {
        editPlayerError.textContent = 'network error — please try again.';
      } finally {
        saveEditPlayer.disabled    = false;
        saveEditPlayer.textContent = 'save changes';
      }
    });
  }

  // ── DELETE PLAYER ──────────────────────────────────────
  // Flow:
  //   1. Coach clicks "delete" in the detail sidebar
  //   2. Confirmation modal shows the player's name
  //   3. Confirmed → DELETE /api/players/<id>
  //      Cascades to player_stats via DB foreign key
  //   4. Sidebar hides, grid refreshes

  if (deletePlayerBtn) {
    deletePlayerBtn.addEventListener('click', () => {
      if (!selectedPlayer) return;
      deletePlayerName.textContent = selectedPlayer.name;
      showModal(deleteModal);
    });
  }

  if (confirmDeletePlayer) {
    confirmDeletePlayer.addEventListener('click', async () => {
      if (!selectedPlayer) return;
      try {
        const res = await fetch(`/api/players/${selectedPlayer.id}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          hideModal(deleteModal);
          playerDetailCard.style.display = 'none';
          selectedPlayer = null;
          fetchPlayers();
        } else {
          alert(data.error || 'could not delete player.');
        }
      } catch {
        alert('network error — please try again.');
      }
    });
  }

  // ── FILTER ─────────────────────────────────────────────

  function filterPlayers() {
    const searchText        = searchInput.value.toLowerCase();
    const selectedPositions = Array.from(checkboxes)
                                  .filter(cb => cb.checked)
                                  .map(cb => cb.value.toLowerCase());

    const filtered = playersData.filter(p => {
      const nameMatch = p.name.toLowerCase().includes(searchText);

      // If no positions are selected, show everyone
      if (selectedPositions.length === 0) return nameMatch;

      // If player has no position, hide them when a filter is active
      if (!p.position) return false;

      // Split "Middle, Setter" into ["middle", "setter"] and check for any overlap
      const playerPositions = p.position.split(',').map(x => x.trim().toLowerCase());
      const posMatch = playerPositions.some(pos => selectedPositions.includes(pos));

      return nameMatch && posMatch;
    });

    displayPlayers(filtered);
  }

  if (searchInput) searchInput.addEventListener('input', filterPlayers);
  checkboxes.forEach(cb => cb.addEventListener('change', filterPlayers));

  // ── INIT ───────────────────────────────────────────────
  fetchPlayers();

});