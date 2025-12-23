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
    gameState: GameState
) => {
    const [mpState, setMpState] = useState<MultiplayerState>({
        playerId: null,
        gameId: null,
        connectionStatus: 'idle',
        isHost: false
    });

    const gameStateRef = useRef(gameState);
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Cleanup subscription on unmount
    useEffect(() => {
        return () => {
            if (mpState.gameId) {
                supabase.channel(`game:${mpState.gameId}`).unsubscribe();
            }
        };
    }, [mpState.gameId]);

    // Auto-reconnect on mount
    useEffect(() => {
        const savedGameId = sessionStorage.getItem('splendor_gameId');
        const savedPlayerName = sessionStorage.getItem('splendor_playerName');
        const savedPlayerUUID = sessionStorage.getItem('splendor_playerUUID');
        const savedIsCreator = sessionStorage.getItem('splendor_isHost') === 'true';

        if (savedGameId && savedPlayerName && savedPlayerUUID) {
            console.log("Restoring session:", savedGameId);
            joinGame(savedGameId, savedPlayerName, savedPlayerUUID, savedIsCreator);
        }
    }, []);

    const hostGame = async (playerName: string, playerUUID: string) => {
        setMpState(prev => ({ ...prev, connectionStatus: 'connecting', errorMessage: undefined }));

        // 1. Create Initial State
        // We use the current LOCAL state as the template, but we need to ensure players are set up correctly.
        // Actually, the lobby logic is different now. We probably want to start with a blank slate or pre-filled state.
        // For simplicity, let's assume the App passes us a valid initial state or we trigger START_GAME later.
        // But wait, "Lobby" in Supabase mean we need a way to gather players BEFORE creating the 'matches' row?
        // OR, we create the row, and players 'join' by updating the 'players' array in the JSON?

        // Let's go with: Create row with "Lobby" status.
        const defaultState = gameStateRef.current;
        // Ensure Host is player 1
        const initialState = {
            ...defaultState,
            players: [{ id: playerUUID /* Use UUID as ID */, name: playerName, tokens: { red: 0, blue: 0, green: 0, white: 0, black: 0, gold: 0 }, hand: [], tableau: [], points: 0, noble: null }],
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

        // 2. Join it
        joinGame(data.id, playerName, playerUUID, true);
    };

    const joinGame = async (gameId: string, playerName: string, playerUUID: string, isCreator = false) => {
        setMpState(prev => ({ ...prev, connectionStatus: 'connecting', errorMessage: undefined }));

        // 1. Fetch current state to see if valid and add ourselves if needed
        const { data, error } = await supabase
            .from('matches')
            .select('game_state')
            .eq('id', gameId)
            .single();

        if (error || !data) {
            setMpState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: 'Game not found' }));
            return;
        }

        let syncedState = data.game_state as GameState;

        // If in LOBBY, add ourselves if not present
        if (syncedState.status === 'LOBBY' || syncedState.status === 'PLAYING') {
            const existingPlayerIndex = syncedState.players.findIndex(p => p.id === playerUUID);
            if (existingPlayerIndex === -1) {
                // Add player
                if (syncedState.players.length >= 4) {
                    setMpState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: 'Game full' }));
                    return;
                }
                syncedState.players.push({
                    id: playerUUID,
                    name: playerName,
                    tokens: { red: 0, blue: 0, green: 0, white: 0, black: 0, gold: 0 } as any, // Type hack if needed, or use proper initializers
                    hand: [],
                    tableau: [],
                    points: 0
                } as any);

                // Update DB
                await supabase
                    .from('matches')
                    .update({ game_state: syncedState })
                    .eq('id', gameId);
            } else {
                // Update name?
                // syncedState.players[existingPlayerIndex].name = playerName;
            }
        }

        // 2. Subscribe to changes
        const channel = supabase
            .channel(`game:${gameId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${gameId}` }, (payload) => {
                const newState = payload.new.game_state as GameState;
                dispatch({ type: 'SYNC_STATE', state: newState });
            })
            .subscribe();

        // 3. Sync local
        dispatch({ type: 'SYNC_STATE', state: syncedState });

        // Save session
        sessionStorage.setItem('splendor_gameId', gameId);
        sessionStorage.setItem('splendor_playerName', playerName);
        if (isCreator) sessionStorage.setItem('splendor_isHost', 'true');
        else sessionStorage.removeItem('splendor_isHost');

        setMpState({
            playerId: playerUUID,
            gameId,
            connectionStatus: 'connected',
            isHost: isCreator
        });
    };

    const sendAction = async (action: GameAction) => {
        if (!mpState.gameId) return;

        // 1. Run Optimistic Local Update
        // We use the gameReducer logic to verify validity and calculate next state
        // IMPORTANT: We need `gameReducer` to be pure.
        const prevState = gameStateRef.current;

        // Validation: Is it my turn? (Only for game moves, not startup)
        // Note: gameReducer generally handles logic, but simple turn check is good UX
        // However, we'll let existing UI handle visuals.

        try {
            const nextState = gameReducer(prevState, action);

            // 2. Push to Supabase
            // We push the WHOLE state.
            // Race condition risk: High if high frequency.
            // Mitigation: Splendor is turn based. Low risk.

            const { error } = await supabase
                .from('matches')
                .update({ game_state: nextState })
                .eq('id', mpState.gameId);

            if (error) {
                console.error("Failed to sync move:", error);
                // Ideally revert local state if we optimistically updated? 
                // But we actully relay on the subscription to confirm.
                // If we want immediate feedback, we dispatch locally too:
                // dispatch(action); 
                // BUT dispatching locally might cause jump if remote state differs.
                // Safest: Dispatch locally (Optimistic), Subscription will overwrite if needed.
                dispatch(action);
            }
        } catch (e) {
            console.error("Invalid move or reducer error", e);
        }
    };

    const closeLobby = async () => {
        // Just leave? delete?
        // For now, just reload.
        setMpState({ playerId: null, gameId: null, connectionStatus: 'idle', isHost: false });
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
