import sqlite3
import os
from flask import Flask, render_template, session, redirect, url_for
from db import close_db
from routes.auth_routes import auth_bp
from flask_mail import Mail

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, '..', 'digdeep.db')

app = Flask(__name__,
            template_folder='../frontend/html',
            static_folder='../frontend',
            static_url_path='')

app.secret_key = 'dev-secret-key'  # change before production
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

app.config['MAIL_SERVER']   = 'smtp.gmail.com'
app.config['MAIL_PORT']     = 587
app.config['MAIL_USE_TLS']  = True
app.config['MAIL_USERNAME'] = 'digdeep.noreply@gmail.com'
app.config['MAIL_PASSWORD'] = 'ecgc ettz zwmb mkkj'
app.config['MAIL_TIMEOUT']  = 5

mail = Mail(app)

app.register_blueprint(auth_bp)

# ── context processor ───────────────────────────────────────────────────────
@app.context_processor
def inject_user():
    """Makes current_user_picture available in every template automatically."""
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
                    'SELECT picture FROM users WHERE id = ?', (session['user_id'],)
                ).fetchone()
                if row:
                    picture = row['picture']
        except Exception:
            pass
    return {'current_user_picture': picture}

# ── db init ─────────────────────────────────────────────────────────────────
def init_db():
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

# ── route guards ────────────────────────────────────────────────────────────
def require_login():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))

def require_coach():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    if session.get('role') != 'coach':
        return redirect(url_for('player_dashboard_page'))

def require_player():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    if session.get('role') != 'player':
        return redirect(url_for('coach_dashboard_page'))

# ── coach-only pages ────────────────────────────────────────────────────────
@app.route('/coach-dashboard')
def coach_dashboard_page():
    guard = require_coach()
    if guard: return guard
    from db import get_db
    from models.game_model import get_all_games
    db    = get_db()
    games = get_all_games(db, team_id=1)
    coach_name = session.get('coach_name') or session.get('email', 'coach').split('@')[0]
    return render_template('coach/coach-dashboard.html',
                           role=session.get('role'),
                           coach_name=coach_name,
                           games=games)

@app.route('/manage-games')
def manage_games_page():
    guard = require_coach()
    if guard: return guard
    return render_template('coach/manage-games.html', role=session.get('role'))

@app.route('/manage-players')
def manage_players_page():
    guard = require_coach()
    if guard: return guard
    return render_template('coach/manage-players.html', role=session.get('role'))

# ── player-only pages ───────────────────────────────────────────────────────
@app.route('/player-dashboard')
def player_dashboard_page():
    guard = require_player()
    if guard: return guard
    from db import get_db
    from models.player_model import get_player_by_user_id
    from models.game_model import get_all_games
    db     = get_db()
    player = get_player_by_user_id(db, session.get('user_id'))
    games  = get_all_games(db, team_id=1)
    return render_template('player/player-dashboard.html',
                           role=session.get('role'),
                           player=player,
                           games=games)

@app.route('/player-stats')
def player_stats_page():
    guard = require_player()
    if guard: return guard
    from db import get_db
    from models.player_model import get_player_by_user_id
    from models.stats_model import get_season_totals_for_player, get_stats_for_player
    db        = get_db()
    player    = get_player_by_user_id(db, session.get('user_id'))
    totals    = get_season_totals_for_player(db, player['id']) if player else {}
    game_rows = get_stats_for_player(db, player['id']) if player else []
    best_game = max(game_rows, key=lambda r: r['kills'], default=None) if game_rows else None
    return render_template('player/player-stats.html',
                           role=session.get('role'),
                           player=player,
                           totals=totals,
                           best_game=best_game)

# ── shared pages (login required) ───────────────────────────────────────────
@app.route('/permissions')
def permissions_page():
    guard = require_login()
    if guard: return guard
    role = session.get('role')
    if role == 'coach':
        return render_template('coach/coach-permissions.html', role=role)
    return render_template('player/player-permissions.html', role=role)

@app.route('/team-stats')
def team_stats_page():
    guard = require_login()
    if guard: return guard
    return render_template('shared/team-stats.html', role=session.get('role'))

@app.route('/account-settings')
def account_settings_page():
    guard = require_login()
    if guard: return guard
    return render_template('shared/account-settings.html', role=session.get('role'))

# ── public pages ─────────────────────────────────────────────────────────────
@app.route('/')
@app.route('/index')
def index_page():
    return render_template('shared/index.html')

@app.route('/login')
def login_page():
    return render_template('shared/login.html')

@app.route('/signup')
def signup_page():
    return render_template('shared/signup.html')

@app.route('/reset-password')
def reset_password_page():
    return render_template('shared/reset-password.html')

# ── teardown & blueprints ────────────────────────────────────────────────────
app.teardown_appcontext(close_db)

from routes.player_routes import player_bp, me_bp
from routes.game_routes import game_bp
from routes.stats_routes import stats_bp

app.register_blueprint(player_bp)
app.register_blueprint(me_bp)
app.register_blueprint(game_bp)
app.register_blueprint(stats_bp)

if __name__ == '__main__':
    init_db()
    app.run(debug=True)