'use client';

import { useState } from 'react';

export default function UserProfile() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSave = () => {
    // save profile logic
  };

  const handleAvatarUpload = () => {
    // avatar upload logic
  };

  return (
    <div>
      <label htmlFor="profile-name">Display name</label>
      <input
        id="profile-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label htmlFor="profile-email">Email</label>
      <input
        id="profile-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button onClick={handleSave}>Save changes</button>

      <button onClick={handleAvatarUpload} aria-label="Upload avatar">
        Choose file
      </button>
    </div>
  );
}
