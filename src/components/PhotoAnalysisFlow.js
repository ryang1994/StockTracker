import React, { useState, useRef, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const MAX_PHOTOS = 6;

function PhotoAnalysisFlow({ onItemSaved, boxes }) {
  // idle -> camera -> selecting -> analyzing -> review
  const [step, setStep] = useState('idle');
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState([]);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [reviewData, setReviewData] = useState({});
  const [cameraError, setCameraError] = useState(null);
  const [defaultPurchaseCost, setDefaultPurchaseCost] = useState(
    () => localStorage.getItem('stocktracker_default_purchase_cost') || ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleDefaultCostChange = (e) => {
    const value = e.target.value;
    setDefaultPurchaseCost(value);
    localStorage.setItem('stocktracker_default_purchase_cost', value);
  };

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Attach the live camera stream to the <video> element once it's mounted
  useEffect(() => {
    if (step === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [step]);

  // Release the camera if the component ever unmounts while it's open
  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      streamRef.current = stream;
      setStep('camera');
    } catch (err) {
      console.error('Camera access failed:', err);
      setCameraError('Could not access the camera. You can choose photos from your gallery instead.');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || selectedPhotos.length >= MAX_PHOTOS) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);

      setSelectedPhotos(prev => [...prev, file].slice(0, MAX_PHOTOS));
      setPhotoPreviewUrls(prev => [...prev, url].slice(0, MAX_PHOTOS));
    }, 'image/jpeg', 0.92);
  };

  const finishCapturing = () => {
    stopCamera();
    setStep('selecting');
  };

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Fires when photos are picked from the gallery (from idle or from "Add More")
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
    stopCamera();
    photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    setStep('idle');
    setSelectedPhotos([]);
    setPhotoPreviewUrls([]);
    setMainPhotoIndex(0);
    setReviewData({});
    setCameraError(null);
    setIsSaving(false);
  };

  const handleCancel = () => {
    resetAll();
  };

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
        purchase_cost: defaultPurchaseCost,
        listing_price: '',
        box_id: '',
        quantity: '1'
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
        purchase_cost: defaultPurchaseCost,
        listing_price: '',
        box_id: '',
        quantity: '1'
      });
      setStep('review');
    }
  };

  const handleReviewInputChange = (e) => {
    const { name, value } = e.target;
    setReviewData({ ...reviewData, [name]: value });
  };

  const handleConfirmSave = async () => {
    if (isSaving) return; // already in progress - ignore extra taps

    if (!reviewData.brand && !reviewData.category) {
      alert('Please fill in at least a brand or category before saving.');
      return;
    }

    setIsSaving(true);

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
        box_id: reviewData.box_id,
        quantity: reviewData.quantity || 1
      };

      const response = await fetch(`${API_URL}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemPayload)
      });

      if (!response.ok) throw new Error('Failed to create item');

      const newItems = await response.json(); // always an array, even for quantity 1

      if (selectedPhotos.length > 0) {
        // Reorder so the chosen main photo uploads first
        const orderedPhotos = [
          selectedPhotos[mainPhotoIndex],
          ...selectedPhotos.filter((_, i) => i !== mainPhotoIndex)
        ];

        // Duplicates from the same batch share identical photos - upload to each in turn
        for (const newItem of newItems) {
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
        }
      } else {
        newItems.forEach(item => { item.images = []; });
      }

      onItemSaved(newItems);
      resetAll();
    } catch (err) {
      console.error(err);
      alert('Failed to save item.');
      setIsSaving(false);
    }
  };

  return (
    <section className="photo-analysis-section">
      {step === 'idle' && (
        <div className="photo-entry-panel">
          <div className="default-cost-row">
            <label>Default cost per item (£)</label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. £6"
              value={defaultPurchaseCost}
              onChange={handleDefaultCostChange}
            />
          </div>

          <button type="button" className="photo-drop-zone" onClick={startCamera}>
            <span className="photo-drop-icon">📷</span>
            <span className="photo-drop-title">Take Photos</span>
            <span className="photo-drop-subtitle">Capture 2–5 photos directly — nothing is saved to your phone's gallery</span>
          </button>

          {cameraError && <p className="camera-error">{cameraError}</p>}

          <button type="button" className="btn-cancel photo-gallery-fallback" onClick={openFilePicker}>
            🖼️ Or choose from gallery instead
          </button>
        </div>
      )}

      {step === 'camera' && (
        <div className="camera-panel">
          <div className="camera-preview-wrapper">
            <video ref={videoRef} autoPlay playsInline muted className="camera-preview" />
          </div>

          <button
            type="button"
            className="camera-shutter-btn"
            onClick={capturePhoto}
            disabled={selectedPhotos.length >= MAX_PHOTOS}
            aria-label="Take photo"
          >
            📸
          </button>

          <p className="camera-count-label">{selectedPhotos.length}/{MAX_PHOTOS} photos captured</p>

          {photoPreviewUrls.length > 0 && (
            <div className="photo-selecting-grid">
              {photoPreviewUrls.map((url, idx) => (
                <div key={idx} className="photo-selecting-item">
                  <img src={url} alt={`Captured ${idx + 1}`} />
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
          )}

          <div className="review-buttons">
            <button type="button" className="btn-cancel" onClick={handleCancel}>Cancel</button>
            <button
              type="button"
              className="btn-add"
              onClick={finishCapturing}
              disabled={selectedPhotos.length === 0}
            >
              ✅ Done ({selectedPhotos.length})
            </button>
          </div>
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

          {selectedPhotos.length < MAX_PHOTOS && (
            <div className="review-buttons photo-add-more-row">
              <button type="button" className="btn-cancel" onClick={startCamera}>
                📷 Add via Camera
              </button>
              <button type="button" className="btn-cancel" onClick={openFilePicker}>
                🖼️ Add from Gallery
              </button>
            </div>
          )}

          {cameraError && <p className="camera-error">{cameraError}</p>}

          <div className="review-buttons">
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
              <label>Quantity</label>
              <input type="number" name="quantity" value={reviewData.quantity} onChange={handleReviewInputChange} min="1" step="1" />
              {parseInt(reviewData.quantity, 10) > 1 && (
                <span className="quantity-hint">Creates {reviewData.quantity} separate item cards, each with its own status</span>
              )}
            </div>
            <div className="form-group">
              <label>Listing Price (£)</label>
              <input type="number" name="listing_price" value={reviewData.listing_price} onChange={handleReviewInputChange} step="0.01" placeholder="Your asking price" />
            </div>
            <div className="form-group">
              <label>Storage Box</label>
              <select name="box_id" value={reviewData.box_id} onChange={handleReviewInputChange}>
                <option value="">Select box</option>
                {(boxes || []).map(box => (
                  <option key={box.id} value={box.id}>{box.name}</option>
                ))}
              </select>
            </div>
          </div>

          {reviewData.visible_defects && (
            <div className="defects-notice">
              ⚠️ AI noted possible defects: {reviewData.visible_defects}
            </div>
          )}

          <div className="review-buttons">
            <button className="btn-add" onClick={handleConfirmSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Item'}
            </button>
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
