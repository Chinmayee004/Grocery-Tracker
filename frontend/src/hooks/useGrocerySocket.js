import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '../lib/supabaseClient';

/**
 * Custom React Hook managing:
 * 1. Initial HTTP REST fetch of user-scoped grocery items (`GET /api/items`).
 * 2. Live WebSocket synchronization via Socket.io with JWT authentication.
 * 3. Strict cleanup and unsubscription in `useEffect` to prevent memory leaks.
 *
 * @param {string | null} token - The active Supabase user session access token (JWT).
 */
export function useGrocerySocket(token) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  // 1. Initial REST API Fetch
  const fetchItems = useCallback(async () => {
    if (!token) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await fetch(`${API_URL}/api/items`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const result = await response.json();
      setItems(result.data || []);
    } catch (err) {
      console.error('[REST] Error fetching grocery items:', err.message);
      setFetchError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // 2. WebSocket Connection and Real-Time Synchronization
  useEffect(() => {
    if (!token) {
      setIsConnected(false);
      return;
    }

    // Initialize initial REST fetch
    fetchItems();

    // Establish WebSocket connection with JWT token in auth payload
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Socket Connection Lifecycle Events
    socket.on('connect', () => {
      console.log('[WEBSOCKET] Connected to real-time server with socket ID:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[WEBSOCKET] Disconnected from real-time server:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[WEBSOCKET] Connection error:', error.message);
      setIsConnected(false);
    });

    // Real-Time Domain Events
    const handleItemAdded = (newItem) => {
      console.log('[WEBSOCKET] Real-time event "item_added":', newItem);
      setItems((prevItems) => {
        // Prevent duplicate insertion if already present
        if (prevItems.some((item) => item.id === newItem.id)) {
          return prevItems;
        }
        return [newItem, ...prevItems];
      });
    };

    const handleItemToggled = (updatedItem) => {
      console.log('[WEBSOCKET] Real-time event "item_toggled":', updatedItem);
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === updatedItem.id ? { ...item, ...updatedItem } : item
        )
      );
    };

    const handleItemDeleted = (payload) => {
      console.log('[WEBSOCKET] Real-time event "item_deleted":', payload);
      setItems((prevItems) => prevItems.filter((item) => item.id !== payload.id));
    };

    socket.on('item_added', handleItemAdded);
    socket.on('item_toggled', handleItemToggled);
    socket.on('item_deleted', handleItemDeleted);

    // 3. Strict Garbage Collection on Unmount or Token Change
    return () => {
      console.log('[WEBSOCKET] Cleaning up socket event listeners and disconnecting...');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('item_added', handleItemAdded);
      socket.off('item_toggled', handleItemToggled);
      socket.off('item_deleted', handleItemDeleted);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, fetchItems]);

  // Real-time Action Dispatchers
  const addItem = useCallback((name) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !socketRef.current.connected) {
        return reject(new Error('WebSocket is not connected. Please try again.'));
      }
      socketRef.current.emit('add_item', { name }, (res) => {
        if (res?.success) resolve(res.data);
        else reject(new Error(res?.error || 'Failed to add item'));
      });
    });
  }, []);

  const toggleItem = useCallback((id, is_completed) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !socketRef.current.connected) {
        return reject(new Error('WebSocket is not connected. Please try again.'));
      }
      socketRef.current.emit('toggle_item', { id, is_completed }, (res) => {
        if (res?.success) resolve(res.data);
        else reject(new Error(res?.error || 'Failed to toggle item'));
      });
    });
  }, []);

  const deleteItem = useCallback((id) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !socketRef.current.connected) {
        return reject(new Error('WebSocket is not connected. Please try again.'));
      }
      socketRef.current.emit('delete_item', { id }, (res) => {
        if (res?.success) resolve(res.id);
        else reject(new Error(res?.error || 'Failed to delete item'));
      });
    });
  }, []);

  return {
    items,
    isLoading,
    fetchError,
    isConnected,
    addItem,
    toggleItem,
    deleteItem,
    refresh: fetchItems,
  };
}
