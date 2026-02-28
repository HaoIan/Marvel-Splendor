import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    getProfile,
    updateDisplayName,
    uploadAvatar,
    getAvatarUrl,
    getMatchHistory,
    type Profile,
    type MatchHistoryEntry
} from '../lib/profileService';

interface ProfilePageProps {
    onSignOut?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onSignOut }) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [matches, setMatches] = useState<MatchHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    // Edit Name state
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState("");
    const [isSavingName, setIsSavingName] = useState(false);

    // Avatar state
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let isMounted = true;

        const loadProfileData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                if (isMounted) setLoading(false);
                return;
            }

            const uid = session.user.id;
            if (isMounted) setUserId(uid);

            const [userProfile, userMatches] = await Promise.all([
                getProfile(uid),
                getMatchHistory(uid, 50)
            ]);

            if (isMounted) {
                setProfile(userProfile);
                if (userProfile) setEditNameValue(userProfile.display_name);
                setMatches(userMatches);
                setLoading(false);
            }
        };

        loadProfileData();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleSaveName = async () => {
        if (!userId || !editNameValue.trim() || editNameValue === profile?.display_name) {
            setIsEditingName(false);
            return;
        }

        setIsSavingName(true);
        const updatedProfile = await updateDisplayName(userId, editNameValue.trim());
        if (updatedProfile) {
            setProfile(updatedProfile);
        }
        setIsSavingName(false);
        setIsEditingName(false);
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userId) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB
            alert('Image must be less than 2MB');
            return;
        }

        setIsUploadingAvatar(true);
        const newAvatarUrl = await uploadAvatar(userId, file);
        if (newAvatarUrl && profile) {
            setProfile({ ...profile, avatar_url: newAvatarUrl });
        }
        setIsUploadingAvatar(false);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (loading) {
        return (
            <div className="profile-page">
                <div className="profile-container" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
                    Loading profile...
                </div>
            </div>
        );
    }

    if (!profile || !userId) {
        return (
            <div className="profile-page">
                <div className="profile-container" style={{ textAlign: 'center' }}>
                    <h2>Please Log In</h2>
                    <p style={{ color: '#888', marginBottom: '2rem' }}>You need an account to view your profile.</p>
                    <Link to="/" className="btn-primary" style={{ textDecoration: 'none' }}>Go to Login</Link>
                </div>
            </div>
        );
    }

    const winRate = profile.games_played > 0
        ? Math.round((profile.games_won / profile.games_played) * 100)
        : 0;

    const memberSince = new Date(profile.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const avatarUrl = getAvatarUrl(profile);

    return (
        <div className="profile-page">
            <div className="profile-container glass-panel">

                <div className="profile-top-section">
                    {/* AVATAR UPLOAD */}
                    <div className="profile-avatar-section">
                        <div
                            className={`profile-avatar-wrapper ${isUploadingAvatar ? 'uploading' : ''}`}
                            onClick={handleAvatarClick}
                            title="Click to change profile picture"
                        >
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={profile.display_name} className="profile-avatar-img" />
                            ) : (
                                <div className="profile-avatar-placeholder">
                                    {profile.display_name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="profile-avatar-overlay">
                                <span>{isUploadingAvatar ? 'Uploading...' : 'Change'}</span>
                            </div>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden-file-input"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* DISPLAY NAME EDITING */}
                    <div className="profile-name-section">
                        <div className="profile-label">Display Name</div>
                        {isEditingName ? (
                            <div className="profile-name-edit">
                                <input
                                    type="text"
                                    value={editNameValue}
                                    onChange={(e) => setEditNameValue(e.target.value)}
                                    className="auth-input"
                                    style={{ margin: 0, fontSize: '1.2rem', padding: '8px 12px' }}
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveName();
                                        if (e.key === 'Escape') setIsEditingName(false);
                                    }}
                                    disabled={isSavingName}
                                />
                                <div className="profile-edit-actions">
                                    <button
                                        className="btn-primary"
                                        style={{ padding: '8px 16px' }}
                                        onClick={handleSaveName}
                                        disabled={isSavingName}
                                    >
                                        Save
                                    </button>
                                    <button
                                        className="btn-welcome secondary"
                                        style={{ padding: '8px 16px' }}
                                        onClick={() => {
                                            setEditNameValue(profile.display_name);
                                            setIsEditingName(false);
                                        }}
                                        disabled={isSavingName}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="profile-name-display">
                                <h2 style={{ margin: 0, fontSize: '2rem' }}>{profile.display_name}</h2>
                                <button
                                    className="btn-auth-action"
                                    onClick={() => setIsEditingName(true)}
                                >
                                    ✎ Edit
                                </button>
                            </div>
                        )}
                        <div className="profile-member-since">{memberSince} joined</div>
                    </div>
                </div>

                {/* STATS SUMMARY */}
                <div className="profile-stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{profile.games_played}</div>
                        <div className="stat-label">Games Played</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value" style={{ color: 'var(--marvel-green)' }}>{profile.games_won}</div>
                        <div className="stat-label">Victories</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value" style={{ color: 'var(--marvel-blue)' }}>{winRate}%</div>
                        <div className="stat-label">Win Rate</div>
                    </div>
                </div>

                {/* MATCH HISTORY */}
                <div className="profile-history-section">
                    <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '15px' }}>
                        Recent Matches
                    </h3>

                    {matches.length === 0 ? (
                        <div className="leaderboard-empty" style={{ padding: '2rem 0' }}>
                            <p>No matches played yet.</p>
                        </div>
                    ) : (
                        <div className="match-history-list">
                            {matches.map(match => {
                                const myData = match.players.find(p => p.id === userId);
                                const isWinner = match.winner_name.includes(profile.display_name);
                                const date = new Date(match.finished_at).toLocaleDateString();

                                return (
                                    <div key={match.id} className="match-history-card">
                                        <div className="match-history-header">
                                            <span className={`match-result-badge ${isWinner ? 'win' : 'loss'}`}>
                                                {isWinner ? 'VICTORY' : 'DEFEAT'}
                                            </span>
                                            <span className="match-date">{date}</span>
                                        </div>
                                        <div className="match-history-body">
                                            <div className="match-history-stat">
                                                <span className="label">Points</span>
                                                <span className="value">{myData?.points || 0}</span>
                                            </div>
                                            <div className="match-history-stat">
                                                <span className="label">Turns</span>
                                                <span className="value">{match.total_turns}</span>
                                            </div>
                                            <div className="match-history-stat">
                                                <span className="label">Cards</span>
                                                <span className="value">{myData?.cards || 0}</span>
                                            </div>
                                        </div>
                                        <div className="match-history-players">
                                            <span className="label">Players: </span>
                                            {match.players.map(p => p.name).join(', ')}
                                            {!isWinner && (
                                                <span className="match-winner-note">
                                                    {' '}(Winner: {match.winner_name})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="profile-footer" style={{ marginTop: '2rem', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <Link to="/" className="btn-back">
                        ← Back
                    </Link>
                    {onSignOut && (
                        <button className="btn-back btn-signout" onClick={onSignOut}>
                            Sign Out
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
