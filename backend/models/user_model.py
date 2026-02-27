import sqlite3

class user():
    def __init__(self, username, password, ):
        cur.execute("""SELECT username FROM users""")
        result = cur.fetchone()
        
    def add_information(self):
        return
    
    
# we need players name grade position stats featured game picture
name, grade, picture (file), positions, featured game

class User:
    def __init__(self, user_id, username, email, role):
        """
        Initialize user attributes
        """
        self.user_id = user_id 
        self.username = username
        self.email = email
        self.role = role

class Player(User):
    def __init__(self, user_id, name, grade, picture, positions, featured_game):
        """
        Attributes:
        
        """ 
        super().__init__()
        self.name = name
        self.grade = grade
        self.picture = picture  # file path
        self.positions = positions  # list or comma-separated
    
    def update_info():
        cur.execute("""INSERT INTO players ('name', grade, picture, positions) VALUES (?,?,?,?)""", (self.name, self.grade, self.picture, self.positions))
    
    
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    
    grade TEXT,
    picture TEXT,
    positions TEXT,
    featured_game INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
);






# import sqlite3

DB_NAME = "users.db"

def get_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn
    
class User:
    def __init__(self, user_id, username, email, role):
        self.user_id = user_id
        self.username = username
        self.email = email
        self.role = role

    @staticmethod
    def get_by_username(username):
        conn = get_connection()
        user = conn.execute(
            "SELECT * FROM users WHERE username = ?",
            (username,)
        ).fetchone()
        conn.close()

        if user:
            return User(user["id"], user["username"], user["email"], user["role"])
        return None
        
class Player(User):
    def __init__(self, user_id, username, email, role,
                 name, grade, picture, positions, featured_game):

        super().__init__(user_id, username, email, role)

        self.name = name
        self.grade = grade
        self.picture = picture
        self.positions = positions
        self.featured_game = featured_game
        
    def save(self):
        conn = get_connection()
        conn.execute("""
            INSERT INTO players (user_id, name, grade, picture, positions, featured_game)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            self.user_id,
            self.name,
            self.grade,
            self.picture,
            self.positions,
            self.featured_game
        ))
        conn.commit()
        conn.close()
        
    def update_info(self, name=None, grade=None, picture=None,
                    positions=None, featured_game=None):

        if name:
            self.name = name
        if grade:
            self.grade = grade
        if picture:
            self.picture = picture
        if positions:
            self.positions = positions
        if featured_game:
            self.featured_game = featured_game

        conn = get_connection()
        conn.execute("""
            UPDATE players
            SET name=?, grade=?, picture=?, positions=?, featured_game=?
            WHERE user_id=?
        """, (
            self.name,
            self.grade,
            self.picture,
            self.positions,
            self.featured_game,
            self.user_id
        ))
        conn.commit()
        conn.close()
        
    @staticmethod
    def get_by_user_id(user_id):
        conn = get_connection()
        player = conn.execute("""
            SELECT u.id, u.username, u.email, u.role,
                   p.name, p.grade, p.picture, p.positions, p.featured_game
            FROM users u
            JOIN players p ON u.id = p.user_id
            WHERE u.id = ?
        """, (user_id,)).fetchone()
        conn.close()

        if player:
            return Player(
                player["id"],
                player["username"],
                player["email"],
                player["role"],
                player["name"],
                player["grade"],
                player["picture"],
                player["positions"],
                player["featured_game"]
            )
        return None
        
        
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    grade TEXT,
    picture TEXT,
    positions TEXT,
    featured_game INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

player = Player(
    user_id=1,
    username="jdoe",
    email="jdoe@email.com",
    role="player",
    name="John Doe",
    grade="11",
    picture="static/uploads/john.jpg",
    positions="Outside,Libero",
    featured_game=3
)

player.save()

# update

player.update_info(grade="12")

# load

player = Player.get_by_user_id(1)
print(player.name)
