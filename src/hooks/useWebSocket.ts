import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

interface WebSocketOptions {
  onNewSubmission?: (data: any) => void;
  onExamCreated?: (data: any) => void;
  onExamStatusChanged?: (data: any) => void;
}

export const useWebSocket = (options: WebSocketOptions = {}) => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Only connect if user exists and is admin/instructor
    if (!user || (user.role !== 'admin' && user.role !== 'instructor')) {
      console.log('⚠️ WebSocket: User not eligible for connection', { 
        hasUser: !!user, 
        role: user?.role 
      });
      return;
    }

    // ✅ FIX: Normalize user ID (handle both _id and id)
    const userId = (user as any)._id || (user as any).id || user.userId;
    
    if (!userId) {
      console.error('❌ WebSocket: No valid user ID found', user);
      return;
    }

    console.log('🔌 WebSocket: Attempting connection...', {
      userId,
      role: user.role,
      socketUrl: SOCKET_URL
    });

    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        userId: userId,
        role: user.role
      }
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket.id);
      setConnected(true);

      // ✅ FIX: Register with normalized user ID
      socket.emit('register', {
        userId: userId,
        role: user.role,
      });

      console.log('📡 WebSocket: Registered as', { userId, role: user.role });

      // ✅ NEW: Join instructor-specific room
      if (user.role === 'instructor') {
        socket.emit('joinInstructorRoom', userId);
        console.log(`🏠 WebSocket: Joined instructor room: instructor-${userId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      setConnected(false);
    });

    // Business logic events
    if (options.onNewSubmission) {
      socket.on('newSubmission', (data) => {
        console.log('📨 New submission received:', data);
        options.onNewSubmission!(data);
      });
    }

    if (options.onExamCreated) {
      socket.on('examCreated', (data) => {
        console.log('📨 New exam created:', data);
        options.onExamCreated!(data);
      });
    }

    if (options.onExamStatusChanged) {
      socket.on('examStatusChanged', (data) => {
        console.log('📨 Exam status changed:', data);
        options.onExamStatusChanged!(data);
      });
    }

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up WebSocket connection');
      socket.disconnect();
    };
  }, [user?.role, (user as any)?._id, (user as any)?.id]); // ✅ FIX: Watch both _id and id

  return {
    connected,
    socket: socketRef.current,
  };
};
