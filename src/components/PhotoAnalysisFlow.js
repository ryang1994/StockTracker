import React, { useState, useRef } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const MAX_PHOTOS = 6;

function PhotoAnalysisFlow({ onItemSaved }) {
  // idle -> selecting -> analyzing -> review
  const [step, setStep] = useState('idle');
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState([]);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [reviewData, setReviewData] = useState({});
  const fileInputRef = useRef(null);

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Fires every time photos are added, whether from "Add Photos" (idle)
  // or "Add More" (selecting step). Appends to whatever is already selected
  // instead of replacing it, so multiple camera shots / gallery picks build up.
  const handleFilesAdded = (e) => {
    const newFiles = Array.from(e.target.files);
    e.target.value = ''; // allow picking the same file again later if needed
    if (newFiles.length === 0) return;

    setSelectedPhotos(prevPhotos => {
      const combined = [...prevPhotos, ...newFiles];
      if (combined.length > MAX_PHOTOS) {
        alert(`You can add up to ${MAX_PHOTOS} photos per item. Only the first ${MAX_PHOTOS} will be kept.`);
      }
      return combined.slice(0, MAX_PHOTOS);
    });

    setPhotoPreviewUrls(prevUrls => {
      const newUrls = newFiles.map(f => URL.createObjectURL(f));
      return [...prevUrls, ...newUrls].slice(0, MAX_PHOTOS);
    });

    setStep('selecting');
  };

  const handleRemovePhoto = (index) => {
    setPhotoPreviewUrls(prevUrls => {
      URL.revokeObjectURL(prevUrls[index]);
      return prevUrls.filter((_, i) => i !== index);
    });
    setSelectedPhotos(prevPhotos => prevPhotos.filter((_, i) => i !== index));
    setMainPhotoIndex(0);
  };

  const resetAll = () => {
    photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    setStep('idle');
    setSelectedPhotos([]);
    setPhotoPreviewUrls([]);
    setMainPhotoIndex(0);
    setReviewData({});
  };

  const handleCancel = () => {
    resetAll();
  };

  // Triggered by the "Continue" button in the selecting step
  const runAnalysis = async () => {
    if (selectedPhotos.length === 0) return;
    setStep('analyzing');

    try {
      const formData = new FormData();
      selectedPhotos.forEach(file => formData.append('photos', file));

      const response = await fetch(`${API_URL}/analyze-photos`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Analysis failed');

      const result = await response.json();

      setReviewData({
        brand: result.brand || '',
        category: result.category || '',
        department: result.department || '',
        size: result.size || '',
        colour: result.colour || '',
        material: result.material || '',
        outer_shell_material: result.outer_shell_material || '',
        style: result.style || '',
        condition: result.condition || '',
        visible_defects: result.visible_defects || '',
        purchase_cost: '',
        listing_price: '',
        box_number: ''
      });
      setStep('review');
    } catch (err) {
      console.error(err);
      setReviewData({
        brand: '',
        category: '',
        department: '',
        size: '',
        colour: '',
        material: '',
        outer_shell_material: '',
        style: '',
        condition: '',
        visible_defects: '',
        purchase_cost: '',
        listing_price: '',
        box_number: ''
      });
      setStep('review');
    }
  };

  const handleReviewInputChange = (e) => {
    const { name, value } = e.target;
    setReviewData({ ...reviewData, [name]: value });
  };

  const handleConfirmSave = async () => {
    if (!reviewData.brand && !reviewData.category) {
      alert('Please fill in at least a brand or category before saving.');
      return;
    }

    try {
      const itemPayload = {
        brand: reviewData.brand,
        category: reviewData.category,
        size: reviewData.size,
        colour: reviewData.colour,
        condition: reviewData.condition,
        material: reviewData.material,
        outer_shell_material: reviewData.outer_shell_material,
        style: reviewData.style,
        department: reviewData.department,
        purchase_cost: reviewData.purchase_cost,
        listing_price: reviewData.listing_price,
        status: 'DRAFT',
        box_number: reviewData.box_number
      };

      const response = await fetch(`${API_URL}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemPayload)
      });

      if (!response.ok) throw new Error('Failed to create item');

      const newItem = await response.json();

      if (selectedPhotos.length > 0) {
        // Reorder so the chosen main photo uploads first
        const orderedPhotos = [
          selectedPhotos[mainPhotoIndex],
          ...selectedPhotos.filter((_, i) => i !== mainPhotoIndex)
        ];

        const photoFormData = new FormData();
        orderedPhotos.forEach(file => photoFormData.append('photos', file));

        const uploadResponse = await fetch(`${API_URL}/items/${newItem.id}/images`, {
          method: 'POST',
          body: photoFormData
        });

        if (uploadResponse.ok) {
          newItem.images = await uploadResponse.json();
        } else {
          newItem.images = [];
        }
      } else {
        newItem.images = [];
      }

      onItemSaved(newItem);
      resetAll();
    } catch (err) {
      console.error(err);
      alert('Failed to save item.');
    }
  };

  return (
    <section className="photo-analysis-section">
      {step === 'idle' && (
        <div className="photo-drop-zone" onClick={openFilePicker} role="button" tabIndex={0}>
          <span className="photo-drop-icon">📷</span>
          <span className="photo-drop-title">Click here to add photos</span>
          <span className="photo-drop-subtitle">Take photos or choose from your gallery — add as many as you need, then continue</span>
        </div>
      )}

      {step === 'selecting' && (
        <div className="photo-selecting-panel">
          <h3>Photos ({selectedPhotos.length}/{MAX_PHOTOS})</h3>
          <p className="review-hint">Add front, back, label — whatever you need. Tap Continue when ready.</p>

          <div className="photo-selecting-grid">
            {photoPreviewUrls.map((url, idx) => (
              <div key={idx} className="photo-selecting-item">
                <img src={url} alt={`Selected ${idx + 1}`} />
                <button
                  type="button"
                  className="photo-remove-btn"
                  onClick={() => handleRemovePhoto(idx)}
                  aria-label="Remove photo"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="review-buttons">
            {selectedPhotos.length < MAX_PHOTOS && (
              <button type="button" className="btn-cancel" onClick={openFilePicker}>
                ➕ Add More
              </button>
            )}
            <button
              type="button"
              className="btn-add"
              onClick={runAnalysis}
              disabled={selectedPhotos.length === 0}
            >
              ▶ Continue ({selectedPhotos.length})
            </button>
          </div>

          <button type="button" className="btn-cancel photo-selecting-cancel" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      )}

      {step === 'analyzing' && (
        <div className="photo-analyzing">
          <div className="spinner"></div>
          <p>Analyzing photos with AI...</p>
        </div>
      )}

      {step === 'review' && (
        <div className="review-panel">
          <h3>Review AI Suggestions</h3>
          <p className="review-hint">Check and correct anything before saving.</p>

          {photoPreviewUrls.length > 0 && (
            <div className="photo-select-strip">
              <p className="photo-select-label">Choose main photo:</p>
              <div className="photo-select-row">
                {photoPreviewUrls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`option ${idx + 1}`}
                    className={`photo-select-thumb ${mainPhotoIndex === idx ? 'selected' : ''}`}
                    onClick={() => setMainPhotoIndex(idx)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="review-grid">
            <div className="form-group">
              <label>Brand</label>
              <input type="text" name="brand" value={reviewData.brand} onChange={handleReviewInputChange} />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input type="text" name="category" value={reviewData.category} onChange={handleReviewInputChange} />
            </div>
            <div className="form-group">
              <label>Department</label>
              <input type="text" name="department" value={reviewData.department} onChange={handleReviewInputChange} />
            </div>
            <div className="form-group">
              <label>Size</label>
              <input type="text" name="size" value={reviewData.size} onChange={handleReviewInputChange} />
            </div>
            <div className="form-group">
              <label>Colour</label>
              <input type="text" name="colour" value={reviewData.colour} onChange={handleReviewInputChange} />
            </div>
            <div className="form-group">
              <label>Style</label>
              <input type="text" name="style" value={reviewData.style} onChange={handleReviewInputChange} />
            </div>
            <div className="form-group">
              <label>Material</label>
              <input type="text" name="material" value={reviewData.material} onChange={handleReviewInputChange} />
            </div>
            <div className="form-group">
              <label>Outer Shell Material</label>
              <input type="text" name="outer_shell_material" value={reviewData.outer_shell_material} onChange={handleReviewInputChange} />
            </div>
            <div className="form-group">
              <label>Condition</label>
              <select name="condition" value={reviewData.condition} onChange={handleReviewInputChange}>
                <option value="">Select condition</option>
                <option value="Like New">Like New</option>
                <option value="Very Good">Very Good</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>
            <div className="form-group">
              <label>Purchase Price (£)</label>
              <input type="number" name="purchase_cost" value={reviewData.purchase_cost} onChange={handleReviewInputChange} step="0.01" />
            </div>
            <div className="form-group">
              <label>Listing Price (£)</label>
              <input type="number" name="listing_price" value={reviewData.listing_price} onChange={handleReviewInputChange} step="0.01" placeholder="Your asking price" />
            </div>
            <div className="form-group">
              <label>Storage Box</label>
              <select name="box_number" value={reviewData.box_number} onChange={handleReviewInputChange}>
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
          </div>

          {reviewData.visible_defects && (
            <div className="defects-notice">
              ⚠️ AI noted possible defects: {reviewData.visible_defects}
            </div>
          )}

          <div className="review-buttons">
            <button className="btn-add" onClick={handleConfirmSave}>Save Item</button>
            <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFilesAdded}
        style={{ display: 'none' }}
      />
    </section>
  );
}

export default PhotoAnalysisFlow;
