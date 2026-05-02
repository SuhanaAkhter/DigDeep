"""
stats_routes.py
===============
Flask Blueprint providing REST endpoints for player statistics.

Covers per-game stats, season totals, set scores, and the coach-controlled
permission flag that determines whether players can view their own statistics.

Blueprint prefix: ``/api/stats``

Route summary
-------------
``GET  /api/stats/game/<game_id>``                      Stats for all players in a game.
``GET  /api/stats/player/<player_id>``                  Per-game history for one player.
``GET  /api/stats/player/<player_id>/totals``           Season totals for one player.
``GET  /api/stats/team/totals``                         Season totals for the whole team.
``POST /api/stats/game/<game_id>/player/<player_id>``   Save (insert/replace) a stat row.
``DELETE /api/stats/game/<game_id>/player/<player_id>`` Delete a stat row.
``GET  /api/stats/game/<game_id>/sets``                 Set scores for a game.
``POST /api/stats/game/<game_id>/sets/<set_number>``    Save a set score.
``GET  /api/stats/permissions``                         Read the stats-visibility setting.
``POST /api/stats/permissions``                         Write the stats-visibility setting.
"""

from flask import Blueprint, jsonify, request, session

from db import get_db
from models.stats_model import (
    delete_stats,
    get_season_totals_for_player,
    get_season_totals_for_team,
    get_stats_for_game,
    get_stats_for_player,
    save_stats,
)

stats_bp = Blueprint('stats', __name__, url_prefix='/api/stats')

# Hardcoded team identifier for the current single-tenant deployment.
TEAM_ID: int = 1


# ---------------------------------------------------------------------------
# Player stats
# ---------------------------------------------------------------------------

@stats_bp.route('/game/<int:game_id>', methods=['GET'])
def stats_for_game(game_id: int):
    """Return all player stat rows for a given game.

    ``GET /api/stats/game/<game_id>``

    Parameters
    ----------
    game_id:
        Primary key of the game whose stats should be returned.

    Returns
    -------
    JSON array
        Each element contains ``id``, ``player_id``, ``name``, ``kills``,
        ``assists``, ``aces``, ``blocks``, and ``digs``.
    """
    db = get_db()
    return jsonify(get_stats_for_game(db, game_id))


@stats_bp.route('/player/<int:player_id>', methods=['GET'])
def stats_for_player(player_id: int):
    """Return per-game stats history for a single player.

    ``GET /api/stats/player/<player_id>``

    Parameters
    ----------
    player_id:
        Primary key of the player whose history should be returned.

    Returns
    -------
    JSON array
        Each element contains ``id``, ``game_id``, ``opponent``,
        ``game_date``, ``kills``, ``assists``, ``aces``, ``blocks``, and
        ``digs``, sorted most-recent first.
    """
    db = get_db()
    return jsonify(get_stats_for_player(db, player_id))


@stats_bp.route('/player/<int:player_id>/totals', methods=['GET'])
def player_totals(player_id: int):
    """Return cumulative season totals for a single player.

    ``GET /api/stats/player/<player_id>/totals``

    Parameters
    ----------
    player_id:
        Primary key of the player to aggregate.

    Returns
    -------
    JSON object
        Contains ``total_kills``, ``total_assists``, ``total_aces``,
        ``total_blocks``, ``total_digs``, and ``games_played``.
    """
    db = get_db()
    return jsonify(get_season_totals_for_player(db, player_id))


@stats_bp.route('/team/totals', methods=['GET'])
def team_totals():
    """Return cumulative season totals across all players on the team.

    ``GET /api/stats/team/totals``

    Returns
    -------
    JSON object
        Contains ``total_kills``, ``total_assists``, ``total_aces``,
        ``total_blocks``, and ``total_digs``.
    """
    db = get_db()
    return jsonify(get_season_totals_for_team(db, TEAM_ID))


@stats_bp.route('/game/<int:game_id>/player/<int:player_id>', methods=['POST'])
def submit_stats(game_id: int, player_id: int):
    """Save (insert or replace) a stat row for a player in a game.

    ``POST /api/stats/game/<game_id>/player/<player_id>``

    Uses ``INSERT OR REPLACE`` semantics so the coach can re-submit the
    form to correct previously entered figures without a separate update
    path.  Any stat field omitted from the request body defaults to 0.

    Expected JSON body:

    .. code-block:: json

        {
            "kills":   5,
            "assists": 10,
            "aces":    2,
            "blocks":  3,
            "digs":    8
        }

    Parameters
    ----------
    game_id:
        Primary key of the game these stats belong to.
    player_id:
        Primary key of the player these stats belong to.

    Returns
    -------
    JSON object
        ``{"success": true}``
    """
    db   = get_db()
    data = request.get_json()
    save_stats(
        db,
        game_id,
        player_id,
        kills=data.get('kills', 0),
        assists=data.get('assists', 0),
        aces=data.get('aces', 0),
        blocks=data.get('blocks', 0),
        digs=data.get('digs', 0),
    )
    return jsonify({'success': True})


@stats_bp.route('/game/<int:game_id>/player/<int:player_id>', methods=['DELETE'])
def remove_stats(game_id: int, player_id: int):
    """Delete the stat row for a specific player in a specific game.

    ``DELETE /api/stats/game/<game_id>/player/<player_id>``

    Parameters
    ----------
    game_id:
        Primary key of the game whose player stat should be removed.
    player_id:
        Primary key of the player whose stat row should be removed.

    Returns
    -------
    JSON object
        ``{"success": true}``
    """
    db = get_db()
    delete_stats(db, game_id, player_id)
    return jsonify({'success': True})


# ---------------------------------------------------------------------------
# Set scores
# ---------------------------------------------------------------------------

@stats_bp.route('/game/<int:game_id>/sets', methods=['GET'])
def get_set_scores(game_id: int):
    """Return all set scores for a given game, ordered by set number.

    ``GET /api/stats/game/<game_id>/sets``

    Parameters
    ----------
    game_id:
        Primary key of the game whose set scores should be returned.

    Returns
    -------
    JSON array
        Each element contains ``set_number``, ``mhs_score``, and
        ``opp_score``.
    """
    db   = get_db()
    rows = db.execute(
        """
        SELECT set_number, mhs_score, opp_score
        FROM   set_scores
        WHERE  game_id = ?
        ORDER  BY set_number
        """,
        (game_id,),
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@stats_bp.route('/game/<int:game_id>/sets/<int:set_number>', methods=['POST'])
def save_set_score(game_id: int, set_number: int):
    """Save (insert or replace) the score for one set of a game.

    ``POST /api/stats/game/<game_id>/sets/<set_number>``

    Expected JSON body:

    .. code-block:: json

        {
            "mhs_score": 25,
            "opp_score": 22
        }

    Parameters
    ----------
    game_id:
        Primary key of the game this set belongs to.
    set_number:
        1-based set index (e.g. 1 for the first set).

    Returns
    -------
    JSON object
        ``{"success": true}``
    """
    db   = get_db()
    data = request.get_json()
    mhs  = int(data.get('mhs_score', 0))
    opp  = int(data.get('opp_score', 0))
    db.execute(
        """
        INSERT OR REPLACE INTO set_scores (game_id, set_number, mhs_score, opp_score)
        VALUES (?, ?, ?, ?)
        """,
        (game_id, set_number, mhs, opp),
    )
    db.commit()
    return jsonify({'success': True})


# ---------------------------------------------------------------------------
# Permissions
# ---------------------------------------------------------------------------

@stats_bp.route('/permissions', methods=['GET'])
def get_permissions():
    """Return the current stats-visibility permission setting.

    ``GET /api/stats/permissions``

    When no permissions row exists the setting defaults to ``true``
    (players can see their stats).

    Returns
    -------
    JSON object
        ``{"allow_players_view_stats": bool}``
    """
    db  = get_db()
    row = db.execute(
        'SELECT allow_players_view_stats FROM permissions WHERE id = 1'
    ).fetchone()
    if not row:
        return jsonify({'allow_players_view_stats': True})
    return jsonify({'allow_players_view_stats': bool(row['allow_players_view_stats'])})


@stats_bp.route('/permissions', methods=['POST'])
def save_permissions():
    """Update the stats-visibility permission setting.

    ``POST /api/stats/permissions``

    Restricted to coaches.

    Expected JSON body:

    .. code-block:: json

        {"allow_players_view_stats": false}

    Returns
    -------
    JSON object
        ``{"success": true}``

    Error responses
    ---------------
    403 Forbidden
        Caller is not logged in as a coach.
    """
    if session.get('role') != 'coach':
        return jsonify({'error': 'unauthorized'}), 403

    db   = get_db()
    data = request.get_json()
    val  = 1 if data.get('allow_players_view_stats') else 0
    db.execute(
        'INSERT OR REPLACE INTO permissions (id, allow_players_view_stats) VALUES (1, ?)',
        (val,),
    )
    db.commit()
    return jsonify({'success': True})