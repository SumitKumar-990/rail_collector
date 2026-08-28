import React from 'react';
import { MapPin, Gauge, CloudRain, TrafficCone } from 'lucide-react';

export default function CurrentConditions({ currentLocation, currentSpeed, weather, trackStatus }) {
  return (
    <section className="conditions-section">
      {/* 1. Current Location */}
      <div className="condition-card">
        <div className="condition-icon-box">
          <MapPin size={20} />
        </div>
        <div className="condition-details">
          <span className="condition-label">Current Location</span>
          <span className="condition-value">{currentLocation}</span>
        </div>
      </div>

      {/* 2. Current Speed */}
      <div className="condition-card">
        <div className="condition-icon-box">
          <Gauge size={20} />
        </div>
        <div className="condition-details">
          <span className="condition-label">Current Speed</span>
          <span className="condition-value">{currentSpeed}</span>
        </div>
      </div>

      {/* 3. Weather */}
      <div className="condition-card">
        <div className="condition-icon-box">
          <CloudRain size={20} />
        </div>
        <div className="condition-details">
          <span className="condition-label">Weather</span>
          <span className="condition-value">{weather}</span>
        </div>
      </div>

      {/* 4. Track Status */}
      <div className="condition-card">
        <div className="condition-icon-box">
          <TrafficCone size={20} />
        </div>
        <div className="condition-details">
          <span className="condition-label">Track Status</span>
          <span className="condition-value">{trackStatus}</span>
        </div>
      </div>
    </section>
  );
}
