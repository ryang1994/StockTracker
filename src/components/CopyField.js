import React, { useState } from 'react';

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!value) return null;

  return (
    <div className="copy-field">
      <span className="copy-field-label">{label}</span>
      <div className="copy-field-value-row">
        <span className="copy-field-value">{value}</span>
        <button className="copy-btn" onClick={handleCopy} title="Copy">
          {copied ? '✅' : '📋'}
        </button>
      </div>
    </div>
  );
}

export default CopyField;
