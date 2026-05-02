"""
stats_model.py
==============
Database access layer for the ``player_stats`` table.

Each ``player_stats`` row records how a single player performed in a single
game (kills, assists, aces, blocks, and digs).  Season-level totals are
computed by aggregating across all game rows for a player or team rather than
being stored separately.

All public functions accept an open ``sqlite3.Connection`` as their first
argument and return plain ``dict`` objects (or lists thereof) so that route
handlers can serialise results directly to JSON without any additional
transformation.
"""

import sqlite3


def get_stats_for_game(db: sqlite3.Connection, game_id: int) -> list[dict]:
    """Return all player stat rows for a given game, sorted by player name.

    Used by the view/edit game modal to display each player's contribution
    for that match.

    Parameters
    ----------
    db:
        An open, request-scoped database connection.
    game_id:
        Primary key of the game whose stats should be returned.

    Returns
    -------
    list[dict]
        A list of stat dicts, each containing ``id``, ``player_id``,
        ``name``, ``kills``, ``assists``, ``aces``, ``blocks``, and
        ``digs``.  Returns an empty list when no stats have been entered
        for the game.
    """
    rows = db.execute(
        """
        SELECT ps.id, ps.player_id, p.name,
               ps.kills, ps.assists, ps.aces, ps.blocks, ps.digs
        FROM   player_stats ps
        JOIN   players      p ON p.id = ps.player_id
        WHERE  ps.game_id = ?
        ORDER  BY p.name
        """,
        (game_id,),
    ).fetchall()
    return [dict(row) for row in rows]


def get_stats_for_player(db: sqlite3.Connection, player_id: int) -> list[dict]:
    """Return all per-game stat rows for a single player, most recent first.

    Each row includes game metadata (opponent and date) so the caller does
    not need a separate game lookup.  Used on the player dashboard and the
    player-stats page to render the game history table.

    Parameters
    ----------
    db:
        An open, request-scoped database connection.
    player_id:
        Primary key of the player whose game history should be returned.

    Returns
    -------
    list[dict]
        A list of stat dicts, each containing ``id``, ``game_id``,
        ``opponent``, ``game_date``, ``kills``, ``assists``, ``aces``,
        ``blocks``, and ``digs``.  Returns an empty list when the player
        has no recorded stats.
    """
    rows = db.execute(
        """
        SELECT ps.id, ps.game_id, g.opponent, g.game_date,
               ps.kills, ps.assists, ps.aces, ps.blocks, ps.digs
        FROM   player_stats ps
        JOIN   games        g ON g.id = ps.game_id
        WHERE  ps.player_id = ?
        ORDER  BY g.game_date DESC
        """,
        (player_id,),
    ).fetchall()
    return [dict(row) for row in rows]


def get_season_totals_for_player(
    db: sqlite3.Connection, player_id: int
) -> dict:
    """Return cumulative season statistics for a single player.

    Aggregates all ``player_stats`` rows for the given player across every
    game.  ``COALESCE`` ensures that a player with no recorded stats receives
    zero values rather than ``None``.

    Parameters
    ----------
    db:
        An open, request-scoped database connection.
    player_id:
        Primary key of the player to aggregate.

    Returns
    -------
    dict
        A dict with keys ``total_kills``, ``total_assists``, ``total_aces``,
        ``total_blocks``, ``total_digs``, and ``games_played``.  Returns an
        empty dict if the query returns no row (should not occur in practice).
    """
    row = db.execute(
        """
        SELECT COALESCE(SUM(ps.kills),   0) AS total_kills,
               COALESCE(SUM(ps.assists), 0) AS total_assists,
               COALESCE(SUM(ps.aces),    0) AS total_aces,
               COALESCE(SUM(ps.blocks),  0) AS total_blocks,
               COALESCE(SUM(ps.digs),    0) AS total_digs,
               COUNT(DISTINCT ps.game_id)   AS games_played
        FROM   player_stats ps
        WHERE  ps.player_id = ?
        """,
        (player_id,),
    ).fetchone()
    return dict(row) if row else {}


def get_season_totals_for_team(db: sqlite3.Connection, team_id: int) -> dict:
    """Return cumulative season statistics across all players on a team.

    Joins through ``players`` to scope the aggregation to a specific team.
    Used on the team-stats page to display overall team performance.

    Parameters
    ----------
    db:
        An open, request-scoped database connection.
    team_id:
        Primary key of the team to aggregate.

    Returns
    -------
    dict
        A dict with keys ``total_kills``, ``total_assists``, ``total_aces``,
        ``total_blocks``, and ``total_digs``.  Returns an empty dict if the
        query returns no row (should not occur in practice).
    """
    row = db.execute(
        """
        SELECT COALESCE(SUM(ps.kills),   0) AS total_kills,
               COALESCE(SUM(ps.assists), 0) AS total_assists,
               COALESCE(SUM(ps.aces),    0) AS total_aces,
               COALESCE(SUM(ps.blocks),  0) AS total_blocks,
               COALESCE(SUM(ps.digs),    0) AS total_digs
        FROM   player_stats ps
        JOIN   players      p ON p.id = ps.player_id
        WHERE  p.team_id = ?
        """,
        (team_id,),
    ).fetchone()
    return dict(row) if row else {}


def save_stats(
    db: sqlite3.Connection,
    game_id: int,
    player_id: int,
    kills: int,
    assists: int,
    aces: int,
    blocks: int,
    digs: int,
) -> None:
    """Insert or replace the stat row for a player in a given game.

    Uses ``INSERT OR REPLACE`` so the coach can re-submit the stats form to
    correct previously entered values without needing a separate update path.
    The ``(game_id, player_id)`` pair is expected to be a unique constraint
    in the schema.

    Parameters
    ----------
    db:
        An open, request-scoped database connection.
    game_id:
        Primary key of the game these stats belong to.
    player_id:
        Primary key of the player these stats belong to.
    kills:
        Number of kill shots recorded for this player in this game.
    assists:
        Number of assists recorded.
    aces:
        Number of service aces recorded.
    blocks:
        Number of blocks recorded.
    digs:
        Number of digs recorded.
    """
    db.execute(
        """
        INSERT OR REPLACE INTO player_stats
            (game_id, player_id, kills, assists, aces, blocks, digs)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (game_id, player_id, kills, assists, aces, blocks, digs),
    )
    db.commit()


def delete_stats(
    db: sqlite3.Connection, game_id: int, player_id: int
) -> None:
    """Remove the stat row for a specific player in a specific game.

    Parameters
    ----------
    db:
        An open, request-scoped database connection.
    game_id:
        Primary key of the game whose player stat should be removed.
    player_id:
        Primary key of the player whose stat row should be removed.
    """
    db.execute(
        """
        DELETE FROM player_stats
        WHERE  game_id   = ?
          AND  player_id = ?
        """,
        (game_id, player_id),
    )
    db.commit()