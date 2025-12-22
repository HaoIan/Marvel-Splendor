import { useReducer, useEffect } from 'react';
import { gameReducer, createInitialState } from './gameReducer';
import type { GameAction } from './gameReducer';
import { useMultiplayer } from './useMultiplayer';


export const useGameEngine = () => {
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
    const { mpState, hostGame, joinGame, sendAction, closeLobby, startGame } = useMultiplayer(dispatch, state);

    const matchDispatch = (action: GameAction) => {
        // If we are Local (no MP) or Host, we dispatch locally.
        // If MP Host, `useMultiplayer` effect will sync state to client.
        // If we are Client, we send action to Host (unless it's 'SYNC_STATE' which comes from Host).

        if (mpState.connectionStatus === 'connected' && !mpState.isHost) {
            // Client logic: Send to server
            // Exception: Local only actions or optimistic updates? 
            // For now, strict Host-authoritative.
            sendAction(action);
        } else {
            // Host or Local
            dispatch(action);
        }
    };

    return {
        state,
        dispatch: matchDispatch,
        mpState,
        hostGame,
        joinGame,
        closeLobby,
        startGame
    };
};
