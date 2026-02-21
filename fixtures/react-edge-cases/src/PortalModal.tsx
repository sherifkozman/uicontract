'use client';

import { createPortal } from 'react-dom';
import { useState } from 'react';

export default function PortalModal() {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => setIsOpen(false);
  const handleConfirm = () => {
    // confirm logic
    setIsOpen(false);
  };

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Open modal</button>

      {isOpen &&
        createPortal(
          <div role="dialog">
            <button onClick={handleClose} aria-label="Close modal">×</button>
            <button onClick={handleConfirm}>Confirm</button>
          </div>,
          document.body
        )}
    </div>
  );
}
