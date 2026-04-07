export interface ChatMessage {
  id: string;
  senderUsername: string;
  message: string;
  timestamp: Date;
}

export interface ChatRoomProps {
  roomId: string;
  otherUsername: string;
  currentUsername: string;
}