interface Action {
  id: string;
  label: string;
}

const actions: Action[] = [
  { id: 'edit', label: 'Edit' },
  { id: 'duplicate', label: 'Duplicate' },
  { id: 'archive', label: 'Archive' },
];

export default function DynamicList() {
  const handleAction = (id: string) => {
    // action logic
  };

  return (
    <div>
      {actions.map((action) => (
        <button key={action.id} onClick={() => handleAction(action.id)}>
          {action.label}
        </button>
      ))}
    </div>
  );
}
