import React from 'react';
import { Train, Clock, Sparkles, Navigation } from 'lucide-react';

export default function HeroEtaCard({ train, currentEta, delayText, remainingText, delayType, progressPct }) {
  return (
    <section className="hero-section">
      {/* Left Side: Dominant AI ETA Card */}
      <div className="hero-left-card">
        <div>
          <div className="hero-label">
            <Sparkles size={14} />
            LIVE ETA PREDICTION
          </div>

          <h2 className="hero-destination">
            Arriving at {train.destination}
          </h2>

          <div className="eta-glow-container">
            <div className="eta-large-time" id="ai-predicted-eta-display">
              {currentEta}
            </div>
            <div className="eta-remaining-text">
              {remainingText}
            </div>
          </div>
        </div>

        <div className="hero-comparison-row">
          <div className="comp-item">
            <Clock size={16} />
            <span>Scheduled: <strong>{train.scheduledEta}</strong></span>
          </div>

          <div className="comp-item">
            <span>Current Delay:</span>
            <span className={`delay-pill ${delayType}`}>
              {delayText}
            </span>
          </div>
        </div>
      </div>

      {/* Right Side: Visual Route Card */}
      <div className="hero-route-card">
        <div className="route-card-title">
          Live Position & Route Segment
        </div>

        <div className="visual-route-graphic">
          <div className="route-endpoints">
            <div className="route-station origin">
              <span className="route-station-name">{train.origin}</span>
              <span className="route-station-code">{train.originCode}</span>
            </div>

            <div className="route-station dest">
              <span className="route-station-name">{train.destination}</span>
              <span className="route-station-code">{train.destinationCode}</span>
            </div>
          </div>

          {/* Animated Track Line */}
          <div className="track-bar-container">
            <div 
              className="track-progress-fill" 
              style={{ width: `${progressPct}%` }}
            ></div>

            <div 
              className="train-position-marker"
              style={{ left: `${progressPct}%` }}
            >
              <div className="train-live-tag">LIVE</div>
              <div className="train-icon-bubble">
                <Train size={18} />
              </div>
            </div>
          </div>

          <div className="route-footer-meta">
            <span>Next station stop</span>
            <span><strong>{train.destination} ({train.destinationCode})</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '1rem' }}>
          <Navigation size={14} color="var(--accent-cyan)" />
          <span>Real-Time GPS & Signal Block Telemetry Active</span>
        </div>
      </div>
    </section>
  );
}
