import { Train, NetworkHotspot, OperationalAlert, DelayFactor } from '../types';
import { INITIAL_TRAINS, NETWORK_HOTSPOTS, OPERATIONAL_ALERTS } from '../data/mockData';

const API_BASE_URL = 'http://localhost:8000/api';

export class MockTrainService {
  private trains: Train[] = [...INITIAL_TRAINS];
  private hotspots: NetworkHotspot[] = [...NETWORK_HOTSPOTS];
  private alerts: OperationalAlert[] = [...OPERATIONAL_ALERTS];

  async getTrains(): Promise<Train[]> {
    try {
      // Try fetching live train status from backend FastAPI
      const res = await fetch(`${API_BASE_URL}/trains/12301/live`);
      if (res.ok) {
        const liveData = await res.json();
        // Enrich first train with live API data
        this.trains[0] = {
          ...this.trains[0],
          currentLocation: liveData.current_station,
          currentSpeed: liveData.speed,
          delayMinutes: liveData.current_delay_minutes,
          lat: liveData.latitude || 38,
          lng: liveData.longitude || 48
        };
      }
    } catch (e) {
      // Fallback to local state if server offline
    }
    return [...this.trains];
  }

  async getTrainById(id: string): Promise<Train | null> {
    const trains = await this.getTrains();
    return trains.find(t => t.id === id || t.number === id) || null;
  }

  async getTrainETA(trainId: string): Promise<{
    trainId: string;
    scheduledEta: string;
    traditionalEta: string;
    aiPredictedEta: string;
    delayMinutes: number;
    confidenceScore: number;
    dataSourceTransparency: {
      is_live_gps: boolean;
      is_estimated: boolean;
      is_simulated: boolean;
      model_type: string;
    };
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/trains/${trainId}/eta`);
      if (res.ok) {
        const data = await res.json();
        return {
          trainId: data.train_id,
          scheduledEta: "18:30",
          traditionalEta: "18:30",
          aiPredictedEta: data.predicted_eta_formatted,
          delayMinutes: data.delay_minutes,
          confidenceScore: Math.round(data.confidence * 100),
          dataSourceTransparency: data.data_source_transparency
        };
      }
    } catch (e) {
      // Fallback
    }

    const train = await this.getTrainById(trainId);
    if (!train) throw new Error(`Train ${trainId} not found`);

    return {
      trainId: train.id,
      scheduledEta: train.scheduledEta,
      traditionalEta: train.traditionalEta,
      aiPredictedEta: train.aiPredictedEta,
      delayMinutes: train.delayMinutes,
      confidenceScore: train.confidenceScore,
      dataSourceTransparency: {
        is_live_gps: true,
        is_estimated: false,
        is_simulated: false,
        model_type: "XGBoost Regressor (eta_xgboost.json)"
      }
    };
  }

  async triggerSimulationEvent(trainId: string, eventType: string, active: boolean) {
    try {
      const res = await fetch(`${API_BASE_URL}/simulation/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ train_id: trainId, event_type: eventType, active })
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  async getPredictionExplanation(trainId: string): Promise<{
    delayFactors: DelayFactor[];
    totalImpact: number;
    confidenceScore: number;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/trains/${trainId}/eta/explanation`);
      if (res.ok) {
        const data = await res.json();
        const delayFactors: DelayFactor[] = data.factors.map((f: any, idx: number) => ({
          id: `f-${idx}`,
          name: f.factor,
          category: f.category,
          impactMinutes: f.impact_minutes,
          type: f.impact_minutes > 0 ? 'delay' : 'gain',
          icon: f.impact_minutes > 0 ? (f.impact_minutes > 10 ? '🔴' : '🟠') : '🟢',
          description: f.category === 'congestion'
            ? 'Track occupancy density on forward route segment'
            : f.category === 'speed_restriction'
            ? 'Caution speed order over track maintenance zone'
            : f.category === 'weather'
            ? 'Rainfall / low visibility regulation'
            : 'Schedule padding buffer recovery'
        }));

        return {
          delayFactors,
          totalImpact: data.total_impact_minutes,
          confidenceScore: Math.round(data.prediction.confidence * 100)
        };
      }
    } catch (e) {
      // Fallback
    }

    const train = await this.getTrainById(trainId);
    if (!train) throw new Error(`Train ${trainId} not found`);
    const totalImpact = train.delayFactors.reduce((acc, df) => acc + df.impactMinutes, 0);

    return {
      delayFactors: train.delayFactors,
      totalImpact,
      confidenceScore: train.confidenceScore
    };
  }
}

export const mockTrainService = new MockTrainService();
