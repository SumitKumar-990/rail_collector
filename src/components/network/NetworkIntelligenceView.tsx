import React from 'react';
import { NetworkHotspot } from '../../types';
import { NETWORK_HOTSPOTS } from '../../data/mockData';
import { Network, Activity, AlertOctagon, ShieldAlert, ArrowRight, Layers } from 'lucide-react';

export default function NetworkIntelligenceView() {
  const healthScore = 82;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold font-mono uppercase tracking-wider mb-2">
            <Network className="w-3.5 h-3.5" />
            <span>Corridor Telemetry & Bottleneck Monitor</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight font-heading">
            Network Intelligence & Congestion Monitor
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Real-time track occupancy analysis, corridor health scoring, and active junction bottleneck detection.
          </p>
        </div>
      </div>

      {/* TOP SECTION: HEALTH SCORE & CORRIDOR HEATMAP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Health Score (1 Col) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Overall Network Health Score
          </span>

          {/* Radial Circular Meter */}
          <div className="relative w-44 h-44 my-3 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle cx="88" cy="88" r="72" fill="none" stroke="#f1f5f9" strokeWidth="14" />
              <circle
                cx="88"
                cy="88"
                r="72"
                fill="none"
                stroke="#10b981"
                strokeWidth="14"
                strokeDasharray="452.39"
                strokeDashoffset={452.39 * (1 - healthScore / 100)}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-black font-mono text-slate-900">{healthScore}</span>
              <span className="text-xs font-bold text-slate-400">out of 100</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Status: Moderate Congestion
          </div>
          <p className="text-xs text-slate-500 mt-3 max-w-xs">
            82% of trunk lines operating within normal headway parameters. 3 active bottlenecks flagged.
          </p>
        </div>

        {/* Route Congestion Heatmap (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">Trunk Corridor Heatmap Visualizer</h3>
                <p className="text-xs text-slate-500">Real-time corridor density & delay risk index</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold font-mono">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Low</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400"></span> Moderate</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-500"></span> High</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-600"></span> Critical</span>
              </div>
            </div>

            {/* Heatmap Corridor Segments */}
            <div className="space-y-3">
              {/* Segment 1 */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <span>Delhi → Kanpur Trunk (NCR Zone)</span>
                  <span className="font-mono text-rose-600 font-extrabold">Critical (28m avg delay)</span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                  <div className="w-[20%] bg-emerald-500 h-full"></div>
                  <div className="w-[30%] bg-amber-400 h-full"></div>
                  <div className="w-[50%] bg-rose-600 h-full animate-pulse"></div>
                </div>
              </div>

              {/* Segment 2 */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <span>Kanpur → Prayagraj → Gaya (Grand Chord)</span>
                  <span className="font-mono text-orange-600 font-extrabold">High (22m avg delay)</span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                  <div className="w-[40%] bg-emerald-500 h-full"></div>
                  <div className="w-[40%] bg-orange-500 h-full"></div>
                  <div className="w-[20%] bg-amber-400 h-full"></div>
                </div>
              </div>

              {/* Segment 3 */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <span>Mumbai → Surat → Ahmedabad (WR Zone)</span>
                  <span className="font-mono text-emerald-600 font-extrabold">Low (4m avg delay)</span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                  <div className="w-[85%] bg-emerald-500 h-full"></div>
                  <div className="w-[15%] bg-amber-400 h-full"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Corridor Sensor Density: <strong>98.4% Operational</strong></span>
            <span className="font-mono text-slate-400">Updated: Just now</span>
          </div>
        </div>
      </div>

      {/* CONGESTION HOTSPOTS CARDS */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">Active Congestion Hotspots</h3>
            <p className="text-xs text-slate-500">Junction segments experiencing significant operational headway delays</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {NETWORK_HOTSPOTS.map(hotspot => (
            <div
              key={hotspot.id}
              className="p-5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-500">
                  {hotspot.zone} Zone
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono ${
                    hotspot.congestionLevel === 'Critical'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : hotspot.congestionLevel === 'High'
                      ? 'bg-orange-100 text-orange-800 border border-orange-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {hotspot.congestionLevel} Congestion
                </span>
              </div>

              <div>
                <h4 className="text-sm font-black text-slate-900">{hotspot.sectionName}</h4>
                <p className="text-xs text-slate-500 font-medium">{hotspot.corridor}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Average Delay</span>
                  <strong className="font-mono font-bold text-rose-600 text-sm">+{hotspot.avgDelayMinutes} min</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Impacted Trains</span>
                  <strong className="font-mono font-bold text-slate-800 text-sm">{hotspot.affectedTrainsCount} trains</strong>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200/60 font-medium italic">
                Reason: {hotspot.primaryCause}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
