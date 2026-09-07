import React from 'react';

const SERVER_URL = 'http://localhost:5000';

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
  onDeleteItem
}) {
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

  const index = activeImageIndex || 0;
  const activeImage = item.images && item.images[index] ? item.images[index] : null;

  return (
    <div className="inventory-card">
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
          <input
            type="text"
            name="brand"
            value={editFormData.brand}
            onChange={onEditInputChange}
            placeholder="Brand"
          />
          <input
            type="text"
            name="category"
            value={editFormData.category}
            onChange={onEditInputChange}
            placeholder="Category"
          />
          <input
            type="text"
            name="size"
            value={editFormData.size}
            onChange={onEditInputChange}
            placeholder="Size"
          />
          <select
            name="condition"
            value={editFormData.condition}
            onChange={onEditInputChange}
          >
            <option value="">Select condition</option>
            <option value="Like New">Like New</option>
            <option value="Very Good">Very Good</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
          </select>
          <input
            type="number"
            name="purchase_cost"
            value={editFormData.purchase_cost}
            onChange={onEditInputChange}
            placeholder="Purchase Price (£)"
            step="0.01"
          />
          <select
            name="box_number"
            value={editFormData.box_number}
            onChange={onEditInputChange}
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

          <div className="edit-buttons">
            <button className="btn-save" onClick={() => onSaveEdit(item.id)}>
              Save
            </button>
            <button className="btn-cancel" onClick={onCancelEdit}>
              Cancel
            </button>
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
            <div className="info-row">
              <span className="label">Status:</span>
              <select
                value={item.status}
                onChange={(e) => onStatusChange(item.id, e.target.value)}
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

            <button className="btn-edit" onClick={() => onEditClick(item)}>
              ✏️ Edit
            </button>
            <button
              className="btn-delete"
              onClick={() => onDeleteItem(item.id, `${item.brand} ${item.category}`)}
            >
              🗑️ Delete Item
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default InventoryCard;
