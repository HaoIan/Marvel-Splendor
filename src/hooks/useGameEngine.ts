import { useReducer, useEffect } from 'react';
import { gameReducer, createInitialState } from './gameReducer';
import type { GameAction } from './gameReducer';
import { useMultiplayer } from './useMultiplayer';

export const useGameEngine = (playerUUID?: string) => {
    // Initial State override could happen here if we loaded from local storage
    const [state, dispatch] = useReducer(gameReducer, createInitialState([{ id: 'host', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]), (initial) => {
        const saved = sessionStorage.getItem('splendor_gameState');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse saved state", e);
            }
        }
        return initial;
    });

    // Save state on change
    useEffect(() => {
        sessionStorage.setItem('splendor_gameState', JSON.stringify(state));
    }, [state]);

    // Custom dispatch wrapper to handle forwarding actions to Host if we are Client
    const { mpState, hostGame, joinGame, sendAction, closeLobby } = useMultiplayer(dispatch, state, playerUUID);

    const matchDispatch = (action: GameAction) => {
        // If we are connected to a game, we always "Send" the action.
        // The sendAction function handles updating the DB (and optionally local optimistic update).
        if (mpState.connectionStatus === 'connected' && mpState.gameId) {
            sendAction(action);
        } else {
            // Local play (or lobby before connection)
            dispatch(action);
        }
    };

    return {
        state,
        dispatch: matchDispatch,
        mpState,
        hostGame,
        joinGame,
        closeLobby
    };
};
