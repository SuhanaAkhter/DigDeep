PRAGMA foreign_keys = ON;

-------------------------------
-- USERS w/ authentication, roles
-------------------------------
-- Stores all user accounts with role-based access (player or coach).

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('player', 'coach')),
    picture TEXT
);

--------------------------------
-- TEAMS 
--------------------------------
-- Stores team information. A team belongs to a season.
CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_name TEXT NOT NULL UNIQUE,
    season TEXT
);

--------------------------------
-- PLAYERS 
--------------------------------
-- Stores player profiles. Each player is linked to a user account and a team.
-- name and picture are stored here because they are display fields, not auth fields.
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    team_id INTEGER,
    name TEXT,
    grade TEXT,
    jersey_number INTEGER,
    position TEXT,
    picture TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS password_reset_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);
--------------------------------
-- GAMES 
--------------------------------
-- Stores one row per game. A game belongs to a team and records the opponent and result.
-- Stats are tracked separately in player_stats, not here.
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    opponent TEXT NOT NULL,
    game_date TEXT,
    season TEXT,
    featured INTEGER DEFAULT 0,
    score TEXT, 
    note TEXT,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);


-- Stores per-player stats for each game. One row per player per game.
CREATE TABLE IF NOT EXISTS player_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    kills INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    aces INTEGER DEFAULT 0,
    blocks INTEGER DEFAULT 0,
    digs INTEGER DEFAULT 0,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE (game_id, player_id)
);

--------------------------------
-- SET SCORES
--------------------------------
-- Stores the score for each set within a game.
-- mhs_score and opp_score are the points won by each side in that set.
CREATE TABLE IF NOT EXISTS set_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    set_number INTEGER NOT NULL,
    mhs_score INTEGER DEFAULT 0,
    opp_score INTEGER DEFAULT 0,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    UNIQUE (game_id, set_number)
);

--------------------------------
-- PERMISSIONS
--------------------------------
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY,
    allow_players_view_stats INTEGER DEFAULT 1
);

-- Insert default row so there's always something to read
INSERT OR IGNORE INTO permissions (id, allow_players_view_stats) VALUES (1, 1);

-- --------------------------------
-- -- HEAT MAP EVENTS 
-- --------------------------------
-- -- Stores individual ball-drop or event click coordinates for the heatmap feature.
-- -- event_type distinguishes between kills, aces, digs, etc. on the court.
-- CREATE TABLE IF NOT EXISTS heatmap_events (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     game_id INTEGER NOT NULL,
--     player_id INTEGER NOT NULL,
--     event_type TEXT NOT NULL,
--     x REAL NOT NULL,
--     y REAL NOT NULL,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
--     FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
-- );
