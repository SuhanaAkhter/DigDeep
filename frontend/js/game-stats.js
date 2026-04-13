document.addEventListener('DOMContentLoaded', () => {

  // ================= DOM REFERENCES =================
  const gamesGrid        = document.getElementById('gamesGrid');
  const featuredList     = document.getElementById('featuredGamesList');

  const addModal         = document.getElementById('addGameModal');
  const newOpponentInput = document.getElementById('newOpponentInput');
  const opponentPreview  = document.getElementById('opponentPreview');
  const saveNewGameBtn   = document.getElementById('saveNewGameBtn');
  const closeAddModal    = document.getElementById('closeAddModal');

  const viewModal        = document.getElementById('viewGameModal');
  const viewOpponent     = document.getElementById('viewOpponent');
  const viewKills        = document.getElementById('viewKills');
  const viewAces         = document.getElementById('viewAces');
  const viewBlocks       = document.getElementById('viewBlocks');
  const viewFeatured     = document.getElementById('viewFeatured');
  const setSidebar       = document.getElementById('setSidebar');
  const openEditBtn      = document.getElementById('openEditBtn');
  const closeViewModal   = document.getElementById('closeViewModal');

  const editModal        = document.getElementById('editGameModal');
  const editOpponent     = document.getElementById('editOpponent');
  const editModalBody    = document.getElementById('editModalBody');
  const closeEditModal   = document.getElementById('closeEditModal');

  const deleteModal      = document.getElementById('deleteConfirmModal');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const cancelDeleteBtn  = document.getElementById('cancelDeleteBtn');
  const closeDeleteModal = document.getElementById('closeDeleteModal');

  const contextMenu      = document.getElementById('gameContextMenu');
  const ctxViewStats     = document.getElementById('ctxViewStats');
  const ctxEditGame      = document.getElementById('ctxEditGame');
  const ctxDeleteGame    = document.getElementById('ctxDeleteGame');

  // ================= STATE =================
  let currentGame     = null;
  let pendingDeleteId = null;
  const colours = ['pink', 'olive', 'brown'];

  // ================= MODAL HELPERS =================
  function showModal(el) { el.style.display = 'flex'; }
  function hideModal(el) { el.style.display = 'none'; }

  document.querySelectorAll('.custom-modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) hideModal(modal);
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.custom-modal').forEach(m => hideModal(m));
      hideContextMenu();
    }
  });

  // ================= CONTEXT MENU =================
  function showContextMenu(x, y, game) {
    currentGame = game;
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top  = `${y}px`;
    contextMenu.style.display = 'block';
  }

  function hideContextMenu() {
    contextMenu.style.display = 'none';
  }

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

let contextGameId       = null;
let contextGameFeatured = false;

const contextMenu      = document.getElementById('gameContextMenu');
const ctxFeature       = document.getElementById('ctxFeatureGame');
const ctxUnfeature     = document.getElementById('ctxUnfeatureGame');

// Show context menu on right-click
document.getElementById('gamesGrid').addEventListener('contextmenu', e => {
  const box = e.target.closest('.game-box');
  if (!box || box.classList.contains('add-btn')) return;

  e.preventDefault();

  contextGameId       = parseInt(box.dataset.gameId);
  contextGameFeatured = box.dataset.featured === '1';

  // Toggle which option is visible
  ctxFeature.style.display   = contextGameFeatured ? 'none'  : 'block';
  ctxUnfeature.style.display = contextGameFeatured ? 'block' : 'none';

  contextMenu.style.display = 'block';
  contextMenu.style.left    = e.pageX + 'px';
  contextMenu.style.top     = e.pageY + 'px';
});

// Hide on any click elsewhere
document.addEventListener('click', () => {
  contextMenu.style.display = 'none';
});
  let contextGameId       = null;
let contextGameFeatured = false;

const contextMenu      = document.getElementById('gameContextMenu');
const ctxFeature       = document.getElementById('ctxFeatureGame');
const ctxUnfeature     = document.getElementById('ctxUnfeatureGame');

// Show context menu on right-click
document.getElementById('gamesGrid').addEventListener('contextmenu', e => {
  const box = e.target.closest('.game-box');
  if (!box || box.classList.contains('add-btn')) return;

  e.preventDefault();

  contextGameId       = parseInt(box.dataset.gameId);
  contextGameFeatured = box.dataset.featured === '1';

  // Toggle which option is visible
  ctxFeature.style.display   = contextGameFeatured ? 'none'  : 'block';
  ctxUnfeature.style.display = contextGameFeatured ? 'block' : 'none';

  contextMenu.style.display = 'block';
  contextMenu.style.left    = e.pageX + 'px';
  contextMenu.style.top     = e.pageY + 'px';
});

// Hide on any click elsewhere
document.addEventListener('click', () => {
  contextMenu.style.display = 'none';
});
  
  // ================= LOAD & RENDER GAMES =================
  async function loadGames() {
    try {
      const res = await fetch('/api/games/');
      if (!res.ok) throw new Error();
      const games = await res.json();
      renderGames(games);
      renderFeaturedSidebar(games);
    } catch (err) {
      gamesGrid.innerHTML = '<p style="color:red;">unable to load games.</p>';
    }
  }

  function renderGames(games) {
    gamesGrid.innerHTML = '';

    games.forEach((game, index) => {
      const box = document.createElement('div');
      box.className = `game-box ${colours[index % colours.length]}`;
      box.innerHTML = `
        <div class="game-box-title">MHS VS ${game.opponent}</div>
        <div class="game-box-score" id="score-${game.id}">—</div>
      `;

      // Left click → view stats
      box.addEventListener('click', () => openViewModal(game));

      // Right click → context menu
      box.addEventListener('contextmenu', e => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, game);
      });

      gamesGrid.appendChild(box);

      // Load score for this game asynchronously
      loadGameScore(game.id);
    });

    // + add button
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

  async function loadGameScore(gameId) {
    try {
      const res = await fetch(`/api/stats/game/${gameId}`);
      const stats = await res.json();
      const scoreEl = document.getElementById(`score-${gameId}`);
      if (!scoreEl) return;
      if (stats.length === 0) {
        scoreEl.textContent = '—';
        return;
      }
      const totals = stats.reduce((acc, r) => {
        acc.kills += r.kills;
        return acc;
      }, { kills: 0 });
      scoreEl.textContent = `${totals.kills} kills`;
    } catch {}
  }

  function renderFeaturedSidebar(games) {
    featuredList.innerHTML = '';
    games.slice(0, 2).forEach(game => {
      const card = document.createElement('div');
      card.className = 'game-card';
      card.innerHTML = `
        <p class="game-title">MHS VS ${game.opponent}</p>
        <div class="game-score">${game.game_date || ''}</div>
      `;
      featuredList.appendChild(card);
    });
  }

  // ================= VIEW MODAL =================
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
      const res = await fetch(`/api/stats/game/${game.id}`);
      const stats = await res.json();

      if (stats.length === 0) {
        viewKills.innerHTML  = 'kills<br>—';
        viewAces.innerHTML   = 'aces<br>—';
        viewBlocks.innerHTML = 'blocks<br>—';
        viewFeatured.textContent = 'no stats yet — click edit stats to add';
        setSidebar.innerHTML = '<p style="color:#F5EBD7; font-size:0.85rem;">no sets recorded</p>';
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

      // Render placeholder set boxes (3 sets by default)
      ['SET #1', 'SET #2', 'SET #3'].forEach((label, i) => {
        const box = document.createElement('div');
        box.className = `set-score-box${i === 0 ? ' active' : ''}`;
        box.innerHTML = `${label}<br><span style="font-size:1.5rem;">—</span>`;
        box.addEventListener('click', () => {
          document.querySelectorAll('.set-score-box').forEach(b => b.classList.remove('active'));
          box.classList.add('active');
        });
        setSidebar.appendChild(box);
      });

    } catch {
      viewFeatured.textContent = 'could not load stats';
    }
  }

  closeViewModal.addEventListener('click', () => hideModal(viewModal));

  openEditBtn.addEventListener('click', () => {
    hideModal(viewModal);
    openEditModal(currentGame);
  });

  // ================= EDIT MODAL =================
  async function openEditModal(game) {
    currentGame = game;
    editOpponent.textContent = game.opponent.toUpperCase();
    editModalBody.innerHTML = '<p style="color:#F5EBD7;">loading players…</p>';
    showModal(editModal);

    let players = [];
    let existingStats = {};

    try {
      const [playersRes, statsRes] = await Promise.all([
        fetch('/api/players/'),
        fetch(`/api/stats/game/${game.id}`)
      ]);
      players = await playersRes.json();
      const statsArr = await statsRes.json();
      statsArr.forEach(s => { existingStats[s.player_id] = s; });
    } catch {
      editModalBody.innerHTML = '<p style="color:red;">failed to load player data.</p>';
      return;
    }

    editModalBody.innerHTML = `
      <div style="overflow-y:auto; max-height:350px;">
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

    document.getElementById('saveStatsBtn').addEventListener('click', () => saveAllStats(game.id));
  }

  closeEditModal.addEventListener('click', () => hideModal(editModal));

  async function saveAllStats(gameId) {
    const rows = editModalBody.querySelectorAll('tr[data-player-id]');
    try {
      await Promise.all(Array.from(rows).map(row => {
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
      }));
      hideModal(editModal);
      loadGames();
    } catch {
      alert('error saving stats.');
    }
  }

  // ================= ADD GAME =================
  // Live preview of opponent name
  newOpponentInput.addEventListener('input', () => {
    opponentPreview.textContent = newOpponentInput.value.trim() || '.....';
  });

  closeAddModal.addEventListener('click', () => hideModal(addModal));

  saveNewGameBtn.addEventListener('click', async () => {
    const opponent = newOpponentInput.value.trim();
    if (!opponent) {
      alert('please enter the opposing school name.');
      return;
    }
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

  // ================= DELETE GAME =================
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

  // ================= INIT =================
  loadGames();

});
