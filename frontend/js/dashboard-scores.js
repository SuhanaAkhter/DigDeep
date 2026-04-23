document.addEventListener('DOMContentLoaded', async () => {
  const scoreEls = document.querySelectorAll('[data-game-score]');
  for (const el of scoreEls) {
    const gameId = el.dataset.gameScore;
    try {
      const r    = await fetch(`/api/stats/game/${gameId}/sets`);
      const sets = await r.json();
      if (sets.length) {
        const mhs = sets.reduce((sum, s) => sum + s.mhs_score, 0);
        const opp = sets.reduce((sum, s) => sum + s.opp_score, 0);
        el.textContent = `${mhs}–${opp}`;
      }
    } catch {}
  }
});