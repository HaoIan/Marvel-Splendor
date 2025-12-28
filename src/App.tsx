import { useState, useEffect, useRef } from 'react';
import { supabase, signInAnonymously } from './lib/supabase';
import './App.css';
import { useGameEngine } from './hooks/useGameEngine';
import { GameBoard } from './components/GameBoard';

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
	}, []);

	const { state, dispatch, mpState, hostGame, joinGame, closeLobby } = useGameEngine(playerUUID);
	const [remoteId, setRemoteId] = useState('');
	const [playerName, setPlayerName] = useState('');
	const [turnLimit, setTurnLimit] = useState(60);
	const [formError, setFormError] = useState('');
	const [isLocal, setIsLocal] = useState(false);
	const [copyFeedback, setCopyFeedback] = useState(false);

	// Clear error when name or id changes
	useEffect(() => {
		if (formError) setFormError('');
	}, [playerName, remoteId]);

	const myPlayerId = isLocal ? null : mpState.playerId;



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
		dispatch({ type: 'START_GAME', players: state.players, config: state.config });
	};

	return (
		<div className="App">
			{!showGame && !showLobbyBoard ? (
				<div className="lobby-container">
					<div className="glass-panel" style={{ textAlign: 'center', maxWidth: '500px' }}>
						<h1 style={{ fontFamily: 'Impact', letterSpacing: '2px', background: 'linear-gradient(to right, #f00, #fc0)', WebkitBackgroundClip: 'text', color: 'transparent', fontSize: '3rem', margin: '0' }}>
							MARVEL SPLENDOR
						</h1>
						<p style={{ color: '#aaa', marginBottom: '2rem' }}>Because Colonist Sucks</p>

						<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
							<div style={{ borderBottom: '1px solid #444', paddingBottom: '1rem', marginBottom: '1rem' }}>
								<h3>Online Multiplayer</h3>

								{/* Name Input */}
								<div style={{ marginBottom: '15px' }}>
									<input
										type="text"
										placeholder="Enter Your Name"
										value={playerName}
										onChange={(e) => setPlayerName(e.target.value)}
										style={{ padding: '10px', borderRadius: '5px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', width: '100%', boxSizing: 'border-box', textAlign: 'center', fontSize: '1.1rem' }}
									/>
								</div>

								{!playerUUID ? (
									<div style={{ color: '#aaa' }}>Establishing secure connection...</div>
								) : mpState.connectionStatus === 'idle' || mpState.connectionStatus === 'error' ? (
									<>
										{/* Timer Selection */}
										<div style={{ marginBottom: '20px', color: '#ccc', fontSize: '0.9rem' }}>
											<label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Turn Timer (seconds)</label>
											<div style={{
												display: 'inline-flex',
												background: 'rgba(255,255,255,0.05)',
												borderRadius: '25px',
												border: '1px solid #444',
												overflow: 'hidden'
											}}>
												{[30, 60, 90, 120, 0].map(val => (
													<button
														key={val}
														onClick={() => setTurnLimit(val)}
														style={{
															padding: '8px 16px',
															borderRadius: 0,
															border: 'none',
															borderRight: '1px solid #555',
															background: turnLimit === val ? '#4facfe' : 'transparent',
															color: turnLimit === val ? 'white' : '#aaa',
															cursor: 'pointer',
															fontSize: '0.85rem',
															fontWeight: turnLimit === val ? 'bold' : 'normal',
															transition: 'all 0.2s',
															minWidth: '50px'
														}}
													>
														{val === 0 ? "No Timer" : `${val}s`}
													</button>
												))}

												<div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: ![30, 60, 90, 120, 0].includes(turnLimit) ? '#4facfe' : 'transparent' }}>
													<input
														type="number"
														min="10"
														max="600"
														value={turnLimit}
														onChange={(e) => setTurnLimit(Math.max(0, parseInt(e.target.value) || 0))}
														style={{
															width: '60px',
															padding: '8px 10px',
															border: 'none',
															background: 'transparent',
															color: ![30, 60, 90, 120, 0].includes(turnLimit) ? 'white' : '#aaa',
															textAlign: 'center',
															fontSize: '0.85rem',
															fontWeight: ![30, 60, 90, 120, 0].includes(turnLimit) ? 'bold' : 'normal',
															outline: 'none',
															MozAppearance: 'textfield'
														}}
														placeholder="Custom"
													/>
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
										<div style={{ margin: '10px' }}>or</div>
										<div style={{ display: 'flex', gap: '5px' }}>
											<input
												type="text"
												placeholder="Enter Game Code (UUID)"
												value={remoteId}
												onChange={(e) => setRemoteId(e.target.value)}
												style={{ padding: '10px', borderRadius: '5px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', flex: 1 }}
											/>
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
							</div>

							<div>
								<button style={{ background: 'transparent', border: '1px solid #555', color: '#888', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => setIsLocal(true)}>
									Play Local Hotseat (Dev Mode)
								</button>
							</div>
						</div>
					</div>
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
								transition: 'all 0.2s'
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
						) : (
							<p>Waiting for host to start...</p>
						)}
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
			)}
		</div>
	);
}

export default App;
