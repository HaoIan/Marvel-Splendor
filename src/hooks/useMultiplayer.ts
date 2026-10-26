import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { GameAction } from './gameReducer';
import { gameReducer, createInitialState } from './gameReducer';
import { createPlayer } from '../lib/gameRules';
import type { GameState } from '../types';

// PostgREST applies this predicate and update in one database statement.
// JSON revisions also work for existing matches without a new database column.
const writeMatch = async (gameId: string, previous: GameState, next: GameState) => {
    const versioned = { ...next, revision: (previous.revision ?? 0) + 1 };
    let query = supabase.from('matches').update({ game_state: versioned }).eq('id', gameId);
    query = previous.revision === undefined
        ? query.is('game_state->>revision', null)
        : query.eq('game_state->>revision', previous.revision);
    const { data, error } = await query.select('game_state');
    if (error) throw new Error(error.message);
    return data?.[0]?.game_state as GameState | undefined;
};

const readMatch = async (gameId: string): Promise<GameState> => {
    const { data, error } = await supabase.from('matches').select('game_state').eq('id', gameId).single();
    if (error || !data) throw new Error(error?.message || 'Game not found');
    return data.game_state as GameState;
};

// Lobby changes can be recalculated after a conflict; gameplay actions must never
// be replayed against a different turn or player.
const changeMembership = async (gameId: string, change: (state: GameState) => GameState) => {
    for (let attempt = 0; attempt < 4; attempt++) {
        const previous = await readMatch(gameId);
        const next = change(previous);
        if (next === previous) return previous;
        const saved = await writeMatch(gameId, previous, next);
        if (saved) return saved;
    }
    throw new Error('The lobby changed. Please try again.');
};

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

    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const gameStateRef = useRef(gameState);
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    const syncState = useCallback((state: GameState, force = false) => {
        if (!force && (state.revision ?? 0) < (gameStateRef.current.revision ?? 0)) return;
        gameStateRef.current = state;
        dispatch({ type: 'SYNC_STATE', state });
    }, [dispatch]);

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

    const hostGame = async (playerName: string, playerUUID: string, turnLimitSeconds: number = 60) => {
        setMpState(prev => ({ ...prev, connectionStatus: 'connecting', errorMessage: undefined }));

        const initialState = {
            ...createInitialState([{ id: playerUUID, name: playerName, uuid: playerUUID }], { turnLimitSeconds }),
            revision: 0,
            turnDeadline: undefined
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

        await joinGame(data.id, playerName, playerUUID, true);
    };

    const joinGame = useCallback(async (gameId: string, playerName: string, playerUUID: string, isCreator = false) => {
        setMpState(prev => ({ ...prev, connectionStatus: 'connecting', errorMessage: undefined }));

        let syncedState: GameState;
        try {
            syncedState = await changeMembership(gameId, state => {
                if (state.status === 'ABORTED') throw new Error('Game was aborted by host.');
                if (state.players.some(player => player.id === playerUUID)) return state;
                if (state.status !== 'LOBBY') throw new Error('This game has already started.');
                if (state.players.length >= 4) throw new Error('Game full');
                return { ...state, players: [...state.players, createPlayer({ id: playerUUID, name: playerName, uuid: playerUUID })] };
            });
        } catch (error) {
            setMpState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: error instanceof Error ? error.message : 'Could not join game' }));
            localStorage.removeItem('splendor_gameId');
            return;
        }

        // 2. Subscribe
        supabase
            .channel(`game:${gameId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${gameId}` }, (payload) => {
                const newState = payload.new.game_state as GameState;

                if (newState.status === 'ABORTED') {
                    alert("The Host has ended the game.");
                    localStorage.removeItem('splendor_gameId');
                    localStorage.removeItem('splendor_isHost');
                    window.location.reload();
                    return;
                }

                syncState(newState);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // console.log("Realtime connected");
                }
            });

        syncState(syncedState, true);

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
                    localStorage.removeItem('splendor_gameId');
                    localStorage.removeItem('splendor_isHost');
                    window.location.reload();
                } else {
                    syncState(remoteState);
                }
            }
        }, 3000);

        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = interval;

        // Save session
        localStorage.setItem('splendor_gameId', gameId);
        localStorage.setItem('splendor_isHost', String(isCreator));
        localStorage.setItem('splendor_playerName', playerName);

        setMpState({
            playerId: playerUUID,
            gameId,
            connectionStatus: 'connected',
            isHost: isCreator
        });
    }, [syncState]);

    // Auto-reconnect based on storage
    useEffect(() => {
        if (!playerUUID) return; // Wait for Auth

        const savedGameId = localStorage.getItem('splendor_gameId');
        // const savedPlayerId = localStorage.getItem('splendor_playerUUID'); // Deprecated, use Auth ID
        const savedIsHost = localStorage.getItem('splendor_isHost') === 'true';
        const savedName = localStorage.getItem('splendor_playerName');

        if (savedGameId && savedName) {
            console.log("Restoring session:", savedGameId);
            // We reuse joinGame logic, but need to be careful not to create loop
            joinGame(savedGameId, savedName, playerUUID, savedIsHost);
        }
    }, [playerUUID, joinGame]);

    const sendAction = useCallback(async (action: GameAction) => {
        if (!mpState.gameId) return;

        const previous = gameStateRef.current;
        try {
            const next = gameReducer(previous, action);
            if (next === previous) return;
            const saved = await writeMatch(mpState.gameId, previous, next);
            if (!saved) {
                syncState(await readMatch(mpState.gameId));
                throw new Error('The game changed before your move was saved. Please try again.');
            }
            // The reducer may shuffle or read the clock. Never reduce an action twice.
            syncState(saved);
            setMpState(prev => ({ ...prev, errorMessage: undefined }));
        } catch (error) {
            setMpState(prev => ({ ...prev, errorMessage: error instanceof Error ? error.message : 'Could not save move' }));
        }
    }, [mpState.gameId, syncState]);

    const closeLobby = async () => {
        if (mpState.isHost && mpState.gameId) {
            try {
                await changeMembership(mpState.gameId, state => ({ ...state, status: 'ABORTED' }));
            } catch (error) {
                alert('Failed to close lobby: ' + (error instanceof Error ? error.message : 'Unknown error'));
                return;
            }
        }

        // Clear local and reload
        setMpState({ playerId: null, gameId: null, connectionStatus: 'idle', isHost: false });
        localStorage.removeItem('splendor_gameId');
        localStorage.removeItem('splendor_isHost');
        window.location.reload();
    };

    const leaveGame = async () => {
        if (!mpState.gameId || !mpState.playerId) return;

        try {
            await changeMembership(mpState.gameId, state => {
                if (state.status !== 'LOBBY') throw new Error('Cannot remove a player from a game that has started.');
                return { ...state, players: state.players.filter(player => player.id !== mpState.playerId) };
            });
        } catch (error) {
            setMpState(prev => ({ ...prev, errorMessage: error instanceof Error ? error.message : 'Could not leave game' }));
            return;
        }

        // 4. Clear local
        setMpState({ playerId: null, gameId: null, connectionStatus: 'idle', isHost: false });
        localStorage.removeItem('splendor_gameId');
        localStorage.removeItem('splendor_isHost');
        window.location.reload();
    };

    return {
        mpState,
        hostGame,
        joinGame,
        sendAction,
        closeLobby,
        leaveGame
    };
};
