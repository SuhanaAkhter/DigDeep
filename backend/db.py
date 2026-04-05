"""
db.py
Database connection helper shared across the app.
Imported by app.py and all route files to avoid circular imports.
"""

import sqlite3
import os
from flask import g

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, '..', 'digdeep.db')

def get_db():
    """
    Opens a database connection scoped to the current request.
    Stores the connection on Flask's g object so it is reused within the same request.
    """
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db

def close_db(e=None):
    """Closes the database connection at the end of each request."""
    db = g.pop('db', None)
    if db is not None:
        db.close()