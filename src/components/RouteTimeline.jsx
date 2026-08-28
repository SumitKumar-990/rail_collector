import React from 'react';
import { Check, Train } from 'lucide-react';

export default function RouteTimeline({ timeline, liveEta }) {
  return (
    <section className="timeline-section">
      <div className="timeline-header">
        <h3 className="timeline-title">Route & Station Timeline</h3>
      </div>

      <div className="timeline-track-wrapper">
        {timeline.map((station, index) => {
          const isLast = index === timeline.length - 1;
          const displayEta = station.isActive ? liveEta : station.eta;

          return (
            <div 
              className={`timeline-station-node ${station.isActive ? 'active' : ''}`}
              key={station.code}
            >
              {!isLast && (
                <div 
                  className={`timeline-connector ${station.isCompleted ? 'completed' : ''}`}
                ></div>
              )}

              <div 
                className={`timeline-node-circle ${
                  station.isCompleted ? 'completed' : station.isActive ? 'active' : ''
                }`}
              >
                {station.isCompleted ? (
                  <Check size={14} />
                ) : station.isActive ? (
                  <Train size={16} />
                ) : (
                  index + 1
                )}
              </div>

              <span className="timeline-station-name">{station.name}</span>
              <span className="timeline-station-eta">
                {station.isActive ? `ETA ${displayEta}` : station.isCompleted ? station.eta : `ETA ${displayEta}`}
              </span>
              <span className="timeline-station-status">
                {station.status}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
