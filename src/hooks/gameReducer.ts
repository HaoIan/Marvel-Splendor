import type { GameState, Player, TokenBank, Card, Cost } from '../types';
import { INITIAL_DECK } from '../data/cards';


export type GameAction =
    | { type: 'TAKE_TOKENS'; tokens: TokenBank }
    | { type: 'RESERVE_CARD'; cardId: string }
    | { type: 'RECRUIT_CARD'; cardId: string }
    | { type: 'END_TURN' }
    | { type: 'SYNC_STATE'; state: GameState }
    | { type: 'PLAYER_JOINED'; player: Player }
    | { type: 'START_GAME'; players: { id: string; name: string; uuid?: string }[] }
    | { type: 'RECONNECT_PLAYER'; oldId: string; newId: string };

// Shuffle helper
const shuffle = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

export const createInitialState = (playerConfig: { id: string; name: string; uuid?: string }[]): GameState => {
    const shuffledDeck = shuffle([...INITIAL_DECK]);

    const deck1 = shuffledDeck.filter((c: Card) => c.tier === 1);
    const deck2 = shuffledDeck.filter((c: Card) => c.tier === 2);
    const deck3 = shuffledDeck.filter((c: Card) => c.tier === 3);

    const market = {
        1: deck1.splice(0, 4),
        2: deck2.splice(0, 4),
        3: deck3.splice(0, 4),
    };

    const players: Player[] = playerConfig.map(cfg => ({
        id: cfg.id,
        name: cfg.name,
        uuid: cfg.uuid,
        tokens: { red: 0, blue: 0, yellow: 0, purple: 0, orange: 0, green: 0, gray: 0 },
        hand: [],
        tableau: [],
        nobles: [],
        points: 0,
        isHuman: true
    }));

    // Standard setup: 2p->4, 3p->5, 4p->7
    const bankSize = playerConfig.length === 2 ? 4 : playerConfig.length === 3 ? 5 : 7;

    return {
        players,
        currentPlayerIndex: 0,
        tokens: { red: bankSize, blue: bankSize, yellow: bankSize, purple: bankSize, orange: bankSize, green: bankSize, gray: 5 },
        decks: { 1: deck1, 2: deck2, 3: deck3 },
        market,
        nobles: [],
        turn: 1,
        winner: null,
        logs: ['Game initialized.'],
        status: 'LOBBY'
    };
};

const getCardFromMarket = (state: GameState, cardId: string): { card: Card, tier: 1 | 2 | 3, index: number } | null => {
    for (const tier of [1, 2, 3] as const) {
        const index = state.market[tier].findIndex(c => c.id === cardId);
        if (index !== -1) return { card: state.market[tier][index], tier, index };
    }
    return null;
};

export const gameReducer = (state: GameState, action: GameAction): GameState => {
    switch (action.type) {
        case 'SYNC_STATE':
            return action.state;

        case 'START_GAME':
            return {
                ...createInitialState(action.players),
                status: 'PLAYING'
            };

        case 'TAKE_TOKENS': {
            const playerIndex = state.currentPlayerIndex;
            const player = { ...state.players[playerIndex], tokens: { ...state.players[playerIndex].tokens } };

            const currentTotal = Object.values(player.tokens).reduce((a, b) => a + b, 0);
            const taken = action.tokens;
            const takenCount = Object.values(taken).reduce((a, b) => a + b, 0);

            if (currentTotal + takenCount > 10) {
                return state; // Reject: Exceeds limit
            }

            const newTokens = { ...state.tokens };
            (Object.keys(taken) as (keyof TokenBank)[]).forEach(k => {
                if (taken[k] > 0) {
                    newTokens[k] -= taken[k];
                    player.tokens[k] += taken[k];
                }
            });

            const newPlayers = [...state.players];
            newPlayers[playerIndex] = player;

            return {
                ...state,
                tokens: newTokens,
                players: newPlayers,
                logs: [...state.logs, `${player.name} took tokens.`]
            };
        }

        case 'RECRUIT_CARD': {
            const playerIndex = state.currentPlayerIndex;
            const player = { ...state.players[playerIndex], tokens: { ...state.players[playerIndex].tokens } };
            let card = player.hand.find(c => c.id === action.cardId);
            let fromReserve = true;
            let marketMeta = null;

            if (!card) {
                fromReserve = false;
                marketMeta = getCardFromMarket(state, action.cardId);
                if (!marketMeta) return state; // Error
                card = marketMeta.card;
            }

            if (!card) return state;

            // Calculate Cost
            // 1. Discount from Tableau
            const discount: Record<string, number> = { red: 0, blue: 0, yellow: 0, purple: 0, orange: 0 };
            player.tableau.forEach(c => {
                if (c.bonus && discount[c.bonus] !== undefined) discount[c.bonus]++;
            });

            // 2. Pay tokens
            const cost = card.cost;
            const newBank = { ...state.tokens };
            let goldNeeded = 0;

            (Object.keys(cost) as (keyof TokenBank)[]).forEach(color => {
                const needed = (cost[color as keyof Cost] || 0);
                const distcountedNeeded = Math.max(0, needed - (discount[color] || 0));

                if (player.tokens[color] >= distcountedNeeded) {
                    player.tokens[color] -= distcountedNeeded;
                    newBank[color] += distcountedNeeded;
                } else {
                    const shortage = distcountedNeeded - player.tokens[color];
                    player.tokens[color] = 0; // Paid all owned
                    newBank[color] += (distcountedNeeded - shortage); // Paid what we had
                    goldNeeded += shortage;
                }
            });

            // Pay Gold
            if (player.tokens.gray < goldNeeded) return state; // Should be validated in UI
            player.tokens.gray -= goldNeeded;
            newBank.gray += goldNeeded;

            // Prepare new Market and Decks state (Immutable)
            const newMarket = { ...state.market };
            const newDecks = { ...state.decks };

            // Move Card
            if (fromReserve) {
                player.hand = player.hand.filter(c => c.id !== card!.id);
            } else if (marketMeta) {
                // Replace in market
                const tier = marketMeta.tier;
                const newMarketTier = [...state.market[tier]];
                const newDeckTier = [...state.decks[tier]];

                if (newDeckTier.length > 0) {
                    newMarketTier[marketMeta.index] = newDeckTier.shift()!;
                } else {
                    newMarketTier.splice(marketMeta.index, 1); // Empty spot
                }
                newMarket[tier] = newMarketTier;
                newDecks[tier] = newDeckTier;
            }

            player.tableau = [...player.tableau, card];
            player.points += card.points;

            if (card.tier === 3 && player.tokens.green === 0) {
                // If bank has the green token (it should), take it.
                // Even if bank logic was off, rule is you get it. But we want to track bank state.
                if (newBank.green > 0) {
                    newBank.green -= 1;
                }
                player.tokens.green = 1;
            }

            const newPlayers = [...state.players];
            newPlayers[playerIndex] = player;

            return {
                ...state,
                players: newPlayers,
                tokens: newBank,
                market: newMarket,
                decks: newDecks,
                logs: [...state.logs, `${player.name} recruited ${card.points}pt card.`]
            };
        }

        case 'RESERVE_CARD': {
            const playerIndex = state.currentPlayerIndex;
            const player = { ...state.players[playerIndex], tokens: { ...state.players[playerIndex].tokens } };

            if (player.hand.length >= 3) return state; // Max 3 reserved

            const marketMeta = getCardFromMarket(state, action.cardId);
            if (!marketMeta) return state;

            const { card, tier, index } = marketMeta;

            // Take Gold if available AND player has space (limit 10)
            const newTokens = { ...state.tokens };
            const currentTotal = Object.values(player.tokens).reduce((a, b) => a + b, 0);

            if (newTokens.gray > 0 && currentTotal < 10) {
                newTokens.gray--;
                player.tokens.gray++;
            }

            // Move to hand
            player.hand = [...player.hand, card];

            // Replace in Market
            const newMarket = { ...state.market };
            const newDecks = { ...state.decks };
            const newMarketTier = [...state.market[tier]];
            const newDeckTier = [...state.decks[tier]];

            if (newDeckTier.length > 0) {
                newMarketTier[index] = newDeckTier.shift()!;
            } else {
                newMarketTier.splice(index, 1);
            }

            newMarket[tier] = newMarketTier;
            newDecks[tier] = newDeckTier;

            const newPlayers = [...state.players];
            newPlayers[playerIndex] = player;

            return {
                ...state,
                players: newPlayers,
                tokens: newTokens,
                market: newMarket,
                decks: newDecks,
                logs: [...state.logs, `${player.name} reserved a card.`]
            };
        }

        case 'END_TURN': {
            const player = state.players[state.currentPlayerIndex];
            let nextState = { ...state };

            // Check Win Condition Trigger: 16 Points + Green Stone
            // If condition met, and not already in final round, trigger final round.
            if (!state.finalRound && player.points >= 16 && player.tokens.green > 0) {
                nextState.finalRound = true;
                nextState.logs = [...nextState.logs, `${player.name} has triggered the end game! Finishing the round...`];
            }

            const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;

            // Check if Round Ended (back to player 0)
            if (nextIndex === 0) {
                // If we are in final round, game ends now.
                if (nextState.finalRound) {
                    // Determine Winner
                    // Tie-breaker: Most points -> Fewest Development Cards (Tableau size)
                    const sortedPlayers = [...nextState.players].sort((a, b) => {
                        if (b.points !== a.points) return b.points - a.points;
                        return a.tableau.length - b.tableau.length; // Fewer cards is better
                    });

                    const winners = sortedPlayers.filter(p =>
                        p.points === sortedPlayers[0].points &&
                        p.tableau.length === sortedPlayers[0].tableau.length
                    );

                    const winnerNames = winners.map(p => p.name).join(' & ');

                    return {
                        ...nextState,
                        currentPlayerIndex: nextIndex, // Reset to 0 just in case
                        winner: winnerNames,
                        status: 'GAME_OVER',
                        logs: [...nextState.logs, `Round Complete. GAME OVER! ${winnerNames} WINS with ${winners[0].points} points!`]
                    };
                }
            }

            return {
                ...nextState,
                currentPlayerIndex: nextIndex,
                turn: nextIndex === 0 ? state.turn + 1 : state.turn
            };
        }

        case 'PLAYER_JOINED': {
            if (state.players.some(p => p.id === action.player.id)) return state;
            return {
                ...state,
                players: [...state.players, action.player]
            };
        }

        case 'RECONNECT_PLAYER': {
            const { oldId, newId } = action;
            const playerIndex = state.players.findIndex(p => p.id === oldId);
            if (playerIndex === -1) return state;

            const newPlayers = [...state.players];
            newPlayers[playerIndex] = { ...newPlayers[playerIndex], id: newId };

            return {
                ...state,
                players: newPlayers,
                logs: [...state.logs, `${newPlayers[playerIndex].name} reconnected.`]
            };
        }

        default:
            return state;
    }
};
