import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLeaderboard, type Profile } from '../lib/profileService';

export const Leaderboard = () => {
    const [players, setPlayers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getLeaderboard(50).then(data => {
            setPlayers(data);
            setLoading(false);
        });
    }, []);

    return (
        <div className="leaderboard-page">
            <div className="leaderboard-container">
                <h1 className="leaderboard-title">
                    <span className="leaderboard-icon">🏆</span>
                    Leaderboard
                </h1>

                {loading ? (
                    <div className="leaderboard-loading">
                        <div className="spinner"></div>
                        Loading rankings...
                    </div>
                ) : players.length === 0 ? (
                    <div className="leaderboard-empty">
                        <p>No ranked players yet.</p>
                        <p style={{ color: '#888', fontSize: '0.9rem' }}>
                            Sign up and win a game to appear here!
                        </p>
                    </div>
                ) : (
                    <div className="leaderboard-table-wrapper">
                        <table className="leaderboard-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Player</th>
                                    <th>Wins</th>
                                    <th>Played</th>
                                    <th>Win Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {players.map((p, i) => {
                                    const winRate = p.games_played > 0
                                        ? Math.round((p.games_won / p.games_played) * 100)
                                        : 0;
                                    const rankClass = i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : '';

                                    return (
                                        <tr key={p.id} className={rankClass}>
                                            <td className="rank-cell">
                                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                            </td>
                                            <td className="name-cell">{p.display_name}</td>
                                            <td className="wins-cell">{p.games_won}</td>
                                            <td>{p.games_played}</td>
                                            <td className="rate-cell">{winRate}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="leaderboard-footer">
                    <Link to="/" className="btn-back">
                        ← Back to Lobby
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
