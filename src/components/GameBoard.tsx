import React, { useState, useEffect } from 'react';
import type { GameState, Card as CardType, TokenBank, Player, Cost } from '../types';
import type { GameAction } from '../hooks/gameReducer';

// Sub-components
const Token = ({ color, count, onClick }: { color: keyof TokenBank, count: number, onClick?: () => void }) => (
    <div
        className={`token ${color}`}
        onClick={onClick}
        style={{ opacity: count > 0 ? 1 : 0.5, pointerEvents: count > 0 ? 'auto' : 'none' }}
    >
        {count}
    </div>
);

const CardView = ({ card, onClick, disabled, canAfford }: { card: CardType, onClick: () => void, disabled?: boolean, canAfford?: boolean }) => {
    const bgImage = card.imageUrl || `/assets/hero-tier-${card.tier}.png`;
    const [animate, setAnimate] = useState(true);

    useEffect(() => {
        // Animation runs on mount. We can remove the class after animation if needed, 
        // but keeping it is fine as long as we don't re-add it.
        // Actually, if the key changes, the component remounts and `animate` resets to true.
        // If the key stays same, `animate` stays false (after we set it false).
        const timer = setTimeout(() => setAnimate(false), 500); // Match CSS animation duration
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`card ${card.bonus} ${canAfford ? 'affordable' : ''} ${animate ? 'card-enter' : ''}`} onClick={disabled ? undefined : onClick} style={{ cursor: disabled ? 'default' : 'pointer', backgroundImage: `url(${bgImage})` }}>
            <div className="card-header">
                <span className="card-points">{card.points || ''}</span>
                {card.tier === 3 && (
                    <div style={{
                        position: 'absolute', top: '5px', right: '5px',
                        width: '15px', height: '15px', borderRadius: '50%',
                        background: 'radial-gradient(circle at 30% 30%, #aaffaa, #00aa00)',
                        boxShadow: '0 0 5px #00ff00',
                        border: '1px solid #fff',
                        zIndex: 2
                    }} title="Grants Time Stone (Green)"></div>
                )}
            </div>
            <div className="card-cost">
                {Object.entries(card.cost).map(([color, amt]) => (
                    amt > 0 ? <div key={color} className={`cost-bubble ${color}`}>{amt}</div> : null
                ))}
            </div>
            {card.name && (
                <div style={{
                    position: 'absolute', bottom: '2px', right: '2px',
                    fontSize: '0.6rem', background: 'rgba(0,0,0,0.7)', padding: '1px 3px', borderRadius: '3px',
                    maxWidth: '65px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    textShadow: '0 1px 1px black'
                }}>
                    {card.name}
                </div>
            )}
        </div>
    );
};

const PlayerArea = ({ player, isActive, onCardClick, isMe }: { player: Player, isActive: boolean, onCardClick: (card: CardType) => void, isMe?: boolean }) => (
    <div className={`player-card ${isActive ? 'active-turn' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{player.name} {isMe ? <span style={{ color: 'var(--marvel-blue)', fontSize: '0.8rem' }}>(You)</span> : ''} {isActive ? '★' : ''}</h3>
            <div style={{ fontWeight: 'bold', color: 'var(--marvel-yellow)' }}>{player.points} VP</div>
        </div>

        {/* Tokens */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', margin: '5px 0' }}>
            {Object.entries(player.tokens).map(([color, count]) => (
                count > 0 ? <div key={color} className={`cost-bubble ${color}`}>{count}</div> : null
            ))}
        </div>

        {/* Reserved Cards */}
        {player.hand.length > 0 && (
            <div style={{ marginBottom: '5px' }}>
                <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '2px' }}>Reserved ({player.hand.length})</div>
                <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                    {player.hand.map(card => (
                        <div key={card.id} style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '60px', height: '84px' }}>
                            <CardView card={card} onClick={() => onCardClick(card)} />
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Tableau (Built Cards) */}
        <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '2px' }}>Tableau ({player.tableau.length})</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
            {player.tableau.map(card => (
                <div key={card.id} style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '60px', height: '84px', marginBottom: '-40px', marginRight: '-10px' }}>
                    <CardView card={card} onClick={() => onCardClick(card)} />
                </div>
            ))}
        </div>

        {/* Bonus Summary (keep for quick reference) */}
        <div style={{ display: 'flex', gap: '2px', marginTop: '40px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2px' }}>
            {['red', 'blue', 'green', 'yellow', 'purple', 'orange'].map(c => {
                const count = player.tableau.filter(card => card.bonus === c).length;
                return count > 0 ? (
                    <div key={c} style={{ display: 'flex', alignItems: 'center', fontSize: '0.7rem', marginRight: '4px' }}>
                        <div style={{ width: '8px', height: '8px', background: c === 'green' ? '#33ff33' : c, borderRadius: '50%', marginRight: '2px' }}></div>
                        {count}
                    </div>
                ) : null;
            })}
        </div>
    </div>
);

interface GameBoardProps {
    state: GameState;
    dispatch: (action: GameAction) => void;
    myPeerId: string | null;
    closeLobby?: () => void;
    isHost?: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({ state, dispatch, myPeerId, closeLobby, isHost }) => {
    const isMyTurn = state.players[state.currentPlayerIndex].id === myPeerId || (myPeerId === null && state.currentPlayerIndex === 0);
    const [selectedTokens, setSelectedTokens] = useState<Partial<TokenBank>>({});
    const [selectedCard, setSelectedCard] = useState<CardType | null>(null); // For Modal

    // Reset selected tokens when turn changes
    useEffect(() => {
        setSelectedTokens({});
    }, [state.currentPlayerIndex]);

    // Split players for left/right panels
    const midPoint = Math.ceil(state.players.length / 2);
    const leftPlayers = state.players.slice(0, midPoint);
    const rightPlayers = state.players.slice(midPoint);

    const handleTakeToken = (color: keyof TokenBank) => {
        if (!isMyTurn) return;
        if (color === 'gray' || color === 'green') return;

        const currentSelection = { ...selectedTokens };
        const currentCount = currentSelection[color] || 0;
        const newCount = currentCount + 1;

        const totalSelected = Object.values(currentSelection).reduce((a, b) => a + b, 0);
        const distinctColors = Object.keys(currentSelection).length;

        if (newCount === 2) {
            if (state.tokens[color] < 4) {
                alert("Cannot take 2 of this color (less than 4 in bank).");
                return;
            }
            if (totalSelected > 1) {
                alert("Cannot take 2 of same color if you have other colors selected.");
                return;
            }
            currentSelection[color] = 2;
            setSelectedTokens(currentSelection);
        } else if (newCount === 1) {
            const hasDouble = Object.values(currentSelection).some(v => v === 2);
            if (hasDouble) {
                alert("Cannot take different colors if you selected 2 of the same.");
                return;
            }
            if (distinctColors >= 3) {
                alert("Max 3 distinct tokens.");
                return;
            }
            currentSelection[color] = 1;
            setSelectedTokens(currentSelection);
        }
    };

    const confirmTakeTokens = () => {
        const player = state.players[state.currentPlayerIndex];
        const currentTotal = Object.values(player.tokens).reduce((a, b) => a + b, 0);
        const selectedCount = Object.values(selectedTokens).reduce((a, b) => a + b, 0);

        if (currentTotal + selectedCount > 10) {
            alert(`Cannot take tokens: You have ${currentTotal} and selected ${selectedCount}. Limit is 10.`);
            return;
        }

        dispatch({
            type: 'TAKE_TOKENS',
            tokens: { red: 0, blue: 0, yellow: 0, purple: 0, orange: 0, green: 0, gray: 0, ...selectedTokens }
        });
        setSelectedTokens({});
        dispatch({ type: 'END_TURN' });
    };

    const handleCardClick = (card: CardType) => {
        if (!isMyTurn) return;
        setSelectedCard(card);
    };

    // Validation for Recruitment
    const canAfford = (card: CardType) => {
        if (!isMyTurn) return false;
        const player = state.players[state.currentPlayerIndex];

        // Calculate Cost
        const discount: Record<string, number> = { red: 0, blue: 0, yellow: 0, purple: 0, orange: 0 };
        player.tableau.forEach(c => {
            if (c.bonus && discount[c.bonus] !== undefined) discount[c.bonus]++;
        });

        const cost = card.cost;
        let goldNeeded = 0;
        let goldAvailable = player.tokens.gray;

        for (const c of ['red', 'blue', 'yellow', 'purple', 'orange'] as const) {
            const val = cost[c as keyof Cost] || 0;
            const effectiveCost = Math.max(0, val - (discount[c] || 0));
            if (player.tokens[c] < effectiveCost) {
                goldNeeded += (effectiveCost - player.tokens[c]);
            }
        }

        return goldAvailable >= goldNeeded;
    };

    const handleAction = (type: 'RECRUIT' | 'RESERVE') => {
        if (!selectedCard) return;
        if (type === 'RECRUIT') {
            dispatch({ type: 'RECRUIT_CARD', cardId: selectedCard.id });
        } else {
            dispatch({ type: 'RESERVE_CARD', cardId: selectedCard.id });
        }
        dispatch({ type: 'END_TURN' });
        setSelectedCard(null);
    };

    return (
        <div className="game-layout">
            {/* Turn Indicator Overlay */}
            {isMyTurn && <div className="turn-indicator-overlay"></div>}

            {/* Status Text */}
            <div style={{
                position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
                background: isMyTurn ? 'rgba(50, 200, 50, 0.9)' : 'rgba(0, 0, 0, 0.6)',
                color: isMyTurn ? 'white' : '#aaa',
                padding: '8px 24px', borderRadius: '30px',
                fontSize: '1rem', fontWeight: isMyTurn ? 'bold' : 'normal',
                pointerEvents: 'none', zIndex: 1000, /* High z-index to sit above overlay */
                boxShadow: isMyTurn ? '0 0 20px var(--marvel-green)' : 'none',
                border: isMyTurn ? '1px solid #fff' : '1px solid rgba(255,255,255,0.1)'
            }}>
                {isMyTurn ? "Your Turn!" : `${state.players[state.currentPlayerIndex].name}'s Turn`}
            </div>

            {/* Host Quit Button */}
            {isHost && closeLobby && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm("Are you sure you want to close the lobby? This will disconnect all players.")) {
                            closeLobby();
                        }
                    }}
                    style={{
                        position: 'absolute', top: '10px', right: '10px',
                        background: 'rgba(255, 0, 0, 0.7)', color: 'white', border: '1px solid #ff4444',
                        padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', zIndex: 1001,
                        pointerEvents: 'auto'
                    }}
                >
                    Quit Game
                </button>
            )}

            <div className="player-panel left">
                {leftPlayers.map((p) => (
                    <PlayerArea key={p.id} player={p} isActive={state.players.indexOf(p) === state.currentPlayerIndex} onCardClick={handleCardClick} isMe={p.id === myPeerId} />
                ))}
            </div>

            <div className="board-center">
                {/* Bank */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', paddingTop: '10px' }}>
                    <div style={{ position: 'relative', display: 'flex', gap: '10px' }}>
                        {(['red', 'blue', 'yellow', 'purple', 'orange', 'gray', 'green'] as const).map(c => (
                            <div key={c} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                                <Token color={c} count={state.tokens[c]} onClick={() => handleTakeToken(c)} />
                                {selectedTokens[c as keyof TokenBank] ? (
                                    <span style={{
                                        position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)',
                                        color: 'lime', fontWeight: 'bold', textShadow: '0 1px 2px black'
                                    }}>
                                        +{selectedTokens[c as keyof TokenBank]}
                                    </span>
                                ) : null}
                            </div>
                        ))}
                        {/* Buttons - Absolute positioned relative to the token cluster */}
                        {isMyTurn && Object.keys(selectedTokens).length > 0 &&
                            <div style={{
                                position: 'absolute', top: '50%', left: '100%', transform: 'translate(15px, -50%)',
                                display: 'flex', flexDirection: 'column', gap: '5px', width: 'max-content'
                            }}>
                                <button onClick={confirmTakeTokens} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Confirm</button>
                                <button onClick={() => setSelectedTokens({})} style={{ background: '#444', border: 'none', color: 'white', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Reset</button>
                            </div>
                        }
                    </div>
                </div>

                {/* Market */}
                <div className="market-grid">
                    {[3, 2, 1].map(tier => (
                        <div key={tier} className="card-row">
                            {/* Deck Back */}
                            <div className="card" style={{
                                backgroundImage: `url(/assets/card-back-${tier}.png)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <div style={{
                                    background: 'rgba(0,0,0,0.7)',
                                    padding: '5px 10px',
                                    borderRadius: '15px',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
                                }}>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', lineHeight: '1' }}>
                                        {state.decks[tier as 1 | 2 | 3].length}
                                    </span>
                                    <span style={{ fontSize: '0.6rem', color: '#aaa', textTransform: 'uppercase', marginTop: '2px' }}>Left</span>
                                </div>
                            </div>

                            {/* Visible Cards */}
                            {state.market[tier as 1 | 2 | 3].map(card => (
                                <CardView key={card.id} card={card} onClick={() => handleCardClick(card)} canAfford={canAfford(card)} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div className="player-panel right">
                {rightPlayers.map((p) => (
                    <PlayerArea key={p.id} player={p} isActive={state.players.indexOf(p) === state.currentPlayerIndex} onCardClick={handleCardClick} isMe={p.id === myPeerId} />
                ))}
            </div>



            {/* Modal */}
            {selectedCard && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }}>
                    <div className="glass-panel" style={{ textAlign: 'center', border: '1px solid var(--marvel-blue)', boxShadow: '0 0 30px var(--marvel-blue)' }}>
                        <h3>Selected Card</h3>
                        <div style={{ margin: '20px auto', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ transform: 'scale(1.5)', margin: '30px' }}>
                                <CardView card={selectedCard} onClick={() => { }} disabled />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            {(() => {
                                const player = state.players[state.currentPlayerIndex];
                                const isOwned = player.tableau.some(c => c.id === selectedCard.id);
                                const isReserved = player.hand.some(c => c.id === selectedCard.id);

                                // Check if owned/reserved by opponent
                                const isOpponentCard = state.players.some(p =>
                                    p.id !== player.id && (
                                        p.tableau.some(c => c.id === selectedCard.id) ||
                                        p.hand.some(c => c.id === selectedCard.id)
                                    )
                                );

                                if (isOpponentCard) {
                                    return <button disabled style={{ padding: '12px 24px', background: '#555', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'not-allowed' }}>Opponent's Card</button>;
                                }

                                if (isOwned) {
                                    return <button disabled style={{ padding: '12px 24px', background: '#555', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'not-allowed' }}>Already Owned</button>;
                                }

                                const missing = (() => {
                                    if (canAfford(selectedCard)) return null;

                                    const discount: Record<string, number> = { red: 0, blue: 0, yellow: 0, purple: 0, orange: 0 };
                                    player.tableau.forEach(c => {
                                        if (c.bonus && discount[c.bonus] !== undefined) discount[c.bonus]++;
                                    });

                                    const cost = selectedCard.cost;
                                    let goldNeeded = 0;
                                    let goldAvailable = player.tokens.gray;
                                    const missingCounts: string[] = [];

                                    for (const c of ['red', 'blue', 'yellow', 'purple', 'orange'] as const) {
                                        const val = cost[c as keyof Cost] || 0;
                                        const effectiveCost = Math.max(0, val - (discount[c] || 0));
                                        if (player.tokens[c] < effectiveCost) {
                                            const diff = effectiveCost - player.tokens[c];
                                            goldNeeded += diff;
                                            // We don't list color missing if we can cover with gold, 
                                            // but if we can't cover with gold, we should show what's missing.
                                            // Actually, simplest is to just show total missing value after gold application?
                                            // Or show specific colors missing assuming gold is used optimally?
                                            // Let's show raw missing colors first.
                                            missingCounts.push(`${diff} ${c.charAt(0).toUpperCase() + c.slice(1)}`);
                                        }
                                    }

                                    if (goldAvailable >= goldNeeded) return null; // Should be caught by canAfford

                                    // If we are here, goldAvailable < goldNeeded.
                                    // We want to show exactly what is missing.
                                    // Since gold can cover anything, we can't be 100% precise on WHICH color is missing if we have some gold but not enough.
                                    // But listing the raw missing amounts is the most helpful.
                                    // Example: Missing 2 Red, 1 Blue. (Have 1 Gold).
                                    // User knows they need 2 more gems total.

                                    const missingStr = missingCounts.join(', ');
                                    return `Missing: ${missingStr}`;
                                })();

                                return (
                                    <>
                                        {canAfford(selectedCard) ? (
                                            <button className="btn-primary" onClick={() => handleAction('RECRUIT')}>Recruit</button>
                                        ) : (
                                            <button disabled style={{ padding: '12px 24px', background: '#555', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'not-allowed' }}>
                                                {missing ? missing : "Cannot Afford"}
                                            </button>
                                        )}
                                        {!isReserved && (
                                            <button className="btn-primary" style={{ filter: 'hue-rotate(90deg)' }} onClick={() => handleAction('RESERVE')}>Reserve</button>
                                        )}
                                    </>
                                );
                            })()}
                            <button style={{ padding: '10px', background: 'transparent', border: '1px solid #666', color: 'white', borderRadius: '4px', cursor: 'pointer' }} onClick={() => setSelectedCard(null)}>Cancel</button>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '10px' }}>Recruit adds to Tableau. Reserve adds to Hand + 1 Gold.</p>
                    </div>
                </div>
            )}
            {/* Victory Screen */}
            {state.status === 'GAME_OVER' && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                }}>
                    <h1 style={{ fontSize: '4rem', color: 'gold', textShadow: '0 0 20px orange', marginBottom: '20px' }}>Game Over!</h1>
                    <h2 style={{ fontSize: '2rem', color: 'white', marginBottom: '40px' }}>{state.winner} Wins!</h2>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        {state.players.map(p => (
                            <div key={p.id} style={{
                                background: p.name === state.winner ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255,255,255,0.1)',
                                padding: '20px', borderRadius: '10px', border: p.name === state.winner ? '2px solid gold' : '1px solid #444',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '10px' }}>{p.name}</div>
                                <div style={{ fontSize: '1.2rem', color: 'var(--marvel-yellow)' }}>{p.points} VP</div>
                                <div style={{ fontSize: '0.9rem', color: '#aaa' }}>{p.tableau.length} Cards</div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => {
                        sessionStorage.removeItem('splendor_gameState');
                        sessionStorage.removeItem('splendor_host');
                        sessionStorage.removeItem('splendor_gameId');
                        window.location.reload();
                    }} style={{ marginTop: '50px', padding: '15px 30px', fontSize: '1.2rem', cursor: 'pointer', background: 'var(--marvel-blue)', color: 'white', border: 'none', borderRadius: '5px' }}>
                        Return to Lobby
                    </button>
                </div>
            )}
        </div>
    );
};
