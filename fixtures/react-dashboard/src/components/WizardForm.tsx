'use client';

import { useState } from 'react';

interface FormData {
  name: string;
  email: string;
  role: string;
  newsletter: boolean;
}

export default function WizardForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    role: '',
    newsletter: false,
  });

  const handleSubmit = () => {
    // submit logic
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      {step === 1 && (
        <fieldset>
          <legend>Step 1: Personal Info</legend>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Full name"
            aria-label="Full name"
          />
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Email address"
            aria-label="Email address"
          />
          <button type="button" onClick={() => setStep(2)}>Next</button>
        </fieldset>
      )}

      {step === 2 && (
        <fieldset>
          <legend>Step 2: Preferences</legend>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            aria-label="Select role"
          >
            <option value="">Choose role</option>
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <label>
            <input
              type="checkbox"
              checked={formData.newsletter}
              onChange={(e) => setFormData({ ...formData, newsletter: e.target.checked })}
            />
            Subscribe to newsletter
          </label>
          <button type="button" onClick={() => setStep(1)}>Back</button>
          <button type="button" onClick={() => setStep(3)}>Next</button>
        </fieldset>
      )}

      {step === 3 && (
        <fieldset>
          <legend>Step 3: Review</legend>
          <p>Name: {formData.name}</p>
          <p>Email: {formData.email}</p>
          <p>Role: {formData.role}</p>
          <button type="button" onClick={() => setStep(2)}>Back</button>
          <button type="submit">Submit</button>
        </fieldset>
      )}
    </form>
  );
}
