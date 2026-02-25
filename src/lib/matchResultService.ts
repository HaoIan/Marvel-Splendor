import { supabase } from './supabase';
import { incrementStats, getProfile } from './profileService';
import type { GameState } from '../types';

export interface MatchResult {
    id: string;
    match_id: string;
    winner_name: string;
    winner_id: string | null;
    players: MatchPlayerSnapshot[];
    total_turns: number;
    finished_at: string;
}

export interface MatchPlayerSnapshot {
    id: string;
    name: string;
    points: number;
    cards: number;
    isRegistered: boolean;
}

/**
 * Save the result of a completed game.
 * Should only be called once per match (host-side, guarded by a ref).
 */
export const saveMatchResult = async (matchId: string, gameState: GameState): Promise<boolean> => {
    if (gameState.status !== 'GAME_OVER' || !gameState.winner) {
        return false;
    }

    // Build player snapshots and check which players are registered
    const playerSnapshots: MatchPlayerSnapshot[] = await Promise.all(
        gameState.players.map(async (p) => {
            const profile = await getProfile(p.id);
            return {
                id: p.id,
                name: p.name,
                points: p.points,
                cards: p.tableau.length,
                isRegistered: !!profile,
            };
        })
    );

    // Determine winner(s) — could be multiple names joined by " & "
    const winnerNames = gameState.winner;

    // Try to find the winner's user ID (first winning player who is registered)
    const winningPlayers = gameState.players.filter(p => winnerNames.includes(p.name));
    let winnerId: string | null = null;
    for (const wp of winningPlayers) {
        const profile = await getProfile(wp.id);
        if (profile) {
            winnerId = wp.id;
            break;
        }
    }

    // Insert match result
    const { error } = await supabase
        .from('match_results')
        .insert([{
            match_id: matchId,
            winner_name: winnerNames,
            winner_id: winnerId,
            players: playerSnapshots,
            total_turns: gameState.turn,
        }]);

    if (error) {
        console.error('Error saving match result:', error);
        return false;
    }

    // Increment stats for registered players
    for (const snapshot of playerSnapshots) {
        if (snapshot.isRegistered) {
            const isWinner = winnerNames.includes(snapshot.name);
            await incrementStats(snapshot.id, isWinner);
        }
    }

    console.log('Match result saved successfully');
    return true;
};
