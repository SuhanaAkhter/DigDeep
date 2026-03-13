"""
stats_routes.py
API endpoints for reading and writing player stats.
Stats are always scoped to a game. Season totals are computed aggregates.
"""

from flask import Blueprint, jsonify, request
from db import get_db
from models.stats_model import (
    get_stats_for_game,
    get_stats_for_player,
    get_season_totals_for_player,
    get_season_totals_for_team,
    save_stats,
    delete_stats
)

stats_bp = Blueprint('stats', __name__, url_prefix='/api/stats')

TEAM_ID = 1


@stats_bp.route('/game/<int:game_id>', methods=['GET'])
def stats_for_game(game_id):
    """
    GET /api/stats/game/<game_id>
    Returns all player stat rows for a single game, with player names.
    Used by the view/edit game modal to show the stat breakdown per player.
    """
    db = get_db()
    stats = get_stats_for_game(db, game_id)
    return jsonify(stats)


@stats_bp.route('/player/<int:player_id>', methods=['GET'])
def stats_for_player(player_id):
    """
    GET /api/stats/player/<player_id>
    Returns all per-game stats for a single player with game info.
    Used on the player stats history page.
    """
    db = get_db()
    stats = get_stats_for_player(db, player_id)
    return jsonify(stats)


@stats_bp.route('/player/<int:player_id>/totals', methods=['GET'])
def player_totals(player_id):
    """
    GET /api/stats/player/<player_id>/totals
    Returns aggregated season totals for one player.
    Used by the player dashboard summary cards.
    """
    db = get_db()
    totals = get_season_totals_for_player(db, player_id)
    return jsonify(totals)


@stats_bp.route('/team/totals', methods=['GET'])
def team_totals():
    """
    GET /api/stats/team/totals
    Returns aggregated season totals across all players on the team.
    Used by the team-stats page stat cards.
    """
    db = get_db()
    totals = get_season_totals_for_team(db, TEAM_ID)
    return jsonify(totals)


@stats_bp.route('/game/<int:game_id>/player/<int:player_id>', methods=['POST'])
def submit_stats(game_id, player_id):
    """
    POST /api/stats/game/<game_id>/player/<player_id>
    Saves or updates stats for one player in one game.
    Expects JSON body: { kills, assists, aces, blocks, digs }.
    Uses INSERT OR REPLACE so re-submitting overwrites the previous entry.
    Called when the coach saves from the edit game modal.
    """
    db = get_db()
    data = request.get_json()

    save_stats(
        db,
        game_id,
        player_id,
        kills=data.get('kills', 0),
        assists=data.get('assists', 0),
        aces=data.get('aces', 0),
        blocks=data.get('blocks', 0),
        digs=data.get('digs', 0)
    )
    return jsonify({'success': True})


@stats_bp.route('/game/<int:game_id>/player/<int:player_id>', methods=['DELETE'])
def remove_stats(game_id, player_id):
    """
    DELETE /api/stats/game/<game_id>/player/<player_id>
    Removes the stat row for a player in a game.
    """
    db = get_db()
    delete_stats(db, game_id, player_id)
    return jsonify({'success': True})