// team-stats.js
document.addEventListener("DOMContentLoaded", () => {
  const TEAM_TOTALS_API = "http://127.0.0.1:5000/api/stats/team/totals";

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
    const statCards = document.querySelectorAll(".stat-card");
  
    try {
      // 1. Show loading (turns - into …)
      statCards.forEach(card => {
        const val = card.querySelector(".stat-value");
        if (val) val.textContent = "…";
      });
  
      // 2. Fetch
      const response = await fetch("/api/stats/team/totals");
      if (!response.ok) throw new Error("API Route not found");
      const totals = await response.json();
  
      // 3. EXTRACT the values from the 'totals' object (CRITICAL STEP)
      const kills = totals.total_kills || 0;
      const blocks = totals.total_blocks || 0;
      const aces = totals.total_aces || 0;
      const digs = totals.total_digs || 0;
  
      // 4. Calculate Ratios
      const killDenom = kills + blocks + digs;
      const serveDenom = aces + digs;
  
      const kill_ratio = killDenom > 0 ? ((kills / killDenom) * 100).toFixed(1) : "0.0";
      const serve_ratio = serveDenom > 0 ? ((aces / serveDenom) * 100).toFixed(1) : "0.0";
  
      // 5. Create the data object for the UI
      const displayData = {
        "total_kills": kills,
        "total_aces": aces,
        "total_blocks": blocks,
        "total_digs": digs,
        "kill_ratio": kill_ratio,
        "serve_ratio": serve_ratio
      };
  
      // 6. Update UI
      statCards.forEach(card => {
        const label = card.querySelector(".stat-label").textContent.toLowerCase().trim();
        const key = statMapping[label];
        if (key && displayData[key] !== undefined) {
          card.querySelector(".stat-value").textContent = displayData[key];
        }
      });
  
    } catch (error) {
      console.error("JS Error:", error);
      statCards.forEach(card => {
        const val = card.querySelector(".stat-value");
        if (val) val.textContent = "ERR";
      });
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