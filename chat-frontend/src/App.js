import React, { useState, useEffect, useRef } from 'react';
import socket from './socket';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState('');
  const messagesEndRef = useRef(null);


  const joinRoom = () => {
    if (username && room) {
      socket.emit('joinRoom', { username, room });
      setJoined(true);
    }
  };// Load chat history when joining
  useEffect(() => {
    if (joined) {
      fetch(`https://chatwebbackend-xkvb.onrender.com/messages/${room}`)
        .then(res => res.json())
        .then(data => setMessages(data));
    }
  }, [joined]);

  // Listen for incoming messages
  useEffect(() => {
    socket.on('chatMessage', (data) => {
      setMessages(prev => [...prev, data]);
    });

    return () => socket.off('chatMessage');
  }, []);
  // Listen for online users
  useEffect(() => {
    socket.on('onlineUsers', (users) => {
      setOnlineUsers(users);
    });
    return () => socket.off('onlineUsers');
  }, []);

  // Listen for typing
  useEffect(() => {
    socket.on('typing', (sender) => {
      setTypingUser(sender + ' is typing...');
      setTimeout(() => setTypingUser(''), 2000);
    });
    return () => socket.off('typing');
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('chatMessage', { sender: username, room, text: message });
      setMessage('');
    }
  };

  return (
    <div className="App">
      {!joined ? (
        <div className="join-screen">
          <h2>Join Chat</h2>
          <input
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            placeholder="Enter room name"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button onClick={joinRoom}>Join</button>
        </div>
      ) : (
        <div className="chat-screen">
          <h2>Room: {room}</h2>
          <div className="online-users">
            Online: {onlineUsers.map(u => u.username).join(', ')}
          </div>
          <div className="messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.sender === username ? 'own' : ''}`}>
                <strong>{msg.sender}: </strong>{msg.text}
                <span className="timestamp">
                  {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {typingUser && <div className="typing">{typingUser}</div>}
          <div className="input-area">
            <input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                socket.emit('typing', { sender: username, room });
              }}

              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
