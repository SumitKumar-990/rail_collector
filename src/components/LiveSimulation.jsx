import React from 'react';
import { CloudRain, TrafficCone, AlertTriangle, Zap, RotateCcw, Activity } from 'lucide-react';

export default function LiveSimulation({ activeEvents, onToggleEvent, onReset, activeToastMessage }) {
  return (
    <section className="simulation-section">
      <div className="sim-header">
        <div className="sim-title-group">
          <h3>
            <Activity size={20} color="var(--accent-cyan)" />
            Test Live Conditions
          </h3>
          <p>See how the AI ETA adapts in real-time to railway events.</p>
        </div>

        <div className="sim-controls-row">
          {/* Rain Button */}
          <button
            className={`sim-btn ${activeEvents.rain ? 'active' : ''}`}
            onClick={() => onToggleEvent('rain')}
            id="sim-btn-rain"
          >
            <CloudRain size={16} />
            🌧 Rain
          </button>

          {/* Congestion Button */}
          <button
            className={`sim-btn ${activeEvents.congestion ? 'active' : ''}`}
            onClick={() => onToggleEvent('congestion')}
            id="sim-btn-congestion"
          >
            <TrafficCone size={16} />
            🚦 Congestion
          </button>

          {/* Signal Delay Button */}
          <button
            className={`sim-btn ${activeEvents.signal ? 'active' : ''}`}
            onClick={() => onToggleEvent('signal')}
            id="sim-btn-signal"
          >
            <AlertTriangle size={16} />
            🚨 Signal Delay
          </button>

          {/* Speed Recovery Button */}
          <button
            className={`sim-btn ${activeEvents.recovery ? 'active' : ''}`}
            onClick={() => onToggleEvent('recovery')}
            id="sim-btn-recovery"
          >
            <Zap size={16} />
            ⚡ Speed Recovery
          </button>

          {/* Reset Button */}
          <button
            className="sim-btn reset-btn"
            onClick={onReset}
            id="sim-btn-reset"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* Dynamic Toast Feedback */}
      {activeToastMessage && (
        <div className="sim-toast">
          <Activity size={16} />
          <span>{activeToastMessage}</span>
        </div>
      )}
    </section>
  );
}
