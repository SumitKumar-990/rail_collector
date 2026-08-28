import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

export default function EtaIntelligence({ impacts, confidence }) {
  // Calculate SVG stroke offset for circle
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  return (
    <section className="intelligence-section">
      {/* LEFT: Why the ETA Changed */}
      <div className="intel-card">
        <div className="intel-card-header">
          <div>
            <h3 className="intel-title">Why the ETA changed</h3>
            <p className="intel-subtitle">AI factor decomposition & time delta impact</p>
          </div>
          <Info size={18} color="var(--text-muted)" />
        </div>

        <div className="impact-list">
          {impacts.map((item) => (
            <div className="impact-item" key={item.id}>
              <div className="impact-info">
                <span className="impact-emoji">{item.icon}</span>
                <span className="impact-name">{item.name}</span>
              </div>
              <span className={`impact-value ${item.type}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Prediction Confidence */}
      <div className="intel-card">
        <div className="intel-card-header">
          <div>
            <h3 className="intel-title">Prediction Confidence</h3>
            <p className="intel-subtitle">Multi-source ensemble model accuracy</p>
          </div>
          <ShieldCheck size={20} color="var(--accent-cyan)" />
        </div>

        <div className="confidence-container">
          {/* Circular SVG Gauge */}
          <div className="confidence-gauge">
            <svg className="confidence-svg" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0072ff" />
                  <stop offset="100%" stopColor="#00f2fe" />
                </linearGradient>
              </defs>
              <circle
                className="confidence-circle-bg"
                cx="60"
                cy="60"
                r={radius}
              />
              <circle
                className="confidence-circle-progress"
                cx="60"
                cy="60"
                r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="confidence-percentage">{confidence}%</div>
          </div>

          {/* Model Features Checklist */}
          <div className="confidence-factors">
            <span className="factors-title">Prediction based on:</span>
            <div className="factor-bullet">
              <span className="factor-dot"></span>
              <span>Live Train Telemetry</span>
            </div>
            <div className="factor-bullet">
              <span className="factor-dot"></span>
              <span>Route & Track Conditions</span>
            </div>
            <div className="factor-bullet">
              <span className="factor-dot"></span>
              <span>Micro-Weather Datasets</span>
            </div>
            <div className="factor-bullet">
              <span className="factor-dot"></span>
              <span>Historical Congestion Patterns</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
