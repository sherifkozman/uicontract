'use client';

import { useState } from 'react';

export default function ConditionalActions() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showExtra, setShowExtra] = useState(false);

  return (
    <div>
      <button onClick={() => setIsAdmin(!isAdmin)}>Toggle admin</button>

      {isAdmin && <button onClick={() => {}}>Delete user</button>}

      {showExtra ? (
        <button onClick={() => setShowExtra(false)}>Hide details</button>
      ) : (
        <button onClick={() => setShowExtra(true)}>Show details</button>
      )}
    </div>
  );
}
