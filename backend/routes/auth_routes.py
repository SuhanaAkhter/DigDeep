"""
auth_routes.py
Handles user signup, login, and logout.
Stores user id and role in session on successful login.
"""

from flask import Blueprint, request, jsonify, session
from db import get_db
import hashlib

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def hash_password(password):
    """Simple SHA-256 hash. Upgrade to bcrypt before going to production."""
    return hashlib.sha256(password.encode()).hexdigest()


@auth_bp.route('/signup', methods=['POST'])
def signup():
    """
    POST /api/auth/signup
    Expects JSON: { email, password, role }
    Creates a new user account. If role is 'player', also creates a blank player profile.
    """
    db = get_db()
    data = request.get_json()

    email = data.get('email', '').strip()
    password = data.get('password', '')
    role = data.get('role', 'player')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    if role not in ('player', 'coach'):
        return jsonify({'error': 'Invalid role'}), 400

    # Check if email already exists
    existing = db.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
    if existing:
        return jsonify({'error': 'An account with this email already exists'}), 409

    password_hash = hash_password(password)

    cursor = db.execute(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        (email, password_hash, role)
    )
    db.commit()
    user_id = cursor.lastrowid

    # If player, create a blank player profile linked to this user
    if role == 'player':
        db.execute(
            'INSERT INTO players (user_id, team_id) VALUES (?, ?)',
            (user_id, 1)  # defaults to team_id 1
        )
        db.commit()

    session['user_id'] = user_id
    session['role'] = role
    session['email'] = email

    return jsonify({'success': True, 'role': role}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    POST /api/auth/login
    Expects JSON: { email, password }
    Verifies credentials and stores user info in session.
    Returns role so the frontend can redirect to the right dashboard.
    """
    db = get_db()
    data = request.get_json()

    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = db.execute(
        'SELECT id, email, password_hash, role FROM users WHERE email = ?',
        (email,)
    ).fetchone()

    if not user or user['password_hash'] != hash_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    session['user_id'] = user['id']
    session['role'] = user['role']
    session['email'] = user['email']

    return jsonify({'success': True, 'role': user['role']})


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    POST /api/auth/logout
    Clears the session.
    """
    session.clear()
    return jsonify({'success': True})


@auth_bp.route('/me', methods=['GET'])
def me():
    """
    GET /api/auth/me
    Returns the currently logged-in user's info.
    Useful for the frontend to check if a session is still active.
    """
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401

    return jsonify({
        'user_id': session['user_id'],
        'role': session['role'],
        'email': session['email']
    })