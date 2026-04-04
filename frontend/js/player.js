/**
 * player.js
 * -------------------
 * Handles player management UI:
 *  - Fetching players from backend API
 *  - Displaying players
 *  - Search + filter by positions
 *  - Selecting a player
 *  - Adding new players
 */


const playersGrid = document.getElementById('playersGrid');
const playerDetailCard = document.getElementById('playerDetailCard');
const playerNameEl = document.getElementById('playerName');
const playerInfoEl = document.getElementById('playerInfo');
const featuredGameEl = document.getElementById('featuredGame');
const searchInput = document.getElementById('searchInput');
const checkboxes = document.querySelectorAll('.position-filter');

let playersData = [];

// ================= FETCH PLAYERS =================
async function fetchPlayers() {
  try {
    const response = await fetch('/api/players/');
    if (!response.ok) throw new Error('Failed to fetch players');
    const data = await response.json();
    playersData = data.map(player => ({
      id: player.id,
      name: player.name,
      grade: player.grade,
      position: player.position,
      featuredGame: player.featuredGame || 'N/A'
    }));
    displayPlayers(playersData);
  } catch (err) {
    console.error(err);
    playersGrid.innerHTML = '<p class="text-danger">Unable to load players.</p>';
  }
}

// ================= DISPLAY PLAYERS =================
function displayPlayers(players) {
  playersGrid.innerHTML = '';

  // Add "Add Player" card first
  const addCol = document.createElement('div');
  addCol.className = 'col text-center';
  addCol.innerHTML = `
    <div class="player-square-add" id="addPlayerBtn">
      <img src="../assets/icons/upload_arrow.png" alt="add" style="width:40px; cursor:pointer;">
    </div>
    <p class="m-0 fw-bold">Add Player</p>
  `;
  playersGrid.appendChild(addCol);

  // Event listener for Add Player
  document.getElementById('addPlayerBtn').addEventListener('click', showAddPlayerModal);

  if (players.length === 0) {
    playersGrid.innerHTML += '<p class="text-muted mt-2">No players match the filter.</p>';
    return;
  }

  players.forEach(player => {
    const col = document.createElement('div');
    col.className = 'col text-center';
    col.innerHTML = `
      <div class="player-square" style="cursor:pointer;"></div>
      <p class="m-0 fw-bold">${player.name}</p>
      <small>${player.position}</small>
    `;
    col.addEventListener('click', () => showPlayerDetail(player));
    playersGrid.appendChild(col);
  });
}

// ================= SHOW PLAYER DETAIL =================
function showPlayerDetail(player) {
  playerDetailCard.style.display = 'block';
  playerNameEl.textContent = player.name.toUpperCase();
  playerInfoEl.innerHTML = `
    <p>player</p>
    <p>gr. ${player.grade}</p>
    <p class="mt-3"><strong>positions:</strong><br>${player.position}</p>
  `;
  featuredGameEl.textContent = player.featuredGame;

}

// ================= FILTER PLAYERS =================
function filterPlayers() {
  const searchText = searchInput.value.toLowerCase();
  const selectedPositions = Array.from(checkboxes)
                                 .filter(cb => cb.checked)
                                 .map(cb => cb.value);

  const filtered = playersData.filter(p => {
    const positions = p.position.split(',').map(pos => pos.trim());
    return p.name.toLowerCase().includes(searchText) &&
           positions.some(pos => selectedPositions.includes(pos));
  });
  displayPlayers(filtered);
}

// ================= ADD PLAYER MODAL =================
function showAddPlayerModal() {
  const name = prompt('Enter player name:');
  if (!name) return;

  const grade = prompt('Enter player grade (number):');
  if (!grade) return;

  const position = prompt('Enter positions (comma-separated):');
  if (!position) return;

  // Send POST to backend
  addPlayerToBackend({ name, grade: parseInt(grade), position });
}

// ================= POST NEW PLAYER =================
async function addPlayerToBackend(player) {
  try {
    const response = await fetch('/api/players/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(player)
    });
    if (!response.ok) throw new Error('Failed to add player');

    const newPlayer = await response.json();
    playersData.push({
      id: newPlayer.id,
      name: newPlayer.name,
      grade: newPlayer.grade,
      position: newPlayer.position,
      featuredGame: 'N/A'
    });
    displayPlayers(playersData);
  } catch (err) {
    console.error(err);
    alert('Error adding player. Check console for details.');
  }
}

// ================= EVENT LISTENERS =================
searchInput.addEventListener('input', filterPlayers);
checkboxes.forEach(cb => cb.addEventListener('change', filterPlayers));

// ================= INITIALIZE =================
fetchPlayers();