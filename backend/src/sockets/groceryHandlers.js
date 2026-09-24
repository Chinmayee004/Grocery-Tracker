import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { memoryStore } from '../store/memoryStore.js';

/**
 * Registers all real-time Grocery List WebSocket event handlers on the given socket connection.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export function registerGroceryHandlers(io, socket) {
  const userId = socket.user?.id;
  const userEmail = socket.user?.email;

  if (!userId) {
    console.error(`[SOCKET] Unauthenticated socket encountered in handler registration: ${socket.id}`);
    socket.disconnect(true);
    return;
  }

  // Each user has their own private real-time room.
  // This allows real-time synchronization across multiple devices, browser tabs, or shared account sessions.
  const userRoom = `user:${userId}`;
  socket.join(userRoom);
  console.log(`[SOCKET] Client connected: ${socket.id} (User: ${userEmail}, Room: ${userRoom})`);

  /**
   * Event: 'add_item'
   * Inserts a new row into the Supabase 'grocery_items' table (or memoryStore if unconfigured)
   * and broadcasts 'item_added' with the item payload to the user room.
   */
  socket.on('add_item', async (payload, callback) => {
    try {
      const name = payload?.name?.trim();
      if (!name) {
        const errorMsg = 'Item name is required and cannot be empty.';
        if (typeof callback === 'function') callback({ success: false, error: errorMsg });
        socket.emit('error', { message: errorMsg });
        return;
      }

      if (!isSupabaseConfigured) {
        const newItem = memoryStore.addItem(userId, name);
        console.log(`[SOCKET-DEMO] Item added by ${userEmail}: "${newItem.name}" (${newItem.id})`);
        io.to(userRoom).emit('item_added', newItem);
        if (typeof callback === 'function') callback({ success: true, data: newItem });
        return;
      }

      const { data, error } = await supabase
        .from('grocery_items')
        .insert([
          {
            user_id: userId,
            name: name,
            is_completed: false,
          },
        ])
        .select('id, user_id, name, is_completed, created_at')
        .single();

      if (error) {
        console.error(`[SOCKET] add_item DB error for user ${userId}:`, error.message);
        if (typeof callback === 'function') callback({ success: false, error: error.message });
        socket.emit('error', { message: 'Failed to add item to database.' });
        return;
      }

      console.log(`[SOCKET] Item added by ${userEmail}: "${data.name}" (${data.id})`);

      // Broadcast to all active sockets for this user (including this socket and any other open tabs/devices)
      io.to(userRoom).emit('item_added', data);

      if (typeof callback === 'function') {
        callback({ success: true, data });
      }
    } catch (err) {
      console.error('[SOCKET] Unexpected error in add_item handler:', err.message);
      if (typeof callback === 'function') callback({ success: false, error: 'Internal server error.' });
      socket.emit('error', { message: 'Unexpected server error adding item.' });
    }
  });

  /**
   * Event: 'toggle_item'
   * Updates the 'is_completed' column boolean status for the target item ID
   * and broadcasts 'item_toggled' to the user room.
   */
  socket.on('toggle_item', async (payload, callback) => {
    try {
      const { id, is_completed } = payload || {};
      if (!id || typeof is_completed !== 'boolean') {
        const errorMsg = 'Invalid payload for toggle_item. Expected { id: string, is_completed: boolean }.';
        if (typeof callback === 'function') callback({ success: false, error: errorMsg });
        socket.emit('error', { message: errorMsg });
        return;
      }

      if (!isSupabaseConfigured) {
        const updatedItem = memoryStore.toggleItem(userId, id, is_completed);
        if (!updatedItem) {
          if (typeof callback === 'function') callback({ success: false, error: 'Item not found.' });
          return;
        }
        console.log(`[SOCKET-DEMO] Item toggled by ${userEmail}: ${id} -> is_completed: ${is_completed}`);
        io.to(userRoom).emit('item_toggled', updatedItem);
        if (typeof callback === 'function') callback({ success: true, data: updatedItem });
        return;
      }

      const { data, error } = await supabase
        .from('grocery_items')
        .update({ is_completed })
        .eq('id', id)
        .eq('user_id', userId)
        .select('id, user_id, name, is_completed, created_at')
        .single();

      if (error) {
        console.error(`[SOCKET] toggle_item DB error for user ${userId} on item ${id}:`, error.message);
        if (typeof callback === 'function') callback({ success: false, error: error.message });
        socket.emit('error', { message: 'Failed to toggle item in database.' });
        return;
      }

      console.log(`[SOCKET] Item toggled by ${userEmail}: ${id} -> is_completed: ${is_completed}`);

      // Broadcast the update to the user's room
      io.to(userRoom).emit('item_toggled', data);

      if (typeof callback === 'function') {
        callback({ success: true, data });
      }
    } catch (err) {
      console.error('[SOCKET] Unexpected error in toggle_item handler:', err.message);
      if (typeof callback === 'function') callback({ success: false, error: 'Internal server error.' });
      socket.emit('error', { message: 'Unexpected server error toggling item.' });
    }
  });

  /**
   * Event: 'delete_item'
   * Prunes the targeted row from the database (or memoryStore) and broadcasts 'item_deleted' to the user room.
   */
  socket.on('delete_item', async (payload, callback) => {
    try {
      const id = payload?.id;
      if (!id) {
        const errorMsg = 'Invalid payload for delete_item. Expected { id: string }.';
        if (typeof callback === 'function') callback({ success: false, error: errorMsg });
        socket.emit('error', { message: errorMsg });
        return;
      }

      if (!isSupabaseConfigured) {
        const deleted = memoryStore.deleteItem(userId, id);
        if (!deleted) {
          if (typeof callback === 'function') callback({ success: false, error: 'Item not found.' });
          return;
        }
        console.log(`[SOCKET-DEMO] Item deleted by ${userEmail}: ${id}`);
        io.to(userRoom).emit('item_deleted', { id });
        if (typeof callback === 'function') callback({ success: true, id });
        return;
      }

      const { data, error } = await supabase
        .from('grocery_items')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle();

      if (error) {
        console.error(`[SOCKET] delete_item DB error for user ${userId} on item ${id}:`, error.message);
        if (typeof callback === 'function') callback({ success: false, error: error.message });
        socket.emit('error', { message: 'Failed to delete item from database.' });
        return;
      }

      // PostgREST returns no row when the id does not exist (or belongs to
      // another user). Treat it as idempotent success rather than a crash.
      if (!data) {
        console.warn(`[SOCKET] delete_item: item ${id} not found for user ${userId}`);
        if (typeof callback === 'function') callback({ success: false, error: 'Item not found.' });
        return;
      }

      console.log(`[SOCKET] Item deleted by ${userEmail}: ${id}`);

      // Broadcast deletion event to the user's room
      io.to(userRoom).emit('item_deleted', { id });

      if (typeof callback === 'function') {
        callback({ success: true, id });
      }
    } catch (err) {
      console.error('[SOCKET] Unexpected error in delete_item handler:', err.message);
      if (typeof callback === 'function') callback({ success: false, error: 'Internal server error.' });
      socket.emit('error', { message: 'Unexpected server error deleting item.' });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[SOCKET] Client disconnected: ${socket.id} (${userEmail}) - Reason: ${reason}`);
  });
}
