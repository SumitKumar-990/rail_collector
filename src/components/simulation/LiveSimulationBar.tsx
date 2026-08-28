import React from 'react';
import { SimulationState } from '../../types';
import { CloudRain, TrafficCone, AlertTriangle, Zap, RotateCcw, Activity } from 'lucide-react';

interface LiveSimulationBarProps {
  simulationState: SimulationState;
  onToggleEvent: (eventKey: 'rain' | 'congestion' | 'signal' | 'recovery') => void;
  onReset: () => void;
  toastMessage: string | null;
}

export default function LiveSimulationBar({
  simulationState,
  onToggleEvent,
  onReset,
  toastMessage
}: LiveSimulationBarProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 select-none max-w-full">
      {/* Toast Notification Alert Banner */}
      {toastMessage && (
        <div className="bg-slate-900 border border-cyan-400/40 text-cyan-300 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs font-bold font-mono animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Simulation Engine Panel */}
      <div className="bg-slate-900/95 border border-slate-800 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center gap-3 text-white text-xs">
        <div className="text-left border-b sm:border-b-0 sm:border-r border-slate-800 pb-2 sm:pb-0 sm:pr-4">
          <div className="text-xs font-black text-white font-heading flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Test Live Conditions</span>
          </div>
          <div className="text-[10px] text-slate-400">See how the AI ETA adapts to events</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 🌧 Rain */}
          <button
            onClick={() => onToggleEvent('rain')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 border text-xs ${
              simulationState.rain
                ? 'bg-blue-600/30 border-blue-400 text-cyan-300 shadow-md shadow-blue-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>🌧 Rain</span>
          </button>

          {/* 🚦 Congestion */}
          <button
            onClick={() => onToggleEvent('congestion')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 border text-xs ${
              simulationState.congestion
                ? 'bg-amber-600/30 border-amber-400 text-amber-300 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <TrafficCone className="w-3.5 h-3.5" />
            <span>🚦 Congestion</span>
          </button>

          {/* 🚨 Signal Delay */}
          <button
            onClick={() => onToggleEvent('signal')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 border text-xs ${
              simulationState.signal
                ? 'bg-rose-600/30 border-rose-400 text-rose-300 shadow-md shadow-rose-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>🚨 Signal Delay</span>
          </button>

          {/* ⚡ Speed Recovery */}
          <button
            onClick={() => onToggleEvent('recovery')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 border text-xs ${
              simulationState.recovery
                ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ Speed Recovery</span>
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs"
            title="Reset Simulation Baseline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
}
