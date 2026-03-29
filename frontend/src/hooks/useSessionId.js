import { useState, useEffect } from 'react';

/**
 * Hook: useSessionId
 * Generates a persistent session ID for anonymous user tracking
 * Used for search history without requiring login
 */
export default function useSessionId() {
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    let id = localStorage.getItem('session_id');
    if (!id) {
      id = 'sess_' + Math.random().toString(36).substr(2, 16) + Date.now();
      localStorage.setItem('session_id', id);
    }
    setSessionId(id);
  }, []);

  return sessionId;
}
