# DigDeep

DigDeep is a web application designed for volleyball coaches and players to track and analyze team and individual performance statistics. Coaches can manage player rosters, record game details, and input statistics for each match, while players can view their personal performance data. The platform supports detailed stats tracking including per-game and per-set scores, enabling data-driven insights for team improvement.

## Features

- **User Authentication**: Secure login system with role-based access (Coach and Player roles).
- **Player Management**: Coaches can add, edit, and manage player profiles including names, grades, jersey numbers, positions, and profile pictures.
- **Game Management**: Coaches can create and manage game records, including opponent, date, and season information.
- **Statistics Tracking**: Detailed per-player stats for each game, including set scores and performance metrics.
- **Dashboard Views**:
  - Coach Dashboard: Overview of team stats, player management, and game records.
  - Player Dashboard: Personal stats and performance history.
- **Team Statistics**: Aggregate views of team performance across games and seasons.
- **Account Settings**: Users can update profiles, change passwords, and upload pictures.
- **Permissions System**: Role-based access control to ensure coaches have full access and players have limited views.

## Installation

To run DigDeep locally, ensure you have Python 3.x installed. The application uses Flask for the backend and SQLite for the database.

### Prerequisites
- Python 3.x
- pip (Python package installer)

### Dependencies
Install the required Python packages using pip:

```
pip install flask flask-mail
```

SQLite3 is included with Python, so no additional installation is needed.

### Setup
1. Clone or download the project repository.
2. Navigate to the `backend` directory.
3. Set up the database:
   ```
   sqlite3 ../digdeep.db < ../database/schema.sql
   sqlite3 ../digdeep.db < ../database/seed.sql
   ```
4. Run the application:
   ```
   python app.py
   ```
   Or using Flask CLI:
   ```
   export FLASK_APP=app.py
   flask run
   ```

The application will start on `http://localhost:5000` by default.

### Configuration
- Update `app.secret_key` in `app.py` with a strong random value for production.
- Configure email settings in `app.py` for password reset functionality (move to environment variables for security).

## Known Bugs

- No known bugs at this time. If you encounter any issues, please report them to the support team.

## Support

For support or questions, contact the developers:

- Suhana A. - sakht2@ocdsb.ca
- Linda Q. - lqi2@ocdsb.ca
- Reyhan C. - rcapa2@ocdsb.ca

## Sources

# Backend Framework

Pallets Projects. (2010). Flask: Web development, one drop at a time (Version 3.1.x) [Software documentation]. https://flask.palletsprojects.com/en/stable/
Pallets Projects. (2010). Flask API reference (Version 3.1.x) [Software documentation]. https://flask.palletsprojects.com/en/stable/api/
Pallets Projects. (2010). Flask blueprints and views (Version 3.1.x) [Software documentation]. https://flask.palletsprojects.com/en/stable/tutorial/views/
Pallets Projects. (2010). Flask configuration handling (Version 3.1.x) [Software documentation]. https://flask.palletsprojects.com/en/stable/config/

# Security

Pallets Projects. (2010). Werkzeug utilities: Security helpers (Version 3.1.x) [Software documentation]. https://werkzeug.palletsprojects.com/en/stable/utils/
Python Software Foundation. (2012). hmac — Keyed-hashing for message authentication (Python 3.x) [Software documentation]. https://docs.python.org/3/library/hmac.html
Python Software Foundation. (2003). secrets — Generate secure random numbers for managing secrets (Python 3.x) [Software documentation]. https://docs.python.org/3/library/secrets.html

# Database

D. Richard Hipp. (2000). SQLite home page [Software]. https://sqlite.org/
D. Richard Hipp. (2000). SQLite documentation [Software documentation]. https://sqlite.org/docs.html
D. Richard Hipp. (2000). SQL as understood by SQLite [Software documentation]. https://sqlite.org/lang.html
D. Richard Hipp. (2000). SQLite foreign key support [Software documentation]. https://sqlite.org/foreignkeys.html
Python Software Foundation. (2004). sqlite3 — DB-API 2.0 interface for SQLite databases (Python 3.x) [Software documentation]. https://docs.python.org/3/library/sqlite3.html

# Email

Pallets Community Ecosystem. (n.d.). Flask-Mail: SMTP mail sending for Flask applications (Version 0.10.0) [Software documentation]. https://github.com/pallets-eco/flask-mail
Pallets Community Ecosystem. (n.d.). Flask-Mail (Version 0.10.0) [Software package]. PyPI. https://pypi.org/project/Flask-Mail/

# File Handling

Pallets Projects. (2010). Werkzeug utilities: secure_filename (Version 3.1.x) [Software documentation]. https://werkzeug.palletsprojects.com/en/stable/utils/#werkzeug.utils.secure_filename


- Flask Documentation: Used for building the web application framework.
- SQLite Documentation: Used for database schema design and queries.
- Werkzeug Security: Used for password hashing.
- Volleyball Statistics References: General knowledge of volleyball stats for feature design.
