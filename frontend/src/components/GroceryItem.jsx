import React, { useState } from 'react';
import { Check, Trash2, Loader2 } from 'lucide-react';

export default function GroceryItem({ item, onToggle, onDelete }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCheckboxClick = async () => {
    if (isUpdating || isDeleting) return;
    setIsUpdating(true);
    try {
      await onToggle(item.id, !item.is_completed);
    } catch (err) {
      console.error('[ITEM] Failed to toggle completion:', err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = async (e) => {
    e.stopPropagation();
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(item.id);
    } catch (err) {
      console.error('[ITEM] Failed to delete item:', err.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className={`grocery-item ${item.is_completed ? 'is-completed' : ''}`}>
      <div className="item-left" onClick={handleCheckboxClick}>
        <div
          className={`custom-checkbox ${item.is_completed ? 'checked' : ''}`}
          role="checkbox"
          aria-checked={item.is_completed}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              handleCheckboxClick();
            }
          }}
        >
          {item.is_completed && <Check size={14} color="#ffffff" strokeWidth={3} />}
        </div>

        {/* Text label with strike-through and faded tone #999 when completed */}
        <span className={`item-label ${item.is_completed ? 'completed' : ''}`}>
          {item.name}
        </span>
      </div>

      <button
        type="button"
        className="btn-delete-item"
        onClick={handleDeleteClick}
        disabled={isDeleting}
        title="Delete item"
      >
        {isDeleting ? (
          <Loader2 size={16} className="spin-icon" />
        ) : (
          <Trash2 size={16} />
        )}
      </button>
    </div>
  );
}
