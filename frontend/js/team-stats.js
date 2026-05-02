/**
 * @file team-stats.js
 * @description Manages the team statistics dashboard page.
 *
 * Responsibilities:
 *  - Loading and displaying aggregated team totals (kills, aces, blocks, digs)
 *  - Computing derived ratios (kill ratio, serve ratio) from raw totals
 *  - Rendering the two most recent games in the featured-games sidebar
 *  - Providing a manual refresh button for team totals
 *  - Adding hover scale effects to stat cards
 *
 * All API requests use relative paths to support deployment in any environment.
 */

document.addEventListener('DOMContentLoaded', () => {

  /**
   * Maps the text content of each `.stat-label` element to its corresponding
   * key in the computed display data object.
   *
   * @type {Object<string, string>}
   */
  const statMapping = {
    'kills':         'total_kills',
    'aces':          'total_aces',
    'blocks':        'total_blocks',
    'digs':          'total_digs',
    'kill ratio %':  'kill_ratio',
    'serve ratio %': 'serve_ratio'
  };

  /** @type {NodeList<HTMLElement>} All stat card elements on the page. */
  const statCards = document.querySelectorAll('.stat-card');

  /** @type {HTMLElement} The featured-games sidebar container. */
  const featuredGamesContainer = document.querySelector('.featured-sidebar');

  // ── TEAM TOTALS ───────────────────────────────────────────────────────────

  /**
   * Fetches aggregated team statistics from the API, computes kill and serve
   * ratios, then updates each stat card's value element.
   *
   * Kill ratio  = kills / (kills + blocks + digs) × 100
   * Serve ratio = aces  / (aces  + digs)          × 100
   *
   * Displays "…" while loading and "ERR" if the request fails.
   *
   * @async
   * @returns {Promise<void>}
   */
  async function loadTeamTotals() {
    statCards.forEach(card => {
      const val = card.querySelector('.stat-value');
      if (val) val.textContent = '…';
    });

    try {
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

  // ── FEATURED GAMES ────────────────────────────────────────────────────────

  /**
   * Fetches all games and renders the two most recent as cards in the
   * featured-games sidebar. Each card shows the opponent name and the
   * cumulative MHS vs opponent set score.
   *
   * @async
   * @returns {Promise<void>}
   */
  async function loadFeaturedGames() {
    const listEl = document.getElementById('featuredGamesList') || featuredGamesContainer;

    try {
      const res = await fetch('/api/games/');
      if (!res.ok) throw new Error();
      const games = await res.json();

      listEl.innerHTML = '';

      if (!games.length) {
        listEl.innerHTML = '<p>no games yet</p>';
        return;
      }

      for (const game of games.slice(0, 2)) {
        let scoreText = '—';
        try {
          const setsRes = await fetch(`/api/stats/game/${game.id}/sets`);
          const sets    = await setsRes.json();
          if (sets.length) {
            const mhs = sets.reduce((sum, s) => sum + s.mhs_score, 0);
            const opp = sets.reduce((sum, s) => sum + s.opp_score, 0);
            scoreText = `${mhs}–${opp}`;
          }
        } catch {}

        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
          <p class="game-title">MHS VS ${game.opponent}</p>
          <div class="game-score">${scoreText}</div>
        `;
        listEl.appendChild(card);
      }

    } catch {
      listEl.innerHTML = '<p>no games yet</p>';
    }
  }

  // ── REFRESH BUTTON ────────────────────────────────────────────────────────

  /**
   * Creates and appends a "refresh stats" button to the featured-games
   * sidebar. The button triggers a fresh fetch of team totals when clicked.
   *
   * This button is appended after `loadFeaturedGames` renders its content
   * to prevent it from being overwritten.
   */
  function addRefreshButton() {
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'refresh stats';
    refreshBtn.className   = 'btn btn-sm btn-outline-dark mt-3';
    refreshBtn.addEventListener('click', loadTeamTotals);
    featuredGamesContainer.appendChild(refreshBtn);
  }

  // ── HOVER EFFECTS ─────────────────────────────────────────────────────────

  // Apply a scale-up effect on hover to each stat card.
  statCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform  = 'scale(1.05)';
      card.style.transition = 'transform 0.2s';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'scale(1)';
    });
  });

  // ── INIT ──────────────────────────────────────────────────────────────────

  loadTeamTotals();
  loadFeaturedGames();
  addRefreshButton();

});