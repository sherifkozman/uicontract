'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // save settings
  };

  return (
    <div>
      <h1>Settings</h1>
      <form data-agent-id="settings.submit.form" onSubmit={handleSubmit}>
        <label htmlFor="display-name">Display name</label>
        <input
          data-agent-id="settings.display-name.input"
          id="display-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display name"
        />

        <label htmlFor="email-addr">Email address</label>
        <input
          data-agent-id="settings.email-address.input"
          id="email-addr"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
        />

        <button data-agent-id="settings.save-changes.button" type="submit">
          Save changes
        </button>
      </form>

      <a data-agent-id="settings.back-to-home.a" href="/">
        Back to home
      </a>
    </div>
  );
}
