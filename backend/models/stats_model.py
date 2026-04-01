"""
stats_model.py
Handles all database reads and writes for player_stats.
Stats are always scoped to a specific game and player.
Season totals are computed by aggregating across all games.
"""

def get_stats_for_game(db, game_id):
    """
    Returns all player stats rows for a given game, including player names.
    Used by the view/edit game modal to show who did what in that game.
    """
    rows = db.execute("""
        SELECT ps.id, ps.player_id, p.name, ps.kills, ps.assists,
               ps.aces, ps.blocks, ps.digs
        FROM player_stats ps
        JOIN players p ON p.id = ps.player_id
        WHERE ps.game_id = ?
        ORDER BY p.name
    """, (game_id,)).fetchall()
    return [dict(row) for row in rows]


def get_stats_for_player(db, player_id):
    """
    Returns all per-game stat rows for a single player, with game info attached.
    Used on the player dashboard and player-stats page to show game history.
    """
    rows = db.execute("""
        SELECT ps.id, ps.game_id, g.opponent, g.game_date,
               ps.kills, ps.assists, ps.aces, ps.blocks, ps.digs
        FROM player_stats ps
        JOIN games g ON g.id = ps.game_id
        WHERE ps.player_id = ?
        ORDER BY g.game_date DESC
    """, (player_id,)).fetchall()
    return [dict(row) for row in rows]


def get_season_totals_for_player(db, player_id):
    row = db.execute("""
        SELECT
            COALESCE(SUM(ps.kills), 0)   AS total_kills,
            COALESCE(SUM(ps.assists), 0) AS total_assists,
            COALESCE(SUM(ps.aces), 0)    AS total_aces,
            COALESCE(SUM(ps.blocks), 0)  AS total_blocks,
            COALESCE(SUM(ps.digs), 0)    AS total_digs,
            COUNT(DISTINCT ps.game_id)   AS games_played
        FROM player_stats ps
        WHERE ps.player_id = ?
    """, (player_id,)).fetchone()
    return dict(row) if row else {}

def get_season_totals_for_team(db, team_id):
    row = db.execute("""
        SELECT
            COALESCE(SUM(ps.kills), 0)   AS total_kills,
            COALESCE(SUM(ps.assists), 0) AS total_assists,
            COALESCE(SUM(ps.aces), 0)    AS total_aces,
            COALESCE(SUM(ps.blocks), 0)  AS total_blocks,
            COALESCE(SUM(ps.digs), 0)    AS total_digs
        FROM player_stats ps
        JOIN players p ON p.id = ps.player_id
        WHERE p.team_id = ?
    """, (team_id,)).fetchone()
    return dict(row) if row else {}


def save_stats(db, game_id, player_id, kills, assists, aces, blocks, digs):
    """
    Inserts or replaces the stat row for a player in a given game.
    Uses INSERT OR REPLACE so the coach can re-submit the form to update stats.
    """
    db.execute("""
        INSERT OR REPLACE INTO player_stats
            (game_id, player_id, kills, assists, aces, blocks, digs)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (game_id, player_id, kills, assists, aces, blocks, digs))
    db.commit()


def delete_stats(db, game_id, player_id):
    """
    Removes the stat row for a specific player in a specific game.
    """
    db.execute("""
        DELETE FROM player_stats
        WHERE game_id = ? AND player_id = ?
    """, (game_id, player_id))
    db.commit()