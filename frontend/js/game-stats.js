document.addEventListener('DOMContentLoaded', () => {

  // ================= DOM REFERENCES =================
  const gamesGrid       = document.getElementById('gamesGrid');
  const featuredList    = document.getElementById('featuredGamesList');

  // Add modal
  const addModal        = document.getElementById('addGameModal');
  const newOpponentInput = document.getElementById('newOpponentInput');
  const saveNewGameBtn  = document.getElementById('saveNewGameBtn');
  const closeAddModal   = document.getElementById('closeAddModal');

  // View modal
  const viewModal       = document.getElementById('viewGameModal');
  const viewOpponent    = document.getElementById('viewOpponent');
  const viewKills       = document.getElementById('viewKills');
  const viewAces        = document.getElementById('viewAces');
  const viewBlocks      = document.getElementById('viewBlocks');
  const viewFeatured    = document.getElementById('viewFeatured');
  const openEditBtn     = document.getElementById('openEditBtn');
  const closeViewModal  = document.getElementById('closeViewModal');

  // Edit modal
  const editModal       = document.getElementById('editGameModal');
  const editOpponent    = document.getElementById('editOpponent');
  const editModalBody   = document.getElementById('editModalBody');
  const closeEditModal  = document.getElementById('closeEditModal');

  // Delete confirm modal
  const deleteModal     = document.getElementById('deleteConfirmModal');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const cancelDeleteBtn  = document.getElementById('cancelDeleteBtn');
  const closeDeleteModal = document.getElementById('closeDeleteModal');

  // ================= STATE =================
  let currentGame = null;   // game object currently open in view/edit modal
  let pendingDeleteId = null; // game id waiting for delete confirmation

  // ================= MODAL HELPERS =================
  function showModal(el)  { el.style.display = 'flex'; }
  function hideModal(el)  { el.style.display = 'none'; }

  // Close any modal when clicking the dark backdrop
  document.querySelectorAll('.custom-modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.custom-modal').forEach(m => m.style.display = 'none');
    }
  });

  // ================= LOAD & RENDER GAMES =================
  const colours = ['pink', 'olive', 'brown'];

  async function loadGames() {
    try {
      const res = await fetch('/api/games/');
      if (!res.ok) throw new Error('Failed to fetch games');
      const games = await res.json();
      renderGames(games);
      renderFeaturedSidebar(games);
    } catch (err) {
      console.error(err);
      gamesGrid.innerHTML = '<p class="text-danger">Unable to load games.</p>';
    }
  }

  function renderGames(games) {
    gamesGrid.innerHTML = '';

    games.forEach((game, index) => {
      const box = document.createElement('div');
      box.className = `game-box ${colours[index % colours.length]}`;
      box.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <span>MHS VS ${game.opponent}</span>
          <button class="delete-game-btn"
            data-id="${game.id}"
            style="background:none; border:none; color:white; font-size:1.2rem;
                   cursor:pointer; line-height:1; padding:0;"
            title="Delete game">✕</button>
        </div>
        <div style="font-size:1rem; margin-top:8px; opacity:0.85;">${game.game_date || ''}</div>
      `;

      // Click the box → open view modal
      box.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-game-btn')) return;
        openViewModal(game);
      });

      // Click the ✕ → open delete confirm
      box.querySelector('.delete-game-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        pendingDeleteId = game.id;
        showModal(deleteModal);
      });

      gamesGrid.appendChild(box);
    });

    // + add button
    const addBox = document.createElement('div');
    addBox.className = 'game-box add-btn';
    addBox.textContent = '+';
    addBox.addEventListener('click', () => {
      newOpponentInput.value = '';
      showModal(addModal);
    });
    gamesGrid.appendChild(addBox);
  }

  function renderFeaturedSidebar(games) {
    featuredList.innerHTML = '';
    // Show the two most recent games
    games.slice(0, 2).forEach(game => {
      const card = document.createElement('div');
      card.className = 'game-card';
      card.innerHTML = `
        <p class="game-title">MHS VS ${game.opponent}</p>
        <div class="game-score" style="font-size:1.5rem;">${game.game_date || ''}</div>
      `;
      featuredList.appendChild(card);
    });
  }

  // ================= VIEW MODAL =================
  async function openViewModal(game) {
    currentGame = game;
    viewOpponent.textContent = game.opponent.toUpperCase();
    viewKills.innerHTML   = 'kills<br>…';
    viewAces.innerHTML    = 'aces<br>…';
    viewBlocks.innerHTML  = 'blocks<br>…';
    viewFeatured.textContent = 'featured player: …';
    showModal(viewModal);

    try {
      const res = await fetch(`/api/stats/game/${game.id}`);
      if (!res.ok) throw new Error();
      const stats = await res.json();

      if (stats.length === 0) {
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

    } catch (err) {
      viewFeatured.textContent = 'could not load stats';
    }
  }

  closeViewModal.addEventListener('click', () => hideModal(viewModal));

  // "edit stats" button in view modal
  openEditBtn.addEventListener('click', () => {
    hideModal(viewModal);
    openEditModal(currentGame);
  });

  // ================= EDIT MODAL =================
  async function openEditModal(game) {
    currentGame = game;
    editOpponent.textContent = game.opponent.toUpperCase();
    editModalBody.innerHTML = '<p style="color:#F5EBD7;">Loading players…</p>';
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
    } catch (err) {
      editModalBody.innerHTML = '<p class="text-danger">Failed to load player data.</p>';
      return;
    }

    editModalBody.innerHTML = `
      <div style="overflow-y:auto; max-height:350px;">
        <table style="width:100%; color:#F5EBD7; border-collapse:collapse;">
          <thead>
            <tr style="text-align:center; border-bottom: 1px solid rgba(255,255,255,0.2);">
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
                  <td style="text-align:left; padding:8px;">${p.name}</td>
                  <td><input type="number" min="0" value="${s.kills   ?? 0}"
                      style="width:55px; border-radius:8px; border:none; text-align:center; padding:4px;"></td>
                  <td><input type="number" min="0" value="${s.assists ?? 0}"
                      style="width:55px; border-radius:8px; border:none; text-align:center; padding:4px;"></td>
                  <td><input type="number" min="0" value="${s.aces    ?? 0}"
                      style="width:55px; border-radius:8px; border:none; text-align:center; padding:4px;"></td>
                  <td><input type="number" min="0" value="${s.blocks  ?? 0}"
                      style="width:55px; border-radius:8px; border:none; text-align:center; padding:4px;"></td>
                  <td><input type="number" min="0" value="${s.digs    ?? 0}"
                      style="width:55px; border-radius:8px; border:none; text-align:center; padding:4px;"></td>
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
      alert('Stats saved!');
    } catch (err) {
      console.error(err);
      alert('Error saving stats.');
    }
  }

  // ================= ADD GAME =================
  closeAddModal.addEventListener('click', () => hideModal(addModal));

  saveNewGameBtn.addEventListener('click', async () => {
    const opponent = newOpponentInput.value.trim();
    if (!opponent) {
      alert('Please enter the opposing school name.');
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
      newOpponentInput.value = '';
      // Reload games then open the edit modal for the new game straight away
      await loadGames();
      openEditModal({ id: data.game_id, opponent });
    } catch (err) {
      console.error(err);
      alert('Error adding game.');
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
    } catch (err) {
      console.error(err);
      alert('Error deleting game.');
    }
  });

  cancelDeleteBtn.addEventListener('click',  () => hideModal(deleteModal));
  closeDeleteModal.addEventListener('click', () => hideModal(deleteModal));

  // ================= INITIALIZE =================
  loadGames();

});