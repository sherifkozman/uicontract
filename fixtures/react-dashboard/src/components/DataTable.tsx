'use client';

import { useState } from 'react';

interface Column {
  key: string;
  label: string;
  sortable: boolean;
}

interface Row {
  id: string;
  [key: string]: string;
}

interface DataTableProps {
  columns: Column[];
  data: Row[];
}

export default function DataTable({ columns, data }: DataTableProps) {
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = data.filter((row) =>
    Object.values(row).some((v) => v.toLowerCase().includes(filter.toLowerCase())),
  );

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = () => {
    // delete logic
    setDeleteTarget(null);
  };

  return (
    <div>
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter rows..."
        aria-label="Filter rows"
      />

      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        aria-label="Sort by column"
      >
        <option value="">No sort</option>
        {columns.filter((c) => c.sortable).map((col) => (
          <option key={col.key} value={col.key}>{col.label}</option>
        ))}
      </select>

      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>
                {col.sortable ? (
                  <button onClick={() => setSortBy(col.key)} aria-label={`Sort by ${col.label}`}>
                    {col.label}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.key}>{row[col.key]}</td>
              ))}
              <td>
                <a href={`/dashboard/${row.id}/edit`} aria-label={`Edit ${row.id}`}>Edit</a>
                <button onClick={() => handleDelete(row.id)} aria-label={`Delete ${row.id}`}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <button
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
          aria-label="Previous page"
        >
          Previous
        </button>
        <button
          onClick={() => setPage(page + 1)}
          aria-label="Next page"
        >
          Next
        </button>
      </div>

      {deleteTarget !== null && (
        <div role="dialog" aria-label="Confirm deletion">
          <p>Are you sure you want to delete item {deleteTarget}?</p>
          <button onClick={confirmDelete}>Confirm delete</button>
          <button onClick={() => setDeleteTarget(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}
