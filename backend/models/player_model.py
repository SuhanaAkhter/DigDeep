"""
player_model.py
Handles all database reads and writes for player profiles.
All methods return plain dicts or lists of dicts so routes can pass them directly to JSON responses.
"""

def get_all_players(db, team_id):
    """
    Returns all players on a given team with their basic profile info.
    Used by the coach dashboard and manage-players page.
    """
    rows = db.execute("""
        SELECT p.id, p.name, p.grade, p.jersey_number, p.position, p.picture
        FROM players p
        WHERE p.team_id = ?
        ORDER BY p.name
    """, (team_id,)).fetchall()
    return [dict(row) for row in rows]


def get_player_by_id(db, player_id):
    """
    Returns full profile for a single player including their user email.
    Used by the player detail card in manage-players.
    """
    row = db.execute("""
        SELECT p.id, p.name, p.grade, p.jersey_number, p.position, p.picture,
               u.email
        FROM players p
        JOIN users u ON u.id = p.user_id
        WHERE p.id = ?
    """, (player_id,)).fetchone()
    return dict(row) if row else None


def get_player_by_user_id(db, user_id):
    """
    Returns the player profile linked to a given user account.
    Used on the player dashboard to load the logged-in player's own info.
    """
    row = db.execute("""
        SELECT p.id, p.name, p.grade, p.jersey_number, p.position, p.picture,
               p.team_id
        FROM players p
        WHERE p.user_id = ?
    """, (user_id,)).fetchone()
    return dict(row) if row else None


def update_player(db, player_id, name=None, grade=None, jersey_number=None,
                  position=None, picture=None):
    """
    Updates whichever fields are provided for a given player.
    Fields passed as None are left unchanged.
    Used by the coach on the manage-players page.
    """
    fields = []
    values = []

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