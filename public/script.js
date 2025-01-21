// DOM Elements
const joinRoomButton = document.getElementById('join-room');
const sendMessageButton = document.getElementById('send-message');
const messageInput = document.getElementById('message-input');
const messageDisplay = document.getElementById('message-display');
const usernameInput = document.getElementById('username');
const roomsList = document.getElementById('rooms-list');
const createRoomButton = document.getElementById('create-room');

// Current state
let currentRoom = 'General Room';
let username = '';

// Connect to the server
const socket = io();

// Event Listeners
joinRoomButton.addEventListener('click', handleJoinRoom);
sendMessageButton.addEventListener('click', sendMessage);
createRoomButton.addEventListener('click', createRoom);
messageInput.addEventListener('input', toggleSendButton);
roomsList.addEventListener('click', handleRoomClick);
messageDisplay.addEventListener('scroll', autoScrollToBottom);

// Listen for server events
socket.on('message', displayMessage);
socket.on('rooms', updateRooms);
socket.on('error', handleError);

// Join Room
function handleJoinRoom() {
    const input = usernameInput.value.trim();
    if (input && input !== username) {
        username = input;
        joinRoom(currentRoom);
        usernameInput.disabled = true;
        joinRoomButton.disabled = true;
    }
}

// Send Message
function sendMessage() {
    const message = messageInput.value.trim();
    if (message && username) {
        socket.emit('message', { username, content: message, room: currentRoom });
        messageInput.value = '';
    }
}

// Join a Room
function joinRoom(room) {
    if (room !== currentRoom) {
        socket.emit('leave', { username, room: currentRoom });
        currentRoom = room;
        socket.emit('join', { username, room });
        highlightActiveRoom();
        clearMessages();
        addSystemMessage(`You joined "${room}"`);
    }
}

// Create a Room
function createRoom() {
    const roomName = prompt('Enter the new room name:').trim();
    if (roomName) {
        socket.emit('create-room', roomName);
    }
}

// Update Rooms List
function updateRooms(roomList) {
    roomsList.innerHTML = '';
    roomList.forEach((room) => {
        const li = document.createElement('li');
        li.textContent = room;
        li.className = room === currentRoom ? 'active-room' : '';
        li.dataset.room = room;
        roomsList.appendChild(li);
    });
}

// Handle Room Click
function handleRoomClick(event) {
    const room = event.target.dataset.room;
    if (room) joinRoom(room);
}

// Display Message
function displayMessage({ username, content }) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');

    const timestamp = new Date().toLocaleTimeString();
    messageElement.innerHTML = `
        <div class="username">${username}</div>
        <div class="timestamp">${timestamp}</div>
        <div class="content">${formatMessage(content)}</div>
    `;

    messageDisplay.appendChild(messageElement);
    if (isUserAtBottom()) messageDisplay.scrollTop = messageDisplay.scrollHeight;
    else showNewMessageNotification();
}

// Format Message
function formatMessage(content) {
    return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/https?:\/\/[^\s]+/g, '<a href="$&" target="_blank">$&</a>');
}

// Add System Message
function addSystemMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'system-message');
    messageElement.textContent = message;
    messageDisplay.appendChild(messageElement);
}

// Highlight Active Room
function highlightActiveRoom() {
    Array.from(roomsList.children).forEach((li) => {
        li.classList.toggle('active-room', li.textContent === currentRoom);
    });
}

// Clear Messages
function clearMessages() {
    messageDisplay.innerHTML = '';
}

// Toggle Send Button
function toggleSendButton() {
    sendMessageButton.disabled = !messageInput.value.trim();
}

// Handle Error
function handleError(error) {
    console.error('Error:', error);
    addSystemMessage(`Error: ${error.message || 'An error occurred'}`);
}

// Auto-scroll to Bottom
function autoScrollToBottom() {
    const isAtBottom = isUserAtBottom();
    if (isAtBottom) {
        messageDisplay.scrollTop = messageDisplay.scrollHeight;
    }
}

// Check if User is at the Bottom of Chat
function isUserAtBottom() {
    return messageDisplay.scrollHeight - messageDisplay.scrollTop <= messageDisplay.clientHeight + 50;
}

// Show New Message Notification
function showNewMessageNotification() {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.textContent = 'New message!';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}
