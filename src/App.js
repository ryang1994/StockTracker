import React, { useState, useEffect } from 'react';
import './App.css';
import InventoryCard from './components/InventoryCard';
import PhotoAnalysisFlow from './components/PhotoAnalysisFlow';
import DashboardStats from './components/DashboardStats';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState({});
  const [editingItemId, setEditingItemId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [statsRefresh, setStatsRefresh] = useState(0);
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
        item.id === updatedItem.id ? { ...updatedItem, images: item.images } : item
      ));
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  const handleDeleteItem = async (itemId, itemName) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${itemName}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/items/${itemId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete item');

      setItems(items.filter(item => item.id !== itemId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete item.');
    }
  };

  const handleEditClick = (item) => {
    setEditingItemId(item.id);
    setEditFormData({
      brand: item.brand || '',
      category: item.category || '',
      size: item.size || '',
      condition: item.condition || '',
      purchase_cost: item.purchase_cost || '',
      listing_price: item.listing_price || '',
      box_number: item.box_number || ''
    });
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async (itemId) => {
    try {
      const response = await fetch(`${API_URL}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });

      if (!response.ok) throw new Error('Failed to update item');

      const updatedItem = await response.json();
      setItems(items.map(item =>
        item.id === updatedItem.id ? { ...updatedItem, images: item.images } : item
      ));

      setEditingItemId(null);
      setEditFormData({});
    } catch (err) {
      console.error(err);
      alert('Failed to save changes.');
    }
  };

  const handleThumbnailClick = (itemId, index) => {
    setActiveImageIndex({ ...activeImageIndex, [itemId]: index });
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>📦 Stock Tracker</h1>
        <p>AI-Assisted Reselling Inventory System</p>
      </header>

            <main className="app-main">
        <DashboardStats refreshTrigger={statsRefresh} />

        <PhotoAnalysisFlow
          onItemSaved={(newItem) => {
            setItems([newItem, ...items]);
            setStatsRefresh(prev => prev + 1);
          }}
        />

        <section className="inventory-section">
          <h2>Inventory ({items.length})</h2>

          {loading ? (
            <p className="no-items">Loading inventory...</p>
          ) : items.length === 0 ? (
            <p className="no-items">No items yet. Add your first item above!</p>
          ) : (
            <div className="inventory-list">
              {items.map(item => (
                <InventoryCard
                  key={item.id}
                  item={item}
                  isEditing={editingItemId === item.id}
                  editFormData={editFormData}
                  activeImageIndex={activeImageIndex[item.id]}
                  onThumbnailClick={handleThumbnailClick}
                  onStatusChange={handleStatusChange}
                  onEditClick={handleEditClick}
                  onEditInputChange={handleEditInputChange}
                  onCancelEdit={handleCancelEdit}
                  onSaveEdit={handleSaveEdit}
                  onDeleteItem={handleDeleteItem}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;