'use client';

import { useState } from 'react';

export default function SearchBar() {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    // search logic
  };

  const handleClear = () => {
    setQuery('');
  };

  return (
    <div role="search">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        aria-label="Search"
      />
      <button onClick={handleSearch} data-testid="search-btn">Search</button>
      <button onClick={handleClear} aria-label="Clear search">×</button>
    </div>
  );
}
