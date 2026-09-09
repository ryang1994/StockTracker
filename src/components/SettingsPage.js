import React, { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function SettingsPage({ boxes, onBoxesChanged }) {
  const [appSettings, setAppSettings] = useState({});
  const [aiStatus, setAiStatus] = useState(null); // null = checking, true/false once known
  const [loading, setLoading] = useState(true);

  const [newBoxName, setNewBoxName] = useState('');
  const [editingBoxId, setEditingBoxId] = useState(null);
  const [editingBoxName, setEditingBoxName] = useState('');

  const [dispatchForm, setDispatchForm] = useState({ ebay_dispatch_days: '', vinted_dispatch_days: '', archive_after_days: '' });
  const [ebayForm, setEbayForm] = useState({ ebay_api_key: '', ebay_active: false });
  const [vintedForm, setVintedForm] = useState({ vinted_api_key: '', vinted_active: false });

  const fetchAppSettings = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/settings/app`);
      const data = await response.json();
      setAppSettings(data);
      setDispatchForm({
        ebay_dispatch_days: data.ebay_dispatch_days || '2',
        vinted_dispatch_days: data.vinted_dispatch_days || '3',
        archive_after_days: data.archive_after_days || '30'
      });
      setEbayForm({
        ebay_api_key: data.ebay_api_key || '',
        ebay_active: data.ebay_active === 'true'
      });
      setVintedForm({
        vinted_api_key: data.vinted_api_key || '',
        vinted_active: data.vinted_active === 'true'
      });
    } catch (err) {
      console.error('Failed to fetch app settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAiStatus = useCallback(async () => {
    setAiStatus(null);
    try {
      const response = await fetch(`${API_URL}/settings/ai-status`);
      const data = await response.json();
      setAiStatus(data.active);
    } catch (err) {
      console.error('Failed to check AI status:', err);
      setAiStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchAppSettings();
    checkAiStatus();
  }, [fetchAppSettings, checkAiStatus]);

  const saveAppSettings = async (updates) => {
    try {
      await fetch(`${API_URL}/settings/app`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      fetchAppSettings();
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    }
  };

  const handleAddBox = async () => {
    if (!newBoxName.trim()) return;
    try {
      await fetch(`${API_URL}/boxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBoxName.trim() })
      });
      setNewBoxName('');
      onBoxesChanged();
    } catch (err) {
      console.error(err);
      alert('Failed to add box.');
    }
  };

  const startEditingBox = (box) => {
    setEditingBoxId(box.id);
    setEditingBoxName(box.name);
  };

  const handleRenameBox = async () => {
    if (!editingBoxName.trim()) return;
    try {
      await fetch(`${API_URL}/boxes/${editingBoxId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingBoxName.trim() })
      });
      setEditingBoxId(null);
      onBoxesChanged();
    } catch (err) {
      console.error(err);
      alert('Failed to rename box.');
    }
  };

  const handleDeleteBox = async (boxId) => {
    const confirmed = window.confirm('Delete this box? Only possible if no items are currently assigned to it.');
    if (!confirmed) return;
    try {
      const response = await fetch(`${API_URL}/boxes/${boxId}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to delete box.');
        return;
      }
      onBoxesChanged();
    } catch (err) {
      console.error(err);
      alert('Failed to delete box.');
    }
  };

  const formatBackupTime = (value) => {
    if (!value) return 'No backup recorded yet';
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'No backup recorded yet';
    return date.toLocaleString('en-GB');
  };

  if (loading) {
    return <p className="no-items">Loading settings...</p>;
  }

  return (
    <section className="inventory-section">
      <h2>Settings</h2>

      {/* AI + Backup status */}
      <div className="settings-card">
        <h3>System Status</h3>

        <div className="status-row">
          <span className={`status-dot ${aiStatus === null ? '' : aiStatus ? 'online' : 'offline'}`}></span>
          <span>AI Connection (Claude Vision): {aiStatus === null ? 'Checking...' : aiStatus ? 'Active' : 'Not working'}</span>
          <button className="btn-cancel settings-inline-btn" onClick={checkAiStatus}>Recheck</button>
        </div>

        <div className="status-row">
          <span className={`status-dot ${appSettings.last_backup_at ? 'online' : 'offline'}`}></span>
          <span>Last Backup: {formatBackupTime(appSettings.last_backup_at)}</span>
        </div>
      </div>

      {/* Storage Boxes */}
      <div className="settings-card">
        <h3>📦 Storage Boxes</h3>
        <p className="review-hint">Renaming a box updates it everywhere, including on items already assigned to it.</p>

        <div className="box-list">
          {boxes.map(box => (
            <div key={box.id} className="box-row">
              {editingBoxId === box.id ? (
                <>
                  <input
                    type="text"
                    value={editingBoxName}
                    onChange={(e) => setEditingBoxName(e.target.value)}
                    autoFocus
                  />
                  <button className="btn-save" onClick={handleRenameBox}>Save</button>
                  <button className="btn-cancel" onClick={() => setEditingBoxId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <span className="box-row-name">{box.name}</span>
                  <button className="btn-cancel settings-inline-btn" onClick={() => startEditingBox(box)}>✏️ Rename</button>
                  <button className="btn-delete settings-inline-btn" onClick={() => handleDeleteBox(box.id)}>🗑️</button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="box-add-row">
          <input
            type="text"
            placeholder="New box name (e.g. Box 8, Garage Shelf A)"
            value={newBoxName}
            onChange={(e) => setNewBoxName(e.target.value)}
          />
          <button className="btn-add" onClick={handleAddBox}>+ Add Box</button>
        </div>
      </div>

      {/* Dispatch time presets */}
      <div className="settings-card">
        <h3>📮 Dispatch Time Presets</h3>
        <p className="review-hint">Used to show a "dispatch by" countdown on items once sold, based on which platform they sold on.</p>

        <div className="review-grid">
          <div className="form-group">
            <label>eBay dispatch time (days)</label>
            <input
              type="number"
              value={dispatchForm.ebay_dispatch_days}
              onChange={(e) => setDispatchForm({ ...dispatchForm, ebay_dispatch_days: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Vinted dispatch time (days)</label>
            <input
              type="number"
              value={dispatchForm.vinted_dispatch_days}
              onChange={(e) => setDispatchForm({ ...dispatchForm, vinted_dispatch_days: e.target.value })}
            />
          </div>
        </div>
        <button className="btn-add" onClick={() => saveAppSettings(dispatchForm)}>Save Dispatch Times</button>
      </div>

      {/* Archive / return window */}
      <div className="settings-card">
        <h3>↩️ Return Window Before Archiving</h3>
        <p className="review-hint">
          How many days after dispatch before an item's full-size photos are archived down to a thumbnail.
          eBay and Vinted buyer protection typically runs 30 days from delivery, so it's worth keeping this
          comfortably longer than your actual dispatch time.
        </p>
        <div className="review-grid">
          <div className="form-group">
            <label>Archive after (days)</label>
            <input
              type="number"
              value={dispatchForm.archive_after_days}
              onChange={(e) => setDispatchForm({ ...dispatchForm, archive_after_days: e.target.value })}
            />
          </div>
        </div>
        <button className="btn-add" onClick={() => saveAppSettings(dispatchForm)}>Save Archive Window</button>
      </div>

      {/* eBay integration placeholder */}
      <div className="settings-card">
        <h3>🛒 eBay Integration <span className="placeholder-tag">Placeholder</span></h3>
        <p className="review-hint">
          Storage for eBay credentials ahead of full API integration. This does not yet connect live to eBay —
          real integration needs eBay's official OAuth setup, which is a bigger future project.
        </p>
        <div className="review-grid">
          <div className="form-group">
            <label>API Key (for future use)</label>
            <input
              type="password"
              value={ebayForm.ebay_api_key}
              onChange={(e) => setEbayForm({ ...ebayForm, ebay_api_key: e.target.value })}
            />
          </div>
        </div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={ebayForm.ebay_active}
            onChange={(e) => setEbayForm({ ...ebayForm, ebay_active: e.target.checked })}
          />
          Mark eBay as Active (manual toggle for now)
        </label>
        <button className="btn-add" onClick={() => saveAppSettings(ebayForm)}>Save eBay Settings</button>
      </div>

      {/* Vinted integration placeholder */}
      <div className="settings-card">
        <h3>👕 Vinted Integration <span className="placeholder-tag">Placeholder</span></h3>
        <p className="review-hint">
          Vinted doesn't currently offer public API access to ordinary sellers, so this is prep work only for if/when that changes.
        </p>
        <div className="review-grid">
          <div className="form-group">
            <label>API Key (for future use)</label>
            <input
              type="password"
              value={vintedForm.vinted_api_key}
              onChange={(e) => setVintedForm({ ...vintedForm, vinted_api_key: e.target.value })}
            />
          </div>
        </div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={vintedForm.vinted_active}
            onChange={(e) => setVintedForm({ ...vintedForm, vinted_active: e.target.checked })}
          />
          Mark Vinted as Active (manual toggle for now)
        </label>
        <button className="btn-add" onClick={() => saveAppSettings(vintedForm)}>Save Vinted Settings</button>
      </div>
    </section>
  );
}

export default SettingsPage;
