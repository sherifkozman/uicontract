'use client';

import { useState } from 'react';

interface AdminPanelProps {
  role: 'admin' | 'moderator' | 'viewer';
}

export default function AdminPanel({ role }: AdminPanelProps) {
  const [showBulkActions, setShowBulkActions] = useState(false);

  const handleExport = () => {
    // export logic
  };

  const handleResetCache = () => {
    // cache reset logic
  };

  const handleBulkDelete = () => {
    // bulk delete logic
  };

  const handleExportReport = () => {
    // report export logic
  };

  return (
    <div>
      {role === 'admin' && (
        <section aria-label="Admin controls">
          <button onClick={handleExport} aria-label="Export data">Export data</button>
          <button onClick={handleResetCache} aria-label="Reset cache">Reset cache</button>
          <button onClick={() => setShowBulkActions(!showBulkActions)} aria-label="Toggle bulk actions">
            Bulk actions
          </button>
          {showBulkActions && (
            <div>
              <button onClick={handleBulkDelete} aria-label="Bulk delete">Bulk delete</button>
            </div>
          )}
        </section>
      )}

      {role === 'moderator' && (
        <section aria-label="Moderator controls">
          <button onClick={handleExportReport} aria-label="Export report">Export report</button>
          <a href="/dashboard/moderation" aria-label="Moderation queue">Moderation queue</a>
        </section>
      )}

      <section>
        <a href="/dashboard/help" aria-label="Help center">Help center</a>
        <a href="/dashboard/profile" aria-label="Edit profile">Edit profile</a>
      </section>
    </div>
  );
}
