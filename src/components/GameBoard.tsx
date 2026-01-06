import React, { useState, useEffect, useRef } from 'react';
import type { GameState, Card as CardType, TokenBank, Player, Cost, Location } from '../types';
import type { GameAction } from '../hooks/gameReducer';
import { AnimationOverlay, type AnimationItem } from './AnimationOverlay';
import { useSoundEffects } from '../hooks/useSoundEffects'; // Import Sound Hook
import { v4 as uuidv4 } from 'uuid';

// Card Back Assets
import cardBack1 from '../assets/card-backs/card-back-1.png';
import cardBack2 from '../assets/card-backs/card-back-2.png';
import cardBack3 from '../assets/card-backs/card-back-3.png';

// Token Assets
import mindToken from '../assets/tokens/mind-token.png';
import powerToken from '../assets/tokens/power-token.png';
import realityToken from '../assets/tokens/reality-token.png';
import shieldToken from '../assets/tokens/shield-token.png';
import soulToken from '../assets/tokens/soul-token.png';
import spaceToken from '../assets/tokens/space-token.png';
import timeToken from '../assets/tokens/time-token.png';

const TOKEN_IMAGES: Record<string, string> = {
    yellow: mindToken,
    purple: powerToken,
    red: realityToken,
    gray: shieldToken,
    orange: soulToken,
    blue: spaceToken,
    green: timeToken
};

const CARD_BACKS: Record<number, string> = {
    1: cardBack1,
    2: cardBack2,
    3: cardBack3
};

// Sub-components
const Token = ({ color, count, onClick, size = 100, style }: { color: keyof TokenBank, count: number, onClick?: () => void, size?: number, style?: React.CSSProperties }) => (
    <div
        id={onClick ? `token-bank-${color}` : undefined} // ID for animation source
        className={`token ${color}`}
        onClick={onClick}
        style={{
            opacity: count > 0 ? 1 : 0.5,
            pointerEvents: count > 0 ? 'auto' : 'none',
            backgroundImage: `url(${TOKEN_IMAGES[color]})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: 'transparent',
            boxShadow: 'none',
            border: 'none',
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...style
        }}
    >
        <span style={{
            textShadow: '0 0 4px #000, 0 0 2px #000',
            color: 'white',
            fontSize: `${size * 0.25}px`
        }}>
            {count}
        </span>
    </div>
);

const CardView = ({ card, onClick, disabled, canAfford, noAnimate, hideName }: { card: CardType, onClick: () => void, disabled?: boolean, canAfford?: boolean, noAnimate?: boolean, hideName?: boolean }) => {
    const bgImage = card.imageUrl || `/assets/hero-tier-${card.tier}.png`;
    const [animate, setAnimate] = useState(!noAnimate);
    const [animDelay, setAnimDelay] = useState('0s');

    useEffect(() => {
        // Match CSS animation duration
        const timer = setTimeout(() => setAnimate(false), 500);
        return () => clearTimeout(timer);
    }, []);

    // Sync animation delay when 'canAfford' changes
    useEffect(() => {
        if (canAfford) {
            // Calculate delay to sync with global 2s cycle
            // Use negative delay to start animation at correct phase immediately
            const delay = -(Date.now() % 2000) + 'ms';
            setAnimDelay(delay);
        }
    }, [canAfford]);

    return (
        <div
            className={`card ${card.bonus} ${canAfford ? 'affordable' : ''} ${animate ? 'card-enter' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={disabled ? undefined : onClick}
            style={{
                cursor: disabled ? 'default' : 'pointer',
                backgroundImage: `url(${bgImage})`,
                animationDelay: canAfford ? animDelay : '0s'
            }}
        >
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
            {card.name && !hideName && (
                <div className="card-name-label" style={{
                    position: 'absolute', bottom: '2px', right: '2px',
                    fontSize: '0.6rem', background: 'rgba(0,0,0,0.7)', padding: '1px 3px', borderRadius: '3px',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    textShadow: '0 1px 1px black'
                }}>
                    {card.name}
                </div>
            )}
        </div>
    );
};

const LocationView = ({ location, onClick, style, disabled, hideName }: { location: Location, onClick?: () => void, style?: React.CSSProperties, disabled?: boolean, hideName?: boolean }) => (
    <div
        className={`card location ${disabled ? 'disabled' : ''}`} // Reuse 'card' class for hover effects and base styling
        onClick={onClick}
        style={{
            width: '130px', // Match card width
            height: '130px', // Match card height
            backgroundImage: `url(${location.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '10px',
            border: '1px solid white',
            position: 'relative',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            cursor: onClick ? 'pointer' : 'default',
            display: 'flex',
            flexDirection: 'column',
            ...style
        }}
    >
        <div className="card-header">
            <span className="card-points" style={{ textShadow: '0 0 5px gold, 0 1px 2px black', color: 'white' }}>{location.points}</span>
        </div>

        {/* Reusing card-cost class for consistent layout */}
        <div className="card-cost" style={{ flexDirection: 'column-reverse' }}>
            {Object.entries(location.requirements).map(([color, amt]) => (
                <div key={color} className={`cost-bubble ${color}`} style={{ borderRadius: '25%' }}>{amt}</div>
            ))}
        </div>

        {!hideName && (
            <div className="location-name-label" style={{
                position: 'absolute', bottom: '2px', right: '2px',
                fontSize: '0.6rem', background: 'rgba(0,0,0,0.7)', padding: '1px 3px', borderRadius: '3px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                textShadow: '0 1px 1px black', color: 'white'
            }}>
                {location.name}
            </div>
        )}
    </div>
);

const PlayerArea = ({ player, isActive, onCardClick, onLocationClick, isMe }: { player: Player, isActive: boolean, onCardClick: (card: CardType) => void, onLocationClick: (loc: Location) => void, isMe?: boolean }) => (
    <div id={`player-area-${player.id}`} className={`player-card ${isActive ? 'active-turn' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: isActive ? 'var(--marvel-green)' : 'inherit', textShadow: isActive ? '0 0 10px var(--marvel-green)' : 'none' }}>
                {player.name} {isMe ? <span style={{ color: 'var(--marvel-blue)', fontSize: '0.8rem' }}>(You)</span> : ''}
            </h3>
            <div style={{ fontWeight: 'bold', color: 'var(--marvel-yellow)' }}>{player.points} VP</div>
        </div>

        {/* Tokens */}
        {/* Tokens */}
        <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '2px' }}>
            Tokens ({Object.values(player.tokens).reduce((a, b) => a + b, 0)}/10)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', margin: '5px 0' }}>
            {Object.entries(player.tokens).map(([color, count]) => (
                count > 0 ? <Token key={color} color={color as keyof TokenBank} count={count} size={50} style={{ margin: '0 -5px' }} /> : null
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

        {/* Acquired Locations */}
        {player.locations.length > 0 && (
            <div style={{ marginBottom: '5px' }}>
                <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '2px' }}>Locations ({player.locations.length})</div>
                <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                    {player.locations.map(loc => (
                        <div key={loc.id} style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '75px', height: '75px' }}>
                            <LocationView location={loc} onClick={() => onLocationClick(loc)} />
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

// Helper for color interpolation
const getTimerColor = (percentage: number) => {
    // 1.0 = Green (120), 0.0 = Red (0)
    // We can clamp it a bit to avoid pure yellow in the middle if we want, but linear 120->0 is standard "health bar" style.
    const hue = Math.max(0, Math.min(120, percentage * 120));
    return `hsl(${hue}, 90%, 45%)`;
};

interface GameBoardProps {
    state: GameState;
    dispatch: (action: GameAction) => void;
    myPeerId: string | null;
    myUUID?: string | null; // Added for robust identity check
    closeLobby?: () => void;
    isHost?: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({ state, dispatch, myPeerId, myUUID, closeLobby, isHost }) => {
    // Sound Effects
    const { playTokenSound, playRecruitSound, playReserveSound, playCardFlipSound, playErrorSound, playVictorySound, playTurnSound, playTickSound } = useSoundEffects();

    const isMyTurn = state.players[state.currentPlayerIndex].id === myPeerId || (myPeerId === null && state.currentPlayerIndex === 0);

    // Determine the viewing player (Me in multiplayer, or Current Player in hotseat)
    // Priority: 1. Match by ID (PeerID), 2. Match by UUID (Persistent Session), 3. Active Player
    const viewingPlayerIndex = (() => {
        if (myPeerId) {
            const byId = state.players.findIndex(p => p.id === myPeerId);
            if (byId !== -1) return byId;
        }
        if (myUUID) {
            const byUUID = state.players.findIndex(p => p.uuid === myUUID);
            if (byUUID !== -1) return byUUID;
        }
        return state.currentPlayerIndex;
    })();

    const viewingPlayer = state.players[viewingPlayerIndex] || state.players[state.currentPlayerIndex];

    // Timer Logic Lifted Up
    const [timeLeft, setTimeLeft] = useState(0);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

    // Auto-acquire single location with delay for animation
    useEffect(() => {
        if (state.pendingLocationSelection && state.pendingLocationSelection.length === 1) {
            const loc = state.pendingLocationSelection[0];
            const playerId = state.players[state.currentPlayerIndex].id;

            // 1. Trigger Animation (Visible to all) after card animation finishes (~700ms)
            const animTimer = setTimeout(() => {
                setHiddenCardIds(prev => new Set(prev).add(loc.id));
                triggerAnimation('card', loc.image, `location-tile-${loc.id}`, `player-area-${playerId}`);
            }, 700);

            // 2. Dispatch Action (Owner only) after flight (~800ms more)
            let dispatchTimer: ReturnType<typeof setTimeout>;
            if (isMyTurn) {
                dispatchTimer = setTimeout(() => {
                    dispatch({ type: 'SELECT_LOCATION', locationId: loc.id });
                    playRecruitSound();
                }, 1500);
            }

            return () => {
                clearTimeout(animTimer);
                if (dispatchTimer) clearTimeout(dispatchTimer);
            };
        }
    }, [state.pendingLocationSelection, state.currentPlayerIndex, isMyTurn, dispatch, playRecruitSound]);

    // Toast Notification Logic
    const [toastMsg, setToastMsg] = useState<{ msg: string, type: 'info' | 'error' | 'success' } | null>(null);
    const prevLogLength = useRef(state.logs.length);

    useEffect(() => {
        if (state.logs.length > prevLogLength.current) {
            const lastLog = state.logs[state.logs.length - 1];
            // Check for location acquisition
            if (lastLog.includes('took location')) {
                setToastMsg({ msg: lastLog, type: 'success' });
            }
        }
        prevLogLength.current = state.logs.length;
    }, [state.logs]);

    // Auto-clear toastMsg
    useEffect(() => {
        if (toastMsg) {
            const timer = setTimeout(() => setToastMsg(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toastMsg]);

    useEffect(() => {
        if (!state.turnDeadline) return;

        const updateTimer = () => {
            const remaining = Math.max(0, Math.ceil((state.turnDeadline! - Date.now()) / 1000));
            setTimeLeft(remaining);

            // Clock Tick Effect
            if (isMyTurn && remaining <= 10 && remaining > 0) {
                playTickSound();
            }

            // Auto-Pass Logic (Universal Enforcement)
            if (remaining <= 0) {
                // If the turn has expired, ANYONE connected can trigger the pass.
                // We send the 'expectedPlayerIndex' to ensure we only skip the current player ONCE.
                // It is harmless if multiple people send it, the reducer will reject duplicates.
                // We dispatch on the next tick check.

                // To avoid spamming, we check if we "should" be the ones to send it.
                // Usually the Host should do it if active player is away, or the active player themselves.
                // Fail-safe: Everyone sends attempts, server syncs the first one.

                // Only dispatch if we haven't received a new turn status yet (which we haven't if deadine is old)
                dispatch({ type: 'PASS_TURN', expectedPlayerIndex: state.currentPlayerIndex });
            }
        };

        const timer = setInterval(updateTimer, 1000);
        updateTimer(); // Initial call

        return () => clearInterval(timer);
    }, [state.turnDeadline, state.currentPlayerIndex, dispatch, playTickSound, isMyTurn]);

    const totalSeconds = state.config.turnLimitSeconds;
    const percentage = Math.max(0, Math.min(1, timeLeft / totalSeconds));
    const dynamicColor = getTimerColor(percentage);


    const [selectedTokens, setSelectedTokens] = useState<Partial<TokenBank>>({});
    const [selectedCard, setSelectedCard] = useState<CardType | null>(null); // For Modal
    const [animations, setAnimations] = useState<AnimationItem[]>([]);
    const [hiddenCardIds, setHiddenCardIds] = useState<Set<string>>(new Set());

    // Track previous market state to detect new cards
    const prevMarketRef = React.useRef(state.market);
    const prevLocationsRef = React.useRef<Location[]>([]);

    // Custom UI State
    const [showResults, setShowResults] = useState(true);
    const [toast, setToast] = useState<{ message: string, type: 'error' | 'info' } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ message: string, onConfirm: () => void } | null>(null);

    const [showPlayers, setShowPlayers] = useState(false);

    // Auto-clear toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Handle ESC key to close modals
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (confirmModal) {
                    setConfirmModal(null);
                } else if (selectedCard) {
                    setSelectedCard(null);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [confirmModal, selectedCard]);

    // Track notified players for win condition to prevent spam
    const notifiedWinnersRef = useRef<Set<string>>(new Set());

    // Track cards that have just arrived via animation to suppress default entry animation
    const justArrivedIdsRef = useRef<Set<string>>(new Set());

    // Check for winning condition (>= 16 points AND has Time Stone)
    useEffect(() => {
        state.players.forEach(p => {
            const hasGreenToken = p.tokens.green > 0;
            // Marvel Splendor Win Condition: 16 Points + Time Stone (Green Token)
            if (p.points >= 16 && hasGreenToken && !notifiedWinnersRef.current.has(p.id) && state.status !== 'GAME_OVER') {
                notifiedWinnersRef.current.add(p.id);
                setToast({
                    message: `${p.name} has met the winning criteria! Score higher to overtake!`,
                    type: 'info'
                });
            }
        });
    }, [state.players, state.status]);

    // Play Victory Sound on Game Over
    useEffect(() => {
        if (state.status === 'GAME_OVER') {
            playVictorySound();
        }
    }, [state.status, playVictorySound]);

    // Play Turn Notification Sound
    const prevTurnRef = useRef(isMyTurn);
    useEffect(() => {
        // If it wasn't my turn before, and now it IS my turn, play sound.
        // Also play on first mount if it IS my turn (for refreshes).
        if (isMyTurn && !prevTurnRef.current) {
            playTurnSound();
        }
        // Update ref
        prevTurnRef.current = isMyTurn;
    }, [isMyTurn, playTurnSound]);

    // Use useLayoutEffect to hide cards BEFORE paint to prevent flash
    React.useLayoutEffect(() => {
        const prevMarket = prevMarketRef.current;
        (['1', '2', '3'] as const).forEach(tStr => {
            const tier = parseInt(tStr) as 1 | 2 | 3;
            const currentCards = state.market[tier];
            const prevCards = prevMarket[tier];

            // Find cards that are in current but not in prev
            const newCards = currentCards.filter(c => !prevCards.some(pc => pc.id === c.id));

            newCards.forEach(card => {
                // Determine if this is a refill (only animate if deck is not empty or we just want to animate anyway)
                // Actually we always want to animate if it appeared in the market.
                // But we need to make sure the elements exist.

                const deckId = `deck-tier-${tier}`;
                const cardId = `market-card-${card.id}`;
                // For flip animation: content = front face, backContent = card back
                const frontImage = card.imageUrl || `/assets/hero-tier-${card.tier}.png`;

                // Hide the real card immediately (synchronously before paint)
                setHiddenCardIds(prev => new Set(prev).add(card.id));

                // Trigger animation in next frame to allow layout to settle if needed, 
                // but since we are just hiding, the element ID still exists (it's properties that changed).
                // Actually, if we hide it, we replace it with a placeholder div with the SAME ID (see render loop).
                // So the ID is present in the DOM.
                justArrivedIdsRef.current.add(card.id);
                requestAnimationFrame(() => {
                    playCardFlipSound(); // Sound on flip
                    triggerAnimation('card', frontImage, deckId, cardId, CARD_BACKS[tier], card.id);
                });
            });
        });
        prevMarketRef.current = state.market;
    }, [state.market]);

    // Animate Locations entering the board (Start of Game)
    React.useLayoutEffect(() => {
        const currentLocations = state.locations || [];
        const prevLocations = prevLocationsRef.current;

        // Find new locations (Check ID AND Image to handle random seed mismatches/resyncs)
        const newLocations = currentLocations.filter(loc =>
            !prevLocations.some(pl => pl.id === loc.id && pl.image === loc.image)
        );

        newLocations.forEach((loc, index) => {
            const startId = 'deck-tier-3'; // Fly from top deck
            const targetId = `location-tile-${loc.id}`;

            // Hide real location
            setHiddenCardIds(prev => new Set(prev).add(loc.id));

            // Stagger animations
            setTimeout(() => {
                requestAnimationFrame(() => {
                    // Use card type for flying tile
                    triggerAnimation('card', loc.image, startId, targetId, undefined, loc.id);
                });
            }, index * 200 + 500); // Initial delay + stagger
        });

        prevLocationsRef.current = currentLocations;
    }, [state.locations]);

    const triggerAnimation = (type: 'token' | 'card', content: string, startId: string, endId: string, backContent?: string, relatedCardId?: string) => {
        const startEl = document.getElementById(startId);
        const endEl = document.getElementById(endId);
        if (!startEl || !endEl) return;

        const startRect = startEl.getBoundingClientRect();


        // Calculate a centered target rect to avoid expanding to the full container size
        // If animating to market (endId includes 'market-card'), use full size (120x168)
        // If animating to location (endId includes 'location-tile'), use full size (130x130)
        // If animating FROM location (startId includes 'location-tile'), use scaled down square (65x65)
        // If token, use 35x35. Else (player area), use 60x84.

        // Dynamically measure target size if possible to respect CSS transforms (e.g. mobile scaling)
        let realEndEl = endEl;
        // Check for specific inner elements that dictate the visual size
        if (endId.includes('market-card') || endId.includes('location-tile')) {
            const inner = endEl.querySelector('.card');
            if (inner) realEndEl = inner as HTMLElement;
        }

        const rect = realEndEl.getBoundingClientRect();

        let targetWidth: number;
        let targetHeight: number;

        if (endId.includes('player-area')) {
            // Special case: Player Area = generic target. Use fixed mini size.
            // Maintain logic: From Location -> 65x65 (Square), From Market -> 60x84 (Card)
            const isLocationSource = startId.includes('location-tile');
            targetWidth = isLocationSource ? 65 : 60;
            targetHeight = isLocationSource ? 65 : 84;
        } else if (endId.includes('token-bank')) {
            // Token bank should match the element size
            targetWidth = rect.width;
            targetHeight = rect.height;
        } else {
            // Default: Trust the element's size (Market cards, Locations, Decks)
            // This picks up the scale(0.85) on mobile automatically
            targetWidth = rect.width;
            targetHeight = rect.height;
        }

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const endRect = {
            left: centerX - targetWidth / 2,
            top: centerY - targetHeight / 2,
            width: targetWidth,
            height: targetHeight,
            bottom: centerY + targetHeight / 2,
            right: centerX + targetWidth / 2,
            x: centerX - targetWidth / 2,
            y: centerY - targetHeight / 2,
            toJSON: () => { }
        } as DOMRect;

        const newItem: AnimationItem = {
            id: uuidv4(),
            type,
            content,
            startRect,
            endRect,
            duration: 800, // 0.8s flight
            backContent, // Optional for flip
            relatedCardId
        };
        setAnimations(prev => [...prev, newItem]);
    };

    const handleAnimationComplete = (id: string) => {
        setAnimations(prev => {
            const completed = prev.find(a => a.id === id);
            const remaining = prev.filter(a => a.id !== id);

            if (completed && completed.relatedCardId) {
                // Only unhide if NO OTHER active animations rely on this card ID
                // This prevents flickering if a new animation started (e.g. correction) before the old one finished
                const isStillAnimating = remaining.some(a => a.relatedCardId === completed.relatedCardId);

                if (!isStillAnimating) {
                    setHiddenCardIds(current => {
                        const next = new Set(current);
                        next.delete(completed.relatedCardId!);
                        return next;
                    });
                }
            }
            return remaining;
        });
    };

    // Reset selected tokens when turn changes
    useEffect(() => {
        setSelectedTokens({});
    }, [state.currentPlayerIndex]);

    const handleTakeToken = (color: keyof TokenBank) => {
        if (state.status === 'GAME_OVER') {
            setToast({ message: "Game is over!", type: 'info' });
            return;
        }
        if (!isMyTurn) return; // Silent return for tokens selection out of turn to rely on confirm button disabled state? 
        // Actually, previous logic just returned silently. Let's keep it consistent or verify if we want feedback.
        // User asked "disallow changes... with corresponding feedback" generally. 
        // For tokens, selection is local state until confirmed. 
        // But if game is over, we shouldn't even select.

        // Let's rely on isMyTurn check, BUT if game is over, isMyTurn might be false anyway. 
        // However, we want to be explicit.
        if (color === 'gray' || color === 'green') return;

        const currentSelection = { ...selectedTokens };
        // ... rest of logic
        const currentCount = currentSelection[color] || 0;
        const newCount = currentCount + 1;

        const totalSelected = Object.values(currentSelection).reduce((a, b) => a + b, 0);
        const distinctColors = Object.keys(currentSelection).length;

        if (newCount === 2) {
            if (state.tokens[color] < 4) {
                setToast({ message: "Cannot take 2 of this color (less than 4 in bank).", type: 'error' });
                playErrorSound();
                return;
            }
            if (totalSelected > 1) {
                setToast({ message: "Cannot take 2 of same color if you have other colors selected.", type: 'error' });
                playErrorSound();
                return;
            }
            playTokenSound();
            currentSelection[color] = 2;
            setSelectedTokens(currentSelection);
        } else if (newCount === 1) {
            const hasDouble = Object.values(currentSelection).some(v => v === 2);
            if (hasDouble) {
                setToast({ message: "Cannot take different colors if you selected 2 of the same.", type: 'error' });
                playErrorSound();
                return;
            }
            if (distinctColors >= 3) {
                setToast({ message: "Max 3 distinct tokens.", type: 'error' });
                playErrorSound();
                return;
            }
            playTokenSound();
            currentSelection[color] = 1;
            setSelectedTokens(currentSelection);
        }
    };

    const confirmTakeTokens = () => {
        if (state.status === 'GAME_OVER') {
            setToast({ message: "Game is over!", type: 'info' });
            return;
        }
        const player = state.players[state.currentPlayerIndex];
        const currentTotal = Object.values(player.tokens).reduce((a, b) => a + b, 0);
        const selectedCount = Object.values(selectedTokens).reduce((a, b) => a + b, 0);


        if (currentTotal + selectedCount > 10) {
            setToast({ message: `Cannot take tokens: You have ${currentTotal} and selected ${selectedCount}. Limit is 10.`, type: 'error' });
            playErrorSound();
            return;
        }

        dispatch({
            type: 'TAKE_TOKENS',
            tokens: { red: 0, blue: 0, yellow: 0, purple: 0, orange: 0, green: 0, gray: 0, ...selectedTokens }
        });

        // Trigger Animations
        const playerId = state.players[state.currentPlayerIndex].id;
        Object.entries(selectedTokens).forEach(([color, count]) => {
            if (count && count > 0) {
                for (let i = 0; i < count; i++) {
                    // Stagger slightly?
                    setTimeout(() => {
                        triggerAnimation('token', TOKEN_IMAGES[color], `token-bank-${color}`, `player-area-${playerId}`);
                    }, i * 100);
                }
            }
        });
        playTokenSound(); // Confirm sound

        setSelectedTokens({});
        // dispatch({ type: 'END_TURN' }); // Handled by reducer automatically
    };

    const handleCardClick = (card: CardType) => {
        // Allow inspection anytime
        setSelectedCard(card);
    };

    // Validation for Recruitment
    const canAfford = (card: CardType) => {
        // Allow check anytime so we can see costs
        const player = viewingPlayer;

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
        if (state.status === 'GAME_OVER') {
            setToast({ message: "The game has ended. You cannot make moves.", type: 'info' });
            playErrorSound();
            return;
        }
        if (!isMyTurn) {
            setToast({ message: "It is not your turn!", type: 'error' });
            playErrorSound();
            return;
        }
        if (!selectedCard) return;

        const playerId = state.players[state.currentPlayerIndex].id;
        // We need an ID for the card in the modal or market.
        // Since modal is open, let's use a specific ID for the modal card view if possible, or just the market card.
        // Actually, let's assume we animate from the Modal center.
        // We can add an ID to the modal card view.

        if (type === 'RECRUIT') {
            dispatch({ type: 'RECRUIT_CARD', cardId: selectedCard.id });
            playRecruitSound();
            triggerAnimation('card', selectedCard.imageUrl || '', 'modal-card-view', `player-area-${playerId}`);
        } else {
            dispatch({ type: 'RESERVE_CARD', cardId: selectedCard.id });
            playReserveSound();
            triggerAnimation('card', selectedCard.imageUrl || '', 'modal-card-view', `player-area-${playerId}`);
        }
        // dispatch({ type: 'END_TURN' }); // Handled by reducer automatically
        setSelectedCard(null);
    };

    return (
        <div className="game-layout has-desktop-header">
            <AnimationOverlay items={animations} onComplete={handleAnimationComplete} />

            {/* ============================================
                DESKTOP HEADER BAR
                ============================================ */}
            <div className="desktop-header-bar desktop-only">
                {/* Timer Section */}
                <div
                    className="header-timer"
                    style={{
                        background: isMyTurn ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)',
                        border: `2px solid ${isMyTurn ? dynamicColor : '#555'}`,
                        color: isMyTurn ? dynamicColor : '#aaa',
                        boxShadow: isMyTurn ? `0 0 15px ${dynamicColor}` : 'none',
                    }}
                >
                    <span>
                        {isMyTurn
                            ? "Your Turn"
                            : `${state.players[state.currentPlayerIndex].name.length > 12
                                ? state.players[state.currentPlayerIndex].name.slice(0, 12) + '...'
                                : state.players[state.currentPlayerIndex].name}'s Turn`
                        }
                    </span>
                    <span style={{
                        fontFamily: 'monospace',
                        fontSize: '1.2rem',
                        background: 'rgba(255,255,255,0.1)',
                        padding: '2px 8px',
                        borderRadius: '4px'
                    }}>
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </span>
                </div>

                {/* Action Buttons */}
                <div className="header-controls">
                    <button
                        onClick={confirmTakeTokens}
                        className="btn-primary"
                        disabled={!isMyTurn || Object.keys(selectedTokens).length === 0}
                        style={{
                            padding: '8px 16px',
                            fontSize: '0.9rem',
                            opacity: (!isMyTurn || Object.keys(selectedTokens).length === 0) ? 0.5 : 1,
                            cursor: (!isMyTurn || Object.keys(selectedTokens).length === 0) ? 'not-allowed' : 'pointer',
                        }}
                    >
                        Confirm
                    </button>
                    <button
                        onClick={() => setSelectedTokens({})}
                        disabled={!isMyTurn || Object.keys(selectedTokens).length === 0}
                        style={{
                            background: '#444', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '4px', fontSize: '0.9rem',
                            opacity: (!isMyTurn || Object.keys(selectedTokens).length === 0) ? 0.5 : 1,
                            cursor: (!isMyTurn || Object.keys(selectedTokens).length === 0) ? 'not-allowed' : 'pointer',
                        }}
                    >
                        Reset
                    </button>
                    <button
                        onClick={() => {
                            setConfirmModal({
                                message: "Pass your turn without taking any action?",
                                onConfirm: () => {
                                    dispatch({ type: 'PASS_TURN', expectedPlayerIndex: state.currentPlayerIndex });
                                }
                            });
                        }}
                        disabled={!isMyTurn}
                        style={{
                            background: 'var(--marvel-red)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '4px', fontSize: '0.9rem',
                            opacity: !isMyTurn ? 0.5 : 1,
                            cursor: !isMyTurn ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Pass
                    </button>
                </div>

                {/* Token Bank */}
                <div className="header-tokens">
                    {(['red', 'blue', 'yellow', 'purple', 'orange', 'gray', 'green'] as const).map(c => (
                        <div key={c} style={{ position: 'relative' }}>
                            <Token color={c} count={state.tokens[c]} onClick={() => handleTakeToken(c)} size={50} />
                            {selectedTokens[c as keyof TokenBank] ? (
                                <span style={{
                                    position: 'absolute', bottom: '-2px', left: '50%', transform: 'translateX(-50%)',
                                    color: 'lime', fontWeight: 'bold', textShadow: '0 0 4px black',
                                    fontSize: '0.8rem', zIndex: 10, pointerEvents: 'none'
                                }}>
                                    +{selectedTokens[c as keyof TokenBank]}
                                </span>
                            ) : null}
                        </div>
                    ))}
                </div>

                {/* Host Quit Button */}
                {isHost && closeLobby && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setConfirmModal({
                                message: "Are you sure you want to close the lobby? This will disconnect all players.",
                                onConfirm: () => closeLobby()
                            });
                        }}
                        style={{
                            background: 'rgba(255, 0, 0, 0.7)', color: 'white', border: '1px solid #ff4444',
                            padding: '8px 16px', borderRadius: '5px', cursor: 'pointer'
                        }}
                    >
                        Quit Game
                    </button>
                )}
            </div>

            {/* Turn Indicator Overlay */}
            {isMyTurn && (
                <div
                    className="turn-indicator-overlay"
                    style={{
                        boxShadow: `inset 0 0 0 4px ${dynamicColor}, inset 0 0 50px ${dynamicColor}`,
                        transition: 'box-shadow 1s linear'
                    }}
                ></div>
            )}

            {/* Custom Toast */}
            {toast && (
                <div className={`toast-notification ${toast.type}`}>
                    {toast.message}
                </div>
            )}

            {/* Custom Confirm Modal */}
            {confirmModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001
                }} onClick={() => setConfirmModal(null)}>
                    <div style={{
                        background: '#1a1d2e', padding: '24px', borderRadius: '12px', border: '1px solid #444',
                        maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 0 40px rgba(0,0,0,0.5)'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 16px 0', color: 'white' }}>Confirm Action</h3>
                        <p style={{ color: '#ccc', marginBottom: '24px' }}>{confirmModal.message}</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button className="btn-primary" style={{ background: '#555' }} onClick={() => setConfirmModal(null)}>Cancel</button>
                            <button className="btn-primary" style={{ background: 'var(--marvel-red)' }} onClick={() => {
                                confirmModal.onConfirm();
                                setConfirmModal(null);
                            }}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================
                MOBILE HEADER: Timer + Actions + Quit (40px)
                ============================================ */}
            <div className="mobile-header mobile-only">
                {/* Timer Section */}
                <div className="timer-section" style={{ color: isMyTurn ? dynamicColor : '#aaa' }}>
                    <span>{isMyTurn ? "Your Turn" : `${state.players[state.currentPlayerIndex].name.slice(0, 8)}'s`}</span>
                    <span className="timer-value">
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </span>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                    <button
                        onClick={confirmTakeTokens}
                        disabled={!isMyTurn || Object.keys(selectedTokens).length === 0}
                        style={{
                            background: 'linear-gradient(135deg, var(--marvel-blue), var(--marvel-purple))',
                            color: 'white',
                            opacity: (!isMyTurn || Object.keys(selectedTokens).length === 0) ? 0.5 : 1,
                        }}
                    >
                        Confirm
                    </button>
                    <button
                        onClick={() => setSelectedTokens({})}
                        disabled={!isMyTurn || Object.keys(selectedTokens).length === 0}
                        style={{
                            background: '#444',
                            color: 'white',
                            opacity: (!isMyTurn || Object.keys(selectedTokens).length === 0) ? 0.5 : 1,
                        }}
                    >
                        Reset
                    </button>
                    <button
                        onClick={() => {
                            setConfirmModal({
                                message: "Pass your turn?",
                                onConfirm: () => dispatch({ type: 'PASS_TURN', expectedPlayerIndex: state.currentPlayerIndex })
                            });
                        }}
                        disabled={!isMyTurn}
                        style={{
                            background: 'var(--marvel-red)',
                            color: 'white',
                            opacity: !isMyTurn ? 0.5 : 1,
                        }}
                    >
                        Pass
                    </button>
                </div>

                {/* Quit Button */}
                {isHost && closeLobby && (
                    <button
                        className="quit-btn"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setConfirmModal({
                                message: "Close lobby and disconnect all players?",
                                onConfirm: () => closeLobby()
                            });
                        }}
                        style={{
                            background: 'rgba(255, 0, 0, 0.7)',
                            color: 'white',
                            border: '1px solid #ff4444',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* ============================================
                MOBILE TOKEN ROW (50px)
                ============================================ */}
            <div className="mobile-token-row mobile-only">
                {(['red', 'blue', 'yellow', 'purple', 'orange', 'gray', 'green'] as const).map(c => (
                    <div key={c} className="token-wrapper">
                        <Token color={c} count={state.tokens[c]} onClick={() => handleTakeToken(c)} size={36} />
                        {selectedTokens[c as keyof TokenBank] ? (
                            <span className="selected-badge">+{selectedTokens[c as keyof TokenBank]}</span>
                        ) : null}
                    </div>
                ))}
            </div>



            <div className="board-center">


                {/* Locations */}
                <div className="locations-row" style={{ display: 'flex', justifyContent: 'center' }}>
                    {(state.locations || []).map(loc => {
                        const isPendingSelection = state.pendingLocationSelection?.some(l => l.id === loc.id) && isMyTurn;
                        return (
                            <div key={loc.id} id={`location-tile-${loc.id}`}>
                                {hiddenCardIds.has(loc.id) ? (
                                    <div className="card location" style={{ width: '130px', height: '130px', visibility: 'hidden' }}></div>
                                ) : (
                                    <div style={{ position: 'relative' }}>
                                        <LocationView
                                            location={loc}
                                            onClick={() => {
                                                if (isPendingSelection) {
                                                    dispatch({ type: 'SELECT_LOCATION', locationId: loc.id });
                                                } else {
                                                    setSelectedLocation(loc);
                                                }
                                            }}
                                            style={isPendingSelection ? {
                                                border: '4px solid gold',
                                                animation: 'glow 2s infinite',
                                                transform: 'scale(1.05)',
                                                '--glow-color': 'gold'
                                            } as React.CSSProperties : undefined}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {(state.locations || []).length === 0 && (
                        <div style={{ color: '#555', fontStyle: 'italic', padding: '20px' }}>No Locations Remaining</div>
                    )}
                </div>

                {/* Market */}
                <div className="market-grid">
                    {[3, 2, 1].map(tier => (
                        <div key={tier} className="card-row" style={{ justifyContent: 'flex-start' }}>
                            {/* Deck Count & Back */}
                            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                <div className="deck-count" style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    color: '#aaa', fontSize: '0.8rem', width: '40px',
                                    position: 'absolute', right: '100%', marginRight: '10px'
                                }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>
                                        {state.decks[tier as 1 | 2 | 3].length}
                                    </span>
                                    <span>left</span>
                                </div>
                                {state.decks[tier as 1 | 2 | 3].length > 0 ? (
                                    <div id={`deck-tier-${tier}`} className="card disabled" style={{
                                        backgroundImage: `url(${CARD_BACKS[tier]})`,
                                        backgroundSize: '200%', // Zoom in to remove transparent padding
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                    </div>
                                ) : (
                                    <div style={{ width: '120px', height: '168px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    </div>
                                )}
                            </div>

                            {/* Visible Cards */}
                            {state.market[tier as 1 | 2 | 3].map(card => (
                                <div key={card.id} id={`market-card-${card.id}`}>
                                    {hiddenCardIds.has(card.id) ? (
                                        <div className="card" style={{ width: '120px', height: '168px', visibility: 'hidden' }}></div> // Transparent placeholder
                                    ) : (
                                        <CardView card={card} onClick={() => handleCardClick(card)} canAfford={canAfford(card)} noAnimate={justArrivedIdsRef.current.has(card.id)} />
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div className={`player-panel right ${!showPlayers ? 'collapsed' : ''}`}>
                {/* Mobile Player Summary Bar - Always visible */}
                <div className="mobile-player-summary mobile-only">
                    <div className="player-info">
                        <span className="player-name" style={{
                            color: viewingPlayer.id === state.players[state.currentPlayerIndex].id ? 'var(--marvel-green)' : 'white'
                        }}>
                            {viewingPlayer.name.length > 10 ? viewingPlayer.name.slice(0, 10) + '...' : viewingPlayer.name}
                        </span>
                        <span className="player-points">{viewingPlayer.points} VP</span>
                        <div className="player-tokens">
                            {(['red', 'blue', 'yellow', 'purple', 'orange'] as const).map(c => (
                                viewingPlayer.tokens[c] > 0 && (
                                    <div key={c} className="mini-token" style={{ background: `var(--marvel-${c})` }}>
                                        {viewingPlayer.tokens[c]}
                                    </div>
                                )
                            ))}
                            {viewingPlayer.tokens.gray > 0 && (
                                <div className="mini-token" style={{ background: '#888' }}>
                                    {viewingPlayer.tokens.gray}
                                </div>
                            )}
                        </div>
                        <span style={{ color: '#888', fontSize: '0.75rem' }}>
                            {viewingPlayer.tableau.length} cards recruited
                        </span>
                    </div>
                    <button
                        className="toggle-btn"
                        onClick={() => setShowPlayers(!showPlayers)}
                    >
                        {showPlayers ? '▼' : '▲'}
                    </button>
                </div>

                {/* Player List - Expandable */}
                <div className={`player-list-section ${!showPlayers ? 'hidden-mobile' : ''}`} style={{ flex: 1, overflowY: 'auto' }}>
                    {state.players.map((p) => (
                        <PlayerArea
                            key={p.id}
                            player={p}
                            isActive={state.players.indexOf(p) === state.currentPlayerIndex}
                            onCardClick={handleCardClick}
                            onLocationClick={setSelectedLocation}
                            isMe={p.id === myPeerId}
                        />
                    ))}
                </div>
            </div>

            {/* Modal */}
            {selectedCard && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }} onClick={() => setSelectedCard(null)}>
                    <div className="glass-panel" style={{ textAlign: 'center', border: '1px solid var(--marvel-blue)', boxShadow: '0 0 30px var(--marvel-blue)' }} onClick={e => e.stopPropagation()}>
                        <h3>{selectedCard.name || 'Selected Card'}</h3>
                        <div style={{ margin: '20px auto', display: 'flex', justifyContent: 'center' }}>
                            <div id="modal-card-view" style={{ transform: 'scale(1.5)', margin: '30px' }}>
                                <CardView card={selectedCard} onClick={() => { }} disabled noAnimate hideName />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            {(() => {
                                const player = viewingPlayer;
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
                                            <button className="btn-primary" onClick={() => handleAction('RECRUIT')}>
                                                {(() => {
                                                    // Calculate what actually needs to be paid
                                                    const discount: Record<string, number> = { red: 0, blue: 0, yellow: 0, purple: 0, orange: 0 };
                                                    player.tableau.forEach(c => {
                                                        if (c.bonus && discount[c.bonus] !== undefined) discount[c.bonus]++;
                                                    });

                                                    const cost = selectedCard.cost;
                                                    const pay: string[] = [];
                                                    let goldToPay = 0;

                                                    // First pass: what can we pay with regular tokens?
                                                    for (const c of ['red', 'blue', 'yellow', 'purple', 'orange'] as const) {
                                                        const val = cost[c as keyof Cost] || 0;
                                                        const effectiveCost = Math.max(0, val - (discount[c] || 0));

                                                        if (effectiveCost > 0) {
                                                            // We need to pay 'effectiveCost'.
                                                            // We use tokens first, then gold.
                                                            const tokenAvailable = player.tokens[c];
                                                            if (tokenAvailable >= effectiveCost) {
                                                                pay.push(`${effectiveCost} ${c.charAt(0).toUpperCase() + c.slice(1)}`);
                                                            } else {
                                                                // Pay all tokens, rest gold
                                                                if (tokenAvailable > 0) {
                                                                    pay.push(`${tokenAvailable} ${c.charAt(0).toUpperCase() + c.slice(1)}`);
                                                                }
                                                                goldToPay += (effectiveCost - tokenAvailable);
                                                            }
                                                        }
                                                    }

                                                    if (goldToPay > 0) {
                                                        pay.push(`${goldToPay} Shield`);
                                                    }

                                                    if (pay.length === 0) return "Recruit (Free)";
                                                    return `Recruit (${pay.join(', ')})`;
                                                })()}
                                            </button>
                                        ) : (
                                            <button disabled style={{ padding: '12px 24px', background: '#555', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'not-allowed' }}>
                                                {missing ? missing : "Cannot Afford"}
                                            </button>
                                        )}
                                        {!isReserved && (
                                            player.hand.length < 3 ? (
                                                <button className="btn-primary" style={{ filter: 'hue-rotate(90deg)' }} onClick={() => handleAction('RESERVE')}>Reserve</button>
                                            ) : (
                                                <button disabled style={{ padding: '12px 24px', background: '#555', color: '#aaa', border: 'none', borderRadius: '8px', cursor: 'not-allowed' }}>
                                                    Max Reserved (3)
                                                </button>
                                            )
                                        )}
                                    </>
                                );
                            })()}
                            <button style={{ padding: '10px', background: 'transparent', border: '1px solid #666', color: 'white', borderRadius: '4px', cursor: 'pointer' }} onClick={() => setSelectedCard(null)}>Close</button>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '10px' }}>Recruit adds to Tableau. Reserve adds to Hand + 1 Shield.</p>
                    </div>
                </div>
            )}

            {/* On-board Selection Banner */}
            {state.pendingLocationSelection && state.pendingLocationSelection.length > 1 && isMyTurn && (
                <div style={{
                    position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(0, 0, 0, 0.8)', border: '1px solid gold', borderRadius: '20px',
                    padding: '10px 30px', color: 'gold', fontWeight: 'bold', fontSize: '1.2rem',
                    boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)', zIndex: 90
                }}>
                    Selection Required: Choose a location to claim
                </div>
            )}

            {/* Location Inspection Modal */}
            {selectedLocation && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }} onClick={() => setSelectedLocation(null)}>
                    <div className="glass-panel" style={{ textAlign: 'center', border: '1px solid white', boxShadow: '0 0 30px white' }} onClick={e => e.stopPropagation()}>
                        <h3>{selectedLocation.name}</h3>
                        <div style={{ margin: '20px auto', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ transform: 'scale(1.5)', margin: '30px' }}>
                                <LocationView location={selectedLocation} disabled hideName />
                            </div>
                        </div>
                        <div style={{ marginBottom: '20px', color: '#ddd' }}>
                            {(() => {
                                const player = viewingPlayer;
                                const bonuses: Record<string, number> = { red: 0, blue: 0, yellow: 0, purple: 0, orange: 0 };
                                player.tableau.forEach(c => {
                                    if (c.bonus && bonuses[c.bonus] !== undefined) bonuses[c.bonus]++;
                                });

                                const missing: string[] = [];
                                let qualificationsMet = true;

                                (Object.keys(selectedLocation.requirements) as (keyof Cost)[]).forEach(color => {
                                    const needed = selectedLocation.requirements[color] || 0;
                                    const has = bonuses[color] || 0;
                                    if (has < needed) {
                                        qualificationsMet = false;
                                        missing.push(`${needed - has} ${color.charAt(0).toUpperCase() + color.slice(1)}`);
                                    }
                                });

                                if (qualificationsMet) {
                                    return <span style={{ color: 'lime', fontWeight: 'bold' }}>You qualify for this location!</span>;
                                } else {
                                    return (
                                        <span>
                                            Missing: <strong style={{ color: 'var(--marvel-red)' }}>{missing.join(', ')}</strong>
                                        </span>
                                    );
                                }
                            })()}
                        </div>
                        <button style={{ padding: '10px', background: 'transparent', border: '1px solid #666', color: 'white', borderRadius: '4px', cursor: 'pointer' }} onClick={() => setSelectedLocation(null)}>
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Global Toast Notification */}
            {toastMsg && (
                <div className={`toast-notification ${toastMsg.type === 'success' ? 'info' : toastMsg.type}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {toastMsg.msg}
                    </div>
                </div>
            )}

            {/* Victory Screen */}
            {state.status === 'GAME_OVER' && (
                <>
                    {/* Persistent Floating Button to Re-open Results */}
                    {!showResults && (
                        <div style={{
                            position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)',
                            zIndex: 3000, background: 'rgba(0,0,0,0.8)', padding: '10px 20px',
                            borderRadius: '20px', border: '1px solid gold',
                            display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 0 10px gold'
                        }}>
                            <span style={{ color: 'gold', fontWeight: 'bold' }}>Game Over - {state.winner} Wins!</span>
                            <button onClick={() => setShowResults(true)} className="btn-primary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                                View Results
                            </button>
                        </div>
                    )}

                    {/* Results Modal */}
                    {showResults && (
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
                                        <div style={{ fontSize: '1.2rem', color: 'var(--marvel-yellow)' }}>{p.points} Victory Points</div>
                                        <div style={{ fontSize: '0.9rem', color: '#aaa' }}>{p.tableau.length} Cards</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '50px', display: 'flex', gap: '20px' }}>
                                <button onClick={() => setShowResults(false)} style={{ padding: '15px 30px', fontSize: '1.2rem', cursor: 'pointer', background: 'transparent', color: 'white', border: '1px solid white', borderRadius: '5px' }}>
                                    View Board
                                </button>
                                <button onClick={() => {
                                    sessionStorage.removeItem('splendor_gameState');
                                    sessionStorage.removeItem('splendor_host');
                                    sessionStorage.removeItem('splendor_gameId');
                                    window.location.reload();
                                }} style={{ padding: '15px 30px', fontSize: '1.2rem', cursor: 'pointer', background: 'var(--marvel-blue)', color: 'white', border: 'none', borderRadius: '5px' }}>
                                    Return to Lobby
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}; 