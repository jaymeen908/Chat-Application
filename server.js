// Import necessary modules
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Create an Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Store rooms and users
let rooms = ['General Room']; // Default room
let users = {}; // Maps socket.id to user data

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

// Handle new client connections
io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    // Notify the client with the current room list
    socket.emit('rooms', rooms);

    // When a user joins a room
    socket.on('join', (data) => {
        const { username, room } = data;

        // Validate inputs
        if (!username || !room) {
            socket.emit('message', {
                username: 'System',
                content: 'Username and room name are required.',
            });
            return;
        }

        if (!rooms.includes(room)) {
            socket.emit('message', {
                username: 'System',
                content: `The room "${room}" does not exist.`,
            });
            return;
        }

        // Leave any existing room
        const prevRoom = users[socket.id]?.room;
        if (prevRoom) {
            socket.leave(prevRoom);
            io.to(prevRoom).emit('message', {
                username: 'System',
                content: `${users[socket.id].username} has left the room.`,
            });
        }

        // Save user data and join the new room
        users[socket.id] = { username, room };
        socket.join(room);

        // Notify others in the room about the new user
        io.to(room).emit('message', {
            username: 'System',
            content: `${username} has joined the room.`,
        });

        console.log(`${username} joined room: ${room}`);
    });

    // Handle user messages
    socket.on('message', (data) => {
        const user = users[socket.id];
        if (!user) {
            socket.emit('message', {
                username: 'System',
                content: 'You need to join a room before sending messages.',
            });
            return;
        }

        const { content } = data;
        if (!content.trim()) return;

        // Broadcast message to the room
        io.to(user.room).emit('message', {
            username: user.username,
            content,
            timestamp: new Date().toLocaleTimeString(),
        });
    });

    // Handle creating a new room
    socket.on('create-room', (roomName) => {
        if (!roomName || roomName.trim() === '') {
            socket.emit('message', {
                username: 'System',
                content: 'Room name cannot be empty.',
            });
            return;
        }

        if (rooms.includes(roomName)) {
            socket.emit('message', {
                username: 'System',
                content: `The room "${roomName}" already exists.`,
            });
            return;
        }

        // Add the new room
        rooms.push(roomName);
        io.emit('rooms', rooms); // Notify all clients
        console.log(`Room "${roomName}" created.`);
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            const { username, room } = user;

            // Notify others in the room
            io.to(room).emit('message', {
                username: 'System',
                content: `${username} has left the room.`,
            });

            console.log(`${username} disconnected from room: ${room}`);
            delete users[socket.id]; // Remove user data
        }

        console.log('User disconnected:', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
