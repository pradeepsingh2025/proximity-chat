export interface ChatMessage {
  id: string;
  senderId: string;
  message: string;
  timestamp: number;
}

export interface ChatRoomProps {
  roomId: string;
  otherUserId: string;
}