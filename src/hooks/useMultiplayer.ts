import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { GameAction } from './gameReducer';
import { gameReducer } from './gameReducer';
import type { GameState } from '../types';

export interface MultiplayerState {
    playerId: string | null; // My ID (used for turn checks)
    gameId: string | null;
    connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
    isHost: boolean; // "Host" just means "Creator" now
    errorMessage?: string;
}

export const useMultiplayer = (
    dispatch: (action: GameAction) => void,
    gameState: GameState,
    playerUUID?: string
) => {
    const [mpState, setMpState] = useState<MultiplayerState>({
        playerId: null,
        gameId: null,
        connectionStatus: 'idle',
        isHost: false
    });

    const pollingRef = useRef<any>(null);

    const gameStateRef = useRef(gameState);
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Auto-reconnect based on storage
    useEffect(() => {
        if (!playerUUID) return; // Wait for Auth

        const savedGameId = sessionStorage.getItem('splendor_gameId');
        // const savedPlayerId = sessionStorage.getItem('splendor_playerUUID'); // Deprecated, use Auth ID
        const savedIsHost = sessionStorage.getItem('splendor_isHost') === 'true';
        const savedName = sessionStorage.getItem('splendor_playerName');

        if (savedGameId && savedName) {
            console.log("Restoring session:", savedGameId);
            // We reuse joinGame logic, but need to be careful not to create loop
            joinGame(savedGameId, savedName, playerUUID, savedIsHost);
        }
    }, [playerUUID]);

    // Cleanup subscription on unmount
    useEffect(() => {
        return () => {
            if (mpState.gameId) {
                // Do not unsubscribe here strictly if we want to allow refresh?
                // Actually React strict mode might mount/unmount.
                // It is safer to unsubscribe to avoid dupes, but Supabase handles it well.
                supabase.channel(`game:${mpState.gameId}`).unsubscribe();
            }
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [mpState.gameId]);

    const hostGame = async (playerName: string, playerUUID: string) => {
        setMpState(prev => ({ ...prev, connectionStatus: 'connecting', errorMessage: undefined }));

        const defaultState = gameStateRef.current;
        const initialState = {
            ...defaultState,
            players: [{ id: playerUUID, name: playerName, tokens: { red: 0, blue: 0, green: 0, white: 0, black: 0, gold: 0 }, hand: [], tableau: [], points: 0, noble: null }],
            status: 'LOBBY'
        };

        const { data, error } = await supabase
            .from('matches')
            .insert([{ game_state: initialState }])
            .select()
            .single();

        if (error) {
            console.error('Error creating game:', error);
            setMpState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: error.message }));
            return;
        }

        joinGame(data.id, playerName, playerUUID, true);
    };

    const joinGame = async (gameId: string, playerName: string, playerUUID: string, isCreator = false) => {
        setMpState(prev => ({ ...prev, connectionStatus: 'connecting', errorMessage: undefined }));

        // 1. Fetch current state
        const { data, error } = await supabase
            .from('matches')
            .select('game_state')
            .eq('id', gameId)
            .single();

        if (error || !data) {
            setMpState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: 'Game not found' }));
            sessionStorage.removeItem('splendor_gameId'); // Clear invalid
            return;
        }

        let syncedState = data.game_state as GameState;

        // Check if aborted
        if (syncedState.status === 'ABORTED') {
            setMpState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: 'Game was aborted by host.' }));
            sessionStorage.removeItem('splendor_gameId');
            return;
        }

        // Logic to add player (if new)
        if (syncedState.status === 'LOBBY' || syncedState.status === 'PLAYING') {
            const existingPlayerIndex = syncedState.players.findIndex(p => p.id === playerUUID);
            if (existingPlayerIndex === -1) {
                if (syncedState.players.length >= 4) {
                    setMpState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: 'Game full' }));
                    return;
                }
                syncedState.players.push({
                    id: playerUUID,
                    name: playerName,
                    tokens: { red: 0, blue: 0, green: 0, white: 0, black: 0, gold: 0 } as any,
                    hand: [],
                    tableau: [],
                    points: 0,
                    isHuman: true
                } as any);

                await supabase
                    .from('matches')
                    .update({ game_state: syncedState })
                    .eq('id', gameId);
            }
        }

        // 2. Subscribe
        supabase
            .channel(`game:${gameId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${gameId}` }, (payload) => {
                const newState = payload.new.game_state as GameState;

                if (newState.status === 'ABORTED') {
                    alert("The Host has ended the game.");
                    sessionStorage.removeItem('splendor_gameId');
                    sessionStorage.removeItem('splendor_isHost');
                    window.location.reload();
                    return;
                }

                dispatch({ type: 'SYNC_STATE', state: newState });
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // console.log("Realtime connected");
                }
            });

        dispatch({ type: 'SYNC_STATE', state: syncedState });

        // 3. Polling Fallback (Every 3s)
        const interval = setInterval(async () => {
            const { data, error } = await supabase
                .from('matches')
                .select('game_state')
                .eq('id', gameId)
                .single();

            if (data && !error) {
                const remoteState = data.game_state as GameState;
                if (remoteState.status === 'ABORTED') {
                    alert("The Host has ended the game.");
                    sessionStorage.removeItem('splendor_gameId');
                    sessionStorage.removeItem('splendor_isHost');
                    window.location.reload();
                } else {
                    dispatch({ type: 'SYNC_STATE', state: remoteState });
                }
            }
        }, 3000);

        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = interval;

        // Save session
        sessionStorage.setItem('splendor_gameId', gameId);
        sessionStorage.setItem('splendor_isHost', String(isCreator));
        sessionStorage.setItem('splendor_playerName', playerName);

        setMpState({
            playerId: playerUUID,
            gameId,
            connectionStatus: 'connected',
            isHost: isCreator
        });
    };

    const sendAction = async (action: GameAction) => {
        if (!mpState.gameId) return;

        // Validation & Reducer Logic handled by checking against ref or just trying optimistic update
        const prevState = gameStateRef.current;
        try {
            const nextState = gameReducer(prevState, action);

            // Optimistic Update: Update local UI immediately
            dispatch(action);

            const { error } = await supabase
                .from('matches')
                .update({ game_state: nextState })
                .eq('id', mpState.gameId);

            if (error) {
                console.error("Failed to sync move:", error);
                // If failed, we should theoretically rollback, but for now we just log.
                // The next successful sync (if any) or reload would fix it.
            }
        } catch (e) {
            console.error("Invalid move or reducer error", e);
        }
    };

    const closeLobby = async () => {
        if (mpState.isHost && mpState.gameId) {
            // Host Aborts
            const abortedState = { ...gameStateRef.current, status: 'ABORTED' };
            await supabase.from('matches').update({ game_state: abortedState }).eq('id', mpState.gameId);
        }

        // Clear local and reload
        setMpState({ playerId: null, gameId: null, connectionStatus: 'idle', isHost: false });
        sessionStorage.removeItem('splendor_gameId');
        sessionStorage.removeItem('splendor_isHost');
        window.location.reload();
    };

    return {
        mpState,
        hostGame,
        joinGame,
        sendAction,
        closeLobby
    };
};
