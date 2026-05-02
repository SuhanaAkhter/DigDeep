-- =============================================================================
-- schema.sql
-- =============================================================================
-- Defines the complete database schema for the Dig Deep volleyball stats
-- platform.
--
-- Table overview
-- --------------
--   users                 Authentication records and roles.
--   teams                 Team roster groups scoped to a season.
--   players               Player profiles linked to user accounts.
--   password_reset_codes  Short-lived email verification codes.
--   games                 One row per match played by a team.
--   player_stats          Per-player, per-game performance figures.
--   set_scores            Individual set scores within a game.
--   permissions           App-wide feature flags (single row).
--
-- Referential integrity is enforced via foreign keys.  Cascade rules ensure
-- that deleting a game removes all associated player_stats and set_scores
-- automatically.
--
-- Run this script before seed.sql.  All CREATE statements use
-- IF NOT EXISTS so the script is safe to re-run on an existing database.
-- =============================================================================

PRAGMA foreign_keys = ON;


-- =============================================================================
-- USERS
-- =============================================================================
-- Stores all user accounts.  The role column gates access to coach-only
-- features; the CHECK constraint prevents any value other than 'player' or
-- 'coach' from being stored.
--
-- Columns
-- -------
--   id             Auto-incrementing primary key.
--   email          Unique login identifier.
--   password_hash  PBKDF2-HMAC hash produced by Werkzeug; never plain-text.
--   role           'player' or 'coach'.
--   picture        Relative URL to the user's uploaded profile picture, or
--                  NULL when no picture has been set.
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK (role IN ('player', 'coach')),
    picture       TEXT
);


-- =============================================================================
-- TEAMS
-- =============================================================================
-- Stores team metadata.  In the current single-tenant deployment only one
-- team row exists (id = 1, 'MHS Varsity'), but the schema supports multiple
-- teams for future use.
--
-- Columns
-- -------
--   id         Auto-incrementing primary key.
--   team_name  Human-readable team name; must be unique.
--   season     Optional label such as '2024-2025'.
-- =============================================================================

CREATE TABLE IF NOT EXISTS teams (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    team_name TEXT    NOT NULL UNIQUE,
    season    TEXT
);


-- =============================================================================
-- PLAYERS
-- =============================================================================
-- Stores player profiles.  A player row is linked to a users row through
-- user_id so that login credentials are kept separate from display/roster
-- data.  Players added manually by a coach (without a login account) will
-- have user_id = NULL.
--
-- Columns
-- -------
--   id             Auto-incrementing primary key.
--   user_id        Foreign key to users(id); NULL for roster-only entries.
--                  ON DELETE SET NULL so deleting the user account does not
--                  remove the player's stats history.
--   team_id        Foreign key to teams(id).
--                  ON DELETE SET NULL so removing a team does not cascade to
--                  players.
--   name           Display name shown in the UI.
--   grade          School year / grade level (stored as text, e.g. '11').
--   jersey_number  The player's jersey number.
--   position       Playing position string, e.g. 'Setter' or 'Libero'.
--   picture        Relative URL to the player's profile photo, or NULL.
-- =============================================================================

CREATE TABLE IF NOT EXISTS players (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER UNIQUE,
    team_id       INTEGER,
    name          TEXT,
    grade         TEXT,
    jersey_number INTEGER,
    position      TEXT,
    picture       TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)   ON DELETE SET NULL,
    FOREIGN KEY (team_id) REFERENCES teams(id)   ON DELETE SET NULL
);


-- =============================================================================
-- PASSWORD RESET CODES
-- =============================================================================
-- Holds the short-lived 6-digit codes emailed to users during the forgot-
-- password flow.  Using the database (rather than an in-memory store) means
-- codes survive process restarts.
--
-- The UNIQUE constraint on email ensures that requesting a new code replaces
-- the previous one via INSERT OR REPLACE in auth_routes.py.
--
-- Columns
-- -------
--   id          Auto-incrementing primary key.
--   email       The address the code was sent to.
--   code        6-digit numeric string.
--   expires_at  Unix timestamp (seconds) after which the code is no longer
--               valid.  Codes expire 10 minutes after creation.
-- =============================================================================

CREATE TABLE IF NOT EXISTS password_reset_codes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT    NOT NULL UNIQUE,
    code       TEXT    NOT NULL,
    expires_at INTEGER NOT NULL
);


-- =============================================================================
-- GAMES
-- =============================================================================
-- Stores one row per match.  Per-player performance statistics are recorded
-- in player_stats, not here.  The featured flag and score/note columns
-- support the optional "featured games" sidebar on the team-stats page.
--
-- Columns
-- -------
--   id         Auto-incrementing primary key.
--   team_id    Foreign key to teams(id).  ON DELETE CASCADE removes all games
--              when a team is deleted.
--   opponent   Display name of the opposing team.
--   game_date  ISO-8601 date string (YYYY-MM-DD).
--   season     Season label, e.g. '2024-2025'.
--   featured   Boolean flag (0 or 1); featured games appear in the sidebar.
--              Defaults to 0.
--   score      Optional plain-text score summary, e.g. '3-1'.
--   note       Optional free-text note about the game, displayed alongside
--              the score in the featured-games view.
-- =============================================================================

CREATE TABLE IF NOT EXISTS games (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id   INTEGER NOT NULL,
    opponent  TEXT    NOT NULL,
    game_date TEXT,
    season    TEXT,
    featured  INTEGER DEFAULT 0,
    score     TEXT,
    note      TEXT,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);


-- =============================================================================
-- PLAYER STATS
-- =============================================================================
-- Stores individual player performance for a single game.  There is exactly
-- one row per (game_id, player_id) pair, enforced by the UNIQUE constraint.
-- The coach submits stats via the edit-game modal; re-submitting uses
-- INSERT OR REPLACE to overwrite previous values.
--
-- ON DELETE CASCADE on both foreign keys ensures that:
--   * Deleting a game removes all stat rows for that game.
--   * Deleting a player removes all their historical stats.
--
-- Columns
-- -------
--   id         Auto-incrementing primary key.
--   game_id    Foreign key to games(id).
--   player_id  Foreign key to players(id).
--   kills      Number of kill shots.
--   assists    Number of assists.
--   aces       Number of service aces.
--   blocks     Number of blocks.
--   digs       Number of successful digs.
-- =============================================================================

CREATE TABLE IF NOT EXISTS player_stats (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id   INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    kills     INTEGER DEFAULT 0,
    assists   INTEGER DEFAULT 0,
    aces      INTEGER DEFAULT 0,
    blocks    INTEGER DEFAULT 0,
    digs      INTEGER DEFAULT 0,
    FOREIGN KEY (game_id)   REFERENCES games(id)   ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE (game_id, player_id)
);


-- =============================================================================
-- SET SCORES
-- =============================================================================
-- Records the point totals for each set within a game.  mhs_score and
-- opp_score hold the points won by the home team and the opponent,
-- respectively, for that set.
--
-- The UNIQUE constraint on (game_id, set_number) means re-submitting a set
-- score via INSERT OR REPLACE safely updates the existing row.
--
-- Columns
-- -------
--   id          Auto-incrementing primary key.
--   game_id     Foreign key to games(id).  ON DELETE CASCADE removes set
--               scores when the parent game is deleted.
--   set_number  1-based index of the set within the game.
--   mhs_score   Points scored by MHS in this set.
--   opp_score   Points scored by the opponent in this set.
-- =============================================================================

CREATE TABLE IF NOT EXISTS set_scores (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id    INTEGER NOT NULL,
    set_number INTEGER NOT NULL,
    mhs_score  INTEGER DEFAULT 0,
    opp_score  INTEGER DEFAULT 0,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    UNIQUE (game_id, set_number)
);


-- =============================================================================
-- PERMISSIONS
-- =============================================================================
-- Holds a single row of app-wide permission flags.  Currently controls
-- whether players can see their own statistics; future flags can be added as
-- new columns without schema changes elsewhere.
--
-- The INSERT OR IGNORE below guarantees that the row with id = 1 exists from
-- the moment the schema is first applied, so the API never encounters a
-- missing row.
--
-- Columns
-- -------
--   id                        Always 1; this is a singleton table.
--   allow_players_view_stats  Boolean (1 = allowed, 0 = hidden from players).
--                             Defaults to 1 (visible).
-- =============================================================================

CREATE TABLE IF NOT EXISTS permissions (
    id                       INTEGER PRIMARY KEY,
    allow_players_view_stats INTEGER DEFAULT 1
);

-- Seed the permissions row so reads always return a value.
INSERT OR IGNORE INTO permissions (id, allow_players_view_stats) VALUES (1, 1);


-- =============================================================================
-- HEATMAP EVENTS  (currently disabled)
-- =============================================================================
-- Intended to store court-position coordinates for each ball-contact event,
-- enabling a hit-location heatmap overlay per player/game.
-- Retained as a commented-out reference for future implementation.
--
-- CREATE TABLE IF NOT EXISTS heatmap_events (
--     id          INTEGER PRIMARY KEY AUTOINCREMENT,
--     game_id     INTEGER NOT NULL,
--     player_id   INTEGER NOT NULL,
--     event_type  TEXT    NOT NULL,
--     x           REAL    NOT NULL,
--     y           REAL    NOT NULL,
--     created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (game_id)   REFERENCES games(id)   ON DELETE CASCADE,
--     FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
-- );