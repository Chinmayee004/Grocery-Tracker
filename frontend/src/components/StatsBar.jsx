import React from 'react';

export default function StatsBar({ items = [] }) {
  const total = items.length;
  const completed = items.filter((item) => item.is_completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="stats-card">
      <div className="stats-header">
        <span className="stats-title">Progress Overview</span>
        <span className="stats-count">
          {completed} of {total} items completed ({percentage}%)
        </span>
      </div>
      <div className="stats-progress-track">
        <div
          className="stats-progress-bar"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
