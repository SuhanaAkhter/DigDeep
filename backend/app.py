import sqlite3
from flask import Flask, render_template
from db import close_db

DATABASE = '../digdeep.db'

# Use '../frontend' to jump out of 'backend' and into 'frontend'
app = Flask(__name__, 
            template_folder='../frontend/html', 
            static_folder='../frontend',
            static_url_path='')

def init_db():
    db = sqlite3.connect(DATABASE)
    db.execute("PRAGMA foreign_keys = ON")
    # Using 'database/schema.sql' assuming you run from the DIGDEEP root
    # or keep it as is if 'database' is truly one level up from app.py
    try:
        with open('../database/schema.sql') as f:
            db.executescript(f.read())
    except FileNotFoundError:
        with open('database/schema.sql') as f:
            db.executescript(f.read())
    db.commit()
    db.close()

@app.route('/team-stats')
def team_stats_page():
    # Since 'shared' is inside 'html', and html is the template_folder:
    return render_template('shared/team-stats.html')

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