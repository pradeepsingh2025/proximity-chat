import { useState, useEffect, useRef } from 'react';
import {
    chatBoxStyle,
    chatHeaderStyle,
    headerTitleStyle,
    statusContainerStyle,
    activeDotStyle,
    statusTextStyle,
    messagesContainerStyle,
    emptyMessageStyle,
    messageRowStyle,
    myMessageStyle,
    otherMessageStyle,
    inputContainerStyle,
    inputStyle,
    buttonStyle
} from '../../styles/chatStyle.ts'
import { socket } from '../../lib/socket.ts';
import type { ChatMessage, ChatRoomProps } from '../../types/chat.ts'
import { fetchWithAuth } from '../lib/api.ts';



export default function ChatRoom({ roomId, otherUsername, currentUsername }: ChatRoomProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<ChatMessage[]>([]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        return () => {
            if (messagesRef.current.length > 0) {
                const sortedUsers = [currentUsername, otherUsername].sort();
                if (currentUsername === sortedUsers[0]) {
                    fetchWithAuth('/chats', {
                        method: 'POST',
                        body: JSON.stringify({
                            participants: [currentUsername, otherUsername],
                            messages: messagesRef.current.map(m => ({
                                sender: m.senderUsername,
                                content: m.message,
                                timestamp: m.timestamp
                            }))
                        })
                    }).catch((err: any) => console.error("Failed to save chat history", err));
                }
            }
        };
    }, [currentUsername, otherUsername]);

    useEffect(() => {
        const handleIncomingMessage = (data: { senderUsername: string; message: string }) => {
            setMessages((prev) => [
                ...prev,
                {
                    id: Math.random().toString(36).substring(7),
                    senderUsername: data.senderUsername,
                    message: data.message,
                    timestamp: new Date()
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
            senderUsername: currentUsername,
            message: inputValue.trim(),
            timestamp: new Date()
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
                    <span style={statusTextStyle}>User: {otherUsername}</span>
                </div>
            </div>

            <div style={messagesContainerStyle}>
                {messages.length === 0 ? (
                    <div style={emptyMessageStyle}>Say hello! They are close by.</div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderUsername === currentUsername;
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