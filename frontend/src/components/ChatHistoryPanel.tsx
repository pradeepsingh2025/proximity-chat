import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../lib/api';
import {
    historyPanelStyle,
    chatHeaderStyle,
    headerTitleStyle,
    historyCloseButtonStyle,
    historyListStyle,
    historyItemStyle,
    historyItemHeaderStyle,
    historyDateStyle,
    historyMessagesStyle,
    historyMessageRowStyle,
    historyMsgSenderStyle,
    emptyMessageStyle
} from '../../styles/chatStyle.ts';

interface MessageRow {
    sender: string;
    content: string;
    timestamp: string;
    _id: string;
}

interface ChatSession {
    _id: string;
    participants: string[];
    messages: MessageRow[];
}

export default function ChatHistoryPanel({ currentUsername, onClose }: { currentUsername: string, onClose: () => void }) {
    const [histories, setHistories] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const res = await fetchWithAuth('/chats');
                if (res.ok) {
                    const data = await res.json();
                    setHistories(data);
                }
            } catch (err) {
                console.error("Failed to load chat history", err);
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, []);

    return (
        <div style={historyPanelStyle}>
            <div style={chatHeaderStyle}>
                <span style={headerTitleStyle}>Chat History</span>
                <button style={historyCloseButtonStyle} onClick={onClose}>&times;</button>
            </div>
            
            <div style={historyListStyle}>
                {loading ? (
                    <div style={emptyMessageStyle}>Loading...</div>
                ) : histories.length === 0 ? (
                    <div style={emptyMessageStyle}>No past encounters found.</div>
                ) : (
                    histories.map((session) => {
                        const otherParticipants = session.participants.filter(p => p !== currentUsername);
                        const otherUsername = otherParticipants.length > 0 ? otherParticipants.join(', ') : 'Unknown';
                        
                        // Grab the earliest message's date or current date for the header
                        const sessionDate = session.messages.length > 0 
                            ? new Date(session.messages[0].timestamp).toLocaleString() 
                            : 'Unknown Date';

                        return (
                            <div key={session._id} style={historyItemStyle}>
                                <div style={historyItemHeaderStyle}>
                                    <span>Chat with: <span style={{ color: '#10b981' }}>{otherUsername}</span></span>
                                    <span style={historyDateStyle}>{sessionDate}</span>
                                </div>
                                <div style={historyMessagesStyle}>
                                    {session.messages.map(msg => (
                                        <div key={msg._id} style={historyMessageRowStyle}>
                                            <span style={historyMsgSenderStyle}>{msg.sender}:</span>
                                            {msg.content}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
