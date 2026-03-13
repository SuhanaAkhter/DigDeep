-- Development seed data for DigDeep.
-- Run this after schema.sql to populate the database with test records.
-- Passwords are placeholder hashes. Replace before any real deployment.

INSERT OR IGNORE INTO users (id, email, password_hash, role) VALUES
    (1, 'coach@digdeep.com', 'placeholder_hash', 'coach'),
    (2, 'linda@digdeep.com', 'placeholder_hash', 'player'),
    (3, 'suhana@digdeep.com', 'placeholder_hash', 'player'),
    (4, 'reyhan@digdeep.com', 'placeholder_hash', 'player'),
    (5, 'nancy@digdeep.com', 'placeholder_hash', 'player'),
    (6, 'bernice@digdeep.com', 'placeholder_hash', 'player');

INSERT OR IGNORE INTO teams (id, team_name, season) VALUES
    (1, 'MHS Varsity', '2024-2025');

INSERT OR IGNORE INTO players (id, user_id, team_id, name, grade, jersey_number, position) VALUES
    (1, 2, 1, 'Linda',   '12', 7,  'Middle'),
    (2, 3, 1, 'Suhana',  '11', 12, 'Setter'),
    (3, 4, 1, 'Reyhan',  '11', 4,  'Libero'),
    (4, 5, 1, 'Nancy',   '12', 9,  'Outside'),
    (5, 6, 1, 'Bernice', '10', 3,  'Opposite');

INSERT OR IGNORE INTO games (id, team_id, opponent, game_date, season) VALUES
    (1, 1, 'De la Salle', '2025-02-10', '2024-2025'),
    (2, 1, 'LDH',         '2025-02-18', '2024-2025'),
    (3, 1, 'St. Mikes',   '2025-03-01', '2024-2025');

INSERT OR IGNORE INTO player_stats (game_id, player_id, kills, assists, aces, blocks, digs) VALUES
    (1, 1, 8,  2, 3, 4, 5),
    (1, 2, 2,  14, 1, 0, 3),
    (1, 3, 0,  1,  2, 0, 12),
    (1, 4, 10, 3,  2, 2, 4),
    (1, 5, 7,  1,  1, 3, 2),
    (2, 1, 5,  1,  2, 3, 6),
    (2, 2, 1,  11, 3, 0, 4),
    (2, 3, 0,  2,  1, 0, 15),
    (2, 4, 12, 2,  4, 1, 3),
    (2, 5, 9,  0,  2, 4, 1),
    (3, 1, 6,  3,  1, 5, 4),
    (3, 2, 3,  13, 2, 0, 2),
    (3, 3, 0,  1,  3, 0, 11),
    (3, 4, 8,  4,  1, 3, 5),
    (3, 5, 11, 2,  3, 2, 3);