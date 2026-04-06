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
import { socket } from '../../lib/socket';
import type { ChatMessage, ChatRoomProps } from '../../types/chat.ts'



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