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

  const contextMenu          = document.getElementById('gameContextMenu');
  const ctxViewStats         = document.getElementById('ctxViewStats');
  const ctxEditGame          = document.getElementById('ctxEditGame');
  const ctxDeleteGame        = document.getElementById('ctxDeleteGame');

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
    contextMenu.style.left    = `${x}px`;
    contextMenu.style.top     = `${y}px`;
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

  // Right-click on a game box
  document.getElementById('gamesGrid').addEventListener('contextmenu', e => {
    const box = e.target.closest('.game-box');
    if (!box || box.classList.contains('add-btn')) return;
    e.preventDefault();
    const gameId = parseInt(box.dataset.gameId);
    currentGame  = { id: gameId, opponent: box.dataset.opponent };
    showContextMenu(e.pageX, e.pageY, currentGame);
  });

  // ================= LOAD & RENDER GAMES =================
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

  // Loads the value shown on a game tile — either a specific stat or the total score
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

  // Sidebar shows total score (sets won)
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

    // Load set scores and player stats in parallel
    try {
      const [statsRes, setsRes] = await Promise.all([
        fetch(`/api/stats/game/${game.id}`),
        fetch(`/api/stats/game/${game.id}/sets`)
      ]);
      const stats = await statsRes.json();
      const sets  = await setsRes.json();

      // Render set score boxes in sidebar
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

  // ================= EDIT MODAL =================
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

    // Build set score editors (3 sets by default, show up to however many exist or 3)
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

    // Player stats table
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

    // Wire up ▲▼ buttons
    editModalBody.querySelectorAll('.set-adj-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const setNum = btn.dataset.set;
        const side   = btn.dataset.side; // 'mhs' or 'opp'
        const dir    = btn.dataset.dir;  // 'up' or 'down'
        const valEl  = document.getElementById(`set-${setNum}-${side}`);
        let val = parseInt(valEl.textContent) || 0;
        val = dir === 'up' ? val + 1 : Math.max(0, val - 1);
        valEl.textContent = val;
      });
    });

    document.getElementById('saveStatsBtn').addEventListener('click', () => saveAll(game.id, setCount));
  }

  closeEditModal.addEventListener('click', () => hideModal(editModal));

  async function saveAll(gameId, setCount) {
    // Save set scores
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

    // Save player stats
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

  // ================= ADD GAME =================
  newOpponentInput.addEventListener('input', () => {
    opponentPreview.textContent = newOpponentInput.value.trim() || '.....';
  });

  closeAddModal.addEventListener('click', () => hideModal(addModal));

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