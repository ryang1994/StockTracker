import React from 'react';

function AddItemForm({ formData, onInputChange, onPhotoSelect, selectedPhotos, onSubmit }) {
  return (
    <section className="add-item-section">
      <h2>Add New Item</h2>
      <form onSubmit={onSubmit} className="add-item-form">
        <div className="form-group">
          <label htmlFor="brand">Brand *</label>
          <input
            type="text"
            id="brand"
            name="brand"
            value={formData.brand}
            onChange={onInputChange}
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
            onChange={onInputChange}
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
            onChange={onInputChange}
            placeholder="e.g., Large"
          />
        </div>

        <div className="form-group">
          <label htmlFor="condition">Condition</label>
          <select
            id="condition"
            name="condition"
            value={formData.condition}
            onChange={onInputChange}
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
            onChange={onInputChange}
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
            onChange={onInputChange}
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

        <div className="form-group">
          <label htmlFor="photo-input">Photos</label>
          <input
            type="file"
            id="photo-input"
            accept="image/*"
            multiple
            capture="environment"
            onChange={onPhotoSelect}
          />
          {selectedPhotos.length > 0 && (
            <span className="photo-count">{selectedPhotos.length} photo(s) selected</span>
          )}
        </div>

        <button type="submit" className="btn-add">Add Item</button>
      </form>
    </section>
  );
}

export default AddItemForm;
