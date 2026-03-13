"""
player_routes.py
API endpoints for reading and updating player profiles.
All responses return JSON. The frontend JS fetches these and renders the results.
"""

from flask import Blueprint, jsonify, request
from db import get_db
from models.player_model import (
    get_all_players,
    get_player_by_id,
    get_player_by_user_id,
    update_player
)

player_bp = Blueprint('player', __name__, url_prefix='/api/players')

TEAM_ID = 1


@player_bp.route('/', methods=['GET'])
def list_players():
    """
    GET /api/players/
    Returns all players on the team.
    The manage-players page calls this on load to populate the player grid.
    """
    db = get_db()
    players = get_all_players(db, TEAM_ID)
    return jsonify(players)


@player_bp.route('/<int:player_id>', methods=['GET'])
def get_player(player_id):
    """
    GET /api/players/<player_id>
    Returns full profile for one player.
    Called when the coach clicks a player card to open the detail sidebar.
    """
    db = get_db()
    player = get_player_by_id(db, player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    return jsonify(player)


@player_bp.route('/by-user/<int:user_id>', methods=['GET'])
def get_player_for_user(user_id):
    """
    GET /api/players/by-user/<user_id>
    Returns the player profile linked to a user account.
    Used by the player dashboard to load the current player's own info.
    """
    db = get_db()
    player = get_player_by_user_id(db, user_id)
    if not player:
        return jsonify({'error': 'No player profile found for this user'}), 404
    return jsonify(player)


@player_bp.route('/<int:player_id>', methods=['PUT'])
def edit_player(player_id):
    """
    PUT /api/players/<player_id>
    Updates a player's profile fields. Accepts a JSON body with any of:
    name, grade, jersey_number, position, picture.
    Only provided fields are updated.
    """
    db = get_db()
    data = request.get_json()
    update_player(
        db,
        player_id,
        name=data.get('name'),
        grade=data.get('grade'),
        jersey_number=data.get('jersey_number'),
        position=data.get('position'),
        picture=data.get('picture')
    )
    return jsonify({'success': True})