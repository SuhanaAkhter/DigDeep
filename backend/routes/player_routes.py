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
import os
from flask import Blueprint, request, jsonify, session
from werkzeug.utils import secure_filename
from db import get_db

player_bp = Blueprint('player', __name__, url_prefix='/api/players')

TEAM_ID = 1
 
UPLOAD_FOLDER   = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'assets', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
 
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
 
 
# Add to your existing player_bp:
 
@player_bp.route('/api/player/me', methods=['GET'])
def player_me():
    if 'user_id' not in session:
        return jsonify({'error': 'not logged in'}), 401
 
    db     = get_db()
    player = db.execute(
        'SELECT name, picture FROM players WHERE user_id = ?', (session['user_id'],)
    ).fetchone()
 
    if not player:
        return jsonify({'error': 'player not found'}), 404
 
    return jsonify({'name': player['name'], 'picture': player['picture']})
 
 
@player_bp.route('/api/player/update-name', methods=['POST'])
def update_player_name():
    if 'user_id' not in session:
        return jsonify({'error': 'not logged in'}), 401
 
    db   = get_db()
    data = request.get_json()
    name = data.get('name', '').strip()
 
    if not name:
        return jsonify({'error': 'name is required'}), 400
 
    db.execute(
        'UPDATE players SET name = ? WHERE user_id = ?',
        (name, session['user_id'])
    )
    db.commit()
 
    return jsonify({'success': True})
 
 
@player_bp.route('/api/player/upload-picture', methods=['POST'])
def upload_player_picture():
    if 'user_id' not in session:
        return jsonify({'error': 'not logged in'}), 401
 
    if 'picture' not in request.files:
        return jsonify({'error': 'no file uploaded'}), 400
 
    file = request.files['picture']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'invalid file type'}), 400
 
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
 
    filename = f"user_{session['user_id']}_{secure_filename(file.filename)}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
 
    picture_url = f"/assets/uploads/{filename}"
 
    db = get_db()
    db.execute(
        'UPDATE players SET picture = ? WHERE user_id = ?',
        (picture_url, session['user_id'])
    )
    db.commit()
 
    return jsonify({'success': True, 'picture_url': picture_url})

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