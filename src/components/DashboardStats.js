import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

function DashboardStats({ refreshTrigger }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  if (!stats) return null;

  return (
    <div className="dashboard-stats">
      <div className="stat-card">
        <span className="stat-value">{stats.totalItems}</span>
        <span className="stat-label">Total Items</span>
      </div>
      <div className="stat-card stat-selling">
        <span className="stat-value">{stats.selling}</span>
        <span className="stat-label">Selling</span>
      </div>
      <div className="stat-card stat-value-card">
        <span className="stat-value">£{stats.listedValue.toFixed(2)}</span>
        <span className="stat-label">Listed Value</span>
      </div>
      <div className="stat-card stat-attention">
        <span className="stat-value">{stats.needAttention}</span>
        <span className="stat-label">Need Attention</span>
      </div>
    </div>
  );
}

export default DashboardStats;
