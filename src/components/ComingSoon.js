import React from 'react';

function ComingSoon({ title, icon, roadmap }) {
  return (
    <div className="coming-soon">
      <div className="coming-soon-icon">{icon}</div>
      <h2>{title}</h2>
      <p className="coming-soon-subtitle">This page is on the roadmap and not built yet.</p>

      <div className="roadmap-list">
        {roadmap.map((item, index) => (
          <div key={index} className="roadmap-item">
            <span className="roadmap-number">{index + 1}</span>
            <span className="roadmap-text">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ComingSoon;
