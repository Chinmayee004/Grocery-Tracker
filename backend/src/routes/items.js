import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { authenticateHttp, DEMO_USER } from '../middleware/auth.js';
import { memoryStore } from '../store/memoryStore.js';

const router = Router();

/**
 * GET /api/items
 *
 * Auth: `Authorization: Bearer <token>` (validated by authenticateHttp).
 * Returns only the rows owned by the authenticated user.
 */
router.get('/', authenticateHttp, async (req, res, next) => {
  try {
    // Demo sessions carry a synthetic non-UUID id, so they can never satisfy the
    // grocery_items.user_id foreign key to auth.users. Keep them in the memory
    // store even once Supabase credentials are configured.
    if (!isSupabaseConfigured || req.user.id === DEMO_USER.id) {
      const items = memoryStore.getItems(req.user.id);
      return res.status(200).json({ success: true, data: items });
    }

    const { data, error } = await supabase
      .from('grocery_items')
      .select('id, user_id, name, is_completed, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, data: data ?? [] });
  } catch (err) {
    return next(err);
  }
});

export default router;
