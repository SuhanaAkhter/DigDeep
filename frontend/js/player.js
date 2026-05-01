/**
 * player.js
 * Handles player management UI:
 *  - Fetching and displaying players
 *  - Search + filter by position
 *  - Selecting a player to view their detail card
 *  - Adding new players via prompt
 */

document.addEventListener('DOMContentLoaded', () => {

  const playersGrid       = document.getElementById('playersGrid');
  const playerDetailCard  = document.getElementById('playerDetailCard');
  const playerNameEl      = document.getElementById('playerName');
  const playerInfoEl      = document.getElementById('playerInfo');
  const playerPicDisplay  = document.getElementById('playerPicDisplay');
  const viewStatsBtn      = document.getElementById('viewStatsBtn');
  const playerStatsPreview = document.getElementById('playerStatsPreview');
  const searchInput       = document.getElementById('searchInput');
  const checkboxes        = document.querySelectorAll('.position-filter');

  // Add player modal elements
  const addModal       = document.getElementById('addPlayerModal');
  const closeAddPlayer = document.getElementById('closeAddPlayer');
  const saveAddPlayer  = document.getElementById('saveAddPlayer');
  const addPlayerError = document.getElementById('addPlayerError');

  let playersData    = [];
  let selectedPlayer = null;

  // ── MODAL HELPERS ──────────────────────────────────────
  function showModal(el) { el.style.display = 'flex'; }
  function hideModal(el) { el.style.display = 'none'; }

  if (closeAddPlayer) closeAddPlayer.addEventListener('click', () => hideModal(addModal));
  addModal.addEventListener('click', e => { if (e.target === addModal) hideModal(addModal); });

  // ── FETCH PLAYERS ──────────────────────────────────────
  async function fetchPlayers() {
    try {
      const res  = await fetch('/api/players/');
      if (!res.ok) throw new Error();
      const data = await res.json();
      playersData = data.map(p => ({
        id:       p.id,
        name:     p.name     || 'unnamed',
        grade:    p.grade    || '—',
        position: p.position || '',
        jersey:   p.jersey_number || '—',
        picture:  p.picture  || null
      }));
      displayPlayers(playersData);
    } catch {
      playersGrid.innerHTML = '<p class="text-danger">unable to load players.</p>';
    }
  }

  // ── DISPLAY PLAYERS ────────────────────────────────────
  function displayPlayers(players) {
    playersGrid.innerHTML = '';

    // Add player button
    const addCol = document.createElement('div');
    addCol.className = 'col text-center';
    addCol.innerHTML = `
      <div class="player-square-add" style="cursor:pointer;">
        <img src="/assets/icons/upload_arrow.png" alt="add" style="width:40px;">
      </div>
      <p class="m-0 fw-bold">add player</p>
    `;
    addCol.querySelector('.player-square-add').addEventListener('click', () => {
      addPlayerError.textContent = '';
      document.getElementById('newPlayerName').value     = '';
      document.getElementById('newPlayerGrade').value    = '';
      document.getElementById('newPlayerPosition').value = '';
      document.getElementById('newPlayerJersey').value   = '';
      showModal(addModal);
    });
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

      const picHtml = player.picture
        ? `<img src="${player.picture}" style="width:100%;height:100%;object-fit:cover;border-radius:20px;">`
        : '';

      col.innerHTML = `
        <div class="player-square">${picHtml}</div>
        <p class="m-0 fw-bold">${player.name}</p>
        <small>${player.position || '—'}</small>
      `;
      col.addEventListener('click', () => showPlayerDetail(player));
      playersGrid.appendChild(col);
    });
  }

  // ── SHOW PLAYER DETAIL ─────────────────────────────────
  function showPlayerDetail(player) {
    selectedPlayer = player;
    playerDetailCard.style.display = 'block';
    playerNameEl.textContent = player.name.toUpperCase();
    playerInfoEl.innerHTML = `
      <p>player</p>
      <p>gr. ${player.grade}</p>
      <p>#${player.jersey}</p>
      <p class="mt-3"><strong>position:</strong><br>${player.position || '—'}</p>
    `;

    // Show picture or placeholder
    if (player.picture) {
      playerPicDisplay.innerHTML = `
        <img src="${player.picture}"
             style="width:70px;height:70px;border-radius:50%;object-fit:cover;">`;
    } else {
      playerPicDisplay.innerHTML = `
        <img src="/assets/icons/upload_arrow.png" style="width:30px;">`;
    }

    // Reset stats preview
    playerStatsPreview.style.display = 'none';
    viewStatsBtn.textContent = 'view stats';
  }

  // ── VIEW STATS BUTTON ──────────────────────────────────
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
  if (saveAddPlayer) {
    saveAddPlayer.addEventListener('click', async () => {
      const name     = document.getElementById('newPlayerName').value.trim();
      const grade    = document.getElementById('newPlayerGrade').value.trim();
      const position = document.getElementById('newPlayerPosition').value.trim();
      const jersey   = document.getElementById('newPlayerJersey').value.trim();

      if (!name) { addPlayerError.textContent = 'name is required.'; return; }

      try {
        const res  = await fetch('/api/players/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, grade, position, jersey_number: jersey || null })
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

  // ── FILTER ─────────────────────────────────────────────
  function filterPlayers() {
    const searchText        = searchInput.value.toLowerCase();
    const selectedPositions = Array.from(checkboxes)
                                   .filter(cb => cb.checked)
                                   .map(cb => cb.value);

    const filtered = playersData.filter(p => {
      const nameMatch = p.name.toLowerCase().includes(searchText);
      if (!p.position) return nameMatch && selectedPositions.length === 0;
      const positions = p.position.split(',').map(x => x.trim());
      const posMatch  = selectedPositions.length === 0 ||
                        positions.some(pos => selectedPositions.includes(pos));
      return nameMatch && posMatch;
    });

    displayPlayers(filtered);
  }

  if (searchInput) searchInput.addEventListener('input', filterPlayers);
  checkboxes.forEach(cb => cb.addEventListener('change', filterPlayers));

  // ── INIT ───────────────────────────────────────────────
  fetchPlayers();

});