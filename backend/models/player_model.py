"""
player_model.py
===============
Database access layer for the ``players`` table.

Player profiles store biographical and roster information (name, grade,
jersey number, position, and profile picture).  Each player row is linked to
a ``users`` row via ``user_id``, which holds the login credentials.

All public functions accept an open ``sqlite3.Connection`` as their first
argument and return plain ``dict`` objects (or ``None``) so that route
handlers can serialise results directly to JSON without any additional
transformation.
"""

import sqlite3

def get_all_players(db, team_id):
    """Return every player on a team ordered alphabetically by name.

    Used by the coach dashboard and the manage-players page to build the
    player roster list.

    Parameters
    ----------
    db:
        An open, request-scoped database connection.
    team_id:
        Primary key of the team whose players should be returned.

    Returns
    -------
    list[dict]
        A list of player profile dicts, each containing the keys ``id``,
        ``name``, ``grade``, ``jersey_number``, ``position``, ``picture``
        ``user_id`` and ``email``.  Returns an empty list when the team has no players.
    """
    rows = db.execute("""
        SELECT p.id, p.name, p.grade, p.jersey_number, p.position,
               p.picture, p.user_id, u.email
        FROM players p
        LEFT JOIN users u ON u.id = p.user_id
        WHERE p.team_id = ?
        ORDER BY p.name
    """, (team_id,)).fetchall()
    return [dict(row) for row in rows]


def get_player_by_id(db: sqlite3.Connection, player_id: int) -> dict | None:
    """Return the full profile for a single player, including their email.

    Used by the player detail card on the manage-players page when the coach
    expands a specific player's row.

    Parameters
    ----------
    db:
        An open, request-scoped database connection.
    player_id:
        Primary key of the player to retrieve.

    Returns
    -------
    dict or None
        A dict with keys ``id``, ``name``, ``grade``, ``jersey_number``,
        ``position``, ``picture``, and ``email``, or ``None`` if no matching
        player exists.
    """
    row = db.execute(
        """
        SELECT p.id, p.name, p.grade, p.jersey_number, p.position, p.picture,
               u.email
        FROM   players p
        JOIN   users   u ON u.id = p.user_id
        WHERE  p.id = ?
        """,
        (player_id,),
    ).fetchone()
    return dict(row) if row else None


def get_player_by_user_id(db: sqlite3.Connection, user_id: int) -> dict | None:
    """Return the player profile linked to a given user account.

    Used on the player dashboard to load the currently logged-in player's
    own profile without requiring a separate player-id lookup.

    Parameters
    ----------
    db:
        An open, request-scoped database connection.
    user_id:
        Primary key of the ``users`` row whose linked player should be
        returned.

    Returns
    -------
    dict or None
        A dict with keys ``id``, ``name``, ``grade``, ``jersey_number``,
        ``position``, ``picture``, and ``team_id``, or ``None`` if the user
        has no associated player profile.
    """
    row = db.execute(
        """
        SELECT p.id, p.name, p.grade, p.jersey_number, p.position, p.picture,
               p.team_id
        FROM   players p
        WHERE  p.user_id = ?
        """,
        (user_id,),
    ).fetchone()
    return dict(row) if row else None


def update_player(
    db: sqlite3.Connection,
    player_id: int,
    name: str | None = None,
    grade: str | None = None,
    jersey_number: int | None = None,
    position: str | None = None,
    picture: str | None = None,
) -> None:
    """Update one or more fields on a player profile.

    Only the keyword arguments that are explicitly provided (i.e. not
    ``None``) are written to the database.  Passing no keyword arguments
    other than ``player_id`` is a no-op.

    Used by the coach on the manage-players page when editing a player's
    details.

    Parameters
    ----------
    db:
        An open, request-scoped database connection.
    player_id:
        Primary key of the player row to update.
    name:
        Updated display name, or ``None`` to leave unchanged.
    grade:
        Updated school grade/year, or ``None`` to leave unchanged.
    jersey_number:
        Updated jersey number, or ``None`` to leave unchanged.
    position:
        Updated position string (e.g. ``"Setter"``), or ``None`` to leave
        unchanged.
    picture:
        Updated picture URL (relative path under ``/assets/uploads/``), or
        ``None`` to leave unchanged.
    """
    fields: list[str] = []
    values: list = []

    if name is not None:
        fields.append("name = ?")
        values.append(name)
    if grade is not None:
        fields.append("grade = ?")
        values.append(grade)
    if jersey_number is not None:
        fields.append("jersey_number = ?")
        values.append(jersey_number)
    if position is not None:
        fields.append("position = ?")
        values.append(position)
    if picture is not None:
        fields.append("picture = ?")
        values.append(picture)

    if not fields:
        return

    values.append(player_id)
    db.execute(f"UPDATE players SET {', '.join(fields)} WHERE id = ?", values)
    db.commit()