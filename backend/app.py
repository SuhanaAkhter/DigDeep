import sqlite3
import os
from flask import Flask, render_template
from db import close_db

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, '..', 'digdeep.db')

app = Flask(__name__, 
            template_folder='../frontend/html', 
            static_folder='../frontend',
            static_url_path='')

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

# Coach pages
@app.route('/coach-dashboard')
def coach_dashboard_page():
    return render_template('coach/coach-dashboard.html')

@app.route('/coach-permissions')
def coach_permissions_page():
    return render_template('shared/coach-permissions.html')

@app.route('/manage-games')
def manage_games_page():
    return render_template('coach/manage-games.html')

@app.route('/manage-players')
def manage_players_page():
    return render_template('coach/manage-players.html')

# Player pages
@app.route('/player-dashboard')
def player_dashboard_page():
    return render_template('player/player-dashboard.html')

@app.route('/player-permissions')
def player_permissions_page():
    return render_template('shared/player-permissions.html')

@app.route('/player-stats')
def player_stats_page():
    return render_template('player/player-stats.html')

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
    return render_template('shared/team-stats.html')

@app.route('/account-settings')
def account_settings_page():
    return render_template('shared/account-settings.html')

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