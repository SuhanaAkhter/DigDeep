-- =============================================================================
-- seed.sql
-- =============================================================================
-- Development seed data for the Dig Deep volleyball stats platform.
--
-- Populates the database with a representative set of test records:
-- one coach, five players, one team, three games, and per-player stats
-- for every player in every game.
--
-- Usage
-- -----
-- Run this script after schema.sql:
--
--   sqlite3 digdeep.db < database/schema.sql
--   sqlite3 digdeep.db < database/seed.sql
--
-- All INSERT statements use INSERT OR IGNORE so the script can be re-run
-- against an existing database without raising duplicate-key errors or
-- overwriting any live data.
--
-- Passwords
-- ---------
-- The password_hash values below are placeholder strings.  They are NOT
-- valid Werkzeug hashes and cannot be used to log in.  Generate real hashes
-- (e.g. via `werkzeug.security.generate_password_hash`) before deploying to
-- any environment where authentication is required.
-- =============================================================================


-- =============================================================================
-- USERS
-- =============================================================================
-- One coach account and five player accounts.
-- IDs are explicit so the foreign-key references in subsequent tables are
-- predictable and do not depend on insertion order.
-- =============================================================================

INSERT OR IGNORE INTO users (id, email, password_hash, role) VALUES
    (1, 'coach@digdeep.com',   'placeholder_hash', 'coach'),
    (2, 'linda@digdeep.com',   'placeholder_hash', 'player'),
    (3, 'suhana@digdeep.com',  'placeholder_hash', 'player'),
    (4, 'reyhan@digdeep.com',  'placeholder_hash', 'player'),
    (5, 'nancy@digdeep.com',   'placeholder_hash', 'player'),
    (6, 'bernice@digdeep.com', 'placeholder_hash', 'player');


-- =============================================================================
-- TEAMS
-- =============================================================================
-- A single team for the current season.  All players and games reference
-- team_id = 1.
-- =============================================================================

INSERT OR IGNORE INTO teams (id, team_name, season) VALUES
    (1, 'MHS Varsity', '2024-2025');


-- =============================================================================
-- PLAYERS
-- =============================================================================
-- Five player profiles, each linked to the corresponding users row and
-- assigned to the MHS Varsity team.
-- =============================================================================

INSERT OR IGNORE INTO players (id, user_id, team_id, name, grade, jersey_number, position) VALUES
    (1, 2, 1, 'Linda',   '12', 7,  'Middle'),
    (2, 3, 1, 'Suhana',  '11', 12, 'Setter'),
    (3, 4, 1, 'Reyhan',  '11', 4,  'Libero'),
    (4, 5, 1, 'Nancy',   '12', 9,  'Outside'),
    (5, 6, 1, 'Bernice', '10', 3,  'Opposite');


-- =============================================================================
-- GAMES
-- =============================================================================
-- Three games played during the 2024-2025 season, in chronological order.
-- =============================================================================

INSERT OR IGNORE INTO games (id, team_id, opponent, game_date, season) VALUES
    (1, 1, 'De la Salle', '2025-02-10', '2024-2025'),
    (2, 1, 'LDH',         '2025-02-18', '2024-2025'),
    (3, 1, 'St. Mikes',   '2025-03-01', '2024-2025');


-- =============================================================================
-- PLAYER STATS
-- =============================================================================
-- Per-player, per-game performance figures for all three games.
-- Each block of five rows covers all players in a single game.
--
-- Columns: game_id, player_id, kills, assists, aces, blocks, digs
-- =============================================================================

INSERT OR IGNORE INTO player_stats (game_id, player_id, kills, assists, aces, blocks, digs) VALUES
    -- Game 1: vs De la Salle (2025-02-10)
    (1, 1,  8,  2,  3, 4,  5),   -- Linda
    (1, 2,  2, 14,  1, 0,  3),   -- Suhana
    (1, 3,  0,  1,  2, 0, 12),   -- Reyhan
    (1, 4, 10,  3,  2, 2,  4),   -- Nancy
    (1, 5,  7,  1,  1, 3,  2),   -- Bernice

    -- Game 2: vs LDH (2025-02-18)
    (2, 1,  5,  1,  2, 3,  6),   -- Linda
    (2, 2,  1, 11,  3, 0,  4),   -- Suhana
    (2, 3,  0,  2,  1, 0, 15),   -- Reyhan
    (2, 4, 12,  2,  4, 1,  3),   -- Nancy
    (2, 5,  9,  0,  2, 4,  1),   -- Bernice

    -- Game 3: vs St. Mikes (2025-03-01)
    (3, 1,  6,  3,  1, 5,  4),   -- Linda
    (3, 2,  3, 13,  2, 0,  2),   -- Suhana
    (3, 3,  0,  1,  3, 0, 11),   -- Reyhan
    (3, 4,  8,  4,  1, 3,  5),   -- Nancy
    (3, 5, 11,  2,  3, 2,  3);   -- Bernice