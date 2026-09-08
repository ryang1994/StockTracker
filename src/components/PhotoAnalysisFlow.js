import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function PhotoAnalysisFlow({ onItemSaved }) {
  const [step, setStep] = useState('idle');
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState([]);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [reviewData, setReviewData] = useState({});

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setSelectedPhotos(files);
    setPhotoPreviewUrls(files.map(f => URL.createObjectURL(f)));
    setMainPhotoIndex(0);
    setStep('analyzing');

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('photos', file));

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

  const handleCancel = () => {
    setStep('idle');
    setSelectedPhotos([]);
    setPhotoPreviewUrls([]);
    setMainPhotoIndex(0);
    setReviewData({});
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
      handleCancel();
    } catch (err) {
      console.error(err);
      alert('Failed to save item.');
    }
  };

  return (
    <section className="photo-analysis-section">
      {step === 'idle' && (
        <label className="photo-drop-zone">
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handlePhotoSelect}
            style={{ display: 'none' }}
          />
          <span className="photo-drop-icon">📷</span>
          <span className="photo-drop-title">Click here to add photos</span>
          <span className="photo-drop-subtitle">Take or upload photos and let AI do the rest</span>
        </label>
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
    </section>
  );
}

export default PhotoAnalysisFlow;
