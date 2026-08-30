import React, { useState } from 'react';
import { Train, CorridorDetail, MapLayersConfig } from '../../types';
import {
  Compass,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertTriangle,
  Flame,
  CloudRain,
  ShieldCheck
} from 'lucide-react';

interface NetworkMapProps {
  trains: Train[];
  corridors?: CorridorDetail[];
  onSelectTrain: (trainId: string) => void;
  onSelectCorridor?: (corridorId: string) => void;
  selectedCorridorId?: string;
  layers?: MapLayersConfig;
  onToggleLayer?: (layerKey: keyof MapLayersConfig) => void;
}

// Major SVG Nodes coordinates across India
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
  { code: 'NGP', name: 'Nagpur JN', x: 46, y: 68, hub: true },
  { code: 'MAS', name: 'Chennai Central', x: 50, y: 88, hub: true },
  { code: 'SBC', name: 'Bengaluru', x: 40, y: 92, hub: true }
];

// Corridor Segments
const CORRIDOR_TRACKS = [
  { id: 'corridor-cnb-pryj', from: 'CNB', to: 'PRYJ', color: '#ef4444', defaultScore: 84, name: 'Kanpur → Prayagraj' },
  { id: 'corridor-mtj-agc', from: 'NDLS', to: 'AGC', color: '#f97316', defaultScore: 65, name: 'Delhi → Agra' },
  { id: 'corridor-ddu-gaya', from: 'DDU', to: 'GAYA', color: '#f59e0b', defaultScore: 68, name: 'DDU → Gaya' },
  { id: 'corridor-bwn-dgr', from: 'DHN', to: 'HWH', color: '#eab308', defaultScore: 55, name: 'Dhanbad → Howrah' },
  { id: 'corridor-st-brc', from: 'ST', to: 'BRC', color: '#10b981', defaultScore: 22, name: 'Surat → Vadodara' },
  { id: 'corridor-delhi-mumbai', from: 'AGC', to: 'KOTA', color: '#10b981', defaultScore: 28, name: 'Agra → Kota' },
  { id: 'corridor-central', from: 'RKMP', to: 'NGP', color: '#10b981', defaultScore: 30, name: 'Bhopal → Nagpur' },
  { id: 'corridor-south', from: 'NGP', to: 'MAS', color: '#10b981', defaultScore: 25, name: 'Nagpur → Chennai' }
];

// Clusters for medium zoom
const CLUSTERS = [
  { id: 'cluster-delhi-ncr', name: 'Northern Zone (NCR/NR)', x: 36, y: 28, count: 18, risk: 'Moderate' },
  { id: 'cluster-eastern-trunk', name: 'Eastern Trunk (CNB-DDU-HWH)', x: 62, y: 48, count: 32, risk: 'Critical' },
  { id: 'cluster-western', name: 'Western Corridor (MMCT-ADI)', x: 22, y: 64, count: 14, risk: 'Normal' },
  { id: 'cluster-central', name: 'Central Transit (BPL-NGP)', x: 42, y: 64, count: 9, risk: 'Normal' }
];

export default function NetworkMap({
  trains,
  corridors,
  onSelectTrain,
  onSelectCorridor,
  selectedCorridorId,
  layers = { liveTrains: true, congestion: true, delayRisk: false, etaImpact: false, weather: false },
  onToggleLayer
}: NetworkMapProps) {
  // Progressive Zoom Levels: 'zoomed_out' (Corridor Heat) | 'medium' (Clusters) | 'zoomed_in' (Individual Trains)
  const [zoomLevel, setZoomLevel] = useState<'zoomed_out' | 'medium' | 'zoomed_in'>('zoomed_in');
  const [hoveredNode, setHoveredNode] = useState<any>(null);

  const getStation = (code: string) => STATIONS.find(s => s.code === code) || { x: 50, y: 50, name: code };

  const handleZoomIn = () => {
    if (zoomLevel === 'zoomed_out') setZoomLevel('medium');
    else if (zoomLevel === 'medium') setZoomLevel('zoomed_in');
  };

  const handleZoomOut = () => {
    if (zoomLevel === 'zoomed_in') setZoomLevel('medium');
    else if (zoomLevel === 'medium') setZoomLevel('zoomed_out');
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[540px]">
      {/* Background Matrix Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Top Map Toolbar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-extrabold tracking-tight text-white font-heading">
              Indian Railway Telemetry & Corridor Density Visualizer
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {zoomLevel === 'zoomed_out' && '● Zoom Level: Regional Corridor Congestion Heatmap'}
            {zoomLevel === 'medium' && '● Zoom Level: Network Fleet Density Clustering'}
            {zoomLevel === 'zoomed_in' && '● Zoom Level: High-Resolution Individual Train Telemetry'}
          </p>
        </div>

        {/* Zoom & Progressive Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom Segmented Control */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setZoomLevel('zoomed_out')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                zoomLevel === 'zoomed_out' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Corridors
            </button>
            <button
              onClick={() => setZoomLevel('medium')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                zoomLevel === 'medium' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Clusters
            </button>
            <button
              onClick={() => setZoomLevel('zoomed_in')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                zoomLevel === 'zoomed_in' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Trains ({trains.length})
            </button>
          </div>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel === 'zoomed_in'}
              className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel === 'zoomed_out'}
              className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main SVG Interactive Map Canvas */}
      <div className="relative w-full h-[400px] sm:h-[440px] flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full preserve-3d">
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="criticalCorridor" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>

          {/* 1. CORRIDOR ROUTE TRACKS */}
          {CORRIDOR_TRACKS.map((track) => {
            const fromSt = getStation(track.from);
            const toSt = getStation(track.to);
            const isSelected = selectedCorridorId === track.id;
            const isCritical = track.defaultScore >= 75;

            return (
              <g
                key={track.id}
                onClick={() => onSelectCorridor && onSelectCorridor(track.id)}
                className="cursor-pointer group"
              >
                {/* Base Thick Heat Line */}
                {layers.congestion && (
                  <line
                    x1={fromSt.x}
                    y1={fromSt.y}
                    x2={toSt.x}
                    y2={toSt.y}
                    stroke={track.color}
                    strokeWidth={isSelected ? '3.5' : isCritical ? '2.5' : '1.8'}
                    strokeOpacity={isSelected ? '0.95' : '0.7'}
                    strokeDasharray={isCritical ? '2 1' : 'none'}
                    className="transition-all duration-300 group-hover:stroke-width-3"
                  />
                )}

                {/* Subtle base track */}
                <line
                  x1={fromSt.x}
                  y1={fromSt.y}
                  x2={toSt.x}
                  y2={toSt.y}
                  stroke="#334155"
                  strokeWidth="0.8"
                  strokeOpacity="0.4"
                />
              </g>
            );
          })}

          {/* 2. MEDIUM ZOOM: CLUSTERS VIEW */}
          {zoomLevel === 'medium' &&
            CLUSTERS.map((cl) => (
              <g
                key={cl.id}
                className="cursor-pointer transition-transform hover:scale-110"
                onMouseEnter={() => setHoveredNode(cl)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <circle
                  cx={cl.x}
                  cy={cl.y}
                  r="7"
                  fill="#1e293b"
                  stroke={cl.risk === 'Critical' ? '#ef4444' : '#3b82f6'}
                  strokeWidth="1.5"
                  filter="url(#glow)"
                />
                <text
                  x={cl.x}
                  y={cl.y + 1}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="3"
                  fontWeight="bold"
                >
                  🚆 × {cl.count}
                </text>
              </g>
            ))}

          {/* 3. ZOOMED IN: INDIVIDUAL TRAIN MARKERS */}
          {zoomLevel === 'zoomed_in' && layers.liveTrains &&
            trains.map((t, idx) => {
              // Interpolate coordinate along its corridor
              const xPos = 20 + ((idx * 13) % 65);
              const yPos = 25 + ((idx * 11) % 55);
              const isDelayed = t.delayMinutes > 15;

              return (
                <g
                  key={t.id}
                  onClick={() => onSelectTrain(t.id)}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredNode({ ...t, isTrain: true })}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <circle
                    cx={xPos}
                    cy={yPos}
                    r="2.5"
                    fill={isDelayed ? '#ef4444' : '#10b981'}
                    stroke="#ffffff"
                    strokeWidth="0.8"
                    className="animate-pulse"
                  />
                  <text
                    x={xPos}
                    y={yPos - 3.5}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize="2.2"
                    fontWeight="bold"
                    className="select-none pointer-events-none"
                  >
                    {t.number || t.id}
                  </text>
                </g>
              );
            })}

          {/* 4. STATION NODES */}
          {STATIONS.map((st) => (
            <g
              key={st.code}
              className="group cursor-pointer"
              onMouseEnter={() => setHoveredNode(st)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <circle
                cx={st.x}
                cy={st.y}
                r={st.hub ? '2.0' : '1.4'}
                fill="#0f172a"
                stroke={st.hub ? '#38bdf8' : '#64748b'}
                strokeWidth={st.hub ? '1.0' : '0.6'}
              />
              <text
                x={st.x}
                y={st.y + 4}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="2.2"
                fontWeight={st.hub ? 'bold' : 'normal'}
                className="select-none pointer-events-none group-hover:fill-white"
              >
                {st.code}
              </text>
            </g>
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredNode && (
          <div className="absolute top-4 left-4 bg-slate-900/95 border border-slate-700 rounded-2xl p-3.5 shadow-2xl z-20 text-xs max-w-xs backdrop-blur-md space-y-1 animate-fadeIn">
            {hoveredNode.isTrain ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-blue-400">{hoveredNode.number}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${hoveredNode.delayMinutes > 15 ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                    {hoveredNode.delayMinutes > 0 ? `+${hoveredNode.delayMinutes}m delay` : 'On Time'}
                  </span>
                </div>
                <p className="font-bold text-white">{hoveredNode.name}</p>
                <p className="text-slate-400 text-[11px]">{hoveredNode.origin} → {hoveredNode.destination}</p>
                <p className="text-cyan-300 font-semibold pt-1 text-[11px]">Speed: {Math.round(hoveredNode.currentSpeed || 90)} km/h</p>
              </>
            ) : hoveredNode.count ? (
              <>
                <p className="font-bold text-white">{hoveredNode.name}</p>
                <p className="text-slate-300">Active Trains: <strong className="text-blue-400">{hoveredNode.count}</strong></p>
                <p className="text-slate-400">Risk Assessment: <strong className="text-amber-400">{hoveredNode.risk}</strong></p>
              </>
            ) : (
              <>
                <p className="font-bold text-white">{hoveredNode.name} ({hoveredNode.code})</p>
                <p className="text-slate-400 text-[11px]">{hoveredNode.hub ? 'Major Railway Trunk Junction Hub' : 'Station Node'}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Map Legend */}
      <div className="relative z-10 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="font-bold text-slate-300">Corridor Pressure:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Normal (0–30)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Moderate (31–60)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span> Critical (61–100)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-medium">
            Click any corridor line to inspect affected trains
          </span>
        </div>
      </div>
    </div>
  );
}
