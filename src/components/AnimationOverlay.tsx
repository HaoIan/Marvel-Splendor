import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface AnimationItem {
    id: string;
    type: 'token' | 'card';
    content: string; // Color for token, Image URL for card
    backContent?: string; // Optional back image for flip animation
    startRect: DOMRect;
    endRect: DOMRect;
    duration: number;
    relatedCardId?: string;
}

interface AnimationOverlayProps {
    items: AnimationItem[];
    onComplete: (id: string) => void;
}

export const AnimationOverlay: React.FC<AnimationOverlayProps> = ({ items, onComplete }) => {
    return createPortal(
        <div className="animation-overlay-container">
            {items.map(item => (
                <FlyingItem key={item.id} item={item} onComplete={onComplete} />
            ))}
        </div>,
        document.body
    );
};

const FlyingItem: React.FC<{ item: AnimationItem, onComplete: (id: string) => void }> = ({ item, onComplete }) => {
    const [style, setStyle] = useState<React.CSSProperties>({
        position: 'fixed',
        left: item.startRect.left,
        top: item.startRect.top,
        width: item.startRect.width,
        height: item.startRect.height,
        zIndex: 9999,
        pointerEvents: 'none',
        transition: `all ${item.duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        opacity: 1,
        // Initial state
    });

    useEffect(() => {
        // Trigger animation in next frame
        requestAnimationFrame(() => {
            setStyle(prev => ({
                ...prev,
                left: item.endRect.left,
                top: item.endRect.top,
                width: item.endRect.width,
                height: item.endRect.height,
                opacity: 1,
                transform: 'scale(1)', // Land perfectly
            }));
        });

        const timer = setTimeout(() => {
            onComplete(item.id);
        }, item.duration);

        return () => clearTimeout(timer);
    }, [item, onComplete]);

    if (item.type === 'token') {
        return (
            <div style={{
                ...style,
                backgroundImage: `url(${item.content})`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                borderRadius: '50%',
            }} className="flying-token">
                {/* No count needed for flying token usually, just the visual */}
            </div>
        );
    } else {
        // Card Animation
        const isFlip = !!item.backContent;

        return (
            <div style={{
                ...style,
                perspective: '1000px', // needed for 3D effect
            }}>
                <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    transition: isFlip ? `transform ${item.duration}ms` : 'none',
                    transformStyle: 'preserve-3d',
                    transform: isFlip && style.left === item.startRect.left ? 'rotateY(180deg) scale(0.2)' : 'rotateY(0deg) scale(1)', // Start small (0.2) then grow to 1
                }}>
                    {/* Front Face (Content) */}
                    <div style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url(${item.content})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderRadius: '10px',
                        border: '1px solid white',
                        boxShadow: '0 0 15px rgba(255,255,255,0.5)',
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(0deg)', // Front is at 0
                    }} />

                    {/* Back Face (BackContent) - Only if flipping */}
                    {isFlip && (
                        <div style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            backgroundImage: `url(${item.backContent})`,
                            backgroundSize: '200%', // Match deck zoom
                            backgroundPosition: 'center',
                            borderRadius: '10px',
                            border: '1px solid white',
                            boxShadow: '0 0 15px rgba(255,255,255,0.5)',
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)', // Back is at 180
                        }} />
                    )}
                </div>
            </div>
        );
    }
};
