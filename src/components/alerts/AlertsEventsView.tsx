import React, { useState } from 'react';
import { OPERATIONAL_ALERTS } from '../../data/mockData';
import { OperationalAlert } from '../../types';
import { BellRing, ShieldAlert, CloudRain, AlertTriangle, CheckCircle, Clock, MapPin, Layers } from 'lucide-react';

export default function AlertsEventsView() {
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredAlerts = OPERATIONAL_ALERTS.filter(alert => {
    if (filterCategory === 'all') return true;
    return alert.category === filterCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-bold font-mono uppercase tracking-wider mb-2">
            <BellRing className="w-3.5 h-3.5" />
            <span>Real-Time Network Operational Events</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight font-heading">
            Alerts & Disruption Events
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Live operational notices affecting train timetables, caution speed orders, weather cautions, and signaling holds.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterCategory === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Alerts ({OPERATIONAL_ALERTS.length})
          </button>
          <button
            onClick={() => setFilterCategory('critical')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
              filterCategory === 'critical' ? 'bg-rose-600 text-white' : 'text-rose-400 hover:bg-slate-800'
            }`}
          >
            🔴 Critical
          </button>
          <button
            onClick={() => setFilterCategory('operational')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
              filterCategory === 'operational' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:bg-slate-800'
            }`}
          >
            🟠 Operational
          </button>
          <button
            onClick={() => setFilterCategory('weather')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
              filterCategory === 'weather' ? 'bg-blue-600 text-white' : 'text-cyan-400 hover:bg-slate-800'
            }`}
          >
            🔵 Weather
          </button>
        </div>
      </div>

      {/* ALERTS CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAlerts.map(alert => (
          <div
            key={alert.id}
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
          >
            <div>
              {/* Card Top Severity */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                    alert.severity === 'critical'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : alert.severity === 'warning'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      alert.severity === 'critical'
                        ? 'bg-rose-600 animate-ping'
                        : alert.severity === 'warning'
                        ? 'bg-amber-600'
                        : 'bg-blue-600'
                    }`}
                  ></span>
                  {alert.category} alert
                </span>

                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{alert.timestamp}</span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-slate-900 font-heading mb-1">{alert.title}</h3>
              <p className="text-xs text-slate-600 mb-4">{alert.description}</p>

              {/* Meta details */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Location</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{alert.location}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Affected Route</span>
                  <span className="font-semibold text-slate-800 truncate block mt-0.5">{alert.affectedRoute}</span>
                </div>
              </div>
            </div>

            {/* Bottom Impact Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Expected ETA Impact</span>
                <strong
                  className={`font-mono font-bold ${
                    alert.severity === 'critical' ? 'text-rose-600' : 'text-amber-600'
                  }`}
                >
                  {alert.expectedImpact}
                </strong>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-semibold">Impacted Trains</span>
                <strong className="font-mono font-bold text-slate-800">{alert.affectedTrainsCount} trains</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
