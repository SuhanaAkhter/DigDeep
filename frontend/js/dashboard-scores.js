/**
 * @file dashboard-scores.js
 * @description Fetches and renders aggregate set scores for each game card
 * on the coach and player dashboards.
 *
 * Overview
 * --------
 * The dashboard HTML contains elements marked with a `data-game-score`
 * attribute whose value is the game ID.  On load, this script iterates over
 * every such element, fetches the set-score breakdown for that game from the
 * API, and replaces the element's text content with a cumulative score
 * string (e.g. "75–62").
 *
 * If a game has no recorded set scores the element is left unchanged.
 * Network or parse errors are swallowed silently so a single failed request
 * cannot break the rest of the dashboard.
 *
 * API endpoint used
 * -----------------
 *   GET /api/stats/game/:gameId/sets
 *     Returns an array of { set_number, mhs_score, opp_score } objects.
 */

document.addEventListener('DOMContentLoaded', async () => {

  const scoreEls = document.querySelectorAll('[data-game-score]');

  for (const el of scoreEls) {
    const gameId = el.dataset.gameScore;

    try {
      const res  = await fetch(`/api/stats/game/${gameId}/sets`);
      const sets = await res.json();

      if (sets.length) {
        // Sum all set scores to produce a total-points display.
        const mhs = sets.reduce((sum, s) => sum + s.mhs_score, 0);
        const opp = sets.reduce((sum, s) => sum + s.opp_score, 0);
        el.textContent = `${mhs}–${opp}`;
      }
    } catch {
      // Leave the element unchanged if the request fails.
    }
  }

});