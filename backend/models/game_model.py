"""
game_model.py
Handles all database reads and writes for games.
A game stores the opponent and date. Per-player stats for that game live in player_stats.
"""

def get_all_games(db, team_id):
    """
    Returns all games for a team, ordered most recent first.
    Used by the game-stats page to populate the games grid.
    """
    rows = db.execute("""
        SELECT id, opponent, game_date, season
        FROM games
        WHERE team_id = ?
        ORDER BY game_date DESC
    """, (team_id,)).fetchall()
    return [dict(row) for row in rows]


def get_game_by_id(db, game_id):
    """
    Returns a single game record by ID.
    Used when opening the view or edit modal for a specific game.
    """
    row = db.execute("""
        SELECT id, team_id, opponent, game_date, season
        FROM games
        WHERE id = ?
    """, (game_id,)).fetchone()
    return dict(row) if row else None


def add_game(db, team_id, opponent, game_date, season):
    """
    Inserts a new game record and returns the new game's ID.
    Called when the coach saves a new game from the add-game modal.
    """
    cursor = db.execute("""
        INSERT INTO games (team_id, opponent, game_date, season)
        VALUES (?, ?, ?, ?)
    """, (team_id, opponent, game_date, season))
    db.commit()
    return cursor.lastrowid


def delete_game(db, game_id):
    """
    Deletes a game and all associated player_stats and heatmap_events via CASCADE.
    """
    db.execute("DELETE FROM games WHERE id = ?", (game_id,))
    db.commit()