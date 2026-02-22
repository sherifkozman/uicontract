'use client';

import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'home' },
  { label: 'Users', href: '/dashboard/users', icon: 'people' },
  { label: 'Analytics', href: '/dashboard/analytics', icon: 'chart' },
  { label: 'Settings', href: '/dashboard/settings', icon: 'gear' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav aria-label="Main navigation">
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label="Toggle sidebar"
      >
        {collapsed ? 'Expand' : 'Collapse'}
      </button>

      <ul>
        {navItems.map((item) => (
          <li key={item.href}>
            <a href={item.href} aria-label={item.label}>
              <span>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
