import React, { useState } from 'react';
import { Navigation, MapPin, RefreshCw, AlertCircle, Maximize2, Compass, Layers, Activity } from 'lucide-react';
import { StationStop } from '../../types';

interface LiveMapViewProps {
  trainNumber: string;
  trainName: string;
  runningStatus: string;
  currentLocation: string;
  currentSegment?: string;
  currentSpeed: number;
  currentDelay: number;
  latitude: number;
  longitude: number;
  distanceCoveredKm: number;
  totalDistanceKm: number;
  journeyProgressPct: number;
  lastUpdated: string;
  isLive: boolean;
  isDemo?: boolean;
  stations: StationStop[];
  selectedStation?: StationStop | null;
  onSelectStation?: (station: StationStop) => void;
  geoCoordinates?: [number, number][]; // [lng, lat]
}

export default function LiveMapView({
  trainNumber,
  trainName,
  runningStatus,
  currentLocation,
  currentSegment,
  currentSpeed,
  currentDelay,
  latitude,
  longitude,
  distanceCoveredKm,
  totalDistanceKm,
  journeyProgressPct,
  lastUpdated,
  isLive,
  isDemo = false,
  stations = [],
  selectedStation,
  onSelectStation,
  geoCoordinates = []
}: LiveMapViewProps) {
  const [mapZoom, setMapZoom] = useState(1);
  const [activeLayer, setActiveLayer] = useState<'standard' | 'satellite' | 'congestion'>('standard');

  const isDelayed = currentDelay > 5;
  const isRunning = runningStatus.toUpperCase().includes('RUNNING') || runningStatus.toUpperCase().includes('LIVE');

  // Compute bounding box or fallback waypoints from station list if GeoJSON is missing
  const waypoints: { lat: number; lng: number; code: string; name: string; isHalt: boolean; isCurrent: boolean }[] = [];

  if (stations && stations.length > 0) {
    stations.forEach((st, idx) => {
      // Approximate geographic positioning across India / Konkan route if specific coordinates absent
      const pct = (st.distanceFromOrigin || st.distanceKm || idx * 25) / Math.max(1, totalDistanceKm);
      // CSMT (18.94, 72.83) to Madgaon (15.26, 73.97) projection for 10103 Mandovi
      const lat = st.latitude || (18.94 - (18.94 - 15.26) * pct);
      const lng = st.longitude || (72.83 + (73.97 - 72.83) * pct);
      waypoints.push({
        lat,
        lng,
        code: st.stationCode,
        name: st.stationName,
        isHalt: st.isHalt !== false,
        isCurrent: st.status === 'AT_STATION' || st.status === 'current'
      });
    });
  }

  // Calculate SVG ViewBox coordinates for clean vector map rendering
  const minLat = Math.min(15.0, ...waypoints.map(w => w.lat), latitude || 19.0);
  const maxLat = Math.max(19.2, ...waypoints.map(w => w.lat), latitude || 19.0);
  const minLng = Math.min(72.7, ...waypoints.map(w => w.lng), longitude || 73.0);
  const maxLng = Math.max(74.2, ...waypoints.map(w => w.lng), longitude || 73.0);

  const latSpan = Math.max(0.5, maxLat - minLat);
  const lngSpan = Math.max(0.5, maxLng - minLng);

  const toSvgX = (lng: number) => {
    return 50 + ((lng - minLng) / lngSpan) * 700;
  };
  const toSvgY = (lat: number) => {
    // Invert Y axis for map
    return 50 + ((maxLat - lat) / latSpan) * 350;
  };

  // Train SVG coordinate
  const trainX = toSvgX(longitude || 73.01);
  const trainY = toSvgY(latitude || 19.06);

  // Completed vs Remaining Polyline SVG Path
  const fullPolylinePoints = waypoints.map(w => `${toSvgX(w.lng)},${toSvgY(w.lat)}`).join(' L ');
  const pathD = waypoints.length > 1 ? `M ${fullPolylinePoints}` : `M 50,200 L 750,200`;

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden relative">
      {/* Top Map Action Bar */}
      <div className="bg-slate-950/80 backdrop-blur-md px-5 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-white relative z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-heading">
            Live Route Geometry & GPS Telemetry
          </span>
          {isDemo && (
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              DEMO / SIMULATION MODE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Layer switchers */}
          <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800">
            <button
              onClick={() => setActiveLayer('standard')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
                activeLayer === 'standard' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Route Vector
            </button>
            <button
              onClick={() => setActiveLayer('congestion')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
                activeLayer === 'congestion' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Congestion
            </button>
          </div>

          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            <RefreshCw className="w-3 h-3 text-slate-500" />
            {lastUpdated || 'Just now'}
          </span>
        </div>
      </div>

      {/* Main Interactive Map Canvas */}
      <div className="relative w-full h-[380px] bg-slate-950 overflow-hidden select-none">
        {/* Grid Background Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

        {/* SVG Route Geometry Map */}
        <svg viewBox="0 0 800 450" className="w-full h-full relative z-10">
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Route Path Shadow */}
          <path
            d={pathD}
            fill="none"
            stroke="#0f172a"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Remaining Route (Dashed) */}
          <path
            d={pathD}
            fill="none"
            stroke="#334155"
            strokeWidth="4"
            strokeDasharray="6 6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Traveled Route */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Station Stop Pins along route */}
          {waypoints.map((st, idx) => {
            const x = toSvgX(st.lng);
            const y = toSvgY(st.lat);
            const isSelected = selectedStation?.stationCode === st.code;

            return (
              <g
                key={`map-st-${st.code}-${idx}`}
                className="cursor-pointer group"
                onClick={() => {
                  const matched = stations.find(s => s.stationCode === st.code);
                  if (matched && onSelectStation) onSelectStation(matched);
                }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 6 : (st.isHalt ? 4 : 2.5)}
                  fill={isSelected ? '#38bdf8' : (st.isHalt ? '#ffffff' : '#64748b')}
                  stroke={isSelected ? '#0284c7' : '#1e293b'}
                  strokeWidth="2"
                  className="transition-all duration-300 hover:scale-150"
                />
                {st.isHalt && (
                  <text
                    x={x}
                    y={y + 14}
                    fill="#94a3b8"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="font-mono tracking-tight group-hover:fill-white transition"
                  >
                    {st.code}
                  </text>
                )}
              </g>
            );
          })}

          {/* Current Live Train Marker */}
          <g transform={`translate(${trainX}, ${trainY})`} className="transition-all duration-700 ease-out z-30">
            {/* Radar Pulse Rings */}
            <circle cx="0" cy="0" r="18" fill="#3b82f6" opacity="0.2" className="animate-ping" />
            <circle cx="0" cy="0" r="12" fill="#3b82f6" opacity="0.4" />
            <circle cx="0" cy="0" r="8" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
            <text x="0" y="3" fill="#ffffff" fontSize="9" textAnchor="middle" fontWeight="bold">
              🚆
            </text>
          </g>
        </svg>

        {/* Floating Live Telemetry Overlay Card */}
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-80 bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 text-white shadow-2xl z-20 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                LIVE TELEMETRY
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {currentSpeed > 0 ? `${Math.round(currentSpeed)} km/h` : 'Stopped'}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Current Segment</p>
            <h4 className="text-xs font-bold text-slate-100 leading-snug">
              {currentSegment || currentLocation}
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono border-t border-slate-800/80">
            <div>
              <span className="text-slate-400 block text-[10px]">JOURNEY PROGRESS</span>
              <strong className="text-blue-400 font-bold">{journeyProgressPct}%</strong> ({Math.round(distanceCoveredKm)}/{Math.round(totalDistanceKm)} km)
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">CURRENT DELAY</span>
              <strong className={`font-bold ${isDelayed ? 'text-amber-400' : 'text-emerald-400'}`}>
                {isDelayed ? `+${currentDelay} min` : 'On Time'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Offline / Unavailable Warning Banner */}
      {!isLive && (
        <div className="bg-amber-950/90 border-t border-amber-800/80 px-4 py-2 text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>LIVE DATA UNAVAILABLE — Displaying latest cached route telemetry</span>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase bg-amber-900 px-2 py-0.5 rounded text-amber-300">
            Timetable Mode
          </span>
        </div>
      )}
    </div>
  );
}
