import { useState, useEffect, useCallback, useMemo } from 'react';
import { Train, SimulationState } from '../types';
import { INITIAL_TRAINS } from '../data/mockData';
import { mockTrainService } from '../services/mockTrainService';

export function useLiveTrainData() {
  const [trains, setTrains] = useState<Train[]>(INITIAL_TRAINS);
  const [selectedTrainId, setSelectedTrainId] = useState<string>('12301');
  const [simulationState, setSimulationState] = useState<SimulationState>({
    rain: false,
    congestion: false,
    signal: false,
    recovery: false,
    simulationSpeed: 1,
    lastTickTimestamp: new Date().toLocaleTimeString()
  });
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  const selectedTrain = useMemo(() => {
    return trains.find(t => t.id === selectedTrainId) || trains[0];
  }, [trains, selectedTrainId]);

  // Handle Event Toggles with backend FastAPI synchronization
  const toggleEvent = useCallback((eventKey: 'rain' | 'congestion' | 'signal' | 'recovery') => {
    setSimulationState(prev => {
      const nextValue = !prev[eventKey];
      let msg = '';
      if (eventKey === 'rain') {
        msg = nextValue ? '🌧 Torrential Rain Simulation Enabled (+8m ETA impact)' : 'Rain condition cleared';
      } else if (eventKey === 'congestion') {
        msg = nextValue ? '🚦 Junction Congestion Injected (+12m ETA impact)' : 'Congestion cleared';
      } else if (eventKey === 'signal') {
        msg = nextValue ? '🚨 Signal Clearance Interlock Triggered (+15m ETA impact)' : 'Signal cleared';
      } else if (eventKey === 'recovery') {
        msg = nextValue ? '⚡ Green Corridor Priority Activated (-10m ETA recovery)' : 'Priority override disabled';
      }
      setToastNotification(msg);

      // Trigger FastAPI simulation endpoint
      mockTrainService.triggerSimulationEvent(selectedTrainId, eventKey, nextValue);

      return { ...prev, [eventKey]: nextValue };
    });
  }, [selectedTrainId]);

  const resetSimulation = useCallback(() => {
    setSimulationState({
      rain: false,
      congestion: false,
      signal: false,
      recovery: false,
      simulationSpeed: 1,
      lastTickTimestamp: new Date().toLocaleTimeString()
    });
    mockTrainService.triggerSimulationEvent(selectedTrainId, 'reset', true);
    setTrains(INITIAL_TRAINS);
    setToastNotification('Live telemetry reset to standard XGBoost AI baseline model.');
  }, [selectedTrainId]);

  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => setToastNotification(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  // Live telemetry fetch & ticker
  useEffect(() => {
    const fetchLatestEta = async () => {
      try {
        const etaRes = await mockTrainService.getTrainETA(selectedTrainId);
        const explanationRes = await mockTrainService.getPredictionExplanation(selectedTrainId);

        setTrains(prevTrains => {
          return prevTrains.map(t => {
            if (t.id === selectedTrainId) {
              return {
                ...t,
                aiPredictedEta: etaRes.aiPredictedEta,
                remainingTravelTimeMinutes: etaRes.remainingTravelTimeMinutes,
                delayMinutes: etaRes.delayMinutes,
                confidenceScore: etaRes.confidenceScore,
                dataQuality: etaRes.dataQuality,
                dataSourceTransparency: etaRes.dataSourceTransparency,
                delayFactors: explanationRes.delayFactors.length > 0 ? explanationRes.delayFactors : t.delayFactors,
                lastUpdated: 'Just now'
              };
            }
            return t;
          });
        });
      } catch (e) {
        // Fallback
      }
    };

    fetchLatestEta();
    const interval = setInterval(() => {
      fetchLatestEta();
      setSimulationState(prev => ({
        ...prev,
        lastTickTimestamp: new Date().toLocaleTimeString()
      }));
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedTrainId, simulationState.rain, simulationState.congestion, simulationState.signal, simulationState.recovery]);

  return {
    trains,
    selectedTrain,
    selectedTrainId,
    setSelectedTrainId,
    simulationState,
    toggleEvent,
    resetSimulation,
    toastNotification
  };
}
