import React, { useState } from 'react';
import './App.css';

function App() {
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({
    brand: '',
    category: '',
    size: '',
    condition: '',
    purchasePrice: '',
    status: 'DRAFT',
    box: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!formData.brand || !formData.category) {
      alert('Please fill in brand and category');
      return;
    }

    const newItem = {
      id: Date.now(),
      ...formData,
      dateAdded: new Date().toLocaleDateString()
    };

    setItems([newItem, ...items]);
    setFormData({
      brand: '',
      category: '',
      size: '',
      condition: '',
      purchasePrice: '',
      status: 'DRAFT',
      box: ''
    });
  };

  const handleStatusChange = (itemId, newStatus) => {
    setItems(items.map(item =>
      item.id === itemId ? { ...item, status: newStatus } : item
    ));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'green';
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

  const getStatusLabel = (status) => {
    const labels = {
      'DRAFT': 'Draft',
      'ACTIVE': 'Active',
      'LISTED': 'Listed',
      'SOLD': 'Sold'
    };
    return labels[status] || status;
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
              <label htmlFor="purchasePrice">Purchase Price (£)</label>
              <input
                type="number"
                id="purchasePrice"
                name="purchasePrice"
                value={formData.purchasePrice}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="box">Storage Box</label>
              <select
                id="box"
                name="box"
                value={formData.box}
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
          
          {items.length === 0 ? (
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

                    {item.purchasePrice && (
                      <div className="info-row">
                        <span className="label">Purchase Price:</span>
                        <span>£{parseFloat(item.purchasePrice).toFixed(2)}</span>
                      </div>
                    )}

                    {item.box && (
                      <div className="info-row">
                        <span className="label">Storage:</span>
                        <span>Box {item.box}</span>
                      </div>
                    )}

                    <div className="info-row">
                      <span className="label">Added:</span>
                      <span>{item.dateAdded}</span>
                    </div>
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