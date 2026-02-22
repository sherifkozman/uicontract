import React from 'react';

export const FancyInput = React.memo(
  React.forwardRef<HTMLInputElement, { label: string }>(function FancyInput(props, ref) {
    return (
      <div>
        <label>{props.label}</label>
        <input ref={ref} placeholder="Enter value" onChange={() => {}} />
        <button onClick={() => {}}>Clear</button>
      </div>
    );
  })
);
