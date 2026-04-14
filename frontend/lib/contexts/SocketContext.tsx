'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/stores/auth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Connect to Socket.IO server
    // Extract base URL from API URL (remove /api/v1 path)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const socketUrl = apiUrl.replace('/api/v1', '');
    
    const newSocket = io(socketUrl, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket'], // Force WebSocket only — avoid polling 400 errors via Nginx
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    let connectionTimeout: NodeJS.Timeout;

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      if (connectionTimeout) clearTimeout(connectionTimeout);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.warn('Socket connection failed (this is OK if backend is restarting):', error.message);
      setIsConnected(false);
    });

    // Auto-disconnect if connection fails after timeout
    connectionTimeout = setTimeout(() => {
      if (!newSocket.connected) {
        console.log('Socket connection timeout - disabling real-time features');
        newSocket.disconnect();
      }
    }, 10000); // 10 seconds

    // Listen for notification events
    newSocket.on('notification:new', (data) => {
      toast.info(data.message, {
        description: data.description,
      });
    });

    newSocket.on('sale:created', (data) => {
      toast.success('Penjualan Baru!', {
        description: `${data.customerName || 'Pelanggan'} - ${data.totalAmount}`,
      });
    });

    newSocket.on('product:low-stock', (data) => {
      toast.warning('Stok Menipis!', {
        description: `${data.productName} - Stok tersisa: ${data.currentStock}`,
      });
    });

    newSocket.on('approval:pending', (data) => {
      toast.info('Persetujuan Diperlukan', {
        description: data.message,
      });
    });
    
    newSocket.on('shipping:ready', (data) => {
      toast.success('🚚 Pesanan Siap Dikirim!', {
        description: `${data.customerName} - Rp ${data.totalAmount?.toLocaleString('id-ID')}`,
        duration: 8000,
      });
    });

    // --- GLOBAL REACTIVITY MAGIC ---
    // When backend signals any data change, invalidate all queries so the UI redraws automatically.
    newSocket.on('data:refresh', (payload: { entity: string }) => {
      console.log(`Realtime Sync: Refreshing UI for entity: ${payload.entity}`);
      queryClient.invalidateQueries(); // invalidates EVERYTHING displayed to silently fetch fresh data
    });

    setSocket(newSocket);

    return () => {
      if (connectionTimeout) clearTimeout(connectionTimeout);
      newSocket.disconnect();
    };
  }, [accessToken, queryClient]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
