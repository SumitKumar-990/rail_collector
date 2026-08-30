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
  const [activeTrain, setActiveTrain] = useState<Train | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Dynamically load any train from the 11,113+ dataset when selected
  useEffect(() => {
    let isMounted = true;
    const existing = trains.find(t => t.id === selectedTrainId || t.number === selectedTrainId);
    if (!existing && selectedTrainId) {
      mockTrainService.getTrainDetails(selectedTrainId).then(fetched => {
        if (isMounted && fetched) {
          setActiveTrain(fetched);
          setTrains(prev => {
            if (!prev.some(t => t.id === fetched.id || t.number === fetched.number)) {
              return [...prev, fetched];
            }
            return prev;
          });
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [selectedTrainId, trains]);

  const selectedTrain = useMemo(() => {
    return trains.find(t => t.id === selectedTrainId || t.number === selectedTrainId) || activeTrain || trains[0];
  }, [trains, selectedTrainId, activeTrain]);

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
    setToastNotification('Live telemetry reset to standard XGBoost AI baseline model.');
  }, [selectedTrainId]);

  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => setToastNotification(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  // PRIORITY 1: Multi-Train Live Telemetry Synchronization
  useEffect(() => {
    const fetchFleetData = async () => {
      try {
        const fleetList = await mockTrainService.getTrains();
        if (fleetList && fleetList.length > 0) {
          setTrains(fleetList);
        }
      } catch (e) {
        // Fallback
      }
    };

    fetchFleetData();
    const interval = setInterval(() => {
      fetchFleetData();
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
