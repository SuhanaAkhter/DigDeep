"""
stats_routes.py
API endpoints for reading and writing player stats.
"""

from flask import Blueprint, jsonify, request, session
from db import get_db
from models.stats_model import (
    get_stats_for_game,
    get_stats_for_player,
    get_season_totals_for_player,
    get_season_totals_for_team,
    save_stats,
    delete_stats
)

stats_bp = Blueprint('stats', __name__, url_prefix='/api/stats')

TEAM_ID = 1


@stats_bp.route('/game/<int:game_id>', methods=['GET'])
def stats_for_game(game_id):
    db = get_db()
    return jsonify(get_stats_for_game(db, game_id))


@stats_bp.route('/player/<int:player_id>', methods=['GET'])
def stats_for_player(player_id):
    db = get_db()
    return jsonify(get_stats_for_player(db, player_id))


@stats_bp.route('/player/<int:player_id>/totals', methods=['GET'])
def player_totals(player_id):
    db = get_db()
    return jsonify(get_season_totals_for_player(db, player_id))


@stats_bp.route('/team/totals', methods=['GET'])
def team_totals():
    db = get_db()
    return jsonify(get_season_totals_for_team(db, TEAM_ID))


@stats_bp.route('/game/<int:game_id>/player/<int:player_id>', methods=['POST'])
def submit_stats(game_id, player_id):
    db   = get_db()
    data = request.get_json()
    save_stats(db, game_id, player_id,
               kills=data.get('kills', 0),
               assists=data.get('assists', 0),
               aces=data.get('aces', 0),
               blocks=data.get('blocks', 0),
               digs=data.get('digs', 0))
    return jsonify({'success': True})


@stats_bp.route('/game/<int:game_id>/player/<int:player_id>', methods=['DELETE'])
def remove_stats(game_id, player_id):
    db = get_db()
    delete_stats(db, game_id, player_id)
    return jsonify({'success': True})


# ── SET SCORES ──────────────────────────────────────────────────────────────

@stats_bp.route('/game/<int:game_id>/sets', methods=['GET'])
def get_set_scores(game_id):
    db   = get_db()
    rows = db.execute(
        'SELECT set_number, mhs_score, opp_score FROM set_scores WHERE game_id = ? ORDER BY set_number',
        (game_id,)
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@stats_bp.route('/game/<int:game_id>/sets/<int:set_number>', methods=['POST'])
def save_set_score(game_id, set_number):
    db   = get_db()
    data = request.get_json()
    mhs  = int(data.get('mhs_score', 0))
    opp  = int(data.get('opp_score', 0))
    db.execute(
        'INSERT OR REPLACE INTO set_scores (game_id, set_number, mhs_score, opp_score) VALUES (?, ?, ?, ?)',
        (game_id, set_number, mhs, opp)
    )
    db.commit()
    return jsonify({'success': True})


# ── PERMISSIONS ─────────────────────────────────────────────────────────────

@stats_bp.route('/permissions', methods=['GET'])
def get_permissions():
    db  = get_db()
    row = db.execute('SELECT allow_players_view_stats FROM permissions WHERE id = 1').fetchone()
    if not row:
        return jsonify({'allow_players_view_stats': True})
    return jsonify({'allow_players_view_stats': bool(row['allow_players_view_stats'])})


@stats_bp.route('/permissions', methods=['POST'])
def save_permissions():
    if session.get('role') != 'coach':
        return jsonify({'error': 'unauthorized'}), 403
    db   = get_db()
    data = request.get_json()
    val  = 1 if data.get('allow_players_view_stats') else 0
    db.execute(
        'INSERT OR REPLACE INTO permissions (id, allow_players_view_stats) VALUES (1, ?)', (val,)
    )
    db.commit()
    return jsonify({'success': True})