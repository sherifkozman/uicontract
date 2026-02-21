'use client';

import { useState } from 'react';

interface Plan {
  id: string;
  name: string;
}

const plans: Plan[] = [
  { id: 'free', name: 'Free' },
  { id: 'pro', name: 'Pro' },
  { id: 'enterprise', name: 'Enterprise' },
];

export default function BillingSettings() {
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePauseSubscription = () => {
    setShowConfirm(true);
  };

  const handleUpdatePayment = () => {
    // update payment logic
  };

  return (
    <div>
      <select
        value={selectedPlan}
        onChange={(e) => setSelectedPlan(e.target.value)}
        aria-label="Select plan"
      >
        {plans.map((plan) => (
          <option key={plan.id} value={plan.id}>{plan.name}</option>
        ))}
      </select>

      <button onClick={handlePauseSubscription}>Pause subscription</button>

      {showConfirm && (
        <button onClick={() => setShowConfirm(false)}>
          Confirm pause
        </button>
      )}

      <a href="/settings/billing/cancel">Cancel subscription</a>

      <button onClick={handleUpdatePayment}>Update payment method</button>
    </div>
  );
}
