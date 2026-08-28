import React, { useState } from 'react';
import { Train } from '../../types';
import { ShieldCheck, Info, Compass, ArrowUpRight } from 'lucide-react';

interface NetworkMapProps {
  trains: Train[];
  onSelectTrain: (trainId: string) => void;
  onNavigateToDetails: () => void;
}

// Major SVG Nodes coordinates (scale 0-100 x, 0-100 y)
const STATIONS = [
  { code: 'NDLS', name: 'New Delhi', x: 30, y: 22, hub: true },
  { code: 'AGC', name: 'Agra Cantt', x: 34, y: 32, hub: false },
  { code: 'CNB', name: 'Kanpur Central', x: 42, y: 38, hub: true },
  { code: 'PRYJ', name: 'Prayagraj JN', x: 50, y: 44, hub: true },
  { code: 'DDU', name: 'Pt DD Upadhyaya', x: 58, y: 48, hub: true },
  { code: 'GAYA', name: 'Gaya JN', x: 68, y: 52, hub: false },
  { code: 'DHN', name: 'Dhanbad JN', x: 76, y: 56, hub: true },
  { code: 'HWH', name: 'Howrah JN', x: 86, y: 62, hub: true },
  { code: 'MMCT', name: 'Mumbai Central', x: 18, y: 72, hub: true },
  { code: 'ST', name: 'Surat', x: 22, y: 62, hub: false },
  { code: 'BRC', name: 'Vadodara JN', x: 24, y: 54, hub: false },
  { code: 'KOTA', name: 'Kota JN', x: 28, y: 42, hub: false },
  { code: 'RKMP', name: 'Bhopal (RKMP)', x: 38, y: 58, hub: true },
  { code: 'NGP', name: 'Nagpur JN', x: 46, y: 68, hub: true }
];

// Corridor connection lines
const ROUTES = [
  // Delhi - Kolkata Trunk
  { from: 'NDLS', to: 'AGC' },
  { from: 'AGC', to: 'CNB' },
  { from: 'CNB', to: 'PRYJ' },
  { from: 'PRYJ', to: 'DDU' },
  { from: 'DDU', to: 'GAYA' },
  { from: 'GAYA', to: 'DHN' },
  { from: 'DHN', to: 'HWH' },
  // Delhi - Mumbai Line
  { from: 'NDLS', to: 'KOTA' },
  { from: 'KOTA', to: 'BRC' },
  { from: 'BRC', to: 'ST' },
  { from: 'ST', to: 'MMCT' },
  // Central Line
  { from: 'AGC', to: 'RKMP' },
  { from: 'RKMP', to: 'NGP' },
  { from: 'CNB', to: 'RKMP' }
];

export default function NetworkMap({ trains, onSelectTrain, onNavigateToDetails }: NetworkMapProps) {
  const [hoveredTrain, setHoveredTrain] = useState<Train | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'on_time' | 'delayed' | 'critical'>('all');

  const filteredTrains = trains.filter(t => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'on_time') return t.status === 'on_time';
    if (activeFilter === 'delayed') return t.status === 'delayed';
    if (activeFilter === 'critical') return t.status === 'critical';
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[460px]">
      {/* Map Header & Legend */}
      <div className="flex items-center justify-between z-10 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold tracking-tight text-white font-heading">
              Indian Railways Telemetry Network Visualizer
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Active high-speed corridors & live ML position estimates
          </p>
        </div>

        {/* Legend & Filter Bar */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({trains.length})
          </button>
          <button
            onClick={() => setActiveFilter('on_time')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition ${
              activeFilter === 'on_time'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-400 hover:bg-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> On Time
          </button>
          <button
            onClick={() => setActiveFilter('delayed')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition ${
              activeFilter === 'delayed'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-400 hover:bg-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> Delayed
          </button>
          <button
            onClick={() => setActiveFilter('critical')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition ${
              activeFilter === 'critical'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-400 hover:bg-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span> Critical
          </button>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div className="relative w-full h-[360px] my-2 bg-slate-950/40 rounded-xl border border-slate-800/80 overflow-hidden">
        {/* Subtle Map Grid lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>

        <svg viewBox="0 0 100 80" className="w-full h-full">
          {/* Corridor Connection Lines */}
          {ROUTES.map((route, i) => {
            const start = STATIONS.find(s => s.code === route.from);
            const end = STATIONS.find(s => s.code === route.to);
            if (!start || !end) return null;
            return (
              <line
                key={i}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="#334155"
                strokeWidth="0.75"
                strokeDasharray="1 1"
              />
            );
          })}

          {/* Station Node Circles */}
          {STATIONS.map(st => (
            <g key={st.code}>
              <circle
                cx={st.x}
                cy={st.y}
                r={st.hub ? 1.8 : 1.2}
                fill={st.hub ? '#0284c7' : '#475569'}
                stroke="#0f172a"
                strokeWidth="0.5"
              />
              <text
                x={st.x}
                y={st.y + (st.hub ? 3.5 : 3)}
                textAnchor="middle"
                className="text-[2.2px] font-bold fill-slate-400 tracking-wider font-mono select-none"
              >
                {st.code}
              </text>
            </g>
          ))}

          {/* Moving Live Train Markers */}
          {filteredTrains.map(train => {
            const isHovered = hoveredTrain?.id === train.id;

            // Status color matching
            let markerColor = '#10b981'; // green
            if (train.status === 'delayed') markerColor = '#f59e0b'; // amber
            if (train.status === 'critical') markerColor = '#ef4444'; // red

            return (
              <g
                key={train.id}
                onClick={() => {
                  onSelectTrain(train.id);
                  onNavigateToDetails();
                }}
                onMouseEnter={() => setHoveredTrain(train)}
                onMouseLeave={() => setHoveredTrain(null)}
                className="cursor-pointer transition-transform duration-200"
              >
                {/* Glowing Pulse outer ring */}
                <circle
                  cx={train.lng}
                  cy={train.lat}
                  r={isHovered ? 4.5 : 3.2}
                  fill={markerColor}
                  fillOpacity="0.25"
                  className="animate-pulse"
                />

                {/* Train Center Dot */}
                <circle
                  cx={train.lng}
                  cy={train.lat}
                  r={isHovered ? 2.2 : 1.6}
                  fill={markerColor}
                  stroke="#ffffff"
                  strokeWidth="0.5"
                />

                {/* Train Number Label tag above */}
                <text
                  x={train.lng}
                  y={train.lat - 2.8}
                  textAnchor="middle"
                  className={`text-[2.3px] font-black font-mono select-none ${
                    isHovered ? 'fill-cyan-300' : 'fill-white'
                  }`}
                >
                  {train.number}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay Card */}
        {hoveredTrain && (
          <div className="absolute top-4 right-4 bg-slate-900/95 border border-cyan-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-md w-72 z-20 text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
                  {hoveredTrain.number}
                </span>
                <h4 className="font-bold text-white text-sm leading-tight">{hoveredTrain.name}</h4>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  hoveredTrain.status === 'on_time'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : hoveredTrain.status === 'delayed'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {hoveredTrain.delayMinutes === 0 ? 'On Time' : `+${hoveredTrain.delayMinutes} min`}
              </span>
            </div>

            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Current Position:</span>
                <strong className="text-white font-semibold">{hoveredTrain.currentLocation}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Speed:</span>
                <strong className="text-cyan-300 font-mono">{hoveredTrain.currentSpeed} km/h</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Next Station:</span>
                <strong className="text-white">{hoveredTrain.nextStation}</strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">AI Predicted ETA:</span>
                <strong className="text-emerald-400 font-mono font-bold">{hoveredTrain.aiPredictedEta}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[11px]">AI Confidence:</span>
                <span className="font-bold font-mono text-cyan-300 text-xs">
                  {hoveredTrain.confidenceScore}% High
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                onSelectTrain(hoveredTrain.id);
                onNavigateToDetails();
              }}
              className="w-full mt-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition"
            >
              <span>View Full Train Timeline</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Map Bottom Footer Meta */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Real-time GPS + Signal Interlock Feed Connected</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Interactive Node Map • Click marker to inspect
        </div>
      </div>
    </div>
  );
}
