"""
auth_routes.py
Handles user signup, login, logout, and password reset via email code.
"""

from flask import Blueprint, request, jsonify, session, current_app
from flask_mail import Mail, Message
from db import get_db
import hashlib
import random
import string
import time

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# In-memory store for reset codes: { email: { code, expires_at } }
reset_codes = {}


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def get_mail():
    return Mail(current_app)


@auth_bp.route('/signup', methods=['POST'])
def signup():
    db = get_db()
    data = request.get_json()

    email    = data.get('email', '').strip()
    password = data.get('password', '')
    role     = data.get('role', 'player')

    if not email or not password:
        return jsonify({'error': 'email and password are required'}), 400
    if role not in ('player', 'coach'):
        return jsonify({'error': 'invalid role'}), 400

    existing = db.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
    if existing:
        return jsonify({'error': 'an account with this email already exists'}), 409

    cursor = db.execute(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        (email, hash_password(password), role)
    )
    db.commit()
    user_id = cursor.lastrowid

    if role == 'player':
        db.execute('INSERT INTO players (user_id, team_id) VALUES (?, ?)', (user_id, 1))
        db.commit()

    session['user_id'] = user_id
    session['role']    = role
    session['email']   = email

    return jsonify({'success': True, 'role': role}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    db = get_db()
    data = request.get_json()

    email    = data.get('email', '').strip()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'email and password are required'}), 400

    user = db.execute(
        'SELECT id, email, password_hash, role FROM users WHERE email = ?', (email,)
    ).fetchone()

    if not user or user['password_hash'] != hash_password(password):
        return jsonify({'error': 'invalid email or password'}), 401

    session['user_id'] = user['id']
    session['role']    = user['role']
    session['email']   = user['email']

    return jsonify({'success': True, 'role': user['role']})


@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})


@auth_bp.route('/me', methods=['GET'])
def me():
    if 'user_id' not in session:
        return jsonify({'error': 'not logged in'}), 401
    return jsonify({
        'user_id': session['user_id'],
        'role':    session['role'],
        'email':   session['email']
    })


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """
    POST /api/auth/forgot-password
    Expects JSON: { email }
    Generates a 6-digit code, stores it for 10 minutes, and emails it.
    """
    data  = request.get_json()
    email = data.get('email', '').strip()

    if not email:
        return jsonify({'error': 'email is required'}), 400

    db   = get_db()
    user = db.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()

    # Always return success even if email not found (security best practice)
    if not user:
        return jsonify({'success': True})

    # Generate 6-digit code
    code = ''.join(random.choices(string.digits, k=6))
    reset_codes[email] = {
        'code':       code,
        'expires_at': time.time() + 600  # 10 minutes
    }

    # Send email
    try:
        mail = get_mail()
        msg  = Message(
            subject='your dig deep password reset code',
            sender='digdeep.noreply@gmail.com',
            recipients=[email]
        )
        msg.body = f"""
hi there,

your dig deep password reset code is:

{code}

this code expires in 10 minutes.

if you didn't request this, you can ignore this email.

— dig deep
        """
        mail.send(msg)
    except Exception as e:
        print(f'Email error: {e}')
        return jsonify({'error': 'failed to send email'}), 500

    return jsonify({'success': True})


@auth_bp.route('/verify-reset-code', methods=['POST'])
def verify_reset_code():
    """
    POST /api/auth/verify-reset-code
    Expects JSON: { email, code }
    Checks the code is valid and not expired.
    """
    data  = request.get_json()
    email = data.get('email', '').strip()
    code  = data.get('code', '').strip()

    entry = reset_codes.get(email)

    if not entry or entry['code'] != code:
        return jsonify({'error': 'invalid code'}), 400
    if time.time() > entry['expires_at']:
        del reset_codes[email]
        return jsonify({'error': 'code has expired — please request a new one'}), 400

    return jsonify({'success': True})


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """
    POST /api/auth/reset-password
    Expects JSON: { email, code, new_password }
    Verifies code one final time then updates the password.
    """
    data         = request.get_json()
    email        = data.get('email', '').strip()
    code         = data.get('code', '').strip()
    new_password = data.get('new_password', '')

    if not new_password:
        return jsonify({'error': 'new password is required'}), 400

    entry = reset_codes.get(email)

    if not entry or entry['code'] != code:
        return jsonify({'error': 'invalid or expired code'}), 400
    if time.time() > entry['expires_at']:
        del reset_codes[email]
        return jsonify({'error': 'code has expired — please request a new one'}), 400

    db = get_db()
    db.execute(
        'UPDATE users SET password_hash = ? WHERE email = ?',
        (hash_password(new_password), email)
    )
    db.commit()

    del reset_codes[email]
    return jsonify({'success': True})