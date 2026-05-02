"""
db.py
=====
Database connection helper shared across the application.

Provides a per-request SQLite connection stored on Flask's application context
(``g``), so each HTTP request reuses a single connection rather than opening
a new one for every model call.

Usage::

    from db import get_db

    db = get_db()
    row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
"""

import sqlite3
import os

from flask import g

# Absolute path to the SQLite database file, located one directory above
# the backend package root.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, '..', 'digdeep.db')


def get_db() -> sqlite3.Connection:
    """Return the database connection for the current request.

    Opens a new ``sqlite3.Connection`` the first time it is called within a
    request, stores it on Flask's ``g`` object, and returns the same
    connection on subsequent calls within the same request.

    The connection is configured with:

    * ``row_factory = sqlite3.Row`` — rows behave like dicts, so columns can
      be accessed by name (e.g. ``row['email']``).
    * ``PRAGMA foreign_keys = ON`` — enforces referential integrity and
      enables cascading deletes defined in the schema.

    Returns
    -------
    sqlite3.Connection
        An open, request-scoped database connection.
    """
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(e: BaseException | None = None) -> None:
    """Close the database connection at the end of each request.

    Registered with ``app.teardown_appcontext`` in ``app.py`` so Flask calls
    it automatically after every request, whether or not an exception occurred.

    Parameters
    ----------
    e:
        The exception that triggered the teardown, if any.  Not used here but
        required by Flask's teardown interface.
    """
    db = g.pop('db', None)
    if db is not None:
        db.close()