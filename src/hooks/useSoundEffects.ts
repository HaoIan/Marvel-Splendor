import { useCallback, useRef, useEffect } from 'react';

export const useSoundEffects = () => {
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Initialize Audio Context on first interaction
    useEffect(() => {
        const initAudio = () => {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } else if (audioCtxRef.current.state === 'suspended') {
                audioCtxRef.current.resume();
            }
        };

        window.addEventListener('click', initAudio, { once: true });
        window.addEventListener('keydown', initAudio, { once: true });

        return () => {
            window.removeEventListener('click', initAudio);
            window.removeEventListener('keydown', initAudio);
        };
    }, []);

    const playTone = useCallback((freq: number, type: OscillatorType, duration: number, startTime = 0, vol = 0.1) => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

        gain.gain.setValueAtTime(vol, ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
    }, []);

    const playTokenSound = useCallback(() => {
        // Poker chip "click"
        // High frequency impact, very short decay
        playTone(2500, 'sine', 0.03, 0, 0.15);
        playTone(3200, 'triangle', 0.03, 0, 0.1);
        // Slight detuned body
        playTone(200, 'square', 0.01, 0, 0.05); // "Thud" of impact
    }, [playTone]);

    const playCardFlipSound = useCallback(() => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;

        // Noise buffer for swoosh
        const bufferSize = ctx.sampleRate * 0.2; // 0.2s
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = ctx.createGain();

        // Filter for "woosh" effect
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, ctx.currentTime);
        filter.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.1);
        filter.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
    }, []);

    const playRecruitSound = useCallback(() => {
        // Power-up arpeggio
        playTone(440, 'sine', 0.1, 0, 0.1); // A4
        playTone(554, 'sine', 0.1, 0.1, 0.1); // C#5
        playTone(659, 'sine', 0.2, 0.2, 0.1); // E5
    }, [playTone]);

    const playReserveSound = useCallback(() => {
        // Lower tone
        playTone(300, 'square', 0.1, 0, 0.05);
        playTone(400, 'square', 0.2, 0.1, 0.05);
    }, [playTone]);

    const playErrorSound = useCallback(() => {
        // Low buzz
        playTone(150, 'sawtooth', 0.2, 0, 0.1);
        playTone(140, 'sawtooth', 0.2, 0.1, 0.1);
    }, [playTone]);

    const playVictorySound = useCallback(() => {
        // Fanfare
        const now = 0;
        // C Major Fanfare: C4, E4, G4, C5 ..... C5-G4-E4-C4
        playTone(523.25, 'triangle', 0.2, now, 0.2); // C5
        playTone(523.25, 'triangle', 0.2, now + 0.2, 0.2); // C5
        playTone(523.25, 'triangle', 0.2, now + 0.4, 0.2); // C5
        playTone(659.25, 'triangle', 0.6, now + 0.6, 0.2); // E5 (Long)

        playTone(783.99, 'sine', 0.6, now + 1.2, 0.2); // G5 (Long)
        playTone(1046.50, 'sine', 1.0, now + 1.8, 0.3); // C6 (Final)
    }, [playTone]);

    const playTurnSound = useCallback(() => {
        // "Notification" chime
        // Two distinct pleasant tones (E5 -> G#5)
        const now = 0;
        playTone(659.25, 'sine', 0.15, now, 0.2); // E5
        playTone(830.61, 'sine', 0.4, now + 0.15, 0.2); // G#5
        // Slight harmonic
        playTone(659.25 / 2, 'triangle', 0.4, now, 0.05);
    }, [playTone]);

    const playTickSound = useCallback(() => {
        // Mechanical Tick
        // High ticking sound (Woodblock-ish)
        playTone(1200, 'square', 0.03, 0, 0.05);
        playTone(200, 'triangle', 0.03, 0, 0.1); // Body
    }, [playTone]);

    return {
        playTokenSound,
        playCardFlipSound,
        playRecruitSound,
        playReserveSound,
        playErrorSound,
        playVictorySound,
        playTurnSound,
        playTickSound
    };
};
