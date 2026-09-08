import React, { useState } from 'react';
import CopyField from './CopyField';

const SERVER_URL = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:5000';

function InventoryCard({
  item,
  isEditing,
  editFormData,
  activeImageIndex,
  onThumbnailClick,
  onStatusChange,
  onEditClick,
  onEditInputChange,
  onCancelEdit,
  onSaveEdit,
  onDeleteItem,
  onConfirmSale,
  onMarkDispatched,
  onOpenFolder
}) {
  const [askingSoldPrice, setAskingSoldPrice] = useState(false);
  const [soldPriceInput, setSoldPriceInput] = useState('');

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'green';
      case 'LISTED':
        return 'purple';
      case 'SOLD':
        return 'amber';
      case 'DISPATCHED':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getCardStatusClass = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'selling';
      case 'LISTED':
        return 'listing';
      case 'SOLD':
        return 'sold';
      case 'DISPATCHED':
        return 'dispatched';
      case 'DRAFT':
        return 'draft';
      default:
        return 'draft';
    }
  };

  const getStatusBadgeText = (status) => {
    switch (status) {
      case 'ACTIVE': return 'ACTIVE';
      case 'LISTED': return 'LISTING';
      case 'SOLD': return 'AWAITING DISPATCH';
      case 'DISPATCHED': return 'DISPATCHED';
      case 'DRAFT': return 'DRAFT';
      default: return status;
    }
  };

  const index = activeImageIndex || 0;
  const activeImage = item.images && item.images[index] ? item.images[index] : null;

  const handleStatusDropdownChange = (e) => {
    const newStatus = e.target.value;
    if (newStatus === 'SOLD') {
      setSoldPriceInput(item.listing_price || '');
      setAskingSoldPrice(true);
    } else {
      onStatusChange(item.id, newStatus);
    }
  };

  const handleConfirmSoldPrice = () => {
    const price = parseFloat(soldPriceInput);
    if (isNaN(price) || price < 0) {
      alert('Please enter a valid price.');
      return;
    }
    onConfirmSale(item.id, price);
    setAskingSoldPrice(false);
  };

  const handleCancelSoldPrice = () => {
    setAskingSoldPrice(false);
    setSoldPriceInput('');
  };

  const profit = (item.status === 'SOLD' || item.status === 'DISPATCHED') && item.sold_price != null && item.purchase_cost != null
    ? (parseFloat(item.sold_price) - parseFloat(item.purchase_cost))
    : null;

  const daysRemaining = item.days_since_dispatch != null ? Math.max(0, 14 - item.days_since_dispatch) : null;

  const showListingTools = item.status === 'LISTED';
  const showSimpleActiveView = item.status === 'ACTIVE';

  return (
    <div className={`inventory-card status-${getCardStatusClass(item.status)} ${item.needs_attention ? 'needs-attention' : ''}`}>
      <div className="card-badges">
        {item.needs_attention && (
          <span className="badge badge-attention">⚠️ ATTENTION</span>
        )}
        <span className="badge badge-status">{getStatusBadgeText(item.status)}</span>
               {item.days_held != null && (item.status === 'DRAFT' || item.status === 'ACTIVE' || item.status === 'LISTED') && (
          <span className="badge badge-days">{item.days_held} days</span>
        )}
        {item.status === 'DISPATCHED' && daysRemaining != null && (
          <span className="badge badge-days">{daysRemaining}d until archived</span>
        )}
      </div>

      {activeImage && (
        <div className="card-image">
          <img
            src={`${SERVER_URL}/${activeImage.object_key}`}
            alt={`${item.brand} ${item.category}`}
          />
        </div>
      )}

      {item.images && item.images.length > 1 && (
        <div className="thumbnail-strip">
          {item.images.map((img, idx) => (
            <img
              key={img.id}
              src={`${SERVER_URL}/${img.object_key}`}
              alt={`thumbnail ${idx + 1}`}
              className={`thumbnail ${index === idx ? 'active' : ''}`}
              onClick={() => onThumbnailClick(item.id, idx)}
            />
          ))}
        </div>
      )}

      {isEditing ? (
        <div className="edit-form">
          <input type="text" name="brand" value={editFormData.brand} onChange={onEditInputChange} placeholder="Brand" />
          <input type="text" name="category" value={editFormData.category} onChange={onEditInputChange} placeholder="Category" />
          <input type="text" name="size" value={editFormData.size} onChange={onEditInputChange} placeholder="Size" />
          <select name="condition" value={editFormData.condition} onChange={onEditInputChange}>
            <option value="">Select condition</option>
            <option value="Like New">Like New</option>
            <option value="Very Good">Very Good</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
          </select>
          <input type="number" name="purchase_cost" value={editFormData.purchase_cost} onChange={onEditInputChange} placeholder="Purchase Price (£)" step="0.01" />
          <input type="number" name="listing_price" value={editFormData.listing_price} onChange={onEditInputChange} placeholder="Listing Price (£)" step="0.01" />
          <input type="text" name="listing_url" value={editFormData.listing_url} onChange={onEditInputChange} placeholder="Listing URL (eBay/Vinted link)" />
          <select name="box_number" value={editFormData.box_number} onChange={onEditInputChange}>
            <option value="">Select box</option>
            <option value="1">Box 1</option>
            <option value="2">Box 2</option>
            <option value="3">Box 3</option>
            <option value="4">Box 4</option>
            <option value="5">Box 5</option>
            <option value="6">Box 6</option>
            <option value="7">Box 7</option>
          </select>

          <div className="edit-buttons">
            <button className="btn-save" onClick={() => onSaveEdit(item.id)}>Save</button>
            <button className="btn-cancel" onClick={onCancelEdit}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="card-header">
            <div className="card-title">
              <h3>{item.brand} {item.category}</h3>
              <p className="card-meta">{item.size} • {item.condition}</p>
            </div>
            <div className={`status-light ${getStatusColor(item.status)}`}></div>
          </div>

          <div className="card-body">
            {askingSoldPrice ? (
              <div className="sold-price-prompt">
                <label>Actual sale price (£)</label>
                <input
                  type="number"
                  value={soldPriceInput}
                  onChange={(e) => setSoldPriceInput(e.target.value)}
                  step="0.01"
                  autoFocus
                />
                <div className="edit-buttons">
                  <button className="btn-save" onClick={handleConfirmSoldPrice}>Confirm Sale</button>
                  <button className="btn-cancel" onClick={handleCancelSoldPrice}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                {item.status !== 'DISPATCHED' && (
                  <div className="info-row">
                    <span className="label">Status:</span>
                    <select value={item.status} onChange={handleStatusDropdownChange} className="status-select">
                      <option value="DRAFT">Draft</option>
                      <option value="LISTED">Listing</option>
                      <option value="ACTIVE">Active</option>
                      <option value="SOLD">Sold</option>
                    </select>
                  </div>
                )}

                {showSimpleActiveView && (
                  <>
                    {item.brand && (
                      <div className="info-row">
                        <span className="label">Brand:</span>
                        <span>{item.brand}</span>
                      </div>
                    )}
                    {item.department && (
                      <div className="info-row">
                        <span className="label">Department:</span>
                        <span>{item.department}</span>
                      </div>
                    )}
                    {item.size && (
                      <div className="info-row">
                        <span className="label">Size:</span>
                        <span>{item.size}</span>
                      </div>
                    )}
                  </>
                )}

                {item.purchase_cost && (
                  <div className="info-row">
                    <span className="label">Purchase Price:</span>
                    <span>£{parseFloat(item.purchase_cost).toFixed(2)}</span>
                  </div>
                )}

                {item.listing_price && (
                  <div className="info-row">
                    <span className="label">Listing Price:</span>
                    <span>£{parseFloat(item.listing_price).toFixed(2)}</span>
                  </div>
                )}

                {item.sold_price && (
                  <div className="info-row">
                    <span className="label">Sold Price:</span>
                    <span>£{parseFloat(item.sold_price).toFixed(2)}</span>
                  </div>
                )}

                {profit !== null && (
                  <div className="info-row">
                    <span className="label">Profit:</span>
                    <span className={profit >= 0 ? 'profit-positive' : 'profit-negative'}>
                      {profit >= 0 ? '+' : ''}£{profit.toFixed(2)}
                    </span>
                  </div>
                )}

                {item.status === 'SOLD' && item.days_to_sell != null && (
                  <div className="info-row">
                    <span className="label">Days to Sell:</span>
                    <span>{item.days_to_sell}</span>
                  </div>
                )}

                {item.box_number && (
                  <div className="info-row">
                    <span className="label">Storage:</span>
                    <span>Box {item.box_number}</span>
                  </div>
                )}

                {item.listing_url && (
                  <div className="info-row">
                    <span className="label">Listing:</span>
                    <a href={item.listing_url} target="_blank" rel="noopener noreferrer" className="listing-link">
                      View listing ↗
                    </a>
                  </div>
                )}

                {showListingTools && (
                  <div className="listing-tools">
                    <div className="listing-tools-title">📋 Copy for Listing</div>
                    <CopyField label="Brand" value={item.brand} />
                    <CopyField label="Size" value={item.size} />
                    <CopyField label="Type" value={item.category} />
                    <CopyField label="Outer Shell Material" value={item.outer_shell_material || item.material} />
                    <CopyField label="Style" value={item.style} />
                    <CopyField label="Colour" value={item.colour} />
                    <CopyField label="Department" value={item.department} />
                    <CopyField label="Listing Price" value={item.listing_price ? `£${parseFloat(item.listing_price).toFixed(2)}` : null} />
                    <CopyField label="Description" value={item.generated_description} />
                  </div>
                )}
                {item.status === 'SOLD' && (
                  <button className="btn-dispatch" onClick={() => onMarkDispatched(item.id)}>
                    📦 Mark Dispatched
                  </button>
                )}

                {item.images && item.images.length > 0 && (
                  <button className="btn-folder" onClick={() => onOpenFolder(item.id)}>
                    📁 Open Photo Folder
                  </button>
                )}

                {item.status !== 'DISPATCHED' && (
                  <button className="btn-edit" onClick={() => onEditClick(item)}>✏️ Edit</button>
                )}
                <button className="btn-delete" onClick={() => onDeleteItem(item.id, `${item.brand} ${item.category}`)}>
                  🗑️ Delete Item
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default InventoryCard;
