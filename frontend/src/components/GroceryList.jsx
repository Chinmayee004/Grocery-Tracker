import React, { useState, useMemo } from 'react';
import GroceryItem from './GroceryItem';
import { Search, ShoppingBasket, CheckCircle2 } from 'lucide-react';

export default function GroceryList({ items = [], onToggle, onDelete }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Completion filter
      if (filter === 'active' && item.is_completed) return false;
      if (filter === 'completed' && !item.is_completed) return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        return item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      }

      return true;
    });
  }, [items, filter, searchQuery]);

  const activeCount = items.filter((i) => !i.is_completed).length;
  const completedCount = items.filter((i) => i.is_completed).length;

  return (
    <div>
      {/* Controls & Filter Bar */}
      <div className="controls-bar">
        <div className="filter-tabs">
          <button
            type="button"
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Pending ({activeCount})
          </button>
          <button
            type="button"
            className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Done ({completedCount})
          </button>
        </div>

        {items.length > 0 && (
          <div className="search-input-wrapper">
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              className="search-input"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Grocery Items List */}
      {filteredItems.length > 0 ? (
        <div className="grocery-list">
          {filteredItems.map((item) => (
            <GroceryItem
              key={item.id}
              item={item}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon-circle">
            {filter === 'completed' ? (
              <CheckCircle2 size={32} />
            ) : (
              <ShoppingBasket size={32} />
            )}
          </div>
          <h3 className="empty-title">
            {items.length === 0
              ? 'Your grocery list is empty'
              : 'No matching grocery items found'}
          </h3>
          <p className="empty-desc">
            {items.length === 0
              ? 'Add items using the bar above to keep your shopping synced across all devices in real time!'
              : 'Try clearing your search query or selecting a different filter above.'}
          </p>
        </div>
      )}
    </div>
  );
}
