import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, AlertCircle } from 'lucide-react';
import API from '../services/api';

function FamilyChat({ user, familyData }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const response = await API.get('/chat');
      setMessages(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching chat messages:', err);
      // Only set error if not initially loading to prevent UI flicker
      if (loading) setError('Failed to load chat messages.');
    } finally {
      if (loading) setLoading(false);
    }
  };

  useEffect(() => {
    if (familyData?.familyId) {
      fetchMessages();
      // Poll every 5 seconds for new messages
      const intervalId = setInterval(fetchMessages, 5000);
      return () => clearInterval(intervalId);
    }
  }, [familyData?.familyId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await API.post('/chat', { content: newMessage });
      setMessages(prev => [...prev, response.data.data]);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message.');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-purple" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-0 animate-fade-in d-flex flex-column h-100" style={{ maxHeight: 'calc(100vh - 100px)' }}>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-white fw-bold mb-1 d-flex align-items-center gap-2">
          <MessageSquare className="text-cyan" /> 
          Family Chat
        </h2>
        <p className="text-muted">Stay connected with your family members.</p>
      </div>

      {error && (
        <div className="alert alert-danger border-0 bg-danger bg-opacity-25 text-danger-emphasis d-flex align-items-center gap-2 mb-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Chat Container */}
      <div className="glass-panel d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: '500px' }}>
        {/* Messages List */}
        <div className="flex-grow-1 p-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {messages.length === 0 ? (
            <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted">
              <MessageSquare size={48} className="mb-3 opacity-25" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {messages.map(msg => {
                const isMine = msg.senderId === user.id;
                return (
                  <div key={msg.id} className={`d-flex flex-column ${isMine ? 'align-items-end' : 'align-items-start'}`}>
                    <span className="text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                      {isMine ? 'You' : msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div 
                      className={`p-3 rounded-4 ${isMine ? 'bg-purple text-white' : 'bg-secondary bg-opacity-25 text-white'}`}
                      style={{ 
                        maxWidth: '75%', 
                        borderBottomRightRadius: isMine ? '0px' : undefined,
                        borderBottomLeftRadius: !isMine ? '0px' : undefined
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 border-top border-secondary border-opacity-25 bg-dark bg-opacity-50">
          <form onSubmit={handleSendMessage} className="d-flex gap-2">
            <input
              type="text"
              className="form-control bg-dark text-white border-secondary border-opacity-50"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              style={{ borderRadius: '20px' }}
            />
            <button 
              type="submit" 
              className="btn btn-purple rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: '45px', height: '45px' }}
              disabled={!newMessage.trim()}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default FamilyChat;
