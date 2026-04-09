import sqlite3
import os
from flask import Flask, render_template, session
from db import close_db
from flask import redirect, url_for

from routes.auth_routes import auth_bp
from flask_mail import Mail

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, '..', 'digdeep.db')


app = Flask(__name__, 
            template_folder='../frontend/html', 
            static_folder='../frontend',
            static_url_path='')

app.secret_key = 'dev-secret-key'  # change this before going to production
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # disable static file caching in dev

app.register_blueprint(auth_bp)
app.config['MAIL_TIMEOUT'] = 5

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

app.config['MAIL_SERVER']   = 'smtp.gmail.com'
app.config['MAIL_PORT']     = 587
app.config['MAIL_USE_TLS']  = True
app.config['MAIL_USERNAME'] = 'digdeep.noreply@gmail.com'
app.config['MAIL_PASSWORD'] = 'ecgc ettz zwmb mkkj'

mail = Mail(app)

# Coach pages
@app.route('/coach-dashboard')
def coach_dashboard_page():
    return render_template('coach/coach-dashboard.html', role=session.get('role', 'coach'))

@app.route('/permissions')
def permissions_page():
    role = session.get('role', 'player')
    if role == 'coach':
        return render_template('coach/coach-permissions.html', role=role)
    else:
        return render_template('player/player-permissions.html', role=role)

@app.route('/reset-password')
def reset_password_page():
    return render_template('shared/reset-password.html')

@app.route('/manage-games')
def manage_games_page():
    return render_template('coach/manage-games.html', role=session.get('role', 'coach'))

@app.route('/manage-players')
def manage_players_page():
    return render_template('coach/manage-players.html', role=session.get('role', 'coach'))

# Player pages
@app.route('/player-dashboard')
def player_dashboard_page():
    return render_template('player/player-dashboard.html', role=session.get('role', 'player'))

@app.route('/player-stats')
def player_stats_page():
    return render_template('player/player-stats.html', role=session.get('role', 'player'))

# Shared pages
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

@app.route('/team-stats')
def team_stats_page():
    return render_template('shared/team-stats.html', role=session.get('role', 'player'))

@app.route('/account-settings')
def account_settings_page():
    return render_template('shared/account-settings.html', role=session.get('role', 'player'))

app.teardown_appcontext(close_db)

from routes.player_routes import player_bp
from routes.game_routes import game_bp
from routes.stats_routes import stats_bp

app.register_blueprint(player_bp)
app.register_blueprint(game_bp)
app.register_blueprint(stats_bp)

if __name__ == '__main__':
    init_db()
    app.run(debug=True)