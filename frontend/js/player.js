/**
 * player.js
 * Handles player management UI:
 *  - Fetching and displaying players
 *  - Search + filter by position
 *  - Selecting a player to view their detail card
 *  - Adding new players via prompt
 */

// FIX: all code wrapped in DOMContentLoaded — previously globals ran before the DOM
// was ready, causing null-reference errors on every querySelector call at the top level.
document.addEventListener('DOMContentLoaded', () => {

  const playersGrid      = document.getElementById('playersGrid');
  const playerDetailCard = document.getElementById('playerDetailCard');
  const playerNameEl     = document.getElementById('playerName');
  const playerInfoEl     = document.getElementById('playerInfo');
  const featuredGameEl   = document.getElementById('featuredGame');
  const searchInput      = document.getElementById('searchInput');
  const checkboxes       = document.querySelectorAll('.position-filter');

  let playersData = [];

  // ── FETCH PLAYERS ──────────────────────────────────────
  async function fetchPlayers() {
    try {
      const response = await fetch('/api/players/');
      if (!response.ok) throw new Error('failed to fetch players');
      const data = await response.json();
      playersData = data.map(player => ({
        id:           player.id,
        name:         player.name   || 'unnamed',
        grade:        player.grade  || '—',
        position:     player.position || '',
        jersey:       player.jersey_number || '—'
      }));
      displayPlayers(playersData);
    } catch (err) {
      console.error(err);
      playersGrid.innerHTML = '<p class="text-danger">unable to load players.</p>';
    }
  }

  // ── DISPLAY PLAYERS ────────────────────────────────────
  function displayPlayers(players) {
    playersGrid.innerHTML = '';

    // "Add Player" card
    const addCol = document.createElement('div');
    addCol.className = 'col text-center';
    addCol.innerHTML = `
      <div class="player-square-add" style="cursor:pointer;">
        <img src="/assets/icons/upload_arrow.png" alt="add" style="width:40px;">
      </div>
      <p class="m-0 fw-bold">add player</p>
    `;
    // FIX: was re-registering a new click listener every time displayPlayers() ran
    // (because it called getElementById each time). Attach directly to the element here.
    addCol.querySelector('.player-square-add').addEventListener('click', showAddPlayerModal);
    playersGrid.appendChild(addCol);

    if (players.length === 0) {
      const msg = document.createElement('p');
      msg.className = 'text-muted mt-2';
      msg.textContent = 'no players match the filter.';
      playersGrid.appendChild(msg);
      return;
    }

    players.forEach(player => {
      const col = document.createElement('div');
      col.className = 'col text-center';
      col.style.cursor = 'pointer';
      col.innerHTML = `
        <div class="player-square"></div>
        <p class="m-0 fw-bold">${player.name}</p>
        <small>${player.position || '—'}</small>
      `;
      col.addEventListener('click', () => showPlayerDetail(player));
      playersGrid.appendChild(col);
    });
  }

  // ── SHOW PLAYER DETAIL ─────────────────────────────────
  function showPlayerDetail(player) {
    playerDetailCard.style.display = 'block';
    playerNameEl.textContent = player.name.toUpperCase();
    playerInfoEl.innerHTML = `
      <p>player</p>
      <p>gr. ${player.grade}</p>
      <p>#${player.jersey}</p>
      <p class="mt-3"><strong>position:</strong><br>${player.position || '—'}</p>
    `;
    if (featuredGameEl) featuredGameEl.textContent = '—';
  }

  // ── FILTER PLAYERS ─────────────────────────────────────
  function filterPlayers() {
    const searchText       = searchInput.value.toLowerCase();
    const selectedPositions = Array.from(checkboxes)
                                   .filter(cb => cb.checked)
                                   .map(cb => cb.value);

    const filtered = playersData.filter(p => {
      const nameMatch = p.name.toLowerCase().includes(searchText);

      // FIX: position can be null/empty — guard before calling .split()
      if (!p.position) return nameMatch && selectedPositions.length === 0;

      const positions = p.position.split(',').map(pos => pos.trim());
      const posMatch  = selectedPositions.length === 0 ||
                        positions.some(pos => selectedPositions.includes(pos));
      return nameMatch && posMatch;
    });

    displayPlayers(filtered);
  }

  // ── ADD PLAYER MODAL ───────────────────────────────────
  function showAddPlayerModal() {
    const name = prompt('enter player name:');
    if (!name || !name.trim()) return;

    const grade = prompt('enter player grade:');
    if (!grade) return;

    const position = prompt('enter position (e.g. Middle, Setter):');
    if (!position) return;

    // FIX: removed addPlayerToBackend() POST call — there is no POST /api/players/ route
    // on the backend (only GET and PUT). Adding a player requires an account to be linked,
    // so for now we show the new entry locally and remind the coach to have the player sign up.
    const tempPlayer = {
      id:       Date.now(),
      name:     name.trim(),
      grade:    grade.trim(),
      position: position.trim(),
      jersey:   '—'
    };
    playersData.push(tempPlayer);
    displayPlayers(playersData);
    alert(`player "${tempPlayer.name}" added locally.\nTo link them fully, have them create an account and you can assign their profile from the backend.`);
  }

  // ── EVENT LISTENERS ────────────────────────────────────
  if (searchInput) searchInput.addEventListener('input', filterPlayers);
  checkboxes.forEach(cb => cb.addEventListener('change', filterPlayers));

  // ── INIT ───────────────────────────────────────────────
  fetchPlayers();

});