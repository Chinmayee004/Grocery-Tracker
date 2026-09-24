/**
 * In-memory grocery item store used as an automatic fallback
 * when Supabase credentials are not configured.
 */

let items = [
  {
    id: 'demo-item-1',
    user_id: 'demo-user-001',
    name: '🥛 Organic Whole Milk (1 Gallon)',
    is_completed: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'demo-item-2',
    user_id: 'demo-user-001',
    name: '🍞 Artisanal Sourdough Bread',
    is_completed: true,
    created_at: new Date(Date.now() - 3000000).toISOString(),
  },
  {
    id: 'demo-item-3',
    user_id: 'demo-user-001',
    name: '🥑 Hass Avocados (Pack of 4)',
    is_completed: false,
    created_at: new Date(Date.now() - 2400000).toISOString(),
  },
  {
    id: 'demo-item-4',
    user_id: 'demo-user-001',
    name: '☕ Medium Roast Coffee Beans',
    is_completed: false,
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'demo-item-5',
    user_id: 'demo-user-001',
    name: '🥚 Free-Range Brown Eggs (1 Dozen)',
    is_completed: true,
    created_at: new Date(Date.now() - 1200000).toISOString(),
  },
];

export const memoryStore = {
  getItems(userId) {
    return items.filter((item) => !userId || item.user_id === userId);
  },

  addItem(userId, name) {
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: userId || 'demo-user-001',
      name: name.trim(),
      is_completed: false,
      created_at: new Date().toISOString(),
    };
    items.unshift(newItem);
    return newItem;
  },

  toggleItem(userId, id, isCompleted) {
    const item = items.find((i) => i.id === id && (!userId || i.user_id === userId));
    if (!item) return null;
    item.is_completed = isCompleted;
    return { ...item };
  },

  deleteItem(userId, id) {
    const initialLen = items.length;
    items = items.filter((i) => !(i.id === id && (!userId || i.user_id === userId)));
    return items.length < initialLen;
  },
};

export default memoryStore;
