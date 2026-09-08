import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SERVER_URL = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:5000';

function DatabasePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchive();
  }, []);

  const fetchArchive = async () => {
    try {
      const response = await fetch(`${API_URL}/archive`);
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch archive:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="no-items">Loading archive...</p>;
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="coming-soon">
        <div className="coming-soon-icon">🗄️</div>
        <h2>Database</h2>
        <p className="coming-soon-subtitle">
          No archived items yet. Items appear here automatically 14 days after dispatch.
        </p>
      </div>
    );
  }

  const { items, summary } = data;

  return (
    <section className="inventory-section">
      <h2>Database — Sales Archive</h2>

      <div className="dashboard-stats">
        <div className="stat-card">
          <span className="stat-value">{summary.totalItems}</span>
          <span className="stat-label">Items Sold</span>
        </div>
        <div className="stat-card stat-value-card">
          <span className="stat-value">£{summary.totalRevenue.toFixed(2)}</span>
          <span className="stat-label">Total Revenue</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">£{summary.totalCost.toFixed(2)}</span>
          <span className="stat-label">Total Cost</span>
        </div>
        <div className={`stat-card ${summary.totalProfit >= 0 ? 'stat-value-card' : 'stat-attention'}`}>
          <span className="stat-value">£{summary.totalProfit.toFixed(2)}</span>
          <span className="stat-label">Total Profit</span>
        </div>
      </div>

      <div className="archive-table-wrapper">
        <table className="archive-table">
          <thead>
            <tr>
              <th></th>
              <th>Brand / Category</th>
              <th>Size</th>
              <th>Purchase</th>
              <th>Sold</th>
              <th>Profit</th>
              <th>Sold Date</th>
              <th>Archived</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>
                  {item.thumbnail_key && (
                    <img
                      src={`${SERVER_URL}/${item.thumbnail_key}`}
                      alt={item.brand}
                      className="archive-thumb"
                    />
                  )}
                </td>
                <td>{item.brand} {item.category}</td>
                <td>{item.size || '-'}</td>
                <td>{item.purchase_cost ? `£${parseFloat(item.purchase_cost).toFixed(2)}` : '-'}</td>
                <td>{item.sold_price ? `£${parseFloat(item.sold_price).toFixed(2)}` : '-'}</td>
                <td className={item.profit >= 0 ? 'profit-positive' : 'profit-negative'}>
                  {item.profit != null ? `${item.profit >= 0 ? '+' : ''}£${item.profit.toFixed(2)}` : '-'}
                </td>
                <td>{item.date_sold ? new Date(item.date_sold).toLocaleDateString('en-GB') : '-'}</td>
                <td>{item.date_archived ? new Date(item.date_archived).toLocaleDateString('en-GB') : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default DatabasePage;
