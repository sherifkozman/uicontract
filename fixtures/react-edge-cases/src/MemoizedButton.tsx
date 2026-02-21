import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
}

const MemoizedButton = React.memo(function MemoizedButton({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
});

export default MemoizedButton;
