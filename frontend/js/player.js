/**
 * @file player.js
 * @description Manages the player management page UI.
 *
 * Responsibilities:
 *  - Fetching and rendering the player grid
 *  - Filtering players by name (search) and position (checkboxes)
 *  - Displaying a detail card for a selected player
 *  - Toggling an inline stats preview for a selected player
 *  - Adding new players via a modal form
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── DOM REFERENCES ────────────────────────────────────────────────────────

  /** @type {HTMLElement} Grid container where player tiles are rendered. */
  const playersGrid = document.getElementById('playersGrid');

  /** @type {HTMLElement} Sidebar card that shows the selected player's details. */
  const playerDetailCard = document.getElementById('playerDetailCard');

  /** @type {HTMLElement} Element that displays the selected player's name. */
  const playerNameEl = document.getElementById('playerName');

  /** @type {HTMLElement} Element that displays the selected player's biographical info. */
  const playerInfoEl = document.getElementById('playerInfo');

  /** @type {HTMLElement} Container for the selected player's profile picture. */
  const playerPicDisplay = document.getElementById('playerPicDisplay');

  /** @type {HTMLButtonElement} Button that toggles the inline stats preview. */
  const viewStatsBtn = document.getElementById('viewStatsBtn');

  /** @type {HTMLElement} Container for the inline stats preview panel. */
  const playerStatsPreview = document.getElementById('playerStatsPreview');

  /** @type {HTMLInputElement} Text input used to filter players by name. */
  const searchInput = document.getElementById('searchInput');

  /** @type {NodeList<HTMLInputElement>} Checkboxes used to filter players by position. */
  const checkboxes = document.querySelectorAll('.position-filter');

  /** @type {HTMLElement} Modal overlay for the add-player form. */
  const addModal = document.getElementById('addPlayerModal');

  /** @type {HTMLButtonElement} Button that closes the add-player modal. */
  const closeAddPlayer = document.getElementById('closeAddPlayer');

  /** @type {HTMLButtonElement} Button that submits the add-player form. */
  const saveAddPlayer = document.getElementById('saveAddPlayer');

  /** @type {HTMLElement} Element that displays validation errors in the add-player modal. */
  const addPlayerError = document.getElementById('addPlayerError');

  // ── STATE ─────────────────────────────────────────────────────────────────

  /**
   * The full list of player objects fetched from the API.
   * @type {Array<{ id: number, name: string, grade: string, position: string, jersey: string, picture: string|null }>}
   */
  let playersData = [];

  /**
   * The player whose detail card is currently visible.
   * @type {{ id: number, name: string, grade: string, position: string, jersey: string, picture: string|null } | null}
   */
  let selectedPlayer = null;

  // ── MODAL HELPERS ─────────────────────────────────────────────────────────

  /**
   * Displays a modal overlay using flex layout.
   * @param {HTMLElement} el - The modal overlay element to show.
   */
  function showModal(el) { el.style.display = 'flex'; }

  /**
   * Hides a modal overlay.
   * @param {HTMLElement} el - The modal overlay element to hide.
   */
  function hideModal(el) { el.style.display = 'none'; }

  if (closeAddPlayer) closeAddPlayer.addEventListener('click', () => hideModal(addModal));

  // Close the add-player modal when the user clicks its backdrop.
  addModal.addEventListener('click', e => { if (e.target === addModal) hideModal(addModal); });

  // ── FETCH PLAYERS ─────────────────────────────────────────────────────────

  /**
   * Fetches the full player list from the API, normalises each record,
   * stores the result in `playersData`, and renders the grid.
   *
   * @async
   * @returns {Promise<void>}
   */
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

  // ── DISPLAY PLAYERS ───────────────────────────────────────────────────────

  /**
   * Clears the player grid and renders one tile per player, preceded by
   * an "add player" tile. Tapping a player tile opens their detail card.
   *
   * @param {Array<{ id: number, name: string, position: string, picture: string|null }>} players
   *   The (possibly filtered) list of players to display.
   */
  function displayPlayers(players) {
    playersGrid.innerHTML = '';

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

  // ── PLAYER DETAIL CARD ────────────────────────────────────────────────────

  /**
   * Populates and reveals the player detail sidebar for the given player.
   * Resets any previously visible stats preview.
   *
   * @param {{ id: number, name: string, grade: string, jersey: string, position: string, picture: string|null }} player
   *   The player whose details should be shown.
   */
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

    if (player.picture) {
      playerPicDisplay.innerHTML = `
        <img src="${player.picture}"
             style="width:70px;height:70px;border-radius:50%;object-fit:cover;">`;
    } else {
      playerPicDisplay.innerHTML = `
        <img src="/assets/icons/upload_arrow.png" style="width:30px;">`;
    }

    playerStatsPreview.style.display = 'none';
    viewStatsBtn.textContent = 'view stats';
  }

  // ── STATS PREVIEW TOGGLE ──────────────────────────────────────────────────

  if (viewStatsBtn) {
    /**
     * Toggles the inline stats preview panel. On first open, fetches career
     * totals (kills, aces, blocks, digs) for the currently selected player
     * and populates the preview elements. On subsequent clicks the panel is
     * hidden without re-fetching.
     */
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

  // ── ADD PLAYER ────────────────────────────────────────────────────────────

  if (saveAddPlayer) {
    /**
     * Reads the add-player form fields, validates that a name has been
     * provided, then POSTs the new player to the API. Closes the modal and
     * refreshes the grid on success; displays an inline error on failure.
     */
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

  // ── FILTER ────────────────────────────────────────────────────────────────

  /**
   * Filters `playersData` against the current search text and checked
   * position filters, then re-renders the grid with the matching subset.
   *
   * A player is included when:
   *  - Their name contains the search string (case-insensitive), AND
   *  - At least one of their positions matches a checked filter,
   *    or no position filters are checked (show all positions).
   */
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

  // ── INIT ──────────────────────────────────────────────────────────────────

  fetchPlayers();
});