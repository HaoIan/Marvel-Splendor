import React from 'react';
import type { TokenBank } from '../types';

// Token Assets
import mindToken from '../assets/tokens/mind-token.png';
import powerToken from '../assets/tokens/power-token.png';
import realityToken from '../assets/tokens/reality-token.png';
import shieldToken from '../assets/tokens/shield-token.png';
import soulToken from '../assets/tokens/soul-token.png';
import spaceToken from '../assets/tokens/space-token.png';
import timeToken from '../assets/tokens/time-token.png';

export const TOKEN_IMAGES: Record<string, string> = {
    yellow: mindToken,
    purple: powerToken,
    red: realityToken,
    gray: shieldToken,
    orange: soulToken,
    blue: spaceToken,
    green: timeToken
};

export const Token = ({ color, count, onClick, size = 100, style }: { color: keyof TokenBank, count: number, onClick?: () => void, size?: number, style?: React.CSSProperties }) => (
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
