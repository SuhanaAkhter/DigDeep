"""
player_routes.py
API endpoints for reading and updating player profiles.
All responses return JSON.
"""

from flask import Blueprint, jsonify, request, session, current_app
from db import get_db
from models.player_model import (
    get_all_players,
    get_player_by_id,
    get_player_by_user_id,
    update_player
)
import os
from werkzeug.utils import secure_filename

player_bp = Blueprint('player', __name__, url_prefix='/api/players')
me_bp     = Blueprint('me', __name__, url_prefix='/api/player')

TEAM_ID = 1
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def get_upload_folder():
    """Returns the absolute path to the uploads folder, creating it if needed."""
    folder = os.path.join(current_app.static_folder, 'assets', 'uploads')
    os.makedirs(folder, exist_ok=True)
    return folder


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ── /api/player (singular) routes ──────────────────────────────────────────

@me_bp.route('/me', methods=['GET'])
def player_me():
    if 'user_id' not in session:
        return jsonify({'error': 'not logged in'}), 401

    db   = get_db()
    role = session.get('role')

    if role == 'player':
        row = db.execute(
            'SELECT name, picture FROM players WHERE user_id = ?',
            (session['user_id'],)
        ).fetchone()
        if not row:
            return jsonify({'error': 'player not found'}), 404
        return jsonify({'name': row['name'], 'picture': row['picture']})

    elif role == 'coach':
        row = db.execute(
            'SELECT picture FROM users WHERE id = ?',
            (session['user_id'],)
        ).fetchone()
        name = session.get('coach_name') or session.get('email', 'coach').split('@')[0]
        picture = row['picture'] if row and 'picture' in row.keys() else None
        return jsonify({'name': name, 'picture': picture})

    return jsonify({'error': 'unknown role'}), 400


@me_bp.route('/update-name', methods=['POST'])
def update_player_name():
    if 'user_id' not in session:
        return jsonify({'error': 'not logged in'}), 401

    db   = get_db()
    data = request.get_json()
    name = data.get('name', '').strip()

    if not name:
        return jsonify({'error': 'name is required'}), 400

    if session.get('role') == 'player':
        db.execute(
            'UPDATE players SET name = ? WHERE user_id = ?',
            (name, session['user_id'])
        )
        db.commit()
    else:
        session['coach_name'] = name

    return jsonify({'success': True})


@me_bp.route('/upload-picture', methods=['POST'])
def upload_picture():
    if 'user_id' not in session:
        return jsonify({'error': 'not logged in'}), 401

    if 'picture' not in request.files:
        return jsonify({'error': 'no file uploaded'}), 400

    file = request.files['picture']
    if not file or file.filename == '':
        return jsonify({'error': 'no file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'invalid file type — use png, jpg, gif, or webp'}), 400

    try:
        upload_folder = get_upload_folder()
        filename      = f"user_{session['user_id']}_{secure_filename(file.filename)}"
        filepath      = os.path.join(upload_folder, filename)
        picture_url   = f"/assets/uploads/{filename}"

        file.save(filepath)

        db   = get_db()
        role = session.get('role')

        if role == 'player':
            db.execute(
                'UPDATE players SET picture = ? WHERE user_id = ?',
                (picture_url, session['user_id'])
            )
        elif role == 'coach':
            # Ensure the picture column exists (safe no-op if it already does)
            try:
                db.execute('ALTER TABLE users ADD COLUMN picture TEXT')
                db.commit()
            except Exception:
                pass  # column already exists
            db.execute(
                'UPDATE users SET picture = ? WHERE id = ?',
                (picture_url, session['user_id'])
            )

        db.commit()
        return jsonify({'success': True, 'picture_url': picture_url})

    except Exception as e:
        return jsonify({'error': f'server error: {str(e)}'}), 500


# ── /api/players (plural) routes ───────────────────────────────────────────

@player_bp.route('/', methods=['GET'])
def list_players():
    db = get_db()
    players = get_all_players(db, TEAM_ID)
    return jsonify(players)


@player_bp.route('/<int:player_id>', methods=['GET'])
def get_player(player_id):
    db = get_db()
    player = get_player_by_id(db, player_id)
    if not player:
        return jsonify({'error': 'player not found'}), 404
    return jsonify(player)


@player_bp.route('/by-user/<int:user_id>', methods=['GET'])
def get_player_for_user(user_id):
    db = get_db()
    player = get_player_by_user_id(db, user_id)
    if not player:
        return jsonify({'error': 'no player profile found for this user'}), 404
    return jsonify(player)


@player_bp.route('/<int:player_id>', methods=['PUT'])
def edit_player(player_id):
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