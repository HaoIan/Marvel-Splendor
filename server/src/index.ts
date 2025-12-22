import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Types
interface Player {
    id: string;      // Socket ID (volatile)
    uuid: string;    // Persistent UUID
    name: string;
    tokens: Record<string, number>;
    hand: any[];
    tableau: any[];
    nobles: any[];
    points: number;
    isHuman: boolean;
    connected: boolean;
}

interface GameState {
    players: Player[];
    currentPlayerIndex: number;
    tokens: Record<string, number>;
    decks: { 1: any[]; 2: any[]; 3: any[] };
    market: { 1: any[]; 2: any[]; 3: any[] };
    nobles: any[];
    turn: number;
    winner: string | null;
    logs: string[];
    status: 'LOBBY' | 'PLAYING' | 'GAME_OVER';
    finalRound?: boolean;
}

interface Room {
    code: string;
    hostUUID: string;
    players: Map<string, { socketId: string; name: string; uuid: string; connected: boolean }>;
    gameState: GameState | null;
    createdAt: number;
}

// Room Storage
const rooms = new Map<string, Room>();

// Generate short room code
function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like O/0, I/1
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure unique
    if (rooms.has(code)) return generateRoomCode();
    return code;
}

// Find room by player UUID
function findRoomByPlayerUUID(uuid: string): Room | undefined {
    for (const room of rooms.values()) {
        if (room.players.has(uuid)) return room;
    }
    return undefined;
}

io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Create a new room
    socket.on('create-room', ({ playerName, uuid }: { playerName: string; uuid: string }) => {
        const code = generateRoomCode();
        const room: Room = {
            code,
            hostUUID: uuid,
            players: new Map(),
            gameState: null,
            createdAt: Date.now()
        };
        room.players.set(uuid, { socketId: socket.id, name: playerName, uuid, connected: true });
        rooms.set(code, room);

        socket.join(code);
        socket.data.roomCode = code;
        socket.data.uuid = uuid;

        console.log(`Room ${code} created by ${playerName} (${uuid})`);
        socket.emit('room-created', { roomCode: code, players: Array.from(room.players.values()) });
    });

    // Join existing room
    socket.on('join-room', ({ roomCode, playerName, uuid }: { roomCode: string; playerName: string; uuid: string }) => {
        const room = rooms.get(roomCode.toUpperCase());

        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        const existingPlayer = room.players.get(uuid);

        if (existingPlayer) {
            // Reconnection
            console.log(`Player ${playerName} (${uuid}) reconnecting to room ${roomCode}`);
            existingPlayer.socketId = socket.id;
            existingPlayer.connected = true;

            // Update socket ID in game state if game is running
            if (room.gameState) {
                const playerInGame = room.gameState.players.find(p => p.uuid === uuid);
                if (playerInGame) {
                    playerInGame.id = socket.id;
                    playerInGame.connected = true;
                }
            }
        } else {
            // New player joining
            if (room.gameState && room.gameState.status !== 'LOBBY') {
                socket.emit('error', { message: 'Game already in progress' });
                return;
            }
            room.players.set(uuid, { socketId: socket.id, name: playerName, uuid, connected: true });
            console.log(`Player ${playerName} (${uuid}) joined room ${roomCode}`);
        }

        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.uuid = uuid;

        // Send current state
        const playerList = Array.from(room.players.values());
        io.to(roomCode).emit('player-list-updated', { players: playerList });

        if (room.gameState) {
            socket.emit('state-sync', { state: room.gameState });
        } else {
            socket.emit('room-joined', { roomCode, players: playerList, isHost: room.hostUUID === uuid });
        }
    });

    // Start game (Host only)
    socket.on('start-game', ({ initialState }: { initialState: GameState }) => {
        const roomCode = socket.data.roomCode;
        const uuid = socket.data.uuid;
        const room = rooms.get(roomCode);

        if (!room || room.hostUUID !== uuid) {
            socket.emit('error', { message: 'Only the host can start the game' });
            return;
        }

        // Update player IDs in initial state to match socket IDs
        initialState.players.forEach(p => {
            const roomPlayer = room.players.get(p.uuid!);
            if (roomPlayer) {
                p.id = roomPlayer.socketId;
                p.connected = true;
            }
        });

        room.gameState = initialState;
        console.log(`Game started in room ${roomCode}`);
        io.to(roomCode).emit('state-sync', { state: room.gameState });
    });

    // Handle game action
    socket.on('game-action', ({ action }: { action: any }) => {
        const roomCode = socket.data.roomCode;
        const room = rooms.get(roomCode);

        if (!room || !room.gameState) {
            socket.emit('error', { message: 'No active game' });
            return;
        }

        // Process action server-side (simplified - just forward to all for now, real logic can be added)
        // For MVP, we trust the client's computed state and just broadcast it
        // In production, you'd validate and compute state server-side
        console.log(`Action in room ${roomCode}:`, action.type);
        io.to(roomCode).emit('game-action', { action });
    });

    // Sync state from host (Host-authoritative model)
    socket.on('sync-state', ({ state }: { state: GameState }) => {
        const roomCode = socket.data.roomCode;
        const uuid = socket.data.uuid;
        const room = rooms.get(roomCode);

        if (!room || room.hostUUID !== uuid) return;

        room.gameState = state;
        socket.to(roomCode).emit('state-sync', { state }); // Broadcast to others in room
    });

    // Close room (Host only)
    socket.on('close-room', () => {
        const roomCode = socket.data.roomCode;
        const uuid = socket.data.uuid;
        const room = rooms.get(roomCode);

        if (!room || room.hostUUID !== uuid) return;

        io.to(roomCode).emit('room-closed', { message: 'Host closed the room' });
        rooms.delete(roomCode);
        console.log(`Room ${roomCode} closed by host`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        const roomCode = socket.data.roomCode;
        const uuid = socket.data.uuid;

        console.log(`Client disconnected: ${socket.id}`);

        if (roomCode && uuid) {
            const room = rooms.get(roomCode);
            if (room) {
                const player = room.players.get(uuid);
                if (player) {
                    player.connected = false;
                    console.log(`Player ${player.name} disconnected from room ${roomCode}`);

                    // Update game state
                    if (room.gameState) {
                        const playerInGame = room.gameState.players.find(p => p.uuid === uuid);
                        if (playerInGame) {
                            playerInGame.connected = false;
                        }
                    }

                    // Notify others
                    io.to(roomCode).emit('player-disconnected', { uuid, name: player.name });
                }
            }
        }
    });
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'ok', rooms: rooms.size });
});

// Cleanup old rooms periodically (older than 4 hours)
setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms.entries()) {
        if (now - room.createdAt > 4 * 60 * 60 * 1000) {
            rooms.delete(code);
            console.log(`Cleaned up stale room ${code}`);
        }
    }
}, 60 * 60 * 1000); // Check every hour

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
