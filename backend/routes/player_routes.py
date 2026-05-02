"""
player_routes.py
================
Flask Blueprints providing REST endpoints for player profile management.

Two blueprints are defined:

``me_bp``
    Mounted at ``/api/player`` (singular).  Endpoints that operate on the
    currently logged-in user's own profile — fetching their name/picture,
    updating their display name, and uploading a profile picture.

``player_bp``
    Mounted at ``/api/players`` (plural).  Endpoints used by the coach to
    read and edit any player's profile, and to add new players to the roster.

All responses are JSON.  Profile pictures are saved to
``<static_folder>/assets/uploads/`` and referenced by relative URL.

Route summary
-------------
``GET  /api/player/me``                      Current user's name and picture.
``POST /api/player/update-name``             Update current user's display name.
``POST /api/player/upload-picture``          Upload a new profile picture.
``GET  /api/players/``                       List all players on the team.
``GET  /api/players/<player_id>``            Retrieve a single player profile.
``GET  /api/players/by-user/<user_id>``      Retrieve the player linked to a user.
``PUT  /api/players/<player_id>``            Update a player profile (coach).
``POST /api/players/add``                    Add a new player to the roster (coach).
"""

import os

from flask import Blueprint, current_app, jsonify, request, session
from werkzeug.utils import secure_filename

from db import get_db
from models.player_model import (
    get_all_players,
    get_player_by_id,
    get_player_by_user_id,
    update_player,
)

player_bp = Blueprint('player', __name__, url_prefix='/api/players')
me_bp     = Blueprint('me',     __name__, url_prefix='/api/player')

# Hardcoded team identifier for the current single-tenant deployment.
TEAM_ID: int = 1

# File extensions accepted for profile picture uploads.
ALLOWED_EXTENSIONS: set[str] = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_upload_folder() -> str:
    """Return the absolute path to the profile-picture upload directory.

    Creates the directory (including any missing parents) if it does not
    already exist.

    Returns
    -------
    str
        Absolute filesystem path to ``<static_folder>/assets/uploads/``.
    """
    folder = os.path.join(current_app.static_folder, 'assets', 'uploads')
    os.makedirs(folder, exist_ok=True)
    return folder


def _allowed_file(filename: str) -> bool:
    """Return ``True`` when ``filename`` has an accepted image extension.

    Parameters
    ----------
    filename:
        Original filename provided by the uploader.

    Returns
    -------
    bool
        ``True`` if the extension is in ``ALLOWED_EXTENSIONS``,
        ``False`` otherwise.
    """
    return (
        '.' in filename
        and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
    )


# ---------------------------------------------------------------------------
# /api/player  (singular — current user's own profile)
# ---------------------------------------------------------------------------

@me_bp.route('/me', methods=['GET'])
def player_me():
    """Return the display name and profile picture for the logged-in user.

    ``GET /api/player/me``

    Behaviour differs by role:

    * **player** — reads ``name`` and ``picture`` from the ``players`` table.
    * **coach** — reads ``picture`` from ``users`` and derives the display
      name from the session (falling back to the email username prefix).

    Returns
    -------
    JSON object
        ``{"name": str, "picture": str | null}``

    Error responses
    ---------------
    401 Unauthorized
        No active session.
    404 Not Found
        A player-role user has no linked player row.
    400 Bad Request
        Session contains an unrecognised role value.
    """
    if 'user_id' not in session:
        return jsonify({'error': 'not logged in'}), 401

    db   = get_db()
    role = session.get('role')

    if role == 'player':
        row = db.execute(
            'SELECT name, picture FROM players WHERE user_id = ?',
            (session['user_id'],),
        ).fetchone()
        if not row:
            return jsonify({'error': 'player not found'}), 404
        return jsonify({'name': row['name'], 'picture': row['picture']})

    if role == 'coach':
        row = db.execute(
            'SELECT picture FROM users WHERE id = ?',
            (session['user_id'],),
        ).fetchone()
        name    = session.get('coach_name') or session.get('email', 'coach').split('@')[0]
        picture = row['picture'] if row and 'picture' in row.keys() else None
        return jsonify({'name': name, 'picture': picture})

    return jsonify({'error': 'unknown role'}), 400


@me_bp.route('/update-name', methods=['POST'])
def update_player_name():
    """Update the display name for the currently logged-in user.

    ``POST /api/player/update-name``

    Expected JSON body:

    .. code-block:: json

        {"name": "Jane Smith"}

    For player accounts the change is persisted to the ``players`` table.
    For coach accounts the name is stored in the session only (coaches do
    not have a ``players`` row).

    Returns
    -------
    JSON object
        ``{"success": true}``

    Error responses
    ---------------
    401 Unauthorized
        No active session.
    400 Bad Request
        ``name`` field is missing or blank.
    """
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
            (name, session['user_id']),
        )
        db.commit()
    else:
        session['coach_name'] = name

    return jsonify({'success': True})


@me_bp.route('/upload-picture', methods=['POST'])
def upload_picture():
    """Upload a new profile picture for the currently logged-in user.

    ``POST /api/player/upload-picture``

    Expects a ``multipart/form-data`` request with a file field named
    ``picture``.  The file is saved under
    ``<static_folder>/assets/uploads/user_<id>_<filename>`` and the
    relative URL is written back to the database.

    Returns
    -------
    JSON object
        ``{"success": true, "picture_url": "/assets/uploads/<filename>"}``

    Error responses
    ---------------
    401 Unauthorized
        No active session.
    400 Bad Request
        No file provided, empty filename, or unsupported file extension.
    500 Internal Server Error
        An unexpected error occurred while saving the file.
    """
    if 'user_id' not in session:
        return jsonify({'error': 'not logged in'}), 401

    if 'picture' not in request.files:
        return jsonify({'error': 'no file uploaded'}), 400

    file = request.files['picture']
    if not file or file.filename == '':
        return jsonify({'error': 'no file selected'}), 400

    if not _allowed_file(file.filename):
        return jsonify({'error': 'invalid file type — use png, jpg, gif, or webp'}), 400

    try:
        upload_folder = _get_upload_folder()
        filename      = f"user_{session['user_id']}_{secure_filename(file.filename)}"
        filepath      = os.path.join(upload_folder, filename)
        picture_url   = f"/assets/uploads/{filename}"

        file.save(filepath)

        db   = get_db()
        role = session.get('role')

        if role == 'player':
            db.execute(
                'UPDATE players SET picture = ? WHERE user_id = ?',
                (picture_url, session['user_id']),
            )
        elif role == 'coach':
            # Add the picture column to users if this is the first upload
            # (safe no-op when the column already exists).
            try:
                db.execute('ALTER TABLE users ADD COLUMN picture TEXT')
                db.commit()
            except Exception:
                pass
            db.execute(
                'UPDATE users SET picture = ? WHERE id = ?',
                (picture_url, session['user_id']),
            )

        db.commit()
        return jsonify({'success': True, 'picture_url': picture_url})

    except Exception as exc:
        return jsonify({'error': f'server error: {str(exc)}'}), 500


# ---------------------------------------------------------------------------
# /api/players  (plural — coach roster management)
# ---------------------------------------------------------------------------

@player_bp.route('/', methods=['GET'])
def list_players():
    """Return every player on the team ordered by name.

    ``GET /api/players/``

    Returns
    -------
    JSON array
        Each element contains ``id``, ``name``, ``grade``,
        ``jersey_number``, ``position``, and ``picture``.
    """
    db      = get_db()
    players = get_all_players(db, TEAM_ID)
    return jsonify(players)


@player_bp.route('/<int:player_id>', methods=['GET'])
def get_player(player_id: int):
    """Return the full profile for a single player.

    ``GET /api/players/<player_id>``

    Parameters
    ----------
    player_id:
        Primary key of the player to retrieve.

    Returns
    -------
    JSON object
        Contains ``id``, ``name``, ``grade``, ``jersey_number``,
        ``position``, ``picture``, and ``email``.

    Error responses
    ---------------
    404 Not Found
        No player exists with the given ID.
    """
    db     = get_db()
    player = get_player_by_id(db, player_id)
    if not player:
        return jsonify({'error': 'player not found'}), 404
    return jsonify(player)


@player_bp.route('/by-user/<int:user_id>', methods=['GET'])
def get_player_for_user(user_id: int):
    """Return the player profile associated with a given user account.

    ``GET /api/players/by-user/<user_id>``

    Parameters
    ----------
    user_id:
        Primary key of the ``users`` row whose linked player should be
        returned.

    Returns
    -------
    JSON object
        Player profile dict.

    Error responses
    ---------------
    404 Not Found
        The user has no linked player profile.
    """
    db     = get_db()
    player = get_player_by_user_id(db, user_id)
    if not player:
        return jsonify({'error': 'no player profile found for this user'}), 404
    return jsonify(player)


@player_bp.route('/<int:player_id>', methods=['PUT'])
def edit_player(player_id: int):
    """Update one or more fields on a player profile.

    ``PUT /api/players/<player_id>``

    Expected JSON body (all fields optional):

    .. code-block:: json

        {
            "name":          "Jane Smith",
            "grade":         "11",
            "jersey_number": 7,
            "position":      "Setter",
            "picture":       "/assets/uploads/user_3_photo.jpg"
        }

    Only the keys present in the request body are written; omitted keys are
    left unchanged.

    Parameters
    ----------
    player_id:
        Primary key of the player to update.

    Returns
    -------
    JSON object
        ``{"success": true}``
    """
    db   = get_db()
    data = request.get_json()
    update_player(
        db,
        player_id,
        name=data.get('name'),
        grade=data.get('grade'),
        jersey_number=data.get('jersey_number'),
        position=data.get('position'),
        picture=data.get('picture'),
    )
    return jsonify({'success': True})


@player_bp.route('/add', methods=['POST'])
def add_player():
    """Add a new player to the team roster.

    ``POST /api/players/add``

    Restricted to coaches.  The new player row is not linked to a ``users``
    account; the coach enters basic roster information manually.

    Expected JSON body:

    .. code-block:: json

        {
            "name":          "Jane Smith",
            "grade":         "11",
            "position":      "Libero",
            "jersey_number": 12
        }

    Only ``name`` is required; all other fields are optional.

    Returns
    -------
    JSON object
        ``{"success": true, "player_id": <new id>}``

    Error responses
    ---------------
    403 Forbidden
        Caller is not logged in as a coach.
    400 Bad Request
        ``name`` field is missing or blank.
    """
    if session.get('role') != 'coach':
        return jsonify({'error': 'unauthorized'}), 403

    db   = get_db()
    data = request.get_json()

    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'name is required'}), 400

    grade    = data.get('grade', '').strip() or None
    position = data.get('position', '').strip() or None
    jersey   = data.get('jersey_number') or None

    cursor = db.execute(
        'INSERT INTO players (team_id, name, grade, position, jersey_number) VALUES (?, ?, ?, ?, ?)',
        (TEAM_ID, name, grade, position, jersey),
    )
    db.commit()
    return jsonify({'success': True, 'player_id': cursor.lastrowid})