"""
app.py
======
Application factory and top-level route definitions for the Dig Deep
volleyball stats platform.

Responsibilities
----------------
* Creates and configures the Flask application instance.
* Configures Flask-Mail for outbound SMTP (password reset emails).
* Registers all API Blueprints (auth, players, games, stats).
* Defines page-level routes that render Jinja2 HTML templates.
* Provides route guards (``require_login``, ``require_coach``,
  ``require_player``) that enforce session-based access control.
* Exposes a context processor that injects the current user's profile
  picture URL into every template automatically.
* Provides ``init_db()`` to create the database schema on first run.

Configuration notes
-------------------
* ``app.secret_key`` must be replaced with a strong random value before
  deploying to production.
* Mail credentials should be moved to environment variables rather than
  being hardcoded.
"""

import os
import sqlite3

from flask import Flask, redirect, render_template, session, url_for
from flask_mail import Mail

from db import close_db

# ---------------------------------------------------------------------------
# Path constants
# ---------------------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, '..', 'digdeep.db')

# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = Flask(
    __name__,
    template_folder='../frontend/html',
    static_folder='../frontend',
    static_url_path='',
)

app.secret_key = 'dev-secret-key'
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# Flask-Mail configuration for Gmail SMTP
app.config['MAIL_SERVER']   = 'smtp.gmail.com'
app.config['MAIL_PORT']     = 587
app.config['MAIL_USE_TLS']  = True
app.config['MAIL_USERNAME'] = 'digdeep.noreply@gmail.com'
app.config['MAIL_PASSWORD'] = 'ecgc ettz zwmb mkkj'
app.config['MAIL_TIMEOUT']  = 5

mail = Mail(app)

# Register the auth blueprint early so login routes are available during
# template rendering triggered by other blueprints.
from routes.auth_routes import auth_bp  # noqa: E402
app.register_blueprint(auth_bp)


# ---------------------------------------------------------------------------
# Context processor
# ---------------------------------------------------------------------------

@app.context_processor
def inject_user() -> dict:
    """Inject ``current_user_picture`` into every template's context.

    Looks up the logged-in user's profile picture URL so that the shared
    navigation component can display it without each route needing to pass
    the value explicitly.

    Returns
    -------
    dict
        ``{"current_user_picture": str | None}``
    """
    picture = None
    if 'user_id' in session:
        from db import get_db
        try:
            db   = get_db()
            role = session.get('role')
            if role == 'player':
                from models.player_model import get_player_by_user_id
                player = get_player_by_user_id(db, session['user_id'])
                if player:
                    picture = player.get('picture')
            elif role == 'coach':
                row = db.execute(
                    'SELECT picture FROM users WHERE id = ?',
                    (session['user_id'],),
                ).fetchone()
                if row:
                    picture = row['picture']
        except Exception:
            pass
    return {'current_user_picture': picture}


# ---------------------------------------------------------------------------
# Database initialisation
# ---------------------------------------------------------------------------

def init_db() -> None:
    """Create the database schema from ``schema.sql`` if it does not exist.

    Tries two possible locations for the schema file to accommodate both
    development (run from the project root) and production layouts.
    """
    db = sqlite3.connect(DATABASE)
    db.execute("PRAGMA foreign_keys = ON")
    try:
        with open('../database/schema.sql') as f:
            db.executescript(f.read())
    except FileNotFoundError:
        with open('database/schema.sql') as f:
            db.executescript(f.read())
    db.commit()
    db.close()


# ---------------------------------------------------------------------------
# Route guards
# ---------------------------------------------------------------------------

def require_login():
    """Redirect unauthenticated visitors to the login page.

    Returns
    -------
    werkzeug.wrappers.Response or None
        A redirect response if the user is not logged in, otherwise
        ``None`` (allowing the calling route to proceed).
    """
    if 'user_id' not in session:
        return redirect(url_for('login_page'))


def require_coach():
    """Restrict access to coach accounts.

    Redirects unauthenticated users to the login page and non-coach users
    to the player dashboard.

    Returns
    -------
    werkzeug.wrappers.Response or None
        A redirect response when access is denied, otherwise ``None``.
    """
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    if session.get('role') != 'coach':
        return redirect(url_for('player_dashboard_page'))


def require_player():
    """Restrict access to player accounts.

    Redirects unauthenticated users to the login page and non-player users
    to the coach dashboard.

    Returns
    -------
    werkzeug.wrappers.Response or None
        A redirect response when access is denied, otherwise ``None``.
    """
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    if session.get('role') != 'player':
        return redirect(url_for('coach_dashboard_page'))


# ---------------------------------------------------------------------------
# Coach-only page routes
# ---------------------------------------------------------------------------

@app.route('/coach-dashboard')
def coach_dashboard_page():
    """Render the coach dashboard with recent games.

    Redirects to the login page when unauthenticated, or to the player
    dashboard when the user is not a coach.
    """
    guard = require_coach()
    if guard:
        return guard

    from db import get_db
    from models.game_model import get_all_games

    db         = get_db()
    games      = get_all_games(db, team_id=1)
    coach_name = session.get('coach_name') or session.get('email', 'coach').split('@')[0]
    return render_template(
        'coach/coach-dashboard.html',
        role=session.get('role'),
        coach_name=coach_name,
        games=games,
    )


@app.route('/manage-games')
def manage_games_page():
    """Render the manage-games page (coach only)."""
    guard = require_coach()
    if guard:
        return guard
    return render_template('coach/manage-games.html', role=session.get('role'))


@app.route('/manage-players')
def manage_players_page():
    """Render the manage-players page (coach only)."""
    guard = require_coach()
    if guard:
        return guard
    return render_template('coach/manage-players.html', role=session.get('role'))


# ---------------------------------------------------------------------------
# Player-only page routes
# ---------------------------------------------------------------------------

@app.route('/player-dashboard')
def player_dashboard_page():
    """Render the player dashboard with the player's own profile and game list.

    Redirects when unauthenticated or when the user is not a player.
    """
    guard = require_player()
    if guard:
        return guard

    from db import get_db
    from models.game_model import get_all_games
    from models.player_model import get_player_by_user_id

    db     = get_db()
    player = get_player_by_user_id(db, session.get('user_id'))
    games  = get_all_games(db, team_id=1)
    return render_template(
        'player/player-dashboard.html',
        role=session.get('role'),
        player=player,
        games=games,
    )


@app.route('/player-stats')
def player_stats_page():
    """Render the player stats page with season totals and game history.

    Also computes the player's best game (by kills) for the highlights
    section.  Redirects when unauthenticated or when the user is not a
    player.
    """
    guard = require_player()
    if guard:
        return guard

    from db import get_db
    from models.player_model import get_player_by_user_id
    from models.stats_model import get_season_totals_for_player, get_stats_for_player

    db        = get_db()
    player    = get_player_by_user_id(db, session.get('user_id'))
    totals    = get_season_totals_for_player(db, player['id']) if player else {}
    game_rows = get_stats_for_player(db, player['id'])        if player else []
    best_game = (
        max(game_rows, key=lambda r: r['kills'], default=None)
        if game_rows else None
    )
    return render_template(
        'player/player-stats.html',
        role=session.get('role'),
        player=player,
        totals=totals,
        best_game=best_game,
    )


# ---------------------------------------------------------------------------
# Shared page routes (login required, any role)
# ---------------------------------------------------------------------------

@app.route('/permissions')
def permissions_page():
    """Render the permissions settings page.

    Coaches see the coach-specific template; players see their own view.
    Redirects to the login page when unauthenticated.
    """
    guard = require_login()
    if guard:
        return guard

    role = session.get('role')
    if role == 'coach':
        return render_template('coach/coach-permissions.html', role=role)
    return render_template('player/player-permissions.html', role=role)


@app.route('/team-stats')
def team_stats_page():
    """Render the team statistics page (any authenticated user)."""
    guard = require_login()
    if guard:
        return guard
    return render_template('shared/team-stats.html', role=session.get('role'))


@app.route('/account-settings')
def account_settings_page():
    """Render the account settings page (any authenticated user)."""
    guard = require_login()
    if guard:
        return guard
    return render_template('shared/account-settings.html', role=session.get('role'))


# ---------------------------------------------------------------------------
# Public page routes
# ---------------------------------------------------------------------------

@app.route('/')
@app.route('/index')
def index_page():
    """Render the public-facing landing page."""
    return render_template('shared/index.html')


@app.route('/login')
def login_page():
    """Render the login page."""
    return render_template('shared/login.html')


@app.route('/signup')
def signup_page():
    """Render the signup page."""
    return render_template('shared/signup.html')


@app.route('/reset-password')
def reset_password_page():
    """Render the password reset page."""
    return render_template('shared/reset-password.html')


# ---------------------------------------------------------------------------
# Teardown and blueprint registration
# ---------------------------------------------------------------------------

app.teardown_appcontext(close_db)

from routes.game_routes   import game_bp    # noqa: E402
from routes.player_routes import me_bp, player_bp  # noqa: E402
from routes.stats_routes  import stats_bp   # noqa: E402

app.register_blueprint(player_bp)
app.register_blueprint(me_bp)
app.register_blueprint(game_bp)
app.register_blueprint(stats_bp)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    init_db()
    app.run(debug=True)