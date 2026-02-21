import React from 'react';

function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    return <Component {...props} />;
  };
}

function AdminPanel() {
  const handleDelete = () => {};
  return <button onClick={handleDelete}>Delete all</button>;
}

export const ProtectedAdminPanel = withAuth(AdminPanel);
