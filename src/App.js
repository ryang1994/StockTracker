import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    brand: '',
    category: '',
    size: '',
    condition: '',
    purchase_cost: '',
    status: 'DRAFT',
    box_number: ''
  });

  // Fetch items from backend when the app loads
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_URL}/items`);
      const data = await response.json();
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch items:', err);
      alert('Could not connect to the backend. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!formData.brand || !formData.category) {
      alert('Please fill in brand and category');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to add item');

      const newItem = await response.json();
      setItems([newItem, ...items]);

      setFormData({
        brand: '',
        category: '',
        size: '',
        condition: '',
        purchase_cost: '',
        status: 'DRAFT',
        box_number: ''
      });
    } catch (err) {
      console.error(err);
      alert('Failed to add item. Check the backend is running.');
    }
  };

  const handleStatusChange = async (itemId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/items/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update status');

      const updatedItem = await response.json();
      setItems(items.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      ));
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
      case 'LISTED':
        return 'green';
      case 'SOLD':
        return 'red';
      case 'DRAFT':
        return 'amber';
      default:
        return 'gray';
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>📦 Stock Tracker</h1>
        <p>AI-Assisted Reselling Inventory System</p>
      </header>

      <main className="app-main">
        {/* Add Item Form */}
        <section className="add-item-section">
          <h2>Add New Item</h2>
          <form onSubmit={handleAddItem} className="add-item-form">
            <div className="form-group">
              <label htmlFor="brand">Brand *</label>
              <input
                type="text"
                id="brand"
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                placeholder="e.g., Nike"
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="e.g., Hoodie"
              />
            </div>

            <div className="form-group">
              <label htmlFor="size">Size</label>
              <input
                type="text"
                id="size"
                name="size"
                value={formData.size}
                onChange={handleInputChange}
                placeholder="e.g., Large"
              />
            </div>

            <div className="form-group">
              <label htmlFor="condition">Condition</label>
              <select
                id="condition"
                name="condition"
                value={formData.condition}
                onChange={handleInputChange}
              >
                <option value="">Select condition</option>
                <option value="Like New">Like New</option>
                <option value="Very Good">Very Good</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="purchase_cost">Purchase Price (£)</label>
              <input
                type="number"
                id="purchase_cost"
                name="purchase_cost"
                value={formData.purchase_cost}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="box_number">Storage Box</label>
              <select
                id="box_number"
                name="box_number"
                value={formData.box_number}
                onChange={handleInputChange}
              >
                <option value="">Select box</option>
                <option value="1">Box 1</option>
                <option value="2">Box 2</option>
                <option value="3">Box 3</option>
                <option value="4">Box 4</option>
                <option value="5">Box 5</option>
                <option value="6">Box 6</option>
                <option value="7">Box 7</option>
              </select>
            </div>

            <button type="submit" className="btn-add">Add Item</button>
          </form>
        </section>

        {/* Inventory List */}
        <section className="inventory-section">
          <h2>Inventory ({items.length})</h2>

          {loading ? (
            <p className="no-items">Loading inventory...</p>
          ) : items.length === 0 ? (
            <p className="no-items">No items yet. Add your first item above!</p>
          ) : (
            <div className="inventory-list">
              {items.map(item => (
                <div key={item.id} className="inventory-card">
                  <div className="card-header">
                    <div className="card-title">
                      <h3>{item.brand} {item.category}</h3>
                      <p className="card-meta">{item.size} • {item.condition}</p>
                    </div>
                    <div className={`status-light ${getStatusColor(item.status)}`}></div>
                  </div>

                  <div className="card-body">
                    <div className="info-row">
                      <span className="label">Status:</span>
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                        className="status-select"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="ACTIVE">Active</option>
                        <option value="LISTED">Listed</option>
                        <option value="SOLD">Sold</option>
                      </select>
                    </div>

                    {item.purchase_cost && (
                      <div className="info-row">
                        <span className="label">Purchase Price:</span>
                        <span>£{parseFloat(item.purchase_cost).toFixed(2)}</span>
                      </div>
                    )}

                    {item.box_number && (
                      <div className="info-row">
                        <span className="label">Storage:</span>
                        <span>Box {item.box_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;