import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { socket } from '../../lib/socket';

interface ChatMessage {
  id: string;
  senderId: string;
  message: string;
  timestamp: number;
}

interface ChatRoomProps {
  roomId: string;
  otherUserId: string;
}

export default function ChatRoom({ roomId, otherUserId }: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleIncomingMessage = (data: { senderId: string; message: string }) => {
      setMessages((prev) => [
        ...prev, 
        {
          id: Math.random().toString(36).substring(7),
          senderId: data.senderId,
          message: data.message,
          timestamp: Date.now()
        }
      ]);
    };

    socket.on('chat:message', handleIncomingMessage);

    return () => {
      socket.off('chat:message', handleIncomingMessage);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMsg = {
      id: Math.random().toString(36).substring(7),
      senderId: socket.id as string,
      message: inputValue.trim(),
      timestamp: Date.now()
    };

    // Optimistically add message
    setMessages((prev) => [...prev, newMsg]);
    
    // Emit to backend
    socket.emit('chat:message', { roomId, message: newMsg.message });
    setInputValue('');
  };

  return (
    <div style={chatBoxStyle}>
      <div style={chatHeaderStyle}>
        <span style={headerTitleStyle}>Proximity Chat</span>
        <div style={statusContainerStyle}>
          <div style={activeDotStyle} />
          <span style={statusTextStyle}>ID: {otherUserId.substring(0, 4)}</span>
        </div>
      </div>
      
      <div style={messagesContainerStyle}>
        {messages.length === 0 ? (
          <div style={emptyMessageStyle}>Say hello! They are close by.</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === socket.id;
            return (
              <div key={msg.id} style={{ ...messageRowStyle, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={isMe ? myMessageStyle : otherMessageStyle}>
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} style={inputContainerStyle}>
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Say something..." 
          style={inputStyle}
          autoFocus
        />
        <button type="submit" style={buttonStyle}>Send</button>
      </form>
    </div>
  );
}

const chatBoxStyle: CSSProperties = {
  position: 'fixed',
  bottom: '4rem', // Above the HUD
  left: '50%',
  transform: 'translateX(-50%)',
  width: '340px',
  display: 'flex',
  flexDirection: 'column',
  background: 'rgba(15, 23, 42, 0.75)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  fontFamily: '"Inter", "Roboto", sans-serif',
  overflow: 'hidden',
  animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
};

const chatHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  background: 'rgba(255, 255, 255, 0.03)',
};

const headerTitleStyle: CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#e2e8f0',
  letterSpacing: '0.02em',
};

const statusContainerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const activeDotStyle: CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#10b981',
  boxShadow: '0 0 8px #10b981',
};

const statusTextStyle: CSSProperties = {
  fontSize: '0.75rem',
  color: '#94a3b8',
};

const messagesContainerStyle: CSSProperties = {
  height: '220px',
  overflowY: 'auto',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  scrollbarWidth: 'none', // Firefox
  msOverflowStyle: 'none',  // IE and Edge
};

const emptyMessageStyle: CSSProperties = {
  margin: 'auto',
  color: '#64748b',
  fontSize: '0.8rem',
  fontStyle: 'italic',
};

const messageRowStyle: CSSProperties = {
  display: 'flex',
  width: '100%',
};

const baseMessageStyle: CSSProperties = {
  maxWidth: '80%',
  padding: '8px 12px',
  borderRadius: '12px',
  fontSize: '0.85rem',
  lineHeight: 1.4,
  wordBreak: 'break-word',
};

const myMessageStyle: CSSProperties = {
  ...baseMessageStyle,
  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  color: '#ffffff',
  borderBottomRightRadius: '4px',
};

const otherMessageStyle: CSSProperties = {
  ...baseMessageStyle,
  background: 'rgba(255, 255, 255, 0.1)',
  color: '#f8fafc',
  borderBottomLeftRadius: '4px',
};

const inputContainerStyle: CSSProperties = {
  display: 'flex',
  padding: '12px',
  gap: '8px',
  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  background: 'rgba(0, 0, 0, 0.2)',
};

const inputStyle: CSSProperties = {
  flex: 1,
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '999px',
  padding: '8px 16px',
  color: '#f8fafc',
  fontSize: '0.85rem',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const buttonStyle: CSSProperties = {
  background: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '999px',
  padding: '0 16px',
  fontSize: '0.85rem',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background 0.2s',
};