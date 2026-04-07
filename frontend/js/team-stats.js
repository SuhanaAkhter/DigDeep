document.addEventListener('DOMContentLoaded', () => {

  // FIX: removed hardcoded 'http://127.0.0.1:5000/...' URL — broken on any non-local deploy.
  // All fetches now use relative paths so they work in every environment.

  const statMapping = {
    'kills':        'total_kills',
    'aces':         'total_aces',
    'blocks':       'total_blocks',
    'digs':         'total_digs',
    'kill ratio %': 'kill_ratio',
    'serve ratio %':'serve_ratio'
  };

  const statCards             = document.querySelectorAll('.stat-card');
  const featuredGamesContainer = document.querySelector('.featured-sidebar');

  // ── TEAM TOTALS ────────────────────────────────────────
  async function loadTeamTotals() {
    statCards.forEach(card => {
      const val = card.querySelector('.stat-value');
      if (val) val.textContent = '…';
    });

    try {
      // FIX: relative path — was 'http://127.0.0.1:5000/api/stats/team/totals'
      const response = await fetch('/api/stats/team/totals');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const totals = await response.json();

      const kills  = totals.total_kills  || 0;
      const blocks = totals.total_blocks || 0;
      const aces   = totals.total_aces   || 0;
      const digs   = totals.total_digs   || 0;

      const killDenom  = kills + blocks + digs;
      const serveDenom = aces + digs;

      const kill_ratio  = killDenom  > 0 ? ((kills / killDenom)  * 100).toFixed(1) : '0.0';
      const serve_ratio = serveDenom > 0 ? ((aces  / serveDenom) * 100).toFixed(1) : '0.0';

      const displayData = {
        total_kills:  kills,
        total_aces:   aces,
        total_blocks: blocks,
        total_digs:   digs,
        kill_ratio,
        serve_ratio
      };

      statCards.forEach(card => {
        const label = card.querySelector('.stat-label').textContent.toLowerCase().trim();
        const key   = statMapping[label];
        if (key && displayData[key] !== undefined) {
          card.querySelector('.stat-value').textContent = displayData[key];
        }
      });

    } catch (error) {
      console.error('team-stats error:', error);
      statCards.forEach(card => {
        const val = card.querySelector('.stat-value');
        if (val) val.textContent = 'ERR';
      });
    }
  }

  // ── FEATURED GAMES ─────────────────────────────────────
  // FIX: loadFeaturedGames() was calling featuredGamesContainer.innerHTML = ''
  // which wiped the sidebar heading and "view all games" link before re-adding cards.
  // Now it only targets the #featuredGamesList element so the rest of the sidebar survives.
  // Also fetches real games from the API instead of using hardcoded data.
  async function loadFeaturedGames() {
    // Try to find a dedicated list container; fall back to the whole sidebar
    const listEl = document.getElementById('featuredGamesList') || featuredGamesContainer;

    try {
      const res = await fetch('/api/games/');
      if (!res.ok) throw new Error();
      const games = await res.json();

      listEl.innerHTML = '';
      games.slice(0, 2).forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
          <p class="game-title">MHS VS ${game.opponent}</p>
          <div class="game-score">${game.game_date || '—'}</div>
        `;
        listEl.appendChild(card);
      });

      if (games.length === 0) {
        listEl.innerHTML = '<p>no games yet</p>';
      }

    } catch {
      // Fallback to hardcoded if API fails
      listEl.innerHTML = `
        <div class="game-card">
          <p class="game-title">MHS VS De la Salle</p>
          <div class="game-score">3-0</div>
          <p>it's a clean sweep!</p>
        </div>
        <div class="game-card">
          <p class="game-title">MHS VS LDH</p>
          <div class="game-score">31 kills</div>
          <p>someone got murdered...</p>
        </div>`;
    }
  }

  // ── REFRESH BUTTON ─────────────────────────────────────
  // FIX: appended to sidebar last so it doesn't get wiped by loadFeaturedGames
  function addRefreshButton() {
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'refresh stats';
    refreshBtn.className   = 'btn btn-sm btn-outline-dark mt-3';
    refreshBtn.addEventListener('click', loadTeamTotals);
    featuredGamesContainer.appendChild(refreshBtn);
  }

  // ── HOVER EFFECTS ──────────────────────────────────────
  statCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform  = 'scale(1.05)';
      card.style.transition = 'transform 0.2s';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'scale(1)';
    });
  });

  // ── INIT ───────────────────────────────────────────────
  loadTeamTotals();
  loadFeaturedGames();
  addRefreshButton();

});