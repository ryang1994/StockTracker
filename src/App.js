import React, { useState, useEffect } from 'react';
import './App.css';
import InventoryCard from './components/InventoryCard';
import PhotoAnalysisFlow from './components/PhotoAnalysisFlow';
import DashboardStats from './components/DashboardStats';
import NavBar from './components/NavBar';
import ComingSoon from './components/ComingSoon';
import SearchBar from './components/SearchBar';
import DatabasePage from './components/DatabasePage';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState({});
  const [editingItemId, setEditingItemId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [statsRefresh, setStatsRefresh] = useState(0);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

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
      setStatsRefresh(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  const handleConfirmSale = async (itemId, soldPrice) => {
    try {
      const response = await fetch(`${API_URL}/items/${itemId}/sell`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sold_price: soldPrice })
      });

      if (!response.ok) throw new Error('Failed to mark as sold');

      const updatedItem = await response.json();
      setItems(items.map(item =>
        item.id === updatedItem.id ? { ...updatedItem, images: item.images } : item
      ));
      setStatsRefresh(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('Failed to mark item as sold.');
    }
  };

  const handleMarkDispatched = async (itemId) => {
    try {
      const response = await fetch(`${API_URL}/items/${itemId}/dispatch`, {
        method: 'PATCH'
      });

      if (!response.ok) throw new Error('Failed to mark as dispatched');

      const updatedItem = await response.json();
      setItems(items.map(item =>
        item.id === updatedItem.id ? { ...updatedItem, images: item.images } : item
      ));
      setStatsRefresh(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('Failed to mark item as dispatched.');
    }
  };
  const handleOpenFolder = async (itemId) => {
    try {
      const response = await fetch(`${API_URL}/items/${itemId}/open-folder`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to open folder');
    } catch (err) {
      console.error(err);
      alert('Could not open the folder. Make sure you are running the app on the same PC as the backend.');
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
      setStatsRefresh(prev => prev + 1);
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
      listing_url: item.listing_url || '',
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
      setStatsRefresh(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('Failed to save changes.');
    }
  };

  const handleThumbnailClick = (itemId, index) => {
    setActiveImageIndex({ ...activeImageIndex, [itemId]: index });
  };

  // Main dashboard never shows DISPATCHED items - they live in the Dispatch tab
  const dashboardItems = items.filter(item => item.status !== 'DISPATCHED');

  const getFilteredItems = () => {
    let result = dashboardItems;

    switch (filterStatus) {
      case 'SELLING':
        result = result.filter(item => item.status === 'ACTIVE' || item.status === 'LISTED');
        break;
      case 'DRAFT':
        result = result.filter(item => item.status === 'DRAFT');
        break;
      case 'ATTENTION':
        result = result.filter(item => item.needs_attention);
        break;
      default:
        break;
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(item =>
        (item.brand && item.brand.toLowerCase().includes(term)) ||
        (item.category && item.category.toLowerCase().includes(term)) ||
        (item.size && item.size.toLowerCase().includes(term)) ||
        (item.colour && item.colour.toLowerCase().includes(term)) ||
        (item.condition && item.condition.toLowerCase().includes(term))
      );
    }

    return result;
  };

  const filteredItems = getFilteredItems();

  const awaitingDispatch = items.filter(item => item.status === 'SOLD');
  const recentlyDispatched = items.filter(item => item.status === 'DISPATCHED');

  const counts = {
    ALL: dashboardItems.length,
    SELLING: dashboardItems.filter(i => i.status === 'ACTIVE' || i.status === 'LISTED').length,
    DRAFT: dashboardItems.filter(i => i.status === 'DRAFT').length,
    ATTENTION: dashboardItems.filter(i => i.needs_attention).length,
    DISPATCH: awaitingDispatch.length
  };

  const renderPage = () => {
    if (currentPage === 'database') {
      return <DatabasePage />;
    }

    if (currentPage === 'analytics') {
      return (
        <ComingSoon
          title="Analytics"
          icon="📊"
          roadmap={[
            'Sell-through rate by brand and category',
            'Best and worst performing stock types',
            'Buying recommendations based on your history'
          ]}
        />
      );
    }

    if (currentPage === 'settings') {
      return (
        <ComingSoon
          title="Settings"
          icon="⚙️"
          roadmap={[
            'Manage storage boxes',
            'eBay and Vinted account connections',
            'Backup and export options'
          ]}
        />
      );
    }

    if (currentPage === 'dispatch') {
      return (
        <section className="inventory-section">
          <h2>Dispatch</h2>

          <h3 className="dispatch-section-title">📦 Awaiting Dispatch ({awaitingDispatch.length})</h3>
          {awaitingDispatch.length === 0 ? (
            <p className="no-items">Nothing waiting to be dispatched.</p>
          ) : (
            <div className="inventory-list">
              {awaitingDispatch.map(item => (
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
                  onConfirmSale={handleConfirmSale}
                  onMarkDispatched={handleMarkDispatched}

                />
              ))}
            </div>
          )}

          <h3 className="dispatch-section-title">✅ Recently Dispatched ({recentlyDispatched.length})</h3>
          {recentlyDispatched.length === 0 ? (
            <p className="no-items">No recently dispatched items.</p>
          ) : (
            <div className="inventory-list">
              {recentlyDispatched.map(item => (
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
                  onConfirmSale={handleConfirmSale}
                  onMarkDispatched={handleMarkDispatched}
                  onOpenFolder={handleOpenFolder}
                />
              ))}
            </div>
          )}
        </section>
      );
    }

    return (
      <>
        <DashboardStats refreshTrigger={statsRefresh} />

        <PhotoAnalysisFlow
          onItemSaved={(newItem) => {
            setItems([newItem, ...items]);
            setStatsRefresh(prev => prev + 1);
          }}
        />

        <section className="inventory-section">
          <h2>Inventory ({filteredItems.length})</h2>

          <SearchBar value={searchTerm} onChange={setSearchTerm} />

          <div className="filter-tabs">
            <button
              className={`filter-tab ${filterStatus === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterStatus('ALL')}
            >
              All ({counts.ALL})
            </button>
            <button
              className={`filter-tab ${filterStatus === 'SELLING' ? 'active' : ''}`}
              onClick={() => setFilterStatus('SELLING')}
            >
              Selling ({counts.SELLING})
            </button>
            <button
              className={`filter-tab ${filterStatus === 'DRAFT' ? 'active' : ''}`}
              onClick={() => setFilterStatus('DRAFT')}
            >
              Draft ({counts.DRAFT})
            </button>
            <button
              className={`filter-tab ${filterStatus === 'ATTENTION' ? 'active' : ''}`}
              onClick={() => setFilterStatus('ATTENTION')}
            >
              ⚠️ Attention ({counts.ATTENTION})
            </button>
            <button
              className="filter-tab"
              onClick={() => setCurrentPage('dispatch')}
            >
              📦 Dispatch ({counts.DISPATCH})
            </button>
          </div>

          {loading ? (
            <p className="no-items">Loading inventory...</p>
          ) : filteredItems.length === 0 ? (
            <p className="no-items">No items in this view.</p>
          ) : (
            <div className="inventory-list">
              {filteredItems.map(item => (
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
                  onConfirmSale={handleConfirmSale}
                  onMarkDispatched={handleMarkDispatched}
                  onOpenFolder={handleOpenFolder}
                />
              ))}
            </div>
          )}
        </section>
      </>
    );
  };

  return (
    <div className="App">
      <NavBar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="app-main">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
