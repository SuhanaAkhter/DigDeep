"""
game_routes.py
API endpoints for creating, reading, and deleting games.
All responses return JSON.
"""

from flask import Blueprint, jsonify, request
from db import get_db
from models.game_model import get_all_games, get_game_by_id, add_game, delete_game

game_bp = Blueprint('game', __name__, url_prefix='/api/games')

TEAM_ID = 1


@game_bp.route('/', methods=['GET'])
def list_games():
    """
    GET /api/games/
    Returns all games for the team, most recent first.
    The game-stats page calls this on load to populate the games grid.
    """
    db = get_db()
    games = get_all_games(db, TEAM_ID)
    return jsonify(games)


@game_bp.route('/<int:game_id>', methods=['GET'])
def get_game(game_id):
    """
    GET /api/games/<game_id>
    Returns a single game record.
    Called when the coach opens the view or edit modal for a game.
    """
    db = get_db()
    game = get_game_by_id(db, game_id)
    if not game:
        return jsonify({'error': 'Game not found'}), 404
    return jsonify(game)


@game_bp.route('/', methods=['POST'])
def create_game():
    """
    POST /api/games/
    Creates a new game. Expects JSON body: { opponent, game_date, season }.
    Returns the new game's ID on success.
    Called when the coach saves from the add-game modal.
    """
    db = get_db()
    data = request.get_json()

    opponent = data.get('opponent')
    game_date = data.get('game_date')
    season = data.get('season', '2024-2025')

    if not opponent:
        return jsonify({'error': 'Opponent name is required'}), 400

    new_id = add_game(db, TEAM_ID, opponent, game_date, season)
    return jsonify({'success': True, 'game_id': new_id}), 201


@game_bp.route('/<int:game_id>', methods=['DELETE'])
def remove_game(game_id):
    """
    DELETE /api/games/<game_id>
    Deletes a game and all related player stats and heatmap events via CASCADE.
    """
    db = get_db()
    delete_game(db, game_id)
    return jsonify({'success': True})