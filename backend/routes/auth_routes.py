"""
auth_routes.py
Handles user signup, login, logout, and password reset via email code.
Reset codes are stored in the database so they survive Flask restarts.
"""

from flask import Blueprint, request, jsonify, session, current_app
from flask_mail import Mail, Message
from db import get_db
# FIX: replaced plain hashlib.sha256 with werkzeug's password hashing.
# SHA-256 is a fast general-purpose hash — attackers can crack common
# passwords in seconds with a GPU. werkzeug uses PBKDF2-HMAC which is
# slow by design and includes a random salt automatically.
from werkzeug.security import generate_password_hash, check_password_hash
import hmac
import random
import string
import time

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def get_mail():
    return Mail(current_app)


@auth_bp.route('/signup', methods=['POST'])
def signup():
    db   = get_db()
    data = request.get_json()

    # FIX: read name from the request — was missing, causing NULL names for all new players
    name     = data.get('name', '').strip()
    email    = data.get('email', '').strip()
    password = data.get('password', '')
    role     = data.get('role', 'player')

    if not email or not password:
        return jsonify({'error': 'email and password are required'}), 400

    # FIX: enforce minimum password length server-side
    if len(password) < 8:
        return jsonify({'error': 'password must be at least 8 characters'}), 400

    if role not in ('player', 'coach'):
        return jsonify({'error': 'invalid role'}), 400

    existing = db.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
    if existing:
        return jsonify({'error': 'an account with this email already exists'}), 409

    cursor = db.execute(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        (email, generate_password_hash(password), role)
    )
    db.commit()
    user_id = cursor.lastrowid

    if role == 'player':
        # FIX: save the name field so players don't show up as "unnamed"
        db.execute(
            'INSERT INTO players (user_id, team_id, name) VALUES (?, ?, ?)',
            (user_id, 1, name or None)
        )
        db.commit()

    session['user_id'] = user_id
    session['role']    = role
    session['email']   = email

    return jsonify({'success': True, 'role': role}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    db   = get_db()
    data = request.get_json()

    email    = data.get('email', '').strip()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'email and password are required'}), 400

    user = db.execute(
        'SELECT id, email, password_hash, role FROM users WHERE email = ?', (email,)
    ).fetchone()

    # FIX: use check_password_hash to match the new werkzeug hashes
    if not user or not check_password_hash(user['password_hash'], password):
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
    Generates a 6-digit code, saves it to the database, and emails it.
    """
    db   = get_db()
    data = request.get_json()
    email = data.get('email', '').strip()

    if not email:
        return jsonify({'error': 'email is required'}), 400

    user = db.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()

    # Always return success even if email not found (prevents email enumeration)
    if not user:
        return jsonify({'success': True})

    code = ''.join(random.choices(string.digits, k=6))

    db.execute(
        'INSERT OR REPLACE INTO password_reset_codes (email, code, expires_at) VALUES (?, ?, ?)',
        (email, code, int(time.time()) + 600)
    )
    db.commit()

    try:
        mail = get_mail()
        msg  = Message(
            subject='your dig deep password reset code',
            sender='digdeep.noreply@gmail.com',
            recipients=[email]
        )
        msg.body = f"""hi there,

your dig deep password reset code is:

{code}

this code expires in 10 minutes.

if you didn't request this, you can ignore this email.

— dig deep"""
        mail.send(msg)
    except Exception as e:
        print(f'email error: {e}')
        return jsonify({'error': 'failed to send email'}), 500

    return jsonify({'success': True})


@auth_bp.route('/verify-reset-code', methods=['POST'])
def verify_reset_code():
    """
    POST /api/auth/verify-reset-code
    Checks the code is valid and not expired.
    """
    db   = get_db()
    data = request.get_json()

    email = data.get('email', '').strip()
    code  = data.get('code', '').strip()

    entry = db.execute(
        'SELECT code, expires_at FROM password_reset_codes WHERE email = ?', (email,)
    ).fetchone()

    if not entry:
        return jsonify({'error': 'invalid code'}), 400

    # FIX: use hmac.compare_digest to prevent timing attacks on code comparison
    if not hmac.compare_digest(entry['code'], code):
        return jsonify({'error': 'invalid code'}), 400

    if time.time() > entry['expires_at']:
        db.execute('DELETE FROM password_reset_codes WHERE email = ?', (email,))
        db.commit()
        return jsonify({'error': 'code has expired — please request a new one'}), 400

    return jsonify({'success': True})


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """
    POST /api/auth/reset-password
    Verifies code one final time then updates the password.
    """
    db   = get_db()
    data = request.get_json()

    email        = data.get('email', '').strip()
    code         = data.get('code', '').strip()
    new_password = data.get('new_password', '')

    if not new_password:
        return jsonify({'error': 'new password is required'}), 400

    # FIX: enforce minimum length on reset too
    if len(new_password) < 8:
        return jsonify({'error': 'password must be at least 8 characters'}), 400

    entry = db.execute(
        'SELECT code, expires_at FROM password_reset_codes WHERE email = ?', (email,)
    ).fetchone()

    if not entry:
        return jsonify({'error': 'invalid or expired code'}), 400

    # FIX: use hmac.compare_digest here too
    if not hmac.compare_digest(entry['code'], code):
        return jsonify({'error': 'invalid or expired code'}), 400

    if time.time() > entry['expires_at']:
        db.execute('DELETE FROM password_reset_codes WHERE email = ?', (email,))
        db.commit()
        return jsonify({'error': 'code has expired — please request a new one'}), 400

    db.execute(
        'UPDATE users SET password_hash = ? WHERE email = ?',
        (generate_password_hash(new_password), email)
    )
    db.execute('DELETE FROM password_reset_codes WHERE email = ?', (email,))
    db.commit()

    return jsonify({'success': True})

@auth_bp.route('/update-email', methods=['POST'])
def update_email():
    if 'user_id' not in session:
        return jsonify({'error': 'not logged in'}), 401
 
    db   = get_db()
    data = request.get_json()
    new_email = data.get('new_email', '').strip()
 
    if not new_email:
        return jsonify({'error': 'email is required'}), 400
 
    existing = db.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        (new_email, session['user_id'])
    ).fetchone()
    if existing:
        return jsonify({'error': 'that email is already in use'}), 409
 
    db.execute(
        'UPDATE users SET email = ? WHERE id = ?',
        (new_email, session['user_id'])
    )
    db.commit()
    session['email'] = new_email
 
    return jsonify({'success': True})
 
 
@auth_bp.route('/update-password', methods=['POST'])
def update_password():
    if 'user_id' not in session:
        return jsonify({'error': 'not logged in'}), 401
 
    db   = get_db()
    data = request.get_json()
    current_password = data.get('current_password', '')
    new_password     = data.get('new_password', '')
 
    if not current_password or not new_password:
        return jsonify({'error': 'all fields are required'}), 400
 
    if len(new_password) < 8:
        return jsonify({'error': 'password must be at least 8 characters'}), 400
 
    user = db.execute(
        'SELECT password_hash FROM users WHERE id = ?', (session['user_id'],)
    ).fetchone()
 
    if not user or not check_password_hash(user['password_hash'], current_password):
        return jsonify({'error': 'current password is incorrect'}), 401
 
    db.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        (generate_password_hash(new_password), session['user_id'])
    )
    db.commit()
 
    return jsonify({'success': True})