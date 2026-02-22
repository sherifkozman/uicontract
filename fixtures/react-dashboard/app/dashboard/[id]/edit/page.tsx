'use client';

import { useState } from 'react';

interface EditPageProps {
  params: { id: string };
}

export default function EditPage({ params }: EditPageProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    // save logic using params.id
  };

  return (
    <div>
      <h1>Edit Item {params.id}</h1>
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          aria-label="Title"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          aria-label="Description"
        />
        <button type="submit">Save changes</button>
        <a href={`/dashboard/${params.id}`}>Cancel</a>
      </form>
    </div>
  );
}
