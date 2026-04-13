

require('dotenv').config();
const Message = require('./models/message');
const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB error:', err));

app.get('/', (req, res) => {
  res.send('Chat server is running');
});
app.get('/messages/:room', async (req, res) => {
  const messages = await Message.find({ room: req.params.room }).sort({ timestamp: 1 });
  res.json(messages);
});
const users = {};


io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a room
socket.on('joinRoom', ({ username, room }) => {
  users[socket.id] = { username, room };
  socket.join(room);
  
  // Send online users list to the room
  const roomUsers = Object.values(users).filter(u => u.room === room);
  io.to(room).emit('onlineUsers', roomUsers);
  
  console.log(`${username} joined room: ${room}`);
});

// Disconnect
socket.on('disconnect', () => {
  const user = users[socket.id];
  if (user) {
    const { room } = user;
    delete users[socket.id];
    const roomUsers = Object.values(users).filter(u => u.room === room);
    io.to(room).emit('onlineUsers', roomUsers);
  }
  console.log('User disconnected:', socket.id);
});


  // Send message
  socket.on('chatMessage', async (data) => {
    const { sender, room, text } = data;
    const message = new Message({ sender, room, text });
    await message.save();
    io.to(room).emit('chatMessage', data);
  });

  // Typing indicator
  socket.on('typing', (data) => {
    socket.to(data.room).emit('typing', data.sender);
  });
});


const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
