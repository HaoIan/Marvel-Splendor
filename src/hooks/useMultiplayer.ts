import { useEffect, useState, useRef } from 'react';
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

    // Initialize Peer
    useEffect(() => {
        const savedPeerId = sessionStorage.getItem('splendor_peerId');
        const savedIsHost = sessionStorage.getItem('splendor_isHost') === 'true';
        const savedGameId = sessionStorage.getItem('splendor_gameId');
        const savedName = sessionStorage.getItem('splendor_playerName');
        const savedUUID = sessionStorage.getItem('splendor_playerUUID');

        // If we were host, try to reclaim the ID. If client, just get a new ID but connect to savedGameId.
        const peerOptions = (savedIsHost && savedPeerId) ? { debug: 2 } : undefined;

        const peer = savedPeerId ? new Peer(savedPeerId, peerOptions) : new Peer();

        peerRef.current = peer;

        peer.on('open', (id) => {
            console.log('Peer Opened:', id);
            setMpState(prev => ({ ...prev, peerId: id }));
            sessionStorage.setItem('splendor_peerId', id);

            // Auto-reconnect logic
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
            } else if (!savedIsHost && savedGameId) {
                console.log('Restoring Client Session, reconnecting to:', savedGameId);
                joinGame(savedGameId, savedName || 'Player', savedUUID || '');
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
            // If ID is taken (unavailable-id), we might need to fallback
            if (err.type === 'unavailable-id') {
                sessionStorage.removeItem('splendor_peerId'); // Clear invalid ID
                // Maybe retry with new ID? For now just show error.
            }
            setMpState(prev => ({
                ...prev,
                connectionStatus: 'error',
                errorMessage: `Peer Error: ${err.type} - ${err.message}`
            }));
        });

        return () => {
            peer.destroy();
        };
    }, []);

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
                sessionStorage.removeItem('splendor_gameState');
                sessionStorage.removeItem('splendor_host');
                sessionStorage.removeItem('splendor_gameId');
                sessionStorage.removeItem('splendor_playerName');
                sessionStorage.removeItem('splendor_peerId');
                sessionStorage.removeItem('splendor_isHost');
                sessionStorage.removeItem('splendor_playerUUID');
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
            sessionStorage.removeItem('splendor_gameState');
            sessionStorage.removeItem('splendor_host');
            sessionStorage.removeItem('splendor_gameId');
            sessionStorage.removeItem('splendor_playerName');
            sessionStorage.removeItem('splendor_peerId');
            sessionStorage.removeItem('splendor_isHost');
            sessionStorage.removeItem('splendor_playerUUID');

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
