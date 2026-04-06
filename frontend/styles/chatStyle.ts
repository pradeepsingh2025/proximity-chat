import type { CSSProperties } from "react";

export const chatBoxStyle: CSSProperties = {
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

export const chatHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  background: 'rgba(255, 255, 255, 0.03)',
};

export const headerTitleStyle: CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#e2e8f0',
  letterSpacing: '0.02em',
};

export const statusContainerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

export const activeDotStyle: CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#10b981',
  boxShadow: '0 0 8px #10b981',
};

export const statusTextStyle: CSSProperties = {
  fontSize: '0.75rem',
  color: '#94a3b8',
};

export const messagesContainerStyle: CSSProperties = {
  height: '220px',
  overflowY: 'auto',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  scrollbarWidth: 'none', // Firefox
  msOverflowStyle: 'none',  // IE and Edge
};

export const emptyMessageStyle: CSSProperties = {
  margin: 'auto',
  color: '#64748b',
  fontSize: '0.8rem',
  fontStyle: 'italic',
};

export const messageRowStyle: CSSProperties = {
  display: 'flex',
  width: '100%',
};

export const baseMessageStyle: CSSProperties = {
  maxWidth: '80%',
  padding: '8px 12px',
  borderRadius: '12px',
  fontSize: '0.85rem',
  lineHeight: 1.4,
  wordBreak: 'break-word',
};

export const myMessageStyle: CSSProperties = {
  ...baseMessageStyle,
  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  color: '#ffffff',
  borderBottomRightRadius: '4px',
};

export const otherMessageStyle: CSSProperties = {
  ...baseMessageStyle,
  background: 'rgba(255, 255, 255, 0.1)',
  color: '#f8fafc',
  borderBottomLeftRadius: '4px',
};

export const inputContainerStyle: CSSProperties = {
  display: 'flex',
  padding: '12px',
  gap: '8px',
  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  background: 'rgba(0, 0, 0, 0.2)',
};

export const inputStyle: CSSProperties = {
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

export const buttonStyle: CSSProperties = {
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