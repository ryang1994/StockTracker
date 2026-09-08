import React, { useState, useEffect } from 'react';

function NavBar({ currentPage, onNavigate }) {
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, []);

const checkBackend = async () => {
    try {
      const baseUrl = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/`);
      setBackendOnline(response.ok);
    } catch {
      setBackendOnline(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'database', label: 'Database', icon: '🗄️' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <nav className="nav-bar">
      <div className="nav-brand">
        <span className="nav-logo">📦</span>
        <div>
          <div className="nav-title">Stock Tracker</div>
          <div className="nav-subtitle">Buy · Sell · Track · Profit</div>
        </div>
      </div>

      <div className="nav-tabs">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-tab ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-tab-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      <div className="nav-status">
        <span className={`status-dot ${backendOnline ? 'online' : 'offline'}`}></span>
        {backendOnline ? 'Backend Connected' : 'Backend Offline'}
      </div>
    </nav>
  );
}

export default NavBar;
