"""
auth_routes.py
==============
Flask Blueprint providing user authentication endpoints.

Covers the full authentication lifecycle:

* **Sign-up** — create a new player or coach account.
* **Login / logout** — session-based authentication.
* **Forgot password** — email a time-limited 6-digit reset code.
* **Verify reset code** — validate the code before allowing a password change.
* **Reset password** — apply a new password after code verification.
* **Update email** — change the email address of the logged-in user.
* **Update password** — change the password of the logged-in user.

All passwords are stored as PBKDF2-HMAC hashes via Werkzeug's
``generate_password_hash`` / ``check_password_hash``.  Reset codes are
persisted in the ``password_reset_codes`` table so they survive process
restarts, and expire after 10 minutes.

All endpoints return JSON responses.

Blueprint prefix: ``/api/auth``
"""

import hmac
import random
import string
import time

from flask import Blueprint, current_app, jsonify, request, session
from flask_mail import Mail, Message
from werkzeug.security import check_password_hash, generate_password_hash

from db import get_db

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_mail() -> Mail:
    """Return the ``flask_mail.Mail`` instance bound to the current app.

    Returns
    -------
    Mail
        The application's configured mail extension.
    """
    return Mail(current_app)


# ---------------------------------------------------------------------------
# Sign-up / login / logout
# ---------------------------------------------------------------------------

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """Register a new user account.

    ``POST /api/auth/signup``

    Expected JSON body:

    .. code-block:: json

        {
            "name":     "Jane Smith",
            "email":    "jane@example.com",
            "password": "s3cr3tPass",
            "role":     "player"
        }

    ``role`` must be ``"player"`` or ``"coach"``; it defaults to
    ``"player"`` when omitted.  A ``player``-role signup also creates a
    linked row in the ``players`` table using the provided ``name``.

    On success, the new user's session is established and
    ``{"success": true, "role": "<role>"}`` is returned with HTTP 201.

    Error responses
    ---------------
    400 Bad Request
        Missing email/password, password shorter than 8 characters, or
        unknown role value.
    409 Conflict
        An account with the given email already exists.
    """
    db   = get_db()
    data = request.get_json()

    name     = data.get('name', '').strip()
    email    = data.get('email', '').strip()
    password = data.get('password', '')
    role     = data.get('role', 'player')

    if not email or not password:
        return jsonify({'error': 'email and password are required'}), 400

    if len(password) < 8:
        return jsonify({'error': 'password must be at least 8 characters'}), 400

    if role not in ('player', 'coach'):
        return jsonify({'error': 'invalid role'}), 400

    existing = db.execute(
        'SELECT id FROM users WHERE email = ?', (email,)
    ).fetchone()
    if existing:
        return jsonify({'error': 'an account with this email already exists'}), 409

    cursor = db.execute(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        (email, generate_password_hash(password), role),
    )
    db.commit()
    user_id = cursor.lastrowid

    if role == 'player':
        db.execute(
            'INSERT INTO players (user_id, team_id, name) VALUES (?, ?, ?)',
            (user_id, 1, name or None),
        )
        db.commit()

    session['user_id'] = user_id
    session['role']    = role
    session['email']   = email

    return jsonify({'success': True, 'role': role}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate a user and start a session.

    ``POST /api/auth/login``

    Expected JSON body:

    .. code-block:: json

        {
            "email":    "jane@example.com",
            "password": "s3cr3tPass"
        }

    On success, ``{"success": true, "role": "<role>"}`` is returned.

    Error responses
    ---------------
    400 Bad Request
        Missing email or password field.
    401 Unauthorized
        Email not found or password does not match.
    """
    db   = get_db()
    data = request.get_json()

    email    = data.get('email', '').strip()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'email and password are required'}), 400

    user = db.execute(
        'SELECT id, email, password_hash, role FROM users WHERE email = ?',
        (email,),
    ).fetchone()

    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'invalid email or password'}), 401

    session['user_id'] = user['id']
    session['role']    = user['role']
    session['email']   = user['email']

    return jsonify({'success': True, 'role': user['role']})


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Destroy the current session.

    ``POST /api/auth/logout``

    Always returns ``{"success": true}``; calling this endpoint when not
    logged in is harmless.
    """
    session.clear()
    return jsonify({'success': True})


@auth_bp.route('/me', methods=['GET'])
def me():
    """Return identifying information about the currently logged-in user.

    ``GET /api/auth/me``

    Returns
    -------
    JSON
        ``{"user_id": int, "role": str, "email": str}`` when authenticated.

    Error responses
    ---------------
    401 Unauthorized
        No active session.
    """
    if 'user_id' not in session:
        return jsonify({'error': 'not logged in'}), 401
    return jsonify({
        'user_id': session['user_id'],
        'role':    session['role'],
        'email':   session['email'],
    })


# ---------------------------------------------------------------------------
# Password reset flow
# ---------------------------------------------------------------------------

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Generate and email a 6-digit password reset code.

    ``POST /api/auth/forgot-password``

    Expected JSON body:

    .. code-block:: json

        {"email": "jane@example.com"}

    A random 6-digit numeric code is generated, written to the
    ``password_reset_codes`` table with a 10-minute expiry, and sent to
    the supplied address.

    To prevent email enumeration, this endpoint always returns
    ``{"success": true}`` regardless of whether the email is registered.

    Error responses
    ---------------
    400 Bad Request
        ``email`` field missing or empty.
    500 Internal Server Error
        The SMTP send operation failed.
    """
    db    = get_db()
    data  = request.get_json()
    email = data.get('email', '').strip()

    if not email:
        return jsonify({'error': 'email is required'}), 400

    user = db.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()

    # Always respond successfully to avoid leaking which addresses are registered.
    if not user:
        return jsonify({'success': True})

    code = ''.join(random.choices(string.digits, k=6))

    db.execute(
        'INSERT OR REPLACE INTO password_reset_codes (email, code, expires_at) VALUES (?, ?, ?)',
        (email, code, int(time.time()) + 600),
    )
    db.commit()

    try:
        mail = _get_mail()
        msg  = Message(
            subject='your dig deep password reset code',
            sender='digdeep.noreply@gmail.com',
            recipients=[email],
        )
        msg.body = (
            f"hi there,\n\n"
            f"your dig deep password reset code is:\n\n"
            f"{code}\n\n"
            f"this code expires in 10 minutes.\n\n"
            f"if you didn't request this, you can ignore this email.\n\n"
            f"— dig deep"
        )
        mail.send(msg)
    except Exception as exc:
        current_app.logger.error("Password reset email failed: %s", exc)
        return jsonify({'error': 'failed to send email'}), 500

    return jsonify({'success': True})


@auth_bp.route('/verify-reset-code', methods=['POST'])
def verify_reset_code():
    """Verify that a password reset code is valid and unexpired.

    ``POST /api/auth/verify-reset-code``

    Expected JSON body:

    .. code-block:: json

        {
            "email": "jane@example.com",
            "code":  "482910"
        }

    This endpoint is called after the user enters the code they received by
    email.  It confirms the code is correct before advancing them to the
    new-password step.  ``hmac.compare_digest`` is used for the string
    comparison to avoid timing-based side-channel attacks.

    Error responses
    ---------------
    400 Bad Request
        No reset code found for the email, the code does not match, or the
        code has expired (and the expired record is cleaned up).
    """
    db   = get_db()
    data = request.get_json()

    email = data.get('email', '').strip()
    code  = data.get('code', '').strip()

    entry = db.execute(
        'SELECT code, expires_at FROM password_reset_codes WHERE email = ?',
        (email,),
    ).fetchone()

    if not entry:
        return jsonify({'error': 'invalid code'}), 400

    if not hmac.compare_digest(entry['code'], code):
        return jsonify({'error': 'invalid code'}), 400

    if time.time() > entry['expires_at']:
        db.execute('DELETE FROM password_reset_codes WHERE email = ?', (email,))
        db.commit()
        return jsonify({'error': 'code has expired — please request a new one'}), 400

    return jsonify({'success': True})


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Apply a new password after verifying the reset code.

    ``POST /api/auth/reset-password``

    Expected JSON body:

    .. code-block:: json

        {
            "email":        "jane@example.com",
            "code":         "482910",
            "new_password": "newS3cr3t!"
        }

    The code is verified a second time here (rather than relying solely on
    the ``/verify-reset-code`` step) to guard against race conditions or
    direct API calls that skip the verification step.  On success, the reset
    code row is deleted so it cannot be reused.

    Error responses
    ---------------
    400 Bad Request
        Missing new password, password too short, invalid/expired code.
    """
    db   = get_db()
    data = request.get_json()

    email        = data.get('email', '').strip()
    code         = data.get('code', '').strip()
    new_password = data.get('new_password', '')

    if not new_password:
        return jsonify({'error': 'new password is required'}), 400

    if len(new_password) < 8:
        return jsonify({'error': 'password must be at least 8 characters'}), 400

    entry = db.execute(
        'SELECT code, expires_at FROM password_reset_codes WHERE email = ?',
        (email,),
    ).fetchone()

    if not entry:
        return jsonify({'error': 'invalid or expired code'}), 400

    if not hmac.compare_digest(entry['code'], code):
        return jsonify({'error': 'invalid or expired code'}), 400

    if time.time() > entry['expires_at']:
        db.execute('DELETE FROM password_reset_codes WHERE email = ?', (email,))
        db.commit()
        return jsonify({'error': 'code has expired — please request a new one'}), 400

    db.execute(
        'UPDATE users SET password_hash = ? WHERE email = ?',
        (generate_password_hash(new_password), email),
    )
    db.execute('DELETE FROM password_reset_codes WHERE email = ?', (email,))
    db.commit()

    return jsonify({'success': True})


# ---------------------------------------------------------------------------
# Account settings
# ---------------------------------------------------------------------------

@auth_bp.route('/update-email', methods=['POST'])
def update_email():
    """Change the email address for the currently logged-in user.

    ``POST /api/auth/update-email``

    Expected JSON body:

    .. code-block:: json

        {"new_email": "newemail@example.com"}

    On success, the session ``email`` key is updated to the new address so
    subsequent requests reflect the change without requiring a re-login.

    Error responses
    ---------------
    401 Unauthorized
        No active session.
    400 Bad Request
        ``new_email`` field is missing or empty.
    409 Conflict
        The requested email is already registered to a different account.
    """
    if 'user_id' not in session:
        return jsonify({'error': 'not logged in'}), 401

    db        = get_db()
    data      = request.get_json()
    new_email = data.get('new_email', '').strip()

    if not new_email:
        return jsonify({'error': 'email is required'}), 400

    existing = db.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        (new_email, session['user_id']),
    ).fetchone()
    if existing:
        return jsonify({'error': 'that email is already in use'}), 409

    db.execute(
        'UPDATE users SET email = ? WHERE id = ?',
        (new_email, session['user_id']),
    )
    db.commit()
    session['email'] = new_email

    return jsonify({'success': True})


@auth_bp.route('/update-password', methods=['POST'])
def update_password():
    """Change the password for the currently logged-in user.

    ``POST /api/auth/update-password``

    Expected JSON body:

    .. code-block:: json

        {
            "current_password": "oldS3cr3t",
            "new_password":     "newS3cr3t!"
        }

    The caller must supply the current password for verification before the
    new one is accepted.  This prevents an attacker with access to an
    unattended session from silently changing credentials.

    Error responses
    ---------------
    401 Unauthorized
        No active session, or ``current_password`` does not match.
    400 Bad Request
        Either password field is missing, or the new password is shorter
        than 8 characters.
    """
    if 'user_id' not in session:
        return jsonify({'error': 'not logged in'}), 401

    db               = get_db()
    data             = request.get_json()
    current_password = data.get('current_password', '')
    new_password     = data.get('new_password', '')

    if not current_password or not new_password:
        return jsonify({'error': 'all fields are required'}), 400

    if len(new_password) < 8:
        return jsonify({'error': 'password must be at least 8 characters'}), 400

    user = db.execute(
        'SELECT password_hash FROM users WHERE id = ?',
        (session['user_id'],),
    ).fetchone()

    if not user or not check_password_hash(user['password_hash'], current_password):
        return jsonify({'error': 'current password is incorrect'}), 401

    db.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        (generate_password_hash(new_password), session['user_id']),
    )
    db.commit()

    return jsonify({'success': True})