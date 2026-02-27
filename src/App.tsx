import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { supabase, signInAnonymously, signUpWithEmail, signInWithEmail, signOutUser, linkAnonymousToEmail, isAnonymousUser, signInWithGoogle } from './lib/supabase';
import { getProfile, type Profile } from './lib/profileService';
import './App.css';
import { useGameEngine } from './hooks/useGameEngine';
import { GameBoard } from './components/GameBoard';
import { Leaderboard } from './components/Leaderboard';

function App() {
	// Identity logic
	const [playerUUID, setPlayerUUID] = useState('');
	const initializingRef = useRef(false);

	useEffect(() => {
		if (initializingRef.current) return;
		initializingRef.current = true;

		supabase.auth.getSession().then(({ data: { session } }) => {
			if (session) {
				console.log("Existing session found:", session.user.id);
				setPlayerUUID(session.user.id);
			} else {
				console.log("No session, signing in anonymously...");
				signInAnonymously().then(id => {
					console.log("Signed in anonymously with ID:", id);
					if (id) setPlayerUUID(id);
				});
			}
		});

		// Listen for auth state changes (handles OAuth redirects)
		const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
			if (event === 'SIGNED_IN' && session) {
				const user = session.user;
				setPlayerUUID(user.id);

				// For OAuth users, auto-create profile if needed
				if (user.app_metadata?.provider === 'google') {
					const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player';
					const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
					if (!existing) {
						await supabase.from('profiles').upsert({ id: user.id, display_name: displayName }, { onConflict: 'id' });
					}
					setIsRegistered(true);
					setPlayerName(displayName);
					setMenuStep('lobby');
					getProfile(user.id).then(p => { if (p) setProfile(p); });
				}
			}
		});

		return () => subscription.unsubscribe();
	}, []);

	const { state, dispatch, mpState, hostGame, joinGame, closeLobby, leaveGame } = useGameEngine(playerUUID);
	const [remoteId, setRemoteId] = useState('');
	const [playerName, setPlayerName] = useState('');
	const [turnLimit, setTurnLimit] = useState(60);
	const [formError, setFormError] = useState('');
	const [isLocal, setIsLocal] = useState(false);
	const [copyFeedback, setCopyFeedback] = useState(false);
	const [randomizeOrder, setRandomizeOrder] = useState(true);

	// Clear error when name or id changes
	useEffect(() => {
		if (formError) setFormError('');
	}, [playerName, remoteId]);

	const myPlayerId = isLocal ? null : mpState.playerId;

	// Menu step navigation: welcome → auth → lobby
	const [menuStep, setMenuStep] = useState<'welcome' | 'auth' | 'lobby'>('welcome');

	// Auth state for optional sign-up/login
	const [isRegistered, setIsRegistered] = useState(false);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
	const [authEmail, setAuthEmail] = useState('');
	const [authPassword, setAuthPassword] = useState('');
	const [authDisplayName, setAuthDisplayName] = useState('');
	const [authError, setAuthError] = useState('');
	const [authLoading, setAuthLoading] = useState(false);

	// Easter egg: secret hotseat mode
	const titleClickCount = useRef(0);
	const titleClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [devToast, setDevToast] = useState(false);

	const handleTitleClick = () => {
		titleClickCount.current++;
		if (titleClickCount.current >= 5) {
			titleClickCount.current = 0;
			if (titleClickTimer.current) clearTimeout(titleClickTimer.current);
			setDevToast(true);
			setTimeout(() => setDevToast(false), 2000);
			setIsLocal(true);
			return;
		}
		if (titleClickTimer.current) clearTimeout(titleClickTimer.current);
		titleClickTimer.current = setTimeout(() => { titleClickCount.current = 0; }, 2000);
	};

	// Check if current user is registered on load → auto-advance to lobby
	useEffect(() => {
		if (!playerUUID) return;
		isAnonymousUser().then(async (isAnon) => {
			if (!isAnon) {
				setIsRegistered(true);
				let p = await getProfile(playerUUID);
				if (!p) {
					// Profile doesn't exist yet (e.g. first OAuth login) — create it
					const { data: { user } } = await supabase.auth.getUser();
					const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Player';
					await supabase.from('profiles').upsert({ id: playerUUID, display_name: displayName }, { onConflict: 'id' });
					p = await getProfile(playerUUID);
				}
				if (p) {
					setProfile(p);
					if (!playerName) setPlayerName(p.display_name);
				}
			}
		});
	}, [playerUUID]);

	const handleSignUp = async () => {
		if (!authEmail.trim() || !authPassword.trim() || !authDisplayName.trim()) {
			setAuthError('Please fill in all fields.');
			return;
		}
		setAuthLoading(true);
		setAuthError('');

		const isAnon = await isAnonymousUser();
		if (isAnon && playerUUID) {
			const { success, error } = await linkAnonymousToEmail(authEmail, authPassword, authDisplayName);
			if (error) {
				setAuthError(error);
				setAuthLoading(false);
				return;
			}
			if (success) {
				setIsRegistered(true);
				const p = await getProfile(playerUUID);
				setProfile(p);
				setPlayerName(authDisplayName);
				setMenuStep('lobby');
			}
		} else {
			const { userId, error } = await signUpWithEmail(authEmail, authPassword, authDisplayName);
			if (error) {
				setAuthError(error);
				setAuthLoading(false);
				return;
			}
			if (userId) {
				setPlayerUUID(userId);
				setIsRegistered(true);
				const p = await getProfile(userId);
				setProfile(p);
				setPlayerName(authDisplayName);
				setMenuStep('lobby');
			}
		}
		setAuthLoading(false);
	};

	const handleSignIn = async () => {
		if (!authEmail.trim() || !authPassword.trim()) {
			setAuthError('Please enter email and password.');
			return;
		}
		setAuthLoading(true);
		setAuthError('');
		const { userId, error } = await signInWithEmail(authEmail, authPassword);
		if (error) {
			setAuthError(error);
			setAuthLoading(false);
			return;
		}
		if (userId) {
			setPlayerUUID(userId);
			setIsRegistered(true);
			const p = await getProfile(userId);
			setProfile(p);
			if (p) setPlayerName(p.display_name);
			setMenuStep('lobby');
		}
		setAuthLoading(false);
	};

	const handleSignOut = async () => {
		await signOutUser();
		setIsRegistered(false);
		setProfile(null);
		setPlayerName('');
		setMenuStep('welcome');
		const id = await signInAnonymously();
		if (id) setPlayerUUID(id);
	};

	// Show Game if:
	// 1. We are playing locally (isLocal)
	// 2. OR state.status is 'PLAYING' or 'GAME_OVER'
	// 3. OR we are connected and in LOBBY (to show the lobby board? No, usually Lobby is UI)

	// Wait, the original GameBoard handled 'isHost' internally too?
	// Let's keep the lobby separate.
	const showGame = isLocal || (mpState.connectionStatus === 'connected' && state.status !== 'LOBBY');
	const showLobbyBoard = mpState.connectionStatus === 'connected' && state.status === 'LOBBY';

	const handleStartGame = () => {
		// Dispatch Start Game
		// Supabase logic: Just change status to PLAYING.
		// Ensure we have enough players?
		if (state.players.length < 2) {
			alert("Need at least 2 players!"); // Host side alert is less problematic, but ideally inline too.
			// But this is inside the specialized lobby view.
			return;
		}

		let finalPlayers = [...state.players];
		if (randomizeOrder && finalPlayers.length >= 2) {
			// Fisher-Yates Shuffle
			for (let i = finalPlayers.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[finalPlayers[i], finalPlayers[j]] = [finalPlayers[j], finalPlayers[i]];
			}
		}

		dispatch({ type: 'START_GAME', players: finalPlayers, config: state.config });
	};

	return (
		<Routes>
			<Route path="/leaderboard" element={<Leaderboard />} />
			<Route path="/" element={
				<div className="App">
					{!showGame && !showLobbyBoard ? (
						<div className="lobby-container">
							{/* ── STEP 1: WELCOME ────────────────────── */}
							{menuStep === 'welcome' && (
								<div className="welcome-screen">
									<h1 className="welcome-title" onClick={handleTitleClick}>
										Marvel Splendor
									</h1>
									<p className="welcome-subtitle">Now with rankings!</p>

									<div className="welcome-actions">
										{isRegistered && profile ? (
											<>
												<button className="btn-welcome primary" onClick={() => setMenuStep('lobby')}>
													Play Game
												</button>
												<button className="btn-welcome secondary" onClick={handleSignOut}>
													Sign Out
												</button>
											</>
										) : (
											<>
												<div className="welcome-auth-row">
													<button className="btn-welcome primary" onClick={() => { setAuthMode('login'); setAuthError(''); setMenuStep('auth'); }}>
														Log In
													</button>
													<button className="btn-welcome primary" onClick={() => { setAuthMode('signup'); setAuthError(''); setMenuStep('auth'); }}>
														Sign Up
													</button>
												</div>
												<div className="welcome-divider">
													<span>or</span>
												</div>
												<button className="btn-welcome secondary" onClick={() => setMenuStep('lobby')}>
													Continue as Guest
												</button>
											</>
										)}
									</div>

									<Link to="/leaderboard" className="btn-leaderboard" style={{ marginTop: '1.5rem' }}>
										Leaderboard
									</Link>
								</div>
							)}

							{/* ── STEP 2: AUTH ─────────────────────────── */}
							{menuStep === 'auth' && (
								<div className="auth-screen glass-panel">
									<button className="btn-back-nav" onClick={() => setMenuStep('welcome')}>← Back</button>

									<h1 className="welcome-title">
										Marvel Splendor
									</h1>
									<p className="welcome-subtitle">Now with rankings!</p>

									{authMode === 'signup' && (
										<input
											type="text"
											placeholder="Display Name"
											value={authDisplayName}
											onChange={(e) => setAuthDisplayName(e.target.value)}
											className="auth-input"
										/>
									)}
									<input type="email" placeholder="Email" value={authEmail}
										onChange={(e) => setAuthEmail(e.target.value)} className="auth-input" />
									<input type="password" placeholder="Password" value={authPassword}
										onChange={(e) => setAuthPassword(e.target.value)} className="auth-input" />

									{authError && <div className="auth-error">{authError}</div>}

									<button
										onClick={authMode === 'signup' ? handleSignUp : handleSignIn}
										className="btn-primary"
										disabled={authLoading}
										style={{ width: '100%', opacity: authLoading ? 0.6 : 1 }}
									>
										{authLoading ? 'Please wait...' : authMode === 'signup' ? 'Create Account' : 'Log In'}
									</button>

									<p className="auth-toggle-text">
										{authMode === 'signup' ? (
											<>Already have an account? <button type="button" className="btn-link" onClick={() => { setAuthMode('login'); setAuthError(''); }}>Log In</button></>
										) : (
											<>New to Marvel Splendor? <button type="button" className="btn-link" onClick={() => { setAuthMode('signup'); setAuthError(''); }}>Sign Up</button></>
										)}
									</p>

									<div className="welcome-divider"><span>or</span></div>

									<button
										className="btn-google"
										onClick={async () => {
											setAuthLoading(true);
											const { error } = await signInWithGoogle();
											if (error) { setAuthError(error); setAuthLoading(false); }
										}}
										disabled={authLoading}
									>
										<svg viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
											<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
											<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
											<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
											<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
										</svg>
										Continue with Google
									</button>
								</div>
							)}

							{/* ── STEP 3: LOBBY ────────────────────────── */}
							{menuStep === 'lobby' && (
								<div className="lobby-screen glass-panel">
									<button className="btn-back-nav" style={{ display: 'block', textAlign: 'left' }} onClick={() => setMenuStep('welcome')}>← Back</button>
									<h1 className="welcome-title">
										Marvel Splendor
									</h1>
									<p className="welcome-subtitle">Now with rankings!</p>

									<div className="lobby-header">
										<h3 style={{ margin: 0 }}>Online Multiplayer</h3>
										{isRegistered && profile ? (
											<span className="lobby-user-badge">{profile.display_name}</span>
										) : (
											<span className="lobby-user-badge guest">Guest</span>
										)}
									</div>

									{/* Name Input */}
									<div style={{ marginBottom: '15px' }}>
										<input
											type="text"
											placeholder="Enter Your Name"
											value={playerName}
											onChange={(e) => setPlayerName(e.target.value)}
											className="auth-input"
											style={{ textAlign: 'center', fontSize: '1.1rem' }}
										/>
									</div>

									{!playerUUID ? (
										<div style={{ color: '#aaa' }}>Establishing secure connection...</div>
									) : mpState.connectionStatus === 'idle' || mpState.connectionStatus === 'error' ? (
										<>
											{/* Timer Selection */}
											<div style={{ marginBottom: '20px', color: '#ccc', fontSize: '0.9rem' }}>
												<label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Turn Timer</label>
												<div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', borderRadius: '25px', border: '1px solid #444', overflow: 'hidden' }}>
													{[30, 60, 90, 120, 0].map(val => (
														<button key={val} onClick={() => setTurnLimit(val)} style={{
															padding: '8px 16px', borderRadius: 0, border: 'none',
															borderRight: '1px solid #555',
															background: turnLimit === val ? '#4facfe' : 'transparent',
															color: turnLimit === val ? 'white' : '#aaa',
															cursor: 'pointer', fontSize: '0.85rem',
															fontWeight: turnLimit === val ? 'bold' : 'normal',
															transition: 'all 0.2s', minWidth: '50px'
														}}>{val === 0 ? "No Timer" : `${val}s`}</button>
													))}
													<div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: ![30, 60, 90, 120, 0].includes(turnLimit) ? '#4facfe' : 'transparent' }}>
														<input type="number" min="10" max="600" value={turnLimit}
															onChange={(e) => setTurnLimit(Math.max(0, parseInt(e.target.value) || 0))}
															style={{
																width: '60px', padding: '8px 10px', border: 'none', background: 'transparent',
																color: ![30, 60, 90, 120, 0].includes(turnLimit) ? 'white' : '#aaa',
																textAlign: 'center', fontSize: '0.85rem',
																fontWeight: ![30, 60, 90, 120, 0].includes(turnLimit) ? 'bold' : 'normal',
																outline: 'none', MozAppearance: 'textfield'
															}}
															placeholder="Custom" />
													</div>
												</div>
											</div>

											{formError && (
												<div style={{ color: '#ff5555', marginBottom: '10px', fontSize: '0.9rem', background: 'rgba(255,0,0,0.1)', padding: '5px', borderRadius: '4px' }}>
													{formError}
												</div>
											)}

											<button className="btn-primary" onClick={() => {
												if (playerName.trim()) hostGame(playerName, playerUUID, turnLimit);
												else setFormError("Please enter your name first!");
											}}>Create New Game</button>
											<div style={{ margin: '10px', color: '#666' }}>or</div>
											<div style={{ display: 'flex', gap: '5px' }}>
												<input type="text" placeholder="Enter Game Code (UUID)" value={remoteId}
													onChange={(e) => setRemoteId(e.target.value)}
													className="auth-input" style={{ flex: 1 }} />
												<button className="btn-primary" onClick={() => {
													if (remoteId.trim() && playerName.trim()) joinGame(remoteId, playerName, playerUUID);
													else setFormError("Please enter your name and Game Code!");
												}}>Join</button>
											</div>
										</>
									) : (
										<div style={{ animation: 'pulse 2s infinite' }}>Connecting...</div>
									)}

									{mpState.errorMessage && (
										<div style={{ marginTop: '10px', color: 'red', background: 'rgba(255,0,0,0.1)', padding: '10px', borderRadius: '5px' }}>
											<strong>Error:</strong> {mpState.errorMessage}
											<br />
											<small onClick={() => window.location.reload()} style={{ textDecoration: 'underline', cursor: 'pointer' }}>Reset</small>
										</div>
									)}

									<div style={{ marginTop: '1.5rem', display: 'flex', gap: '10px', justifyContent: 'center' }}>
										<Link to="/leaderboard" className="btn-leaderboard">🏆 Leaderboard</Link>
									</div>
								</div>
							)}

							{/* Dev toast for Easter egg */}
							{devToast && <div className="dev-toast">🎮 Dev Mode Activated!</div>}
						</div>
					) : showLobbyBoard ? (
						// Waiting Room (LOBBY status)
						<div className="lobby-container">
							<div className="glass-panel" style={{ textAlign: 'center' }}>
								<h2>Waiting Room</h2>
								<div
									onClick={() => {
										if (mpState.gameId) {
											navigator.clipboard.writeText(mpState.gameId);
											setCopyFeedback(true);
											setTimeout(() => setCopyFeedback(false), 2000);
										}
									}}
									style={{
										background: '#222',
										padding: '10px',
										borderRadius: '5px',
										userSelect: 'all',
										cursor: 'pointer',
										border: '1px dashed #555',
										marginBottom: '20px',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										gap: '10px',
										transition: 'background 0.2s'
									}}
									title="Click to Copy"
									onMouseEnter={(e) => e.currentTarget.style.background = '#333'}
									onMouseLeave={(e) => e.currentTarget.style.background = '#222'}
								>
									<span style={{ fontFamily: 'monospace', fontSize: '1.2rem', letterSpacing: '1px' }}>{mpState.gameId}</span>
									<span style={{
										background: copyFeedback ? '#4caf50' : '#444',
										padding: '4px 8px',
										borderRadius: '4px',
										fontSize: '0.8rem',
										color: 'white',
										transition: 'all 0.2s',
										minWidth: '55px',
										textAlign: 'center'
									}}>
										{copyFeedback ? "Copied!" : "Copy"}
									</span>
								</div>
								<small>Share this Game Code</small>

								<div style={{ marginTop: '20px', textAlign: 'left' }}>
									<h4>Players ({state.players.length}/4)</h4>
									<ul>
										{state.players.map(p => (
											<li key={p.id} style={{ color: p.id === playerUUID ? 'lime' : 'white' }}>
												{p.name} {p.id === playerUUID ? '(You)' : ''}
											</li>
										))}
									</ul>
								</div>

								{mpState.isHost ? (
									<>
										<div style={{ marginBottom: '15px' }}>
											<label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '8px', userSelect: 'none' }}>
												<input
													type="checkbox"
													checked={randomizeOrder}
													onChange={(e) => setRandomizeOrder(e.target.checked)}
													style={{
														cursor: 'pointer',
														width: '18px',
														height: '18px',
														accentColor: '#4facfe'
													}}
												/>
												<span style={{ color: '#ccc', fontSize: '0.95rem' }}>Randomize Player Order</span>
											</label>
										</div>
										<button
											className="btn-primary"
											onClick={handleStartGame}
											disabled={state.players.length < 2}
											style={{
												opacity: state.players.length < 2 ? 0.5 : 1,
												cursor: state.players.length < 2 ? 'not-allowed' : 'pointer'
											}}
										>
											{state.players.length < 2 ? "Waiting for 2nd Player..." : "Start Game"}
										</button>
									</>
								) : (
									<p>Waiting for host to start...</p>
								)}

								<div style={{ marginTop: '30px', borderTop: '1px solid #444', paddingTop: '20px' }}>
									{mpState.isHost ? (
										<button
											style={{
												background: 'rgba(255, 0, 0, 0.2)',
												color: '#ff4444',
												border: '1px solid #ff4444',
												padding: '8px 16px',
												borderRadius: '4px',
												cursor: 'pointer',
												fontSize: '0.9rem'
											}}
											onClick={(e) => {
												const btn = e.currentTarget;
												if (btn.innerText === "Confirm Close?") {
													closeLobby();
												} else {
													btn.innerText = "Confirm Close?";
													setTimeout(() => btn.innerText = "Close Lobby", 3000);
												}
											}}
										>
											Close Lobby
										</button>
									) : (
										<button
											style={{
												background: 'rgba(255, 0, 0, 0.2)',
												color: '#ff4444',
												border: '1px solid #ff4444',
												padding: '8px 16px',
												borderRadius: '4px',
												cursor: 'pointer',
												fontSize: '0.9rem'
											}}
											onClick={() => {
												if (window.confirm("Are you sure you want to leave the game?")) {
													leaveGame();
												}
											}}
										>
											Leave Game
										</button>
									)}
								</div>
							</div>
						</div>
					) : (
						<GameBoard
							state={state}
							dispatch={dispatch}
							myPeerId={myPlayerId || (isLocal ? state.players[state.currentPlayerIndex].id : null)}
							myUUID={playerUUID}
							closeLobby={closeLobby}
							isHost={mpState.isHost}
						/>
					)
					}
				</div >
			} />
		</Routes >
	);
}

export default App;
