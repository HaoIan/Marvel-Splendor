import { useState } from 'react';
import './App.css';
import { useGameEngine } from './hooks/useGameEngine';
import { GameBoard } from './components/GameBoard';

function App() {
  const { state, dispatch, mpState, hostGame, joinGame, closeLobby } = useGameEngine();
  const [remoteId, setRemoteId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isLocal, setIsLocal] = useState(false);

  // Identity logic
  const [playerUUID] = useState(() => {
    const saved = sessionStorage.getItem('splendor_playerUUID');
    if (saved) return saved;
    const newId = crypto.randomUUID();
    sessionStorage.setItem('splendor_playerUUID', newId);
    return newId;
  });

  const myPlayerId = isLocal ? null : mpState.peerId;

  // Show Game if:
  // 1. We are playing locally (isLocal)
  // 2. OR state.status is 'PLAYING' or 'GAME_OVER' (which means Host started game)
  const showGame = isLocal || state.status !== 'LOBBY';

  const handleStartGame = () => {
    if (!mpState.isHost) return;
    // Gather players: Host + Connected Peers
    const players = [
      { id: mpState.peerId!, name: mpState.peerNames[mpState.peerId!] || 'Host', uuid: playerUUID },
      ...mpState.connectedPeers.map((p, i) => ({ id: p, name: mpState.peerNames[p] || `Player ${i + 2}`, uuid: mpState.peerUUIDs?.[p] }))
    ];
    // Dispatch Start Game
    dispatch({ type: 'START_GAME', players });
  };

  return (
    <div className="App">
      {!showGame ? (
        <div className="lobby-container">
          <div className="glass-panel" style={{ textAlign: 'center', maxWidth: '500px' }}>
            <h1 style={{ fontFamily: 'Impact', letterSpacing: '2px', background: 'linear-gradient(to right, #f00, #fc0)', WebkitBackgroundClip: 'text', color: 'transparent', fontSize: '3rem', margin: '0' }}>
              MARVEL SPLENDOR
            </h1>
            <p style={{ color: '#aaa', marginBottom: '2rem' }}>Assemble the Infinity Stones</p>

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

                {mpState.connectionStatus === 'idle' ? (
                  <>
                    <button className="btn-primary" onClick={() => {
                      if (playerName.trim()) hostGame(playerName, playerUUID);
                      else alert("Please enter your name");
                    }}>Host Game</button>
                    <div style={{ margin: '10px' }}>or</div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input
                        type="text"
                        placeholder="Enter Host ID"
                        value={remoteId}
                        onChange={(e) => setRemoteId(e.target.value)}
                        style={{ padding: '10px', borderRadius: '5px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', flex: 1 }}
                      />
                      <button className="btn-primary" onClick={() => {
                        if (remoteId.trim() && playerName.trim()) joinGame(remoteId, playerName, playerUUID);
                        else alert("Please enter your name and Host ID");
                      }}>Join</button>
                    </div>
                  </>
                ) : null}

                {/* Host Waiting UI */}
                {mpState.isHost && (mpState.connectionStatus === 'host_waiting' || mpState.connectionStatus === 'connected') && (
                  <div>
                    <p>Lobby Created!</p>
                    <div style={{ background: '#222', padding: '10px', borderRadius: '5px', userSelect: 'all', cursor: 'pointer', border: '1px dashed #555', marginBottom: '10px' }}>
                      {mpState.gameId}
                    </div>
                    <small>Share this ID to invite friends.</small>

                    <h4 style={{ marginTop: '20px' }}>Connected Players ({mpState.connectedPeers.length + 1})</h4>
                    <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
                      <li>{mpState.peerNames[mpState.peerId!] || 'Host'} (You)</li>
                      {mpState.connectedPeers.map((p, i) => <li key={p}>{mpState.peerNames[p] || `Player ${i + 2}`}</li>)}
                    </ul>

                    {mpState.connectedPeers.length > 0 ? (
                      <button className="btn-primary" style={{ marginTop: '20px', fontSize: '1.2rem' }} onClick={handleStartGame}>Start Game</button>
                    ) : (
                      <p style={{ color: '#666', fontStyle: 'italic' }}>Waiting for players...</p>
                    )}
                  </div>
                )}

                {/* Client Waiting UI */}
                {!mpState.isHost && (mpState.connectionStatus === 'connecting' || mpState.connectionStatus === 'connected') && (
                  <div style={{ animation: 'pulse 2s infinite' }}>
                    {mpState.connectionStatus === 'connecting' ? 'Connecting to Host...' : 'Connected! Waiting for Host to start...'}
                  </div>
                )}

                {mpState.connectionStatus === 'error' && (
                  <div style={{ color: 'red', background: 'rgba(255,0,0,0.1)', padding: '10px', borderRadius: '5px' }}>
                    <strong>Connection Error:</strong> {mpState.errorMessage || 'Unknown error occurred.'}
                    <br />
                    <small onClick={() => window.location.reload()} style={{ textDecoration: 'underline', cursor: 'pointer' }}>Refresh to retry</small>
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
