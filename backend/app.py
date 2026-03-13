import sqlite3
from flask import Flask
from db import close_db

DATABASE = 'digdeep.db'

app = Flask(__name__, template_folder='../frontend/html', static_folder='../frontend')

def init_db():
    """
    Creates all tables from schema.sql if they do not already exist.
    Called once on app startup.
    """
    db = sqlite3.connect(DATABASE)
    db.execute("PRAGMA foreign_keys = ON")
    with open('../database/schema.sql') as f:
        db.executescript(f.read())
    db.commit()
    db.close()

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