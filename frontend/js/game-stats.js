/**
 * @file game-stats.js
 * @description Manages the game statistics page UI.
 *
 * Responsibilities:
 *  - Loading and rendering the games grid
 *  - Displaying per-game set scores on each game tile
 *  - View modal: shows aggregated kills, aces, blocks, featured player, and set scores
 *  - Edit modal: allows updating per-set scores and per-player statistics
 *  - Add game modal: creates a new game record and opens the edit modal
 *  - Delete game: confirms and permanently removes a game record
 *  - Context menu: right-click access to view, edit, and delete actions
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── DOM REFERENCES ────────────────────────────────────────────────────────

  /** @type {HTMLElement} Grid container for all game tiles. */
  const gamesGrid = document.getElementById('gamesGrid');

  /** @type {HTMLElement} Sidebar list element for featured games. */
  const featuredList = document.getElementById('featuredGamesList');

  /** @type {HTMLElement} Modal overlay for adding a new game. */
  const addModal = document.getElementById('addGameModal');

  /** @type {HTMLInputElement} Text input for the opponent's name in the add-game modal. */
  const newOpponentInput = document.getElementById('newOpponentInput');

  /** @type {HTMLElement} Live preview of the opponent name within the add-game modal. */
  const opponentPreview = document.getElementById('opponentPreview');

  /** @type {HTMLButtonElement} Button that submits the new game form. */
  const saveNewGameBtn = document.getElementById('saveNewGameBtn');

  /** @type {HTMLButtonElement} Button that closes the add-game modal. */
  const closeAddModal = document.getElementById('closeAddModal');

  /** @type {HTMLElement} Modal overlay for viewing a game's stats summary. */
  const viewModal = document.getElementById('viewGameModal');

  /** @type {HTMLElement} Element displaying the opponent name in the view modal. */
  const viewOpponent = document.getElementById('viewOpponent');

  /** @type {HTMLElement} Element displaying total kills in the view modal. */
  const viewKills = document.getElementById('viewKills');

  /** @type {HTMLElement} Element displaying total aces in the view modal. */
  const viewAces = document.getElementById('viewAces');

  /** @type {HTMLElement} Element displaying total blocks in the view modal. */
  const viewBlocks = document.getElementById('viewBlocks');

  /** @type {HTMLElement} Element displaying the featured (highest-kills) player. */
  const viewFeatured = document.getElementById('viewFeatured');

  /** @type {HTMLElement} Sidebar container for per-set score boxes in the view modal. */
  const setSidebar = document.getElementById('setSidebar');

  /** @type {HTMLButtonElement} Button that transitions from the view modal to the edit modal. */
  const openEditBtn = document.getElementById('openEditBtn');

  /** @type {HTMLButtonElement} Button that closes the view modal. */
  const closeViewModal = document.getElementById('closeViewModal');

  /** @type {HTMLElement} Modal overlay for editing a game's set scores and player stats. */
  const editModal = document.getElementById('editGameModal');

  /** @type {HTMLElement} Element displaying the opponent name in the edit modal. */
  const editOpponent = document.getElementById('editOpponent');

  /** @type {HTMLElement} Container for the dynamically built edit form. */
  const editModalBody = document.getElementById('editModalBody');

  /** @type {HTMLButtonElement} Button that closes the edit modal. */
  const closeEditModal = document.getElementById('closeEditModal');

  /** @type {HTMLElement} Modal overlay for the delete-confirmation prompt. */
  const deleteModal = document.getElementById('deleteConfirmModal');

  /** @type {HTMLButtonElement} Button that confirms a game deletion. */
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  /** @type {HTMLButtonElement} Button that cancels a pending deletion. */
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

  /** @type {HTMLButtonElement} Button that closes the delete-confirmation modal. */
  const closeDeleteModal = document.getElementById('closeDeleteModal');

  /** @type {HTMLElement} Custom right-click context menu element. */
  const contextMenu = document.getElementById('gameContextMenu');

  /** @type {HTMLElement} "View stats" item in the context menu. */
  const ctxViewStats = document.getElementById('ctxViewStats');

  /** @type {HTMLElement} "Edit game" item in the context menu. */
  const ctxEditGame = document.getElementById('ctxEditGame');

  /** @type {HTMLElement} "Delete game" item in the context menu. */
  const ctxDeleteGame = document.getElementById('ctxDeleteGame');

  // ── STATE ─────────────────────────────────────────────────────────────────

  /**
   * The game object most recently targeted by a click or context-menu action.
   * @type {{ id: number, opponent: string } | null}
   */
  let currentGame = null;

  /**
   * The ID of the game awaiting deletion confirmation.
   * @type {number | null}
   */
  let pendingDeleteId = null;

  /**
   * Colour class names cycled across game tiles.
   * @type {string[]}
   */
  const colours = ['pink', 'olive', 'brown'];

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

  // Close any modal when the user clicks its backdrop.
  document.querySelectorAll('.custom-modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) hideModal(modal);
    });
  });

  // Close all modals and the context menu when the Escape key is pressed.
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.custom-modal').forEach(m => hideModal(m));
      hideContextMenu();
    }
  });

  // ── CONTEXT MENU ──────────────────────────────────────────────────────────

  /**
   * Positions and displays the context menu at the given coordinates,
   * binding it to the specified game.
   *
   * @param {number} x - Horizontal position in page pixels.
   * @param {number} y - Vertical position in page pixels.
   * @param {{ id: number, opponent: string }} game - The game the menu applies to.
   */
  function showContextMenu(x, y, game) {
    currentGame = game;
    contextMenu.style.left    = `${x}px`;
    contextMenu.style.top     = `${y}px`;
    contextMenu.style.display = 'block';
  }

  /** Hides the context menu. */
  function hideContextMenu() {
    contextMenu.style.display = 'none';
  }

  // Dismiss the context menu on any document click.
  document.addEventListener('click', () => hideContextMenu());

  ctxViewStats.addEventListener('click', () => {
    hideContextMenu();
    openViewModal(currentGame);
  });

  ctxEditGame.addEventListener('click', () => {
    hideContextMenu();
    openEditModal(currentGame);
  });

  ctxDeleteGame.addEventListener('click', () => {
    hideContextMenu();
    pendingDeleteId = currentGame.id;
    showModal(deleteModal);
  });

  // Trigger the context menu on right-click over a game tile.
  document.getElementById('gamesGrid').addEventListener('contextmenu', e => {
    const box = e.target.closest('.game-box');
    if (!box || box.classList.contains('add-btn')) return;
    e.preventDefault();
    const gameId = parseInt(box.dataset.gameId);
    currentGame  = { id: gameId, opponent: box.dataset.opponent };
    showContextMenu(e.pageX, e.pageY, currentGame);
  });

  // ── LOAD & RENDER GAMES ───────────────────────────────────────────────────

  /**
   * Fetches all games from the API and renders both the main grid
   * and the featured-games sidebar.
   *
   * @async
   * @returns {Promise<void>}
   */
  async function loadGames() {
    try {
      const res = await fetch('/api/games/');
      if (!res.ok) throw new Error();
      const games = await res.json();
      renderGames(games);
      renderFeaturedSidebar(games);
    } catch {
      gamesGrid.innerHTML = '<p style="color:red;">unable to load games.</p>';
    }
  }

  /**
   * Clears the games grid and re-renders one tile per game, followed by
   * an "add game" tile. Each game tile asynchronously populates its score.
   *
   * @param {Array<{ id: number, opponent: string }>} games - Games to render.
   */
  function renderGames(games) {
    gamesGrid.innerHTML = '';

    games.forEach((game, index) => {
      const box = document.createElement('div');
      box.className = `game-box ${colours[index % colours.length]}`;
      box.dataset.gameId   = game.id;
      box.dataset.opponent = game.opponent;

      box.innerHTML = `
        <div class="game-box-title">MHS VS ${game.opponent}</div>
        <div class="game-box-score" id="score-${game.id}">—</div>
      `;

      box.addEventListener('click', () => openViewModal(game));
      box.addEventListener('contextmenu', e => {
        e.preventDefault();
        currentGame = game;
        showContextMenu(e.pageX, e.pageY, game);
      });

      gamesGrid.appendChild(box);
      loadGameTileStat(game.id);
    });

    const addBox = document.createElement('div');
    addBox.className = 'game-box add-btn';
    addBox.textContent = '+';
    addBox.addEventListener('click', () => {
      newOpponentInput.value = '';
      opponentPreview.textContent = '.....';
      showModal(addModal);
    });
    gamesGrid.appendChild(addBox);
  }

  /**
   * Fetches the set data for a single game and updates its tile with the
   * cumulative MHS vs opponent score. Displays "—" if no sets are recorded.
   *
   * @async
   * @param {number} gameId - ID of the game whose score should be displayed.
   * @returns {Promise<void>}
   */
  async function loadGameTileStat(gameId) {
    const el = document.getElementById(`score-${gameId}`);
    if (!el) return;
    try {
      const res  = await fetch(`/api/stats/game/${gameId}/sets`);
      const sets = await res.json();
      if (!sets.length) { el.textContent = '—'; return; }
      const mhs = sets.reduce((sum, s) => sum + s.mhs_score, 0);
      const opp = sets.reduce((sum, s) => sum + s.opp_score, 0);
      el.textContent = `${mhs}–${opp}`;
    } catch {
      el.textContent = '—';
    }
  }

  /**
   * Renders the two most recent games in the featured-games sidebar,
   * each showing the cumulative set score.
   *
   * @async
   * @param {Array<{ id: number, opponent: string }>} games - Full list of games.
   * @returns {Promise<void>}
   */
  async function renderFeaturedSidebar(games) {
    featuredList.innerHTML = '';
    for (const game of games.slice(0, 2)) {
      const card = document.createElement('div');
      card.className = 'game-card';

      let scoreText = '—';
      try {
        const res  = await fetch(`/api/stats/game/${game.id}/sets`);
        const sets = await res.json();
        if (sets.length) {
          const mhs = sets.reduce((sum, s) => sum + s.mhs_score, 0);
          const opp = sets.reduce((sum, s) => sum + s.opp_score, 0);
          scoreText = `${mhs}–${opp}`;
        }
      } catch {}

      card.innerHTML = `
        <p class="game-title">MHS VS ${game.opponent}</p>
        <div class="game-score">${scoreText}</div>
      `;
      featuredList.appendChild(card);
    }
    if (!games.length) featuredList.innerHTML = '<p style="opacity:0.7;">no games yet</p>';
  }

  // ── VIEW MODAL ────────────────────────────────────────────────────────────

  /**
   * Opens the view modal for the given game. Displays placeholder values
   * while data loads, then populates total kills, aces, blocks, the
   * featured player (highest kills), and a set-score sidebar.
   *
   * @async
   * @param {{ id: number, opponent: string }} game - The game to display.
   * @returns {Promise<void>}
   */
  async function openViewModal(game) {
    currentGame = game;
    viewOpponent.textContent = game.opponent.toUpperCase();
    viewKills.innerHTML  = 'kills<br>…';
    viewAces.innerHTML   = 'aces<br>…';
    viewBlocks.innerHTML = 'blocks<br>…';
    viewFeatured.textContent = 'featured player: …';
    setSidebar.innerHTML = '';
    showModal(viewModal);

    try {
      const [statsRes, setsRes] = await Promise.all([
        fetch(`/api/stats/game/${game.id}`),
        fetch(`/api/stats/game/${game.id}/sets`)
      ]);
      const stats = await statsRes.json();
      const sets  = await setsRes.json();

      const setCount = Math.max(sets.length, 3);
      for (let i = 1; i <= setCount; i++) {
        const setData = sets.find(s => s.set_number === i) || { mhs_score: 0, opp_score: 0 };
        const box = document.createElement('div');
        box.className = `set-score-box${i === 1 ? ' active' : ''}`;
        box.dataset.setNumber = i;
        box.innerHTML = `
          SET #${i}<br>
          <span style="font-size:1.2rem; font-weight:900;">
            ${setData.mhs_score}–${setData.opp_score}
          </span>
        `;
        box.addEventListener('click', () => {
          document.querySelectorAll('.set-score-box').forEach(b => b.classList.remove('active'));
          box.classList.add('active');
        });
        setSidebar.appendChild(box);
      }

      if (!stats.length) {
        viewKills.innerHTML  = 'kills<br>—';
        viewAces.innerHTML   = 'aces<br>—';
        viewBlocks.innerHTML = 'blocks<br>—';
        viewFeatured.textContent = 'no stats yet — click edit stats to add';
        return;
      }

      const totals = stats.reduce((acc, r) => {
        acc.kills  += r.kills;
        acc.aces   += r.aces;
        acc.blocks += r.blocks;
        return acc;
      }, { kills: 0, aces: 0, blocks: 0 });

      viewKills.innerHTML  = `kills<br>${totals.kills}`;
      viewAces.innerHTML   = `aces<br>${totals.aces}`;
      viewBlocks.innerHTML = `blocks<br>${totals.blocks}`;

      const mvp = stats.reduce((best, r) => r.kills > best.kills ? r : best, stats[0]);
      viewFeatured.textContent = `featured player: ${mvp.name.toUpperCase()}`;

    } catch {
      viewFeatured.textContent = 'could not load stats';
    }
  }

  closeViewModal.addEventListener('click', () => hideModal(viewModal));

  openEditBtn.addEventListener('click', () => {
    hideModal(viewModal);
    openEditModal(currentGame);
  });

  // ── EDIT MODAL ────────────────────────────────────────────────────────────

  /**
   * Opens the edit modal for the given game. Fetches all players, existing
   * player stats, and existing set scores in parallel, then builds:
   *  - A set-score editor with increment/decrement controls for each set
   *  - A player statistics table with numeric inputs for kills, assists,
   *    aces, blocks, and digs
   *
   * @async
   * @param {{ id: number, opponent: string }} game - The game to edit.
   * @returns {Promise<void>}
   */
  async function openEditModal(game) {
    currentGame = game;
    editOpponent.textContent = game.opponent.toUpperCase();
    editModalBody.innerHTML  = '<p style="color:#F5EBD7;">loading…</p>';
    showModal(editModal);

    let players = [], existingStats = {}, existingSets = [];

    try {
      const [playersRes, statsRes, setsRes] = await Promise.all([
        fetch('/api/players/'),
        fetch(`/api/stats/game/${game.id}`),
        fetch(`/api/stats/game/${game.id}/sets`)
      ]);
      players = await playersRes.json();
      const statsArr = await statsRes.json();
      statsArr.forEach(s => { existingStats[s.player_id] = s; });
      existingSets = await setsRes.json();
    } catch {
      editModalBody.innerHTML = '<p style="color:red;">failed to load data.</p>';
      return;
    }

    // Render at least 3 set editors, expanding if more sets already exist.
    const setCount = Math.max(existingSets.length, 3);
    let setsHtml = `
      <div style="margin-bottom:18px;">
        <div style="color:#D9AEAE; font-weight:900; font-size:1rem; margin-bottom:8px;">set scores</div>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
    `;
    for (let i = 1; i <= setCount; i++) {
      const s = existingSets.find(x => x.set_number === i) || { mhs_score: 0, opp_score: 0 };
      setsHtml += `
        <div style="background:#B0947B; border-radius:12px; padding:10px 14px; text-align:center; color:white;">
          <div style="font-size:0.8rem; font-weight:bold; margin-bottom:6px;">set ${i}</div>
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="text-align:center;">
              <div style="font-size:0.65rem; opacity:0.8;">mhs</div>
              <div style="display:flex; flex-direction:column; gap:2px;">
                <button class="set-adj-btn" data-set="${i}" data-side="mhs" data-dir="up"
                        style="background:rgba(255,255,255,0.3);border:none;border-radius:4px;color:white;font-weight:bold;width:28px;cursor:pointer;">▲</button>
                <span class="set-val" id="set-${i}-mhs" style="font-size:1.2rem;font-weight:900;">${s.mhs_score}</span>
                <button class="set-adj-btn" data-set="${i}" data-side="mhs" data-dir="down"
                        style="background:rgba(255,255,255,0.3);border:none;border-radius:4px;color:white;font-weight:bold;width:28px;cursor:pointer;">▼</button>
              </div>
            </div>
            <span style="font-size:1.2rem; font-weight:900; padding-top:4px;">–</span>
            <div style="text-align:center;">
              <div style="font-size:0.65rem; opacity:0.8;">opp</div>
              <div style="display:flex; flex-direction:column; gap:2px;">
                <button class="set-adj-btn" data-set="${i}" data-side="opp" data-dir="up"
                        style="background:rgba(255,255,255,0.3);border:none;border-radius:4px;color:white;font-weight:bold;width:28px;cursor:pointer;">▲</button>
                <span class="set-val" id="set-${i}-opp" style="font-size:1.2rem;font-weight:900;">${s.opp_score}</span>
                <button class="set-adj-btn" data-set="${i}" data-side="opp" data-dir="down"
                        style="background:rgba(255,255,255,0.3);border:none;border-radius:4px;color:white;font-weight:bold;width:28px;cursor:pointer;">▼</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    setsHtml += `</div></div>`;

    const tableHtml = `
      <div style="overflow-y:auto; max-height:250px;">
        <table style="width:100%; color:#F5EBD7; border-collapse:collapse;">
          <thead>
            <tr style="text-align:center; border-bottom:1px solid rgba(255,255,255,0.2);">
              <th style="text-align:left; padding:8px;">player</th>
              <th style="padding:8px;">kills</th>
              <th style="padding:8px;">assists</th>
              <th style="padding:8px;">aces</th>
              <th style="padding:8px;">blocks</th>
              <th style="padding:8px;">digs</th>
            </tr>
          </thead>
          <tbody>
            ${players.map(p => {
              const s = existingStats[p.id] || {};
              return `
                <tr data-player-id="${p.id}" style="text-align:center;">
                  <td style="text-align:left; padding:8px;">${p.name || 'unnamed'}</td>
                  <td><input type="number" min="0" value="${s.kills   ?? 0}" class="stat-input"></td>
                  <td><input type="number" min="0" value="${s.assists ?? 0}" class="stat-input"></td>
                  <td><input type="number" min="0" value="${s.aces    ?? 0}" class="stat-input"></td>
                  <td><input type="number" min="0" value="${s.blocks  ?? 0}" class="stat-input"></td>
                  <td><input type="number" min="0" value="${s.digs    ?? 0}" class="stat-input"></td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <button id="saveStatsBtn" class="save-btn-floating">save changes</button>
    `;

    editModalBody.innerHTML = setsHtml + tableHtml;

    // Wire up set score increment/decrement buttons.
    editModalBody.querySelectorAll('.set-adj-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const setNum = btn.dataset.set;
        const side   = btn.dataset.side;
        const dir    = btn.dataset.dir;
        const valEl  = document.getElementById(`set-${setNum}-${side}`);
        let val = parseInt(valEl.textContent) || 0;
        val = dir === 'up' ? val + 1 : Math.max(0, val - 1);
        valEl.textContent = val;
      });
    });

    document.getElementById('saveStatsBtn').addEventListener('click', () => saveAll(game.id, setCount));
  }

  closeEditModal.addEventListener('click', () => hideModal(editModal));

  /**
   * Persists all set scores and player statistics for the given game.
   * Submits all requests in parallel and reloads the games grid on success.
   *
   * @async
   * @param {number} gameId   - ID of the game being saved.
   * @param {number} setCount - Number of set editors currently rendered.
   * @returns {Promise<void>}
   */
  async function saveAll(gameId, setCount) {
    const setPromises = [];
    for (let i = 1; i <= setCount; i++) {
      const mhs = parseInt(document.getElementById(`set-${i}-mhs`)?.textContent) || 0;
      const opp = parseInt(document.getElementById(`set-${i}-opp`)?.textContent) || 0;
      setPromises.push(
        fetch(`/api/stats/game/${gameId}/sets/${i}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mhs_score: mhs, opp_score: opp })
        })
      );
    }

    const rows = editModalBody.querySelectorAll('tr[data-player-id]');
    const statPromises = Array.from(rows).map(row => {
      const playerId = row.getAttribute('data-player-id');
      const inputs   = row.querySelectorAll('input');
      return fetch(`/api/stats/game/${gameId}/player/${playerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kills:   parseInt(inputs[0].value) || 0,
          assists: parseInt(inputs[1].value) || 0,
          aces:    parseInt(inputs[2].value) || 0,
          blocks:  parseInt(inputs[3].value) || 0,
          digs:    parseInt(inputs[4].value) || 0
        })
      });
    });

    try {
      await Promise.all([...setPromises, ...statPromises]);
      hideModal(editModal);
      loadGames();
    } catch {
      alert('error saving — please try again.');
    }
  }

  // ── ADD GAME ──────────────────────────────────────────────────────────────

  // Update the live opponent preview as the user types.
  newOpponentInput.addEventListener('input', () => {
    opponentPreview.textContent = newOpponentInput.value.trim() || '.....';
  });

  closeAddModal.addEventListener('click', () => hideModal(addModal));

  /**
   * Submits the new game form, creates the game record via the API,
   * then immediately opens the edit modal so stats can be entered.
   */
  saveNewGameBtn.addEventListener('click', async () => {
    const opponent = newOpponentInput.value.trim();
    if (!opponent) { alert('please enter the opposing school name.'); return; }
    const today = new Date().toISOString().split('T')[0];
    try {
      const res = await fetch('/api/games/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opponent, game_date: today, season: '2024-2025' })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      hideModal(addModal);
      await loadGames();
      openEditModal({ id: data.game_id, opponent });
    } catch {
      alert('error adding game.');
    }
  });

  // ── DELETE GAME ───────────────────────────────────────────────────────────

  /**
   * Confirms the pending deletion, sends a DELETE request to the API,
   * then reloads the games grid.
   */
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    try {
      const res = await fetch(`/api/games/${pendingDeleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      hideModal(deleteModal);
      pendingDeleteId = null;
      loadGames();
    } catch {
      alert('error deleting game.');
    }
  });

  cancelDeleteBtn.addEventListener('click',  () => hideModal(deleteModal));
  closeDeleteModal.addEventListener('click', () => hideModal(deleteModal));

  // ── INIT ──────────────────────────────────────────────────────────────────

  loadGames();
});