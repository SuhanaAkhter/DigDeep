// team-stats.js
document.addEventListener("DOMContentLoaded", () => {
  const TEAM_TOTALS_API = "/api/stats/team/totals";

  // Map HTML stat labels to API keys
  const statMapping = {
    "kills": "total_kills",
    "aces": "total_aces",
    "blocks": "total_blocks",
    "digs": "total_digs",
    // computed stats
    "kill ratio %": "kill_ratio",
    "serve ratio %": "serve_ratio"
  };

  // Cache DOM elements
  const statCards = document.querySelectorAll(".stat-card");
  const featuredGamesContainer = document.querySelector(".featured-sidebar");

  // Function to fetch and populate team totals
  async function loadTeamTotals() {
    try {
      // Show loading
      statCards.forEach(card => card.querySelector(".stat-value").textContent = "…");

      const response = await fetch(TEAM_TOTALS_API);
      const totals = await response.json();

      // Example: calculate derived stats
      const totalKills = totals.total_kills || 0;
      const totalBlocks = totals.total_blocks || 0;
      const totalAces = totals.total_aces || 0;
      const totalDigs = totals.total_digs || 0;
      const gamesPlayed = totals.games_played || 1; // prevent div by 0

      // Compute ratios
      totals.kill_ratio = ((totalKills / (totalKills + totalBlocks + totalDigs)) * 100).toFixed(1);
      totals.serve_ratio = ((totalAces / (totalAces + totalDigs)) * 100).toFixed(1);

      // Populate stat cards
      statCards.forEach(card => {
        const label = card.querySelector(".stat-label").textContent.toLowerCase();
        const key = statMapping[label];
        if (key && totals[key] !== undefined) {
          card.querySelector(".stat-value").textContent = totals[key];
        }
      });

    } catch (error) {
      console.error("Error loading team totals:", error);
      statCards.forEach(card => card.querySelector(".stat-value").textContent = "ERR");
    }
  }

  // Fetch and populate featured games (hardcoded for now)
  function loadFeaturedGames() {
    // Normally you'd fetch from /api/games/team/<team_id>/recent
    const games = [
      { title: "MHS VS De la Salle", score: "3-0", note: "it's a clean sweep!" },
      { title: "MHS VS LDH", score: "31 kills", note: "someone got murdered..." }
    ];

    const container = document.createElement("div");

    games.forEach(game => {
      const card = document.createElement("div");
      card.className = "game-card";

      const title = document.createElement("p");
      title.className = "game-title";
      title.textContent = game.title;

      const score = document.createElement("div");
      score.className = "game-score";
      score.textContent = game.score;

      const note = document.createElement("p");
      note.textContent = game.note;

      card.append(title, score, note);
      container.appendChild(card);
    });

    // Clear previous and append
    featuredGamesContainer.innerHTML = '';
    featuredGamesContainer.appendChild(container);
  }

  // Refresh button for live update (bonus feature)
  function addRefreshButton() {
    const refreshBtn = document.createElement("button");
    refreshBtn.textContent = "Refresh Stats";
    refreshBtn.className = "btn btn-sm btn-outline-dark mt-3";
    refreshBtn.addEventListener("click", loadTeamTotals);

    featuredGamesContainer.appendChild(refreshBtn);
  }

  // Optional hover effect to show top contributor (mock)
  statCards.forEach(card => {
    card.addEventListener("mouseenter", () => {
      card.style.transform = "scale(1.05)";
      card.style.transition = "transform 0.2s";
      // Here you could fetch top player per stat
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "scale(1)";
    });
  });

  // Initialize
  loadTeamTotals();
  loadFeaturedGames();
  addRefreshButton();
});