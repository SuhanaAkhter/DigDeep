"""
game_routes.py
==============
Flask Blueprint providing REST endpoints for game management.

Exposes CRUD operations on game records and supporting endpoints for
featuring/unfeaturing games on a public-facing view.  All responses are JSON.

Blueprints
----------
``game_bp``
    Mounted at ``/api/games``.

Route summary
-------------
``GET  /api/games/``                        List all games for the team.
``POST /api/games/``                        Create a new game.
``GET  /api/games/<game_id>``               Retrieve a single game.
``DELETE /api/games/<game_id>``             Delete a game and its stats.
``GET  /api/games/featured``                List featured games.
``POST /api/games/<game_id>/feature``       Mark a game as featured.
``DELETE /api/games/<game_id>/feature``     Remove a game's featured status.
"""

from flask import Blueprint, jsonify, request, session

from db import get_db
from models.game_model import add_game, delete_game, get_all_games, get_game_by_id

game_bp = Blueprint('game', __name__, url_prefix='/api/games')

# Hardcoded team identifier for the current single-tenant deployment.
TEAM_ID: int = 1


# ---------------------------------------------------------------------------
# Core CRUD
# ---------------------------------------------------------------------------

@game_bp.route('/', methods=['GET'])
def list_games():
    """Return all games for the team, ordered most-recent first.

    ``GET /api/games/``

    Called by the game-stats page on load to populate the games grid.

    Returns
    -------
    JSON array
        Each element contains ``id``, ``opponent``, ``game_date``, and
        ``season``.
    """
    db    = get_db()
    games = get_all_games(db, TEAM_ID)
    return jsonify(games)


@game_bp.route('/<int:game_id>', methods=['GET'])
def get_game(game_id: int):
    """Return a single game record by ID.

    ``GET /api/games/<game_id>``

    Called when the coach opens the view or edit modal for a specific game.

    Parameters
    ----------
    game_id:
        Primary key of the game to retrieve.

    Returns
    -------
    JSON object
        Contains ``id``, ``team_id``, ``opponent``, ``game_date``, and
        ``season``.

    Error responses
    ---------------
    404 Not Found
        No game exists with the given ID.
    """
    db   = get_db()
    game = get_game_by_id(db, game_id)
    if not game:
        return jsonify({'error': 'Game not found'}), 404
    return jsonify(game)


@game_bp.route('/', methods=['POST'])
def create_game():
    """Create a new game record.

    ``POST /api/games/``

    Expected JSON body:

    .. code-block:: json

        {
            "opponent":  "Riverside High",
            "game_date": "2024-11-15",
            "season":    "2024-2025"
        }

    ``season`` defaults to ``"2024-2025"`` when omitted.

    Returns
    -------
    JSON object
        ``{"success": true, "game_id": <new id>}`` with HTTP 201.

    Error responses
    ---------------
    400 Bad Request
        ``opponent`` field is missing or empty.
    """
    db   = get_db()
    data = request.get_json()

    opponent  = data.get('opponent')
    game_date = data.get('game_date')
    season    = data.get('season', '2024-2025')

    if not opponent:
        return jsonify({'error': 'Opponent name is required'}), 400

    new_id = add_game(db, TEAM_ID, opponent, game_date, season)
    return jsonify({'success': True, 'game_id': new_id}), 201


@game_bp.route('/<int:game_id>', methods=['DELETE'])
def remove_game(game_id: int):
    """Delete a game and all related data.

    ``DELETE /api/games/<game_id>``

    Cascading deletes in the schema automatically remove associated
    ``player_stats`` and ``heatmap_events`` rows.

    Parameters
    ----------
    game_id:
        Primary key of the game to delete.

    Returns
    -------
    JSON object
        ``{"success": true}``
    """
    db = get_db()
    delete_game(db, game_id)
    return jsonify({'success': True})


# ---------------------------------------------------------------------------
# Featured games
# ---------------------------------------------------------------------------

@game_bp.route('/featured', methods=['GET'])
def get_featured_games():
    """Return up to five featured games, most recent first.

    ``GET /api/games/featured``

    Featured games are surfaced on the public-facing landing page.

    Returns
    -------
    JSON object
        ``{"games": [...]}`` where each element contains ``id``,
        ``opponent``, ``score``, and ``note``.
    """
    db    = get_db()
    games = db.execute(
        """
        SELECT id, opponent, score, note
        FROM   games
        WHERE  featured = 1
        ORDER  BY game_date DESC
        LIMIT  5
        """,
    ).fetchall()
    return jsonify({'games': [dict(g) for g in games]})


@game_bp.route('/<int:game_id>/feature', methods=['POST'])
def feature_game(game_id: int):
    """Mark a game as featured.

    ``POST /api/games/<game_id>/feature``

    Restricted to coaches.

    Parameters
    ----------
    game_id:
        Primary key of the game to feature.

    Returns
    -------
    JSON object
        ``{"success": true}``

    Error responses
    ---------------
    403 Forbidden
        Caller is not logged in as a coach.
    """
    if 'user_id' not in session or session.get('role') != 'coach':
        return jsonify({'error': 'unauthorized'}), 403

    db = get_db()
    db.execute('UPDATE games SET featured = 1 WHERE id = ?', (game_id,))
    db.commit()
    return jsonify({'success': True})


@game_bp.route('/<int:game_id>/feature', methods=['DELETE'])
def unfeature_game(game_id: int):
    """Remove a game's featured status.

    ``DELETE /api/games/<game_id>/feature``

    Restricted to coaches.

    Parameters
    ----------
    game_id:
        Primary key of the game to unfeature.

    Returns
    -------
    JSON object
        ``{"success": true}``

    Error responses
    ---------------
    403 Forbidden
        Caller is not logged in as a coach.
    """
    if 'user_id' not in session or session.get('role') != 'coach':
        return jsonify({'error': 'unauthorized'}), 403

    db = get_db()
    db.execute('UPDATE games SET featured = 0 WHERE id = ?', (game_id,))
    db.commit()
    return jsonify({'success': True})