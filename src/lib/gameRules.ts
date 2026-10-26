import type { Card, Player, TokenBank } from '../types';

export const PAYMENT_COLORS = ['red', 'blue', 'yellow', 'purple', 'orange'] as const;

export const createPlayer = (config: { id: string; name: string; uuid?: string }): Player => ({
    ...config,
    tokens: { red: 0, blue: 0, yellow: 0, purple: 0, orange: 0, green: 0, gray: 0 },
    hand: [],
    tableau: [],
    nobles: [],
    locations: [],
    points: 0,
    isHuman: true
});

export const calculatePayment = (player: Player, card: Card) => {
    const payment: TokenBank = { red: 0, blue: 0, yellow: 0, purple: 0, orange: 0, green: 0, gray: 0 };
    const shortfall: Partial<Record<typeof PAYMENT_COLORS[number], number>> = {};
    for (const color of PAYMENT_COLORS) {
        const discount = player.tableau.filter(c => c.bonus === color).length;
        const needed = Math.max(0, (card.cost[color] || 0) - discount);
        payment[color] = Math.min(player.tokens[color], needed);
        const missing = needed - payment[color];
        if (missing > 0) shortfall[color] = missing;
        payment.gray += missing;
    }
    return { payment, shortfall, canAfford: player.tokens.gray >= payment.gray };
};
