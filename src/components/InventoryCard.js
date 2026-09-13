import React, { useState, useEffect } from 'react';
import CopyField from './CopyField';

const SERVER_URL = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:5000';

// Best-guess which of the item's existing fields corresponds to a given eBay aspect name,
// so dropdowns/values start pre-filled rather than blank.
function guessValueForAspect(aspectName, item) {
  const name = aspectName.toLowerCase();
  if (name.includes('brand')) return item.brand;
  if (name.includes('colour') || name.includes('color')) return item.colour;
  if (name.includes('department')) return item.department;
  if (name.includes('size')) return item.size;
  if (name.includes('style')) return item.style;
  if (name.includes('type')) return item.category;
  if (name.includes('outer shell') || name.includes('material')) return item.outer_shell_material || item.material;
  if (name.includes('condition')) return item.condition;
  return '';
}

// Given eBay's controlled list of values, find the closest match to a guessed free-text value.
// Returns empty (not a random first-in-list value) when there's genuinely nothing to match against -
// a wrong-looking-confident guess is worse than an honest blank.
function findClosestValue(guess, values) {
  if (!guess || !values || values.length === 0) return '';
  const guessLower = guess.toLowerCase();
  const exact = values.find(v => v.toLowerCase() === guessLower);
  if (exact) return exact;
  const partial = values.find(v => guessLower.includes(v.toLowerCase()) || v.toLowerCase().includes(guessLower));
  if (partial) return partial;
  return '';
}

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
  onReturnItem,
  onFlagReturn,
  onUnflagReturn,
  onCheckPrice,
  onToggleMarketplaceStatus,
  onCategorySaved,
  hiddenAspects,
  onOpenFolder,
  onUploadPurchaseReceipt,
  boxes
}) {
  const [askingSoldPrice, setAskingSoldPrice] = useState(false);
  const [soldPriceInput, setSoldPriceInput] = useState('');
  const [sellingFeesInput, setSellingFeesInput] = useState('');
  const [soldPlatformInput, setSoldPlatformInput] = useState('');
  const [isCheckingPrice, setIsCheckingPrice] = useState(false);
  const [aspectDrafts, setAspectDrafts] = useState({});
  const [publishing, setPublishing] = useState(false);

  const handlePublishToEbay = async () => {
    const confirmed = window.confirm(`Publish "${item.brand} ${item.category}" live to eBay for £${item.listing_price}? This creates a real listing.`);
    if (!confirmed) return;

    setPublishing(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/items/${item.id}/publish-ebay`, { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        alert('Could not publish: ' + (data.error || 'Unknown error') + (data.details ? '\n\n' + JSON.stringify(data.details) : ''));
        return;
      }

      alert(`Published! eBay listing ID: ${data.listingId}`);
      onCategorySaved(data.item);
    } catch (err) {
      console.error(err);
      alert('Failed to publish to eBay.');
    } finally {
      setPublishing(false);
    }
  };
  const [categorySuggestions, setCategorySuggestions] = useState(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [itemAspects, setItemAspects] = useState(null);
  const [aspectsLoading, setAspectsLoading] = useState(false);

  const handleFindCategory = async () => {
    const query = `${item.brand || ''} ${item.category || ''}`.trim();
    if (!query) {
      alert('This item needs a brand or category before searching for an eBay category.');
      return;
    }
    setCategoryLoading(true);
    setCategorySuggestions(null);
    try {
      const response = await fetch(`${SERVER_URL}/api/ebay/category-suggestions?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to find categories');
      setCategorySuggestions(data.suggestions);
    } catch (err) {
      console.error(err);
      alert('Could not fetch eBay category suggestions right now.');
    } finally {
      setCategoryLoading(false);
    }
  };

  const handlePickCategory = async (categoryId, categoryName) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/items/${item.id}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ebay_category_id: categoryId, ebay_category_name: categoryName })
      });
      if (!response.ok) throw new Error('Failed to save category');
      const updatedItem = await response.json();
      onCategorySaved(updatedItem);
      setCategorySuggestions(null);
      setItemAspects(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save eBay category.');
    }
  };

  const handleViewAspects = async () => {
    if (!item.ebay_category_id) return;
    setAspectsLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/ebay/item-aspects?category_id=${item.ebay_category_id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch item aspects');
      setItemAspects(data.aspects);
    } catch (err) {
      console.error(err);
      alert('Could not fetch required fields for this category right now.');
    } finally {
      setAspectsLoading(false);
    }
  };

  // Automatically suggest a category the moment an item is ready to list, so there's
  // a recommendation waiting rather than requiring an extra click to even see one.
  useEffect(() => {
    if (item.status === 'LISTED' && !item.ebay_category_id && !categorySuggestions && !categoryLoading) {
      handleFindCategory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.status, item.id]);

  useEffect(() => {
    if (item.ebay_category_id && !itemAspects && !aspectsLoading) {
      handleViewAspects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.ebay_category_id]);

  const handleAspectChange = async (aspectName, value) => {
    const updatedAspects = { ...(item.ebay_aspects || {}), [aspectName]: value };
    try {
      const response = await fetch(`${SERVER_URL}/api/items/${item.id}/aspects`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aspects: updatedAspects })
      });
      if (!response.ok) throw new Error('Failed to save aspect');
      const updatedItem = await response.json();
      onCategorySaved(updatedItem);
    } catch (err) {
      console.error(err);
      alert('Failed to save that selection.');
    }
  };

  const handleCopyAspectValue = (value) => {
    if (!value) return;
    navigator.clipboard.writeText(value.toString());
  };

  const handleCheckPriceClick = async () => {
    setIsCheckingPrice(true);
    try {
      await onCheckPrice(item.id);
    } finally {
      setIsCheckingPrice(false);
    }
  };

  const handleReceiptFileSelected = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) {
      onUploadPurchaseReceipt(item.id, file);
    }
  };

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
    const fees = parseFloat(sellingFeesInput) || 0;
    onConfirmSale(item.id, price, fees, soldPlatformInput || null);
    setAskingSoldPrice(false);
  };

  const handleCancelSoldPrice = () => {
    setAskingSoldPrice(false);
    setSoldPriceInput('');
    setSellingFeesInput('');
    setSoldPlatformInput('');
  };

  const profit = (item.status === 'SOLD' || item.status === 'DISPATCHED') && item.sold_price != null && item.purchase_cost != null
    ? (parseFloat(item.sold_price) - parseFloat(item.purchase_cost) - parseFloat(item.selling_fees || 0))
    : null;

  const daysRemaining = item.days_until_archived != null ? item.days_until_archived : null;

  const showListingTools = item.status === 'LISTED';
  const showSimpleActiveView = item.status === 'ACTIVE';

  return (
    <div className={`inventory-card status-${getCardStatusClass(item.status)} ${item.needs_attention ? 'needs-attention' : ''}`}>
      <div className="card-badges">
        {item.item_number && (
          <span className="badge badge-item-number">{item.item_number}</span>
        )}
        {item.needs_attention && (
          <span className="badge badge-attention">⚠️ ATTENTION</span>
        )}
        {item.return_requested && (
          <span className="badge badge-return-requested">🚩 RETURN REQUESTED</span>
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
          <input type="text" name="colour" value={editFormData.colour} onChange={onEditInputChange} placeholder="Colour" />
          <input type="text" name="style" value={editFormData.style} onChange={onEditInputChange} placeholder="Style" />
          <input type="text" name="department" value={editFormData.department} onChange={onEditInputChange} placeholder="Department" />
          <input type="text" name="material" value={editFormData.material} onChange={onEditInputChange} placeholder="Material" />
          <input type="text" name="outer_shell_material" value={editFormData.outer_shell_material} onChange={onEditInputChange} placeholder="Outer Shell Material" />
          <select name="condition" value={editFormData.condition} onChange={onEditInputChange}>
            <option value="">Select condition</option>
            <option value="Like New">Like New</option>
            <option value="Very Good">Very Good</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
          </select>
          <input type="number" name="purchase_cost" value={editFormData.purchase_cost} onChange={onEditInputChange} placeholder="Purchase Price (£)" step="0.01" />
          <input type="number" name="listing_price" value={editFormData.listing_price} onChange={onEditInputChange} placeholder="Listing Price (£)" step="0.01" />
          <input type="text" name="ebay_url" value={editFormData.ebay_url} onChange={onEditInputChange} placeholder="eBay listing URL" />
          <input type="text" name="vinted_url" value={editFormData.vinted_url} onChange={onEditInputChange} placeholder="Vinted listing URL" />
          <select name="box_id" value={editFormData.box_id} onChange={onEditInputChange}>
            <option value="">Select box</option>
            {(boxes || []).map(box => (
              <option key={box.id} value={box.id}>{box.name}</option>
            ))}
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
              {item.ebay_estimated_median != null ? (
                <p className="card-estimate">
                  📊 Est. £{parseFloat(item.ebay_estimated_low).toFixed(2)}–£{parseFloat(item.ebay_estimated_high).toFixed(2)} (median £{parseFloat(item.ebay_estimated_median).toFixed(2)}) · {item.ebay_estimated_count} active
                  {' '}
                  <button className="card-estimate-refresh" onClick={handleCheckPriceClick} disabled={isCheckingPrice}>
                    {isCheckingPrice ? 'checking...' : '↻ refresh'}
                  </button>
                </p>
              ) : (
                <button className="card-estimate-check-btn" onClick={handleCheckPriceClick} disabled={isCheckingPrice}>
                  {isCheckingPrice ? 'Checking eBay...' : '🔍 Check eBay price'}
                </button>
              )}
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
                <label>Marketplace fees (£, optional)</label>
                <input
                  type="number"
                  value={sellingFeesInput}
                  onChange={(e) => setSellingFeesInput(e.target.value)}
                  step="0.01"
                  placeholder="0.00"
                />
                <label>Sold via</label>
                <select value={soldPlatformInput} onChange={(e) => setSoldPlatformInput(e.target.value)}>
                  <option value="">Select platform</option>
                  <option value="eBay">eBay</option>
                  <option value="Vinted">Vinted</option>
                  <option value="Other">Other</option>
                </select>
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

                    <div className="marketplace-status-row">
                      {item.ebay_listing_id ? (
                        <a href={item.ebay_url} target="_blank" rel="noopener noreferrer" className="marketplace-toggle marketplace-link">
                          <span className="status-dot online"></span>
                          🔗 View eBay Listing
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="marketplace-toggle"
                          onClick={() => onToggleMarketplaceStatus(item.id, 'active_on_ebay', !item.active_on_ebay)}
                        >
                          <span className={`status-dot ${item.active_on_ebay ? 'online' : 'offline'}`}></span>
                          eBay {item.active_on_ebay ? 'Active' : 'Not marked active'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="marketplace-toggle"
                        onClick={() => onToggleMarketplaceStatus(item.id, 'active_on_vinted', !item.active_on_vinted)}
                      >
                        <span className={`status-dot ${item.active_on_vinted ? 'online' : 'offline'}`}></span>
                        Vinted {item.active_on_vinted ? 'Active' : 'Not marked active'}
                      </button>
                    </div>
                  </>
                )}

                {item.purchase_cost && (
                  <div className="info-row">
                    <span className="label">Purchase Price:</span>
                    <span>£{parseFloat(item.purchase_cost).toFixed(2)}</span>
                  </div>
                )}

                <div className="info-row purchase-receipt-row">
                  <span className="label">Purchase Receipt:</span>
                  {item.purchase_receipt_key ? (
                    <a href={`${SERVER_URL}/${item.purchase_receipt_key}`} target="_blank" rel="noopener noreferrer" className="listing-link">
                      View receipt ↗
                    </a>
                  ) : (
                    <label className="receipt-upload-label">
                      📄 Add receipt
                      <input type="file" accept="image/*" onChange={handleReceiptFileSelected} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>

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

                {item.selling_fees > 0 && (
                  <div className="info-row">
                    <span className="label">Marketplace Fees:</span>
                    <span>£{parseFloat(item.selling_fees).toFixed(2)}</span>
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

                {item.sold_platform && (
                  <div className="info-row">
                    <span className="label">Sold Via:</span>
                    <span>{item.sold_platform}</span>
                  </div>
                )}

                {item.status === 'SOLD' && item.days_to_dispatch != null && (
                  <div className="info-row">
                    <span className="label">Dispatch By:</span>
                    <span className={item.days_to_dispatch < 0 ? 'profit-negative' : ''}>
                      {item.days_to_dispatch < 0
                        ? `${Math.abs(item.days_to_dispatch)} days overdue`
                        : item.days_to_dispatch === 0
                        ? 'Today'
                        : `${item.days_to_dispatch} day${item.days_to_dispatch === 1 ? '' : 's'} left`}
                    </span>
                  </div>
                )}

                {item.box_id && boxes && boxes.find(b => b.id === item.box_id) && (
                  <div className="info-row">
                    <span className="label">Storage:</span>
                    <span>{boxes.find(b => b.id === item.box_id).name}</span>
                  </div>
                )}

                {item.ebay_url && (
                  <div className="info-row">
                    <span className="label">eBay:</span>
                    <a href={item.ebay_url} target="_blank" rel="noopener noreferrer" className="listing-link">
                      View listing ↗
                    </a>
                  </div>
                )}

                {item.vinted_url && (
                  <div className="info-row">
                    <span className="label">Vinted:</span>
                    <a href={item.vinted_url} target="_blank" rel="noopener noreferrer" className="listing-link">
                      View listing ↗
                    </a>
                  </div>
                )}

                {showListingTools && (
                  <div className="listing-tools">
                    <div className="listing-tools-title">📋 Copy for Listing</div>
                    <CopyField label="Listing Price" value={item.listing_price ? `£${parseFloat(item.listing_price).toFixed(2)}` : null} />
                    <CopyField label="Description" value={item.generated_description} />

                    <div className="ebay-category-box">
                      <div className="ebay-category-title">eBay Category</div>

                      {item.ebay_category_id ? (
                        <div className="ebay-category-picked">
                          <span>🏷️ <strong>{item.ebay_category_name}</strong></span>
                          <button className="copy-btn" onClick={() => handleCopyAspectValue(item.ebay_category_name)} title="Copy">
                            📋
                          </button>
                          <button type="button" className="card-estimate-check-btn" onClick={handleFindCategory} disabled={categoryLoading}>
                            change
                          </button>
                          <button type="button" className="card-estimate-check-btn" onClick={handleViewAspects} disabled={aspectsLoading}>
                            {aspectsLoading ? 'loading...' : 'refresh required fields'}
                          </button>
                        </div>
                      ) : categoryLoading ? (
                        <p className="review-hint">Finding a recommended eBay category...</p>
                      ) : (
                        <button type="button" className="card-estimate-check-btn" onClick={handleFindCategory}>
                          🏷️ Get eBay category recommendation
                        </button>
                      )}

                      {categorySuggestions && categorySuggestions.length > 0 && (
                        <div className="category-suggestions-list">
                          <p className="review-hint">
                            {item.ebay_category_id ? 'Pick a different category:' : `Recommended: ${categorySuggestions[0].categoryName}. Tap to confirm, or pick another below.`}
                          </p>
                          {categorySuggestions.map((s, idx) => (
                            <button
                              key={s.categoryId}
                              type="button"
                              className={`category-suggestion-btn ${idx === 0 && !item.ebay_category_id ? 'category-suggestion-recommended' : ''}`}
                              onClick={() => handlePickCategory(s.categoryId, s.categoryName)}
                            >
                              {idx === 0 && !item.ebay_category_id ? '⭐ ' : ''}{s.categoryName}
                              {s.path && <span className="category-suggestion-path">{s.path}</span>}
                            </button>
                          ))}
                        </div>
                      )}

                      {categorySuggestions && categorySuggestions.length === 0 && (
                        <p className="no-items">No category suggestions found - try adjusting the brand/category text.</p>
                      )}

                      {itemAspects && (
                        <div className="aspects-fields">
                          {itemAspects
                            .filter(a => a.required || !(hiddenAspects || []).includes(a.name.toLowerCase()))
                            .map(a => {
                            const savedValue = item.ebay_aspects && item.ebay_aspects[a.name];
                            const guess = guessValueForAspect(a.name, item);
                            const hasControlledValues = a.mode === 'SELECTION_ONLY' && a.values && a.values.length > 0;
                            const currentValue = savedValue || (hasControlledValues ? findClosestValue(guess, a.values) : guess);

                            if (hasControlledValues) {
                              return (
                                <div key={a.name} className="copy-field">
                                  <span className="copy-field-label">
                                    {a.name} {a.required && <span className="aspect-required-tag">required</span>}
                                  </span>
                                  <div className="copy-field-value-row">
                                    <select
                                      className="aspect-select"
                                      value={currentValue}
                                      onChange={(e) => handleAspectChange(a.name, e.target.value)}
                                    >
                                      {!currentValue && <option value="">-- Select --</option>}
                                      {a.values.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                    <button className="copy-btn" onClick={() => handleCopyAspectValue(currentValue)} title="Copy">
                                      📋
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            const draftValue = aspectDrafts[a.name] !== undefined ? aspectDrafts[a.name] : currentValue;

                            return (
                              <div key={a.name} className="copy-field">
                                <span className="copy-field-label">
                                  {a.name} {a.required && <span className="aspect-required-tag">required</span>}
                                </span>
                                <div className="copy-field-value-row">
                                  <input
                                    type="text"
                                    className="aspect-text-input"
                                    value={draftValue}
                                    onChange={(e) => setAspectDrafts({ ...aspectDrafts, [a.name]: e.target.value })}
                                    onBlur={(e) => handleAspectChange(a.name, e.target.value)}
                                  />
                                  <button className="copy-btn" onClick={() => handleCopyAspectValue(draftValue)} title="Copy">
                                    📋
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn-publish-ebay btn-publish-ebay-live"
                      onClick={handlePublishToEbay}
                      disabled={publishing || !item.ebay_category_id}
                    >
                      {publishing ? 'Publishing...' : '🚀 Publish to eBay'}
                    </button>
                  </div>
                )}
                {item.status === 'SOLD' && (
                  <button className="btn-dispatch" onClick={() => onMarkDispatched(item.id)}>
                    📦 Mark Dispatched
                  </button>
                )}

                {item.status === 'DISPATCHED' && !item.return_requested && (
                  <button className="btn-flag-return" onClick={() => onFlagReturn(item.id)}>
                    🚩 Flag Return Requested
                  </button>
                )}

                {item.status === 'DISPATCHED' && item.return_requested && (
                  <>
                    <button className="btn-return" onClick={() => onReturnItem(item.id, `${item.brand} ${item.category}`)}>
                      ✅ Confirm Returned & Relist
                    </button>
                    <button className="btn-cancel-flag" onClick={() => onUnflagReturn(item.id)}>
                      Cancel Flag (resolved without return)
                    </button>
                  </>
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
