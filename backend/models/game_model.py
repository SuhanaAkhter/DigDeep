"""
game_model.py
=============
Database access layer for the ``games`` table.

A game record stores the opponent name, date, and season string for a single
match played by a team.  Per-player performance statistics for each game are
stored separately in the ``player_stats`` table (see ``stats_model.py``).

All public functions accept an open ``sqlite3.Connection`` as their first
argument and return plain ``dict`` objects (or ``None``) so that route
handlers can serialise results directly to JSON without any additional
transformation.
"""

import sqlite3


def get_all_games(db: sqlite3.Connection, team_id: int) -> list[dict]:
    """Return every game recorded for a team, sorted most-recent first.

    Used by the game-stats page to populate the games grid on initial load.

    Parameters
    ----------
    db:
        An open, request-scoped database connection.
    team_id:
        Primary key of the team whose games should be returned.

    Returns
    -------
    list[dict]
        A list of game records, each containing the keys ``id``,
        ``opponent``, ``game_date``, and ``season``.  Returns an empty list
        when the team has no games.
    """
    rows = db.execute(
        """
        SELECT id, opponent, game_date, season
        FROM   games
        WHERE  team_id = ?
        ORDER  BY game_date DESC
        """,
        (team_id,),
    ).fetchall()
    return [dict(row) for row in rows]


def get_game_by_id(db: sqlite3.Connection, game_id: int) -> dict | None:
    """Return a single game record by primary key.

    Used when the coach opens the view or edit modal for a specific game.

    Parameters
    ----------
    db:
        An open, request-scoped database connection.
    game_id:
        Primary key of the game to retrieve.

    Returns
    -------
    dict or None
        A dict with keys ``id``, ``team_id``, ``opponent``, ``game_date``,
        and ``season``, or ``None`` if no matching record exists.
    """
    row = db.execute(
        """
        SELECT id, team_id, opponent, game_date, season
        FROM   games
        WHERE  id = ?
        """,
        (game_id,),
    ).fetchone()
    return dict(row) if row else None


def add_game(
    db: sqlite3.Connection,
    team_id: int,
    opponent: str,
    game_date: str,
    season: str,
) -> int:
    """Insert a new game record and return its generated primary key.

    Called when the coach saves a new game from the add-game modal.

    Parameters
    ----------
    db:
        An open, request-scoped database connection.
    team_id:
        Primary key of the team this game belongs to.
    opponent:
        Display name of the opposing team.
    game_date:
        ISO-8601 date string (``YYYY-MM-DD``) for when the game was played.
    season:
        Season label, e.g. ``"2024-2025"``.

    Returns
    -------
    int
        The ``id`` of the newly created game row.
    """
    cursor = db.execute(
        """
        INSERT INTO games (team_id, opponent, game_date, season)
        VALUES (?, ?, ?, ?)
        """,
        (team_id, opponent, game_date, season),
    )
    db.commit()
    return cursor.lastrowid


def delete_game(db: sqlite3.Connection, game_id: int) -> None:
    """Delete a game and all of its associated data.

    Because the schema defines ``ON DELETE CASCADE`` on the ``player_stats``
    and ``heatmap_events`` tables, deleting the parent game row automatically
    removes all related child rows without requiring separate delete
    statements.

    Parameters
    ----------
    db:
        An open, request-scoped database connection.
    game_id:
        Primary key of the game to delete.
    """
    db.execute("DELETE FROM games WHERE id = ?", (game_id,))
    db.commit()