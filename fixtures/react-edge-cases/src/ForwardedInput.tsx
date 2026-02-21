import { forwardRef } from 'react';

interface InputProps {
  label: string;
  placeholder?: string;
}

const ForwardedInput = forwardRef<HTMLInputElement, InputProps>(
  ({ label, placeholder }, ref) => {
    return (
      <div>
        <label>{label}</label>
        <input ref={ref} placeholder={placeholder} onChange={() => {}} />
      </div>
    );
  }
);

ForwardedInput.displayName = 'ForwardedInput';

export default ForwardedInput;
