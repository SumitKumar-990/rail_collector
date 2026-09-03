import React, { useState, useMemo } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { StationStop } from '../../types';
import { getStationCoordinate } from '../../data/stationCoordinates';

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

interface ResolvedWaypoint {
  lat: number;
  lng: number;
  code: string;
  name: string;
  distanceKm: number;
  isHalt: boolean;
  isCurrent: boolean;
  isOrigin: boolean;
  isDestination: boolean;
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
  const [activeLayer, setActiveLayer] = useState<'standard' | 'congestion'>('standard');

  const roundedSpeed = Math.round(currentSpeed || 0);
  const roundedDelay = Math.round(currentDelay || 0);
  const roundedCovered = Math.round(distanceCoveredKm || 0);
  const roundedTotal = Math.round(totalDistanceKm || 1);
  const roundedProgress = Math.min(100, Math.max(0, Math.round(journeyProgressPct || (roundedTotal > 0 ? (roundedCovered / roundedTotal) * 100 : 0))));
  const isDelayed = roundedDelay > 5;

  // 1. Resolve real Geographic Waypoints for every station in the route
  const waypoints = useMemo<ResolvedWaypoint[]>(() => {
    if (!stations || stations.length === 0) {
      return [];
    }

    const totalDist = Math.max(1, totalDistanceKm || stations[stations.length - 1]?.distanceFromOrigin || 1000);

    // First pass: attach known coordinates or mark as null
    const initial = stations.map((st, idx) => {
      const dist = st.distanceFromOrigin ?? st.distanceKm ?? (idx * 50);
      let lat = st.latitude;
      let lng = st.longitude;

      if (!lat || !lng || (lat === 19.06 && lng === 73.01 && st.stationCode !== 'MMCT' && st.stationCode !== 'CSMT')) {
        const lookup = getStationCoordinate(st.stationCode);
        if (lookup) {
          lat = lookup.lat;
          lng = lookup.lng;
        }
      }

      return {
        code: st.stationCode || `ST${idx + 1}`,
        name: st.stationName || st.stationCode,
        distanceKm: dist,
        lat: lat ?? null,
        lng: lng ?? null,
        isHalt: st.isHalt !== false,
        isCurrent: st.status === 'AT_STATION' || st.status === 'current',
        isOrigin: idx === 0,
        isDestination: idx === stations.length - 1
      };
    });

    // Second pass: interpolate any missing station coordinates between nearest known anchors
    const resolved: ResolvedWaypoint[] = [];
    for (let i = 0; i < initial.length; i++) {
      const item = initial[i];
      if (item.lat !== null && item.lng !== null) {
        resolved.push({
          ...item,
          lat: item.lat,
          lng: item.lng
        });
        continue;
      }

      // Find prior known anchor
      let prevAnchor: { lat: number; lng: number; dist: number } | null = null;
      for (let p = i - 1; p >= 0; p--) {
        if (initial[p].lat !== null && initial[p].lng !== null) {
          prevAnchor = { lat: initial[p].lat!, lng: initial[p].lng!, dist: initial[p].distanceKm };
          break;
        }
      }

      // Find next known anchor
      let nextAnchor: { lat: number; lng: number; dist: number } | null = null;
      for (let n = i + 1; n < initial.length; n++) {
        if (initial[n].lat !== null && initial[n].lng !== null) {
          nextAnchor = { lat: initial[n].lat!, lng: initial[n].lng!, dist: initial[n].distanceKm };
          break;
        }
      }

      let interpLat = 24.0;
      let interpLng = 80.0;

      if (prevAnchor && nextAnchor) {
        const span = Math.max(1, nextAnchor.dist - prevAnchor.dist);
        const ratio = Math.max(0, Math.min(1, (item.distanceKm - prevAnchor.dist) / span));
        interpLat = prevAnchor.lat + (nextAnchor.lat - prevAnchor.lat) * ratio;
        interpLng = prevAnchor.lng + (nextAnchor.lng - prevAnchor.lng) * ratio;
      } else if (prevAnchor) {
        interpLat = prevAnchor.lat;
        interpLng = prevAnchor.lng + 0.15;
      } else if (nextAnchor) {
        interpLat = nextAnchor.lat;
        interpLng = nextAnchor.lng - 0.15;
      } else {
        const ratio = item.distanceKm / totalDist;
        interpLat = 28.61 - (28.61 - 22.58) * ratio;
        interpLng = 77.20 + (88.34 - 77.20) * ratio;
      }

      resolved.push({
        ...item,
        lat: interpLat,
        lng: interpLng
      });
    }

    return resolved;
  }, [stations, totalDistanceKm]);

  // 2. Synchronize Live Train Marker Position
  const trainPosition = useMemo<{ lat: number; lng: number }>(() => {
    if (waypoints.length === 0) {
      return { lat: latitude || 26.4499, lng: longitude || 80.3319 };
    }

    // Check if input latitude/longitude match within the corridor bounding box
    const minWLat = Math.min(...waypoints.map(w => w.lat)) - 1.5;
    const maxWLat = Math.max(...waypoints.map(w => w.lat)) + 1.5;
    const minWLng = Math.min(...waypoints.map(w => w.lng)) - 1.5;
    const maxWLng = Math.max(...waypoints.map(w => w.lng)) + 1.5;

    const isCoordInsideCorridor =
      latitude &&
      longitude &&
      latitude >= minWLat &&
      latitude <= maxWLat &&
      longitude >= minWLng &&
      longitude <= maxWLng;

    if (isCoordInsideCorridor) {
      return { lat: latitude, lng: longitude };
    }

    // Interpolate along route waypoints according to journey progress
    const progressFraction = Math.max(0, Math.min(1, roundedProgress / 100));
    const totalDist = waypoints[waypoints.length - 1].distanceKm || Math.max(1, totalDistanceKm);
    const targetDist = progressFraction * totalDist;

    // Find segment [i, i+1]
    for (let i = 0; i < waypoints.length - 1; i++) {
      const w1 = waypoints[i];
      const w2 = waypoints[i + 1];
      if (targetDist >= w1.distanceKm && targetDist <= w2.distanceKm) {
        const segLen = Math.max(1, w2.distanceKm - w1.distanceKm);
        const segRatio = (targetDist - w1.distanceKm) / segLen;
        return {
          lat: w1.lat + (w2.lat - w1.lat) * segRatio,
          lng: w1.lng + (w2.lng - w1.lng) * segRatio
        };
      }
    }

    // Fallback to origin or destination waypoint
    if (progressFraction >= 0.99) {
      const last = waypoints[waypoints.length - 1];
      return { lat: last.lat, lng: last.lng };
    }
    const first = waypoints[0];
    return { lat: first.lat, lng: first.lng };
  }, [waypoints, latitude, longitude, roundedProgress, totalDistanceKm]);

  // 3. Dynamic Bounding Box & SVG Vector Projection
  const { toSvgX, toSvgY } = useMemo(() => {
    if (waypoints.length === 0) {
      return {
        toSvgX: (_lng: number) => 400,
        toSvgY: (_lat: number) => 220
      };
    }

    const allLats = waypoints.map(w => w.lat).concat(trainPosition.lat);
    const allLngs = waypoints.map(w => w.lng).concat(trainPosition.lng);

    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);
    const minLng = Math.min(...allLngs);
    const maxLng = Math.max(...allLngs);

    const latSpanRaw = Math.max(0.4, maxLat - minLat);
    const lngSpanRaw = Math.max(0.4, maxLng - minLng);

    // Generous padding so station codes, badges, and radar pulses are never clipped
    const latPad = latSpanRaw * 0.22;
    const lngPad = lngSpanRaw * 0.22;

    const bMinLat = minLat - latPad;
    const bMaxLat = maxLat + latPad;
    const bMinLng = minLng - lngPad;
    const bMaxLng = maxLng + lngPad;

    const totalLatSpan = bMaxLat - bMinLat;
    const totalLngSpan = bMaxLng - bMinLng;

    // ViewBox: 0 0 850 440
    // Usable canvas inner area: X: 80 to 770 (width 690), Y: 60 to 380 (height 320)
    return {
      toSvgX: (lng: number) => 80 + ((lng - bMinLng) / totalLngSpan) * 690,
      toSvgY: (lat: number) => 60 + ((bMaxLat - lat) / totalLatSpan) * 320 // Inverted Y for map
    };
  }, [waypoints, trainPosition]);

  // Generate Traveled vs Remaining Polyline SVG Paths
  const trainSvgX = toSvgX(trainPosition.lng);
  const trainSvgY = toSvgY(trainPosition.lat);

  const fullPathD = useMemo(() => {
    if (waypoints.length < 2) return '';
    return 'M ' + waypoints.map(w => `${toSvgX(w.lng).toFixed(1)},${toSvgY(w.lat).toFixed(1)}`).join(' L ');
  }, [waypoints, toSvgX, toSvgY]);

  // Build traveled path up to train position
  const traveledPathD = useMemo(() => {
    if (waypoints.length < 2) return '';
    const points: string[] = [];
    const totalDist = waypoints[waypoints.length - 1].distanceKm || totalDistanceKm || 1000;
    const trainDist = (roundedProgress / 100) * totalDist;

    for (let i = 0; i < waypoints.length; i++) {
      const w = waypoints[i];
      if (w.distanceKm <= trainDist) {
        points.push(`${toSvgX(w.lng).toFixed(1)},${toSvgY(w.lat).toFixed(1)}`);
      } else {
        break;
      }
    }
    points.push(`${trainSvgX.toFixed(1)},${trainSvgY.toFixed(1)}`);

    return points.length > 1 ? 'M ' + points.join(' L ') : '';
  }, [waypoints, roundedProgress, totalDistanceKm, toSvgX, toSvgY, trainSvgX, trainSvgY]);

  const originStation = waypoints[0];
  const destStation = waypoints[waypoints.length - 1];

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden relative">
      {/* Top Map Action Bar */}
      <div className="bg-slate-950/85 backdrop-blur-md px-5 py-3.5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3 text-white relative z-20">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-heading block">
              Live Route Geometry & GPS Telemetry
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {originStation ? `${originStation.name} (${originStation.code})` : 'Origin'} → {destStation ? `${destStation.name} (${destStation.code})` : 'Destination'}
            </span>
          </div>
          {isDemo && (
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              DEMO / SIMULATION
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Layer switcher */}
          <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800">
            <button
              onClick={() => setActiveLayer('standard')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                activeLayer === 'standard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Route Vector
            </button>
            <button
              onClick={() => setActiveLayer('congestion')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                activeLayer === 'congestion' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Congestion Heat
            </button>
          </div>

          <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
            <RefreshCw className="w-3 h-3 text-cyan-400" />
            {lastUpdated || 'Live Sync'}
          </span>
        </div>
      </div>

      {/* Main Interactive Map Canvas */}
      <div className="relative w-full h-[440px] bg-slate-950 overflow-hidden select-none">
        {/* Subtle Railway Grid Texture */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" />

        {/* SVG Route Geometry Map */}
        <svg viewBox="0 0 850 440" className="w-full h-full relative z-10">
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="trainGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Full Railway Track Base Shadow */}
          {fullPathD && (
            <path
              d={fullPathD}
              fill="none"
              stroke="#0f172a"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 2. Remaining Route Path (Dashed Slate) */}
          {fullPathD && (
            <path
              d={fullPathD}
              fill="none"
              stroke="#334155"
              strokeWidth="4"
              strokeDasharray="6 6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 3. Traveled / Active Route Path (Vibrant Gradient with Glow) */}
          {traveledPathD && (
            <path
              d={traveledPathD}
              fill="none"
              stroke={activeLayer === 'congestion' ? '#f59e0b' : 'url(#routeGradient)'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
          )}

          {/* 4. Station Stop Pins & Badges */}
          {waypoints.map((st, idx) => {
            const x = toSvgX(st.lng);
            const y = toSvgY(st.lat);
            const isSelected = selectedStation?.stationCode === st.code;
            const isEndpoint = st.isOrigin || st.isDestination;

            return (
              <g
                key={`map-st-${st.code}-${idx}`}
                className="cursor-pointer group"
                onClick={() => {
                  const matched = stations.find(s => s.stationCode === st.code);
                  if (matched && onSelectStation) onSelectStation(matched);
                }}
              >
                {/* Station Pin Halo on Hover / Selected */}
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r={14}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    opacity="0.6"
                    className="animate-pulse"
                  />
                )}

                {/* Main Station Marker */}
                <circle
                  cx={x}
                  cy={y}
                  r={isEndpoint ? 7 : (st.isHalt ? 5 : 3.5)}
                  fill={isEndpoint ? '#38bdf8' : (st.isHalt ? '#ffffff' : '#94a3b8')}
                  stroke={isEndpoint ? '#0284c7' : '#0f172a'}
                  strokeWidth={isEndpoint ? 2.5 : 2}
                  className="transition-transform duration-200 group-hover:scale-125"
                />

                {/* Station Code Badge */}
                <g transform={`translate(${x}, ${y + (idx % 2 === 0 ? 18 : -14)})`}>
                  <rect
                    x={-20}
                    y={-8}
                    width={40}
                    height={16}
                    rx={5}
                    fill="#0f172a"
                    stroke={isSelected ? '#38bdf8' : '#334155'}
                    strokeWidth="1"
                    className="group-hover:stroke-white transition"
                  />
                  <text
                    x={0}
                    y={3.5}
                    fill={isSelected ? '#38bdf8' : '#e2e8f0'}
                    fontSize="9.5"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="font-mono tracking-wider group-hover:fill-white select-none pointer-events-none"
                  >
                    {st.code}
                  </text>
                </g>
              </g>
            );
          })}

          {/* 5. Real-Time Train Marker with Radar Pulse Beacon */}
          <g transform={`translate(${trainSvgX}, ${trainSvgY})`} className="transition-all duration-700 ease-out z-30">
            {/* Live Radar Beacon Rings */}
            <circle cx="0" cy="0" r="22" fill="#38bdf8" opacity="0.2" className="animate-ping" />
            <circle cx="0" cy="0" r="14" fill="#0284c7" opacity="0.35" />
            <circle cx="0" cy="0" r="9" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" filter="url(#trainGlow)" />

            {/* Train Emoji / Direction Icon */}
            <text x="0" y="3.5" fill="#ffffff" fontSize="10" textAnchor="middle" fontWeight="bold">
              🚆
            </text>

            {/* Live Speed Tooltip Floating on Train */}
            <g transform="translate(0, -18)">
              <rect
                x={-28}
                y={-12}
                width={56}
                height={16}
                rx={6}
                fill="#0284c7"
                stroke="#ffffff"
                strokeWidth="1"
                className="shadow-lg"
              />
              <text
                x={0}
                y={-1}
                fill="#ffffff"
                fontSize="9"
                fontWeight="bold"
                textAnchor="middle"
                className="font-mono"
              >
                {roundedSpeed > 0 ? `${roundedSpeed} km/h` : 'Stopped'}
              </text>
            </g>
          </g>
        </svg>

        {/* Floating Live Telemetry Overlay Card */}
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-84 bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl p-4 text-white shadow-2xl z-20 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                LIVE GPS TELEMETRY
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-cyan-300 bg-slate-800 px-2 py-0.5 rounded">
              {roundedSpeed > 0 ? `${roundedSpeed} km/h` : 'Station Halt'}
            </span>
          </div>

          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Track Segment</p>
            <h4 className="text-xs font-bold text-slate-100 leading-snug">
              {currentSegment || currentLocation}
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1.5 text-[11px] font-mono border-t border-slate-800/80">
            <div>
              <span className="text-slate-400 block text-[10px]">PROGRESS</span>
              <strong className="text-blue-400 font-bold">{roundedProgress}%</strong> ({roundedCovered}/{roundedTotal} km)
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">DELAY STATUS</span>
              <strong className={`font-bold ${isDelayed ? 'text-amber-400' : 'text-emerald-400'}`}>
                {isDelayed ? `+${roundedDelay} min` : 'On Time'}
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
