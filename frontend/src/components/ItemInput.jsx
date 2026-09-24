import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';

export default function ItemInput({ onAddItem, disabled }) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddItem(trimmed);
      setName('');
    } catch (err) {
      console.error('[INPUT] Failed to add item:', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="item-input-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="item-text-input"
        placeholder="Add an item (e.g. Organic Milk, Sourdough Bread...)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={disabled || isSubmitting}
        maxLength={120}
      />
      <button
        type="submit"
        className="btn-add-item"
        disabled={!name.trim() || disabled || isSubmitting}
        title="Add to grocery list"
      >
        {isSubmitting ? (
          <Loader2 size={18} className="spin-icon" />
        ) : (
          <>
            <Plus size={18} />
            <span>Add Item</span>
          </>
        )}
      </button>
    </form>
  );
}
