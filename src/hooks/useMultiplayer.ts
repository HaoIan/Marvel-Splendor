import { useEffect, useState, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { GameAction } from './gameReducer';
import type { GameState } from '../types';

export interface MultiplayerState {
    peerId: string | null;
    connectionStatus: 'idle' | 'host_waiting' | 'connecting' | 'connected' | 'error';
    isHost: boolean;
    gameId: string | null;
    connectedPeers: string[];
    peerNames: Record<string, string>; // Map peerId -> name
    peerUUIDs: Record<string, string>; // Map peerId -> uuid
    errorMessage?: string;
}

export const useMultiplayer = (
    dispatch: (action: GameAction) => void,
    gameState: GameState
) => {
    const [mpState, setMpState] = useState<MultiplayerState>({
        peerId: null,
        connectionStatus: 'idle',
        isHost: false,
        gameId: null,
        connectedPeers: [],
        peerNames: {},
        peerUUIDs: {}
    });

    const peerRef = useRef<Peer | null>(null);
    const connectionsRef = useRef<DataConnection[]>([]); // Host: list of clients
    const clientConnRef = useRef<DataConnection | null>(null); // Client: connection to host

    // IMPORTANT: Track latest gameState in ref so event listeners (which are closures) can access it
    const gameStateRef = useRef(gameState);
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Define connection logic as a stable function we can call from anywhere
    const setupPeer = useCallback((requestedId?: string) => {
        // Cleanup existing (if any) - though usually we call this on mount or after destroy
        if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
        }

        const peer = requestedId ? new Peer(requestedId, { debug: 2 }) : new Peer({ debug: 2 });
        peerRef.current = peer;

        peer.on('open', (id) => {
            console.log('Peer Opened:', id);
            setMpState(prev => ({ ...prev, peerId: id, connectionStatus: 'idle', errorMessage: undefined }));
            sessionStorage.setItem('splendor_peerId', id);

            // Access latest storage for recovery context
            const savedIsHost = sessionStorage.getItem('splendor_isHost') === 'true';
            const savedGameId = sessionStorage.getItem('splendor_gameId');
            const savedName = sessionStorage.getItem('splendor_playerName');
            const savedUUID = sessionStorage.getItem('splendor_playerUUID');

            // Auto-reconnect logic
            // 1. If we were Host, and we successfully reclaimed our ID:
            if (savedIsHost && savedGameId === id) {
                console.log('Restoring Host Session');
                setMpState(prev => ({
                    ...prev,
                    isHost: true,
                    connectionStatus: 'host_waiting',
                    gameId: id,
                    peerNames: { ...prev.peerNames, [id]: savedName || 'Host' },
                    peerUUIDs: { ...prev.peerUUIDs, [id]: savedUUID || '' }
                }));
            }
            // 2. If we were Client (or Host who lost ID), and we have a target GameID:
            else if (!savedIsHost && savedGameId) {
                console.log('Restoring Client Session, reconnecting to:', savedGameId);
                // We use a small timeout to let the UI settle or ensure peer is ready
                setTimeout(() => {
                    joinGame(savedGameId, savedName || 'Player', savedUUID || '');
                }, 500);
            }
        });

        peer.on('connection', (conn) => {
            // Handle incoming connection (Host side)
            console.log('Incoming connection:', conn.peer);
            connectionsRef.current.push(conn);

            conn.on('open', () => {
                console.log('Connection opened with:', conn.peer);
                setMpState(prev => ({
                    ...prev,
                    connectedPeers: [...prev.connectedPeers, conn.peer],
                    connectionStatus: 'connected'
                }));
                // Send current state to new player - USE REF to get latest state!
                conn.send({ type: 'SYNC_STATE', state: gameStateRef.current });
            });

            conn.on('data', (data: any) => {
                if (data.type === 'PLAYER_HELLO') {
                    const { name, id, uuid } = data;

                    // Check for reconnection - USE REF
                    const currentGameState = gameStateRef.current;
                    const existingPlayer = currentGameState.players.find(p => p.uuid === uuid);

                    if (existingPlayer && existingPlayer.id !== id) {
                        console.log(`Player ${name} reconnected with new ID ${id} (old: ${existingPlayer.id})`);
                        // Dispatch action to update player ID in game state
                        dispatch({ type: 'RECONNECT_PLAYER', oldId: existingPlayer.id, newId: id });
                    }

                    setMpState(prev => ({
                        ...prev,
                        peerNames: { ...prev.peerNames, [id]: name },
                        peerUUIDs: { ...prev.peerUUIDs, [id]: uuid }
                    }));
                } else if (data.type) {
                    dispatch(data);
                }
            });

            conn.on('close', () => {
                connectionsRef.current = connectionsRef.current.filter(c => c !== conn);
                setMpState(prev => ({
                    ...prev,
                    connectedPeers: prev.connectedPeers.filter(p => p !== conn.peer)
                }));
            });
        });

        peer.on('error', (err) => {
            console.error('Peer Error:', err);

            // AUTOMATIC RETRY ON UNAVAILABLE ID (Server thinks we are still online with old ID)
            if (err.type === 'unavailable-id') {
                console.warn('Peer ID taken/unavailable. Clearing stored ID and retrying with fresh ID...');
                sessionStorage.removeItem('splendor_peerId');
                setupPeer(undefined);
                return;
            }

            // AUTOMATIC RETRY ON CONNECTION FAILURE (Host not found / Flaky signaling)
            // If we are trying to join a game (we have a valid gameId we want to be connected to)
            const targetGameId = sessionStorage.getItem('splendor_gameId'); // Or look at mpState, but mpState might not be updated inside closure if we didn't use Ref?
            // Actually setupPeer recreates the closure, so it's fine? No, setupPeer is useCallback with [] dep (well, dispatch).
            // But we can check sessionStorage for intent.
            const isHost = sessionStorage.getItem('splendor_isHost') === 'true';

            if (!isHost && targetGameId && (err.type === 'peer-unavailable' || err.message.includes('Could not connect'))) {
                console.warn(`Connection to host ${targetGameId} failed. Retrying in 2s...`);

                // Update state to show we are trying
                setMpState(prev => ({
                    ...prev,
                    connectionStatus: 'connecting',
                    errorMessage: `Connection failed. Retrying...`
                }));

                setTimeout(() => {
                    // Retry joining
                    joinGame(targetGameId, sessionStorage.getItem('splendor_playerName') || 'Player', sessionStorage.getItem('splendor_playerUUID') || '');
                }, 2000);
                return;
            }

            setMpState(prev => ({
                ...prev,
                connectionStatus: 'error',
                errorMessage: `Peer Error: ${err.type} - ${err.message}`
            }));
        });
    }, [dispatch]); // Dependencies for setupPeer. Dispatch is stable.

    // Initial Mount Setup
    useEffect(() => {
        const savedPeerId = sessionStorage.getItem('splendor_peerId');
        // Initial setup attempts to reclaim ID if present
        setupPeer(savedPeerId || undefined);

        return () => {
            if (peerRef.current) peerRef.current.destroy();
        };
    }, [setupPeer]);

    // Persist Host State
    useEffect(() => {
        if (mpState.isHost) {
            sessionStorage.setItem('splendor_isHost', 'true');
            if (mpState.gameId) sessionStorage.setItem('splendor_gameId', mpState.gameId);
        } else if (mpState.gameId) {
            sessionStorage.setItem('splendor_isHost', 'false');
            sessionStorage.setItem('splendor_gameId', mpState.gameId);
        }
    }, [mpState.isHost, mpState.gameId]);

    // Sync state changes to peers (Host -> Clients)
    useEffect(() => {
        if (mpState.isHost && connectionsRef.current.length > 0) {
            connectionsRef.current.forEach(conn => {
                if (conn.open) {
                    conn.send({ type: 'SYNC_STATE', state: gameState });
                }
            });
        }
    }, [gameState, mpState.isHost]);

    const hostGame = (playerName: string, playerUUID: string) => {
        const peer = peerRef.current;
        if (!peer || !peer.id) {
            setMpState(prev => ({
                ...prev,
                connectionStatus: 'error',
                errorMessage: 'Initialization not complete. Please wait a moment and try again.'
            }));
            return;
        }
        const gameId = peer.id;
        sessionStorage.setItem('splendor_playerName', playerName);
        setMpState(prev => ({
            ...prev,
            isHost: true,
            connectionStatus: 'host_waiting',
            gameId,
            peerNames: { ...prev.peerNames, [gameId]: playerName },
            peerUUIDs: { ...prev.peerUUIDs, [gameId]: playerUUID }
        }));
    };

    const joinGame = (hostId: string, playerName: string, playerUUID: string) => {
        if (!peerRef.current) return;
        sessionStorage.setItem('splendor_playerName', playerName);
        setMpState(prev => ({ ...prev, isHost: false, connectionStatus: 'connecting' }));

        const conn = peerRef.current.connect(hostId);
        clientConnRef.current = conn;

        conn.on('open', () => {
            setMpState(prev => ({ ...prev, connectionStatus: 'connected', gameId: hostId }));
            // Send Hello
            conn.send({ type: 'PLAYER_HELLO', name: playerName, id: peerRef.current?.id, uuid: playerUUID });
        });

        conn.on('data', (data: any) => {
            if (data.type === 'SYNC_STATE') {
                dispatch(data);
            } else if (data.type === 'LOBBY_CLOSED') {
                alert("The host has closed the lobby.");
                sessionStorage.clear(); // Clear all
                window.location.reload();
            }
        });
    };

    const sendAction = (action: GameAction) => {
        if (clientConnRef.current) {
            clientConnRef.current.send(action);
        }
    };

    const closeLobby = () => {
        if (mpState.isHost) {
            // Notify all clients
            connectionsRef.current.forEach(conn => {
                if (conn.open) {
                    conn.send({ type: 'LOBBY_CLOSED' });
                    conn.close();
                }
            });
            connectionsRef.current = [];

            // Clear local state
            sessionStorage.clear();
            window.location.reload();
        }
    };

    return {
        mpState,
        hostGame,
        joinGame,
        sendAction,
        closeLobby
    };
};
