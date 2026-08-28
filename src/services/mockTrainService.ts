import { Train, NetworkHotspot, OperationalAlert, DelayFactor, DataQualityScore, DataSourceTransparency, ModelPredictions, DatasetMetadata } from '../types';
import { INITIAL_TRAINS, NETWORK_HOTSPOTS, OPERATIONAL_ALERTS } from '../data/mockData';

const API_BASE_URL = 'http://localhost:8000/api';

export class MockTrainService {
  private trains: Train[] = [...INITIAL_TRAINS];
  private hotspots: NetworkHotspot[] = [...NETWORK_HOTSPOTS];
  private alerts: OperationalAlert[] = [...OPERATIONAL_ALERTS];

  async getTrains(): Promise<Train[]> {
    try {
      // PRIORITY 1: Fetch ALL active trains from backend FastAPI dynamic Train Registry
      const res = await fetch(`${API_BASE_URL}/trains`);
      if (res.ok) {
        const data = await res.json();
        const activeList = data.trains || [];
        
        if (activeList.length > 0) {
          // Perform batch ETA predictions across the entire fleet
          const batchRes = await fetch(`${API_BASE_URL}/trains/batch-eta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });

          let batchPredictionsMap: Record<string, any> = {};
          if (batchRes.ok) {
            const batchData = await batchRes.json();
            for (const item of (batchData.predictions || [])) {
              batchPredictionsMap[item.train_id] = item;
            }
          }

          // Map backend dynamic registry objects to frontend Train model
          const mappedTrains: Train[] = activeList.map((t: any) => {
            const pred = batchPredictionsMap[t.train_id] || {};
            const existing = this.trains.find(existingT => existingT.id === t.train_id);
            const modelPreds: ModelPredictions = pred.model_predictions || {
              schedule_baseline_minutes: round(t.current_delay_minutes * 0.7 + 120),
              random_forest_minutes: round(t.current_delay_minutes * 0.85 + 112),
              xgboost_minutes: round(t.current_delay_minutes * 0.75 + 105)
            };

            return {
              id: t.train_id,
              number: t.train_number || t.train_id,
              name: t.train_name,
              type: t.type || 'Express',
              zone: t.zone || 'NR',
              origin: t.origin,
              originCode: t.origin_code || 'ORG',
              destination: t.destination,
              destinationCode: t.destination_code || 'DEST',
              currentLocation: t.current_station,
              currentLocationCode: t.current_station ? t.current_station.substring(0, 4).toUpperCase() : 'CURR',
              nextStation: t.next_station,
              nextStationCode: t.next_station ? t.next_station.substring(0, 4).toUpperCase() : 'NEXT',
              currentSpeed: t.speed,
              maxSpeed: 130,
              distanceCovered: t.distance_covered_km,
              totalDistance: t.total_distance_km,
              scheduledEta: existing ? existing.scheduledEta : '18:30',
              traditionalEta: existing ? existing.traditionalEta : '18:30',
              aiPredictedEta: pred.predicted_eta_formatted || (existing ? existing.aiPredictedEta : '18:48'),
              remainingTravelTimeMinutes: pred.remaining_travel_time_minutes || 105,
              delayMinutes: t.current_delay_minutes,
              status: t.status || (t.current_delay_minutes <= 5 ? 'on_time' : t.current_delay_minutes > 40 ? 'critical' : 'delayed'),
              confidenceScore: Math.round((pred.data_reliability_score || 0.94) * 100),
              dataReliabilityScore: pred.data_reliability_score || 0.94,
              dataQuality: pred.data_quality || { score: 0.94, estimated_telemetry: t.is_estimated, weather_available: true },
              dataSourceTransparency: pred.data_source_transparency || {
                is_live_gps: !t.is_estimated,
                is_estimated: t.is_estimated,
                is_simulated: t.is_simulated || false,
                model_type: "XGBoost Regressor (eta_xgboost.json) + Random Forest (eta_random_forest.pkl)"
              },
              modelPredictions: modelPreds,
              weatherScore: t.weather_score,
              rainfallMm: t.rainfall_mm,
              congestionScore: t.congestion_score,
              speedRestrictionScore: t.speed_restriction_score,
              signalDelayScore: t.signal_delay_score,
              lat: t.latitude || 26.4499,
              lng: t.longitude || 80.3319,
              timeline: existing ? existing.timeline : [
                { id: 's1', stationName: t.origin, stationCode: t.origin_code || 'ORG', scheduledArrival: '16:00', scheduledDeparture: '16:00', predictedArrival: '16:00', predictedDeparture: '16:00', delayMinutes: 0, distanceFromOrigin: 0, status: 'completed' },
                { id: 's2', stationName: t.current_station, stationCode: 'CURR', scheduledArrival: '19:00', scheduledDeparture: '19:05', predictedArrival: '19:10', predictedDeparture: '19:15', delayMinutes: t.current_delay_minutes, distanceFromOrigin: t.distance_covered_km, status: 'current' },
                { id: 's3', stationName: t.destination, stationCode: t.destination_code || 'DEST', scheduledArrival: '23:30', scheduledDeparture: '23:30', predictedArrival: pred.predicted_eta_formatted || '23:45', predictedDeparture: '23:45', delayMinutes: t.current_delay_minutes, distanceFromOrigin: t.total_distance_km, status: 'upcoming' }
              ],
              delayFactors: pred.prediction_factors ? pred.prediction_factors.map((f: any, idx: number) => ({
                id: `df-${idx}`,
                name: f.factor,
                category: f.category,
                impactMinutes: f.impact_minutes,
                type: f.impact_minutes > 0 ? 'delay' : 'gain',
                icon: f.impact_minutes > 0 ? (f.impact_minutes > 10 ? '🔴' : '🟠') : '🟢',
                source: f.source || 'LIVE / HISTORICAL TELEMETRY',
                description: f.category === 'congestion'
                  ? 'Track occupancy density on forward route segment'
                  : f.category === 'speed_restriction'
                  ? 'Caution speed order over track maintenance zone'
                  : f.category === 'weather'
                  ? 'Rainfall / low visibility regulation'
                  : 'Schedule padding buffer recovery'
              })) : (existing ? existing.delayFactors : []),
              lastUpdated: 'Just now'
            };
          });

          this.trains = mappedTrains;
          return [...this.trains];
        }
      }
    } catch (e) {
      // Local fallback if server offline
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
    remainingTravelTimeMinutes: number;
    delayMinutes: number;
    confidenceScore: number;
    dataReliabilityScore: number;
    dataQuality: DataQualityScore;
    dataSourceTransparency: DataSourceTransparency;
    modelPredictions: ModelPredictions;
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
          remainingTravelTimeMinutes: data.remaining_travel_time_minutes,
          delayMinutes: data.delay_minutes,
          confidenceScore: Math.round((data.data_reliability_score || 0.94) * 100),
          dataReliabilityScore: data.data_reliability_score || 0.94,
          dataQuality: data.data_quality || { score: 0.94, estimated_telemetry: false, weather_available: true },
          dataSourceTransparency: data.data_source_transparency || {
            is_live_gps: true,
            is_estimated: false,
            is_simulated: false,
            model_type: "XGBoost Regressor (eta_xgboost.json) + Random Forest (eta_random_forest.pkl)"
          },
          modelPredictions: data.model_predictions || {
            schedule_baseline_minutes: data.schedule_baseline_minutes || 115.0,
            random_forest_minutes: data.random_forest_minutes || 108.0,
            xgboost_minutes: data.xgboost_minutes || 105.0
          }
        };
      }
    } catch (e) {
      // Local fallback
    }

    const train = await this.getTrainById(trainId);
    if (!train) throw new Error(`Train ${trainId} not found`);

    return {
      trainId: train.id,
      scheduledEta: train.scheduledEta,
      traditionalEta: train.traditionalEta,
      aiPredictedEta: train.aiPredictedEta,
      remainingTravelTimeMinutes: train.remainingTravelTimeMinutes || 105,
      delayMinutes: train.delayMinutes,
      confidenceScore: train.confidenceScore,
      dataReliabilityScore: train.dataReliabilityScore || 0.94,
      dataQuality: train.dataQuality || { score: 0.94, estimated_telemetry: false, weather_available: true },
      dataSourceTransparency: train.dataSourceTransparency || {
        is_live_gps: true,
        is_estimated: false,
        is_simulated: false,
        model_type: "XGBoost Regressor (eta_xgboost.json) + Random Forest (eta_random_forest.pkl)"
      },
      modelPredictions: train.modelPredictions || {
        schedule_baseline_minutes: 115.0,
        random_forest_minutes: 108.0,
        xgboost_minutes: 105.0
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

  async getDatasetMetadata(): Promise<DatasetMetadata | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/dataset/metadata`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback
    }
    return null;
  }

  async getPredictionExplanation(trainId: string): Promise<{
    delayFactors: DelayFactor[];
    totalImpact: number;
    confidenceScore: number;
    explanationType: string;
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
          source: f.source || 'LIVE / HISTORICAL TELEMETRY',
          description: f.category === 'congestion'
            ? 'Track occupancy density on forward route segment'
            : f.category === 'speed_restriction'
            ? 'Caution speed order over track maintenance zone'
            : f.category === 'weather'
            ? 'Rainfall / low visibility regulation'
            : f.category === 'signal'
            ? 'Signal clearance interlock hold'
            : 'Schedule padding buffer recovery'
        }));

        return {
          delayFactors,
          totalImpact: data.total_impact_minutes,
          confidenceScore: Math.round((data.prediction.reliability_score || 0.94) * 100),
          explanationType: data.explanation_type || "Operational ETA Impact Analysis"
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
      confidenceScore: train.confidenceScore,
      explanationType: "Operational ETA Impact Analysis"
    };
  }
}

export const mockTrainService = new MockTrainService();
function round(num: number): number {
  return Math.round(num * 10) / 10;
}
