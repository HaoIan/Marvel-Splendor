import React from 'react';
import type { GameState, TokenBank } from '../types';
import { Token } from './Token';

interface GameControlsProps {
    isMyTurn: boolean;
    selectedTokens: Partial<TokenBank>;
    state: GameState;
    onConfirmTakeTokens: () => void;
    onResetTokens: () => void;
    onTakeToken: (color: keyof TokenBank) => void;
    onPassTurn: () => void;
    layout: 'horizontal' | 'vertical';
}

export const GameControls: React.FC<GameControlsProps> = ({
    isMyTurn,
    selectedTokens,
    state,
    onConfirmTakeTokens,
    onResetTokens,
    onTakeToken,
    onPassTurn,
    layout
}) => {
    // Determine styles based on layout
    const isHorizontal = layout === 'horizontal';

    const containerStyle: React.CSSProperties = isHorizontal ? {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        background: 'rgba(0, 0, 0, 0.5)',
        padding: '10px 20px',
        borderRadius: '15px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(5px)'
    } : {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        alignItems: 'center',
        padding: '10px',
        width: '100%'
    };

    return (
        <div className="game-controls" style={containerStyle}>
            {/* Token Bank */}
            <div style={{ display: 'flex', gap: '5px', flexWrap: isHorizontal ? 'nowrap' : 'wrap', justifyContent: 'center' }}>
                {(['red', 'blue', 'green', 'yellow', 'purple', 'orange'] as Array<keyof TokenBank>).map(color => {
                    const count = state.tokens[color];
                    const selected = selectedTokens[color] || 0;
                    return (
                        <div key={color} style={{ position: 'relative' }}>
                            <Token
                                color={color}
                                count={count}
                                onClick={() => onTakeToken(color)}
                                size={50}
                            />
                            {selected > 0 && (
                                <div style={{
                                    position: 'absolute', top: -5, right: -5,
                                    background: 'white', color: 'black',
                                    borderRadius: '50%', width: '20px', height: '20px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.8rem', fontWeight: 'bold',
                                    boxShadow: '0 0 5px rgba(0,0,0,0.5)'
                                }}>
                                    {selected}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', flexDirection: isHorizontal ? 'row' : 'row' }}>
                <button
                    className="btn-secondary"
                    disabled={!isMyTurn || Object.keys(selectedTokens).length === 0}
                    onClick={onResetTokens}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '5px',
                        cursor: (!isMyTurn || Object.keys(selectedTokens).length === 0) ? 'not-allowed' : 'pointer',
                        opacity: (!isMyTurn || Object.keys(selectedTokens).length === 0) ? 0.5 : 1,
                        background: '#444',
                        color: '#ddd',
                        border: '1px solid #666'
                    }}
                >
                    Reset
                </button>
                <button
                    className="btn-primary"
                    disabled={!isMyTurn || Object.keys(selectedTokens).length === 0}
                    onClick={onConfirmTakeTokens}
                    style={{
                        padding: '8px 16px',
                        cursor: (!isMyTurn || Object.keys(selectedTokens).length === 0) ? 'not-allowed' : 'pointer',
                        opacity: (!isMyTurn || Object.keys(selectedTokens).length === 0) ? 0.5 : 1,
                        background: 'var(--marvel-blue)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '5px'
                    }}
                >
                    Confirm
                </button>
                <button
                    disabled={!isMyTurn}
                    onClick={onPassTurn}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '5px',
                        cursor: !isMyTurn ? 'not-allowed' : 'pointer',
                        background: '#555',
                        color: '#ccc',
                        border: '1px solid #444',
                        opacity: !isMyTurn ? 0.5 : 1
                    }}
                >
                    Pass
                </button>
            </div>
        </div>
    );
};
