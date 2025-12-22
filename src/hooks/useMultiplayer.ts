import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameAction } from './gameReducer';
import type { GameState } from '../types';

// Server URL - Change this to your deployed server URL in production
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export interface MultiplayerState {
    peerId: string | null;         // Socket ID
    connectionStatus: 'idle' | 'connecting' | 'host_waiting' | 'connected' | 'error';
    isHost: boolean;
    gameId: string | null;         // Room code (e.g., "ABCD12")
    connectedPeers: string[];      // UUIDs of connected players
    peerNames: Record<string, string>; // UUID -> name
    peerUUIDs: Record<string, string>; // Socket ID -> UUID (for compatibility)
    errorMessage?: string;
}

interface PlayerInfo {
    socketId: string;
    name: string;
    uuid: string;
    connected: boolean;
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

    const socketRef = useRef<Socket | null>(null);
    const gameStateRef = useRef(gameState);

    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Connect to server
    const connect = useCallback(() => {
        if (socketRef.current?.connected) return;

        console.log('Connecting to server:', SERVER_URL);
        const socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to server:', socket.id);
            setMpState(prev => ({ ...prev, peerId: socket.id || null, errorMessage: undefined }));

            // Check for saved session to rejoin
            const savedRoomCode = sessionStorage.getItem('splendor_roomCode');
            const savedUUID = sessionStorage.getItem('splendor_playerUUID');
            const savedName = sessionStorage.getItem('splendor_playerName');

            if (savedRoomCode && savedUUID && savedName) {
                console.log('Attempting to rejoin room:', savedRoomCode);
                setMpState(prev => ({ ...prev, connectionStatus: 'connecting' }));
                socket.emit('join-room', { roomCode: savedRoomCode, playerName: savedName, uuid: savedUUID });
            }
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            setMpState(prev => ({ ...prev, connectionStatus: 'connecting', errorMessage: 'Disconnected from server. Reconnecting...' }));
        });

        socket.on('connect_error', (err) => {
            console.error('Connection error:', err);
            setMpState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: `Connection failed: ${err.message}` }));
        });

        // Room created (Host)
        socket.on('room-created', ({ roomCode, players }: { roomCode: string; players: PlayerInfo[] }) => {
            console.log('Room created:', roomCode);
            sessionStorage.setItem('splendor_roomCode', roomCode);
            sessionStorage.setItem('splendor_isHost', 'true');

            const names: Record<string, string> = {};
            players.forEach(p => { names[p.uuid] = p.name; });

            setMpState(prev => ({
                ...prev,
                isHost: true,
                connectionStatus: 'host_waiting',
                gameId: roomCode,
                peerNames: names,
                connectedPeers: players.map(p => p.uuid)
            }));
        });

        // Room joined (Client or Reconnect)
        socket.on('room-joined', ({ roomCode, players, isHost }: { roomCode: string; players: PlayerInfo[]; isHost: boolean }) => {
            console.log('Joined room:', roomCode, 'isHost:', isHost);
            sessionStorage.setItem('splendor_roomCode', roomCode);
            sessionStorage.setItem('splendor_isHost', String(isHost));

            const names: Record<string, string> = {};
            const myUUID = sessionStorage.getItem('splendor_playerUUID');
            players.forEach(p => { names[p.uuid] = p.name; });

            setMpState(prev => ({
                ...prev,
                isHost: isHost,
                connectionStatus: isHost ? 'host_waiting' : 'connected',
                gameId: roomCode,
                peerNames: names,
                connectedPeers: players.filter(p => p.uuid !== myUUID).map(p => p.uuid)
            }));
        });

        // Player list updated
        socket.on('player-list-updated', ({ players }: { players: PlayerInfo[] }) => {
            const names: Record<string, string> = {};
            const myUUID = sessionStorage.getItem('splendor_playerUUID');
            players.forEach(p => { names[p.uuid] = p.name; });

            setMpState(prev => ({
                ...prev,
                peerNames: names,
                connectedPeers: players.filter(p => p.uuid !== myUUID).map(p => p.uuid)
            }));
        });

        // State sync from server
        socket.on('state-sync', ({ state }: { state: GameState }) => {
            console.log('Received state sync');
            dispatch({ type: 'SYNC_STATE', state });
            setMpState(prev => ({ ...prev, connectionStatus: 'connected' }));
        });

        // Game action from server (for non-host clients)
        socket.on('game-action', ({ action }: { action: GameAction }) => {
            dispatch(action);
        });

        // Player disconnected
        socket.on('player-disconnected', ({ uuid: _uuid, name }: { uuid: string; name: string }) => {
            console.log(`Player ${name} disconnected`);
            // Could show a toast or indicator here
        });

        // Room closed
        socket.on('room-closed', ({ message }: { message: string }) => {
            alert(message || 'The host has closed the room.');
            sessionStorage.removeItem('splendor_roomCode');
            sessionStorage.removeItem('splendor_isHost');
            window.location.reload();
        });

        // Error
        socket.on('error', ({ message }: { message: string }) => {
            console.error('Server error:', message);
            setMpState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: message }));
        });

        return () => {
            socket.disconnect();
        };
    }, [dispatch]);

    // Connect on mount
    useEffect(() => {
        const cleanup = connect();
        return cleanup;
    }, [connect]);

    // Sync state to server when it changes (Host only)
    useEffect(() => {
        if (mpState.isHost && mpState.connectionStatus === 'connected' && socketRef.current?.connected) {
            socketRef.current.emit('sync-state', { state: gameState });
        }
    }, [gameState, mpState.isHost, mpState.connectionStatus]);

    const hostGame = (playerName: string, playerUUID: string) => {
        if (!socketRef.current?.connected) {
            setMpState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: 'Not connected to server' }));
            return;
        }

        sessionStorage.setItem('splendor_playerName', playerName);
        sessionStorage.setItem('splendor_playerUUID', playerUUID);

        socketRef.current.emit('create-room', { playerName, uuid: playerUUID });
    };

    const joinGame = (roomCode: string, playerName: string, playerUUID: string) => {
        if (!socketRef.current?.connected) {
            setMpState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: 'Not connected to server' }));
            return;
        }

        sessionStorage.setItem('splendor_playerName', playerName);
        sessionStorage.setItem('splendor_playerUUID', playerUUID);
        sessionStorage.setItem('splendor_roomCode', roomCode.toUpperCase());

        setMpState(prev => ({ ...prev, connectionStatus: 'connecting' }));
        socketRef.current.emit('join-room', { roomCode: roomCode.toUpperCase(), playerName, uuid: playerUUID });
    };

    const startGame = (initialState: GameState) => {
        if (!socketRef.current?.connected || !mpState.isHost) return;
        socketRef.current.emit('start-game', { initialState });
    };

    const sendAction = (action: GameAction) => {
        if (!socketRef.current?.connected) return;
        socketRef.current.emit('game-action', { action });
    };

    const closeLobby = () => {
        if (!socketRef.current?.connected || !mpState.isHost) return;

        socketRef.current.emit('close-room');
        sessionStorage.removeItem('splendor_roomCode');
        sessionStorage.removeItem('splendor_isHost');
        window.location.reload();
    };

    return {
        mpState,
        hostGame,
        joinGame,
        sendAction,
        closeLobby,
        startGame
    };
};
