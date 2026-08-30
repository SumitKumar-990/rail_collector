import {
  Train,
  NetworkHotspot,
  OperationalAlert,
  StationItem,
  BetweenTrainResult,
  PassengerDelayExplanation,
  CorridorDetail,
  NetworkCongestionResponse,
  AffectedTrain,
  ModelPredictions
} from '../types';
import { INITIAL_TRAINS, NETWORK_HOTSPOTS, OPERATIONAL_ALERTS } from '../data/mockData';

const API_BASE_URL = 'http://localhost:8000/api';

export class MockTrainService {
  private trains: Train[] = [...INITIAL_TRAINS];
  private hotspots: NetworkHotspot[] = [...NETWORK_HOTSPOTS];
  private alerts: OperationalAlert[] = [...OPERATIONAL_ALERTS];

  // Helper rounding
  private round(val: number): number {
    return Math.round(val * 10) / 10;
  }

  // =========================================================================
  // 1. ALL ACTIVE FLEET TRAINS
  // =========================================================================
  async getTrains(): Promise<Train[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/trains`);
      if (res.ok) {
        const data = await res.json();
        const activeList = data.trains || [];
        
        if (activeList.length > 0) {
          // Perform batch ETA predictions across the entire fleet
          let batchPredictionsMap: Record<string, any> = {};
          try {
            const batchRes = await fetch(`${API_BASE_URL}/trains/batch-eta`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            });
            if (batchRes.ok) {
              const batchData = await batchRes.json();
              for (const item of (batchData.predictions || [])) {
                batchPredictionsMap[item.train_id] = item;
              }
            }
          } catch (err) {
            // Non-blocking
          }

          // Map backend dynamic registry objects to frontend Train model
          const mappedTrains: Train[] = activeList.map((t: any) => {
            const pred = batchPredictionsMap[t.train_id] || {};
            const existing = this.trains.find(existingT => existingT.id === t.train_id);
            const modelPreds: ModelPredictions = pred.model_predictions || {
              schedule_baseline_minutes: this.round(t.current_delay_minutes * 0.7 + 120),
              random_forest_minutes: this.round(t.current_delay_minutes * 0.85 + 112),
              xgboost_minutes: this.round(t.current_delay_minutes * 0.75 + 105)
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
              currentSpeed: t.speed || 85,
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
                  : (f.category === 'weather' ? 'Atmospheric condition coefficient on braking curve' : 'Standard scheduled baseline')
              })) : (existing ? existing.delayFactors : []),
              lastUpdated: new Date().toLocaleTimeString()
            };
          });

          this.trains = mappedTrains;
          return mappedTrains;
        }
      }
    } catch (e) {
      // Fallback to memory
    }
    return this.trains;
  }

  // =========================================================================
  // 2. PASSENGER TRAIN SEARCH
  // =========================================================================
  async searchTrains(query: string, limit: number = 15): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/trains/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        return data.trains || [];
      }
    } catch (e) {
      // Fallback search
    }
    const q = query.toLowerCase().trim();
    return this.trains.filter(t => t.number.includes(q) || t.name.toLowerCase().includes(q)).slice(0, limit);
  }

  // =========================================================================
  // 3. PASSENGER STATION SEARCH
  // =========================================================================
  async searchStations(query: string): Promise<StationItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/stations/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        return data.stations || [];
      }
    } catch (e) {
      // Fallback
    }
    const q = query.toLowerCase().trim();
    const defaults: StationItem[] = [
      { code: 'HWH', name: 'Howrah Junction', city: 'Kolkata' },
      { code: 'RNC', name: 'Ranchi Junction', city: 'Ranchi' },
      { code: 'NDLS', name: 'New Delhi', city: 'New Delhi' },
      { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur' },
      { code: 'PRYJ', name: 'Prayagraj Junction', city: 'Prayagraj' },
      { code: 'MMCT', name: 'Mumbai Central', city: 'Mumbai' },
      { code: 'DGR', name: 'Durgapur', city: 'Durgapur' },
      { code: 'DHN', name: 'Dhanbad Junction', city: 'Dhanbad' }
    ];
    return defaults.filter(s => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (s.city && s.city.toLowerCase().includes(q)));
  }

  // =========================================================================
  // 4. FIND TRAINS BETWEEN STATIONS
  // =========================================================================
  async getTrainsBetween(fromStation: string, toStation: string): Promise<BetweenTrainResult[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/trains/between?from=${encodeURIComponent(fromStation)}&to=${encodeURIComponent(toStation)}`);
      if (res.ok) {
        const data = await res.json();
        return data.trains || [];
      }
    } catch (e) {
      // Fallback
    }
    return [
      {
        train_number: '12019',
        train_name: 'Howrah - Ranchi Shatabdi Express',
        type: 'Shatabdi Express',
        zone: 'ER',
        source_station_code: fromStation || 'HWH',
        source_station_name: 'Howrah Junction',
        destination_station_code: toStation || 'RNC',
        destination_station_name: 'Ranchi Junction',
        departure_time: '06:05',
        arrival_time: '13:15',
        duration: '7h 10m',
        total_distance_km: 421.0,
        runs_on: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      },
      {
        train_number: '12301',
        train_name: 'Howrah Rajdhani Express',
        type: 'Rajdhani Express',
        zone: 'ER',
        source_station_code: fromStation || 'HWH',
        source_station_name: 'Howrah Junction',
        destination_station_code: toStation || 'NDLS',
        destination_station_name: 'New Delhi',
        departure_time: '16:50',
        arrival_time: '10:05',
        duration: '17h 15m',
        total_distance_km: 1447.0,
        runs_on: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      }
    ];
  }

  // =========================================================================
  // 5. GET FULL TRAIN DETAILS FOR ANY TRAIN IN THE DIRECTORY
  // =========================================================================
  async getTrainDetails(trainNumber: string): Promise<Train> {
    try {
      const res = await fetch(`${API_BASE_URL}/trains/${trainNumber}`);
      if (res.ok) {
        const data = await res.json();
        const existing = this.trains.find(t => t.number === trainNumber || t.id === trainNumber);
        if (existing) {
          return existing;
        }

        const newTrain: Train = {
          id: data.train_number || trainNumber,
          number: data.train_number || trainNumber,
          name: data.train_name || `Train ${trainNumber}`,
          type: data.train_type || 'Express',
          origin: data.source_station_name || 'Origin Station',
          originCode: data.source_station_code || 'ORG',
          destination: data.destination_station_name || 'Destination Station',
          destinationCode: data.destination_station_code || 'DEST',
          currentStation: data.source_station_name || 'Origin',
          nextStation: data.destination_station_name || 'Destination',
          nextStationCode: data.destination_station_code || 'DEST',
          scheduledDeparture: data.departure_time || '06:00',
          scheduledArrival: data.arrival_time || '14:00',
          scheduledEta: data.arrival_time || '14:00',
          aiPredictedEta: data.arrival_time || '14:15',
          delayMinutes: 0,
          status: 'on-time',
          currentSpeed: 0,
          maxSpeed: 110,
          totalDistance: data.total_distance_km || 500,
          distanceCovered: 0,
          confidence: 'High',
          congestionScore: 0.2,
          weatherScore: 0.1,
          rainfallMm: 0,
          speedRestrictionScore: 0,
          signalDelayScore: 0,
          lat: 23.3441,
          lng: 85.3096,
          timeline: data.stations && data.stations.length > 0 ? data.stations.map((s: any, idx: number) => ({
            id: `st-${idx}`,
            stationName: s.station_name,
            stationCode: s.station_code,
            scheduledArrival: s.scheduled_arrival || '--',
            scheduledDeparture: s.scheduled_departure || '--',
            predictedArrival: s.scheduled_arrival || '--',
            predictedDeparture: s.scheduled_departure || '--',
            delayMinutes: 0,
            distanceFromOrigin: s.distance_km || idx * 40,
            status: idx === 0 ? 'completed' : (idx === 1 ? 'current' : 'upcoming'),
            platform: '1'
          })) : [
            { id: 's1', stationName: data.source_station_name || 'Origin', stationCode: data.source_station_code || 'ORG', scheduledArrival: data.departure_time || '06:00', scheduledDeparture: data.departure_time || '06:00', predictedArrival: data.departure_time || '06:00', predictedDeparture: data.departure_time || '06:00', delayMinutes: 0, distanceFromOrigin: 0, status: 'completed' },
            { id: 's2', stationName: data.destination_station_name || 'Destination', stationCode: data.destination_station_code || 'DEST', scheduledArrival: data.arrival_time || '14:00', scheduledDeparture: data.arrival_time || '14:00', predictedArrival: data.arrival_time || '14:00', predictedDeparture: data.arrival_time || '14:00', delayMinutes: 0, distanceFromOrigin: data.total_distance_km || 500, status: 'upcoming' }
          ],
          delayFactors: [
            { id: 'df-1', name: 'Section Congestion', category: 'congestion', impactMinutes: 0, type: 'gain', icon: '🟢', source: 'INDIAN RAILWAYS DIRECTORY', description: 'Standard baseline schedule' }
          ],
          lastUpdated: new Date().toLocaleTimeString()
        };

        // Cache into this.trains
        this.trains.push(newTrain);
        return newTrain;
      }
    } catch (e) {
      // Fallback
    }

    const found = this.trains.find(t => t.number === trainNumber || t.id === trainNumber);
    if (found) return found;

    return {
      id: trainNumber,
      number: trainNumber,
      name: `Train ${trainNumber}`,
      type: 'Express',
      origin: 'Origin Station',
      originCode: 'ORG',
      destination: 'Destination Station',
      destinationCode: 'DEST',
      currentStation: 'Origin Station',
      nextStation: 'Destination Station',
      nextStationCode: 'DEST',
      scheduledDeparture: '06:00',
      scheduledArrival: '14:00',
      scheduledEta: '14:00',
      aiPredictedEta: '14:10',
      delayMinutes: 0,
      status: 'on-time',
      currentSpeed: 0,
      maxSpeed: 110,
      totalDistance: 500,
      distanceCovered: 0,
      confidence: 'Medium',
      congestionScore: 0.2,
      weatherScore: 0.1,
      rainfallMm: 0,
      speedRestrictionScore: 0,
      signalDelayScore: 0,
      lat: 23.3441,
      lng: 85.3096,
      timeline: [],
      delayFactors: [],
      lastUpdated: new Date().toLocaleTimeString()
    };
  }

  // =========================================================================
  // 6. LIVE STATUS FOR SPECIFIC TRAIN
  // =========================================================================
  async getLiveTrainStatus(trainNumber: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/trains/${trainNumber}/live`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback
    }
    const found = this.trains.find(t => t.number === trainNumber || t.id === trainNumber);
    if (found) {
      return {
        train_number: found.number,
        train_name: found.name,
        is_live_available: true,
        running_status: 'RUNNING',
        current_location: found.currentLocation,
        previous_station: found.origin,
        next_station: found.nextStation,
        destination: found.destination,
        current_delay_minutes: found.delayMinutes,
        current_speed_kmph: found.currentSpeed,
        last_updated: new Date().toLocaleTimeString()
      };
    }
    return null;
  }

  // =========================================================================
  // 6. TRAIN SCHEDULE TIMELINE
  // =========================================================================
  async getTrainSchedule(trainNumber: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/trains/${trainNumber}/schedule`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback
    }
    return null;
  }

  // =========================================================================
  // 7. TRAIN ROUTE GEOMETRY
  // =========================================================================
  async getTrainRoute(trainNumber: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/trains/${trainNumber}/route`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback
    }
    return null;
  }

  // =========================================================================
  // 8. AI ETA PREDICTION
  // =========================================================================
  async getTrainEta(trainNumber: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/trains/${trainNumber}/eta`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback
    }
    return null;
  }

  // =========================================================================
  // 7. PASSENGER HUMAN-READABLE DELAY EXPLANATION
  // =========================================================================
  async getPassengerEtaExplanation(trainNumber: string): Promise<PassengerDelayExplanation> {
    try {
      const res = await fetch(`${API_BASE_URL}/trains/${trainNumber}/eta/explanation`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback
    }
    return {
      train_number: trainNumber,
      human_summary: 'Heavy rail traffic ahead. Your arrival may be affected by approximately 5–10 minutes.',
      has_advisory: true,
      confidence_percentage: 91,
      breakdown: [
        { factor: 'Heavy rail traffic ahead', impact_minutes: 6, icon: '🚦' },
        { factor: 'Weather & visibility conditions', impact_minutes: 2, icon: '🌧' },
        { factor: 'Current running delay', impact_minutes: 3, icon: '⏱' }
      ]
    };
  }

  // =========================================================================
  // 8. OFFICER NETWORK CONGESTION INTELLIGENCE
  // =========================================================================
  async getNetworkCongestion(): Promise<NetworkCongestionResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/network/congestion`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback
    }
    return {
      timestamp: new Date().toISOString(),
      network_health_score: 82,
      overall_status: 'Moderate Congestion',
      critical_corridors_count: 1,
      high_corridors_count: 2,
      corridors: [
        {
          corridor_id: 'corridor-cnb-pryj',
          corridor_name: 'Kanpur Central → Prayagraj Junction',
          from_station_code: 'CNB',
          to_station_code: 'PRYJ',
          zone: 'NCR',
          length_km: 195.0,
          congestion_score: 84.0,
          congestion_level: 'CRITICAL',
          congestion_color: 'red',
          active_trains_count: 28,
          average_delay_minutes: 16.0,
          trend: 'Increasing',
          ai_assessment: 'Severe track occupancy ahead. ETA disruption and signal holds likely.',
          affected_trains: [
            { train_number: '12301', train_name: 'Howrah Rajdhani Express', current_delay_minutes: 18.0, predicted_eta_impact_minutes: 22, risk_level: 'High' },
            { train_number: '12309', train_name: 'Patna Tejas Rajdhani', current_delay_minutes: 32.0, predicted_eta_impact_minutes: 28, risk_level: 'High' },
            { train_number: '22436', train_name: 'Vande Bharat Express', current_delay_minutes: 4.0, predicted_eta_impact_minutes: 8, risk_level: 'Low' }
          ]
        },
        {
          corridor_id: 'corridor-mtj-agc',
          corridor_name: 'Mathura Junction → Agra Cantt',
          from_station_code: 'MTJ',
          to_station_code: 'AGC',
          zone: 'NCR',
          length_km: 54.0,
          congestion_score: 65.0,
          congestion_level: 'HIGH',
          congestion_color: 'orange',
          active_trains_count: 19,
          average_delay_minutes: 12.0,
          trend: 'Stable',
          ai_assessment: 'Heavy rail traffic detected. Sectional speed reduced; moderate delay propagation.',
          affected_trains: [
            { train_number: '12002', train_name: 'Bhopal Shatabdi Express', current_delay_minutes: 2.0, predicted_eta_impact_minutes: 6, risk_level: 'Low' }
          ]
        },
        {
          corridor_id: 'corridor-bwn-dgr',
          corridor_name: 'Barddhaman → Durgapur / Asansol',
          from_station_code: 'BWN',
          to_station_code: 'ASN',
          zone: 'ER',
          length_km: 105.0,
          congestion_score: 55.0,
          congestion_level: 'MODERATE',
          congestion_color: 'yellow',
          active_trains_count: 14,
          average_delay_minutes: 8.0,
          trend: 'Stable',
          ai_assessment: 'Steady traffic flow with minor junction queueing.',
          affected_trains: [
            { train_number: '12019', train_name: 'Howrah - Ranchi Shatabdi Express', current_delay_minutes: 8.0, predicted_eta_impact_minutes: 7, risk_level: 'Medium' }
          ]
        },
        {
          corridor_id: 'corridor-st-brc',
          corridor_name: 'Surat → Vadodara Junction',
          from_station_code: 'ST',
          to_station_code: 'BRC',
          zone: 'WR',
          length_km: 130.0,
          congestion_score: 22.0,
          congestion_level: 'LOW',
          congestion_color: 'emerald',
          active_trains_count: 11,
          average_delay_minutes: 3.0,
          trend: 'Decreasing',
          ai_assessment: 'Optimal throughput. Clear line with minimal delay propagation.',
          affected_trains: []
        }
      ]
    };
  }

  // =========================================================================
  // 9. OFFICER AFFECTED TRAINS LIST
  // =========================================================================
  async getAffectedTrains(): Promise<AffectedTrain[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/network/affected-trains`);
      if (res.ok) {
        const data = await res.json();
        return data.affected_trains || [];
      }
    } catch (e) {
      // Fallback
    }
    return [
      { train_number: '12309', train_name: 'Patna Tejas Rajdhani', current_delay_minutes: 32.0, predicted_eta_impact_minutes: 28, risk_level: 'High', congestion_score: 84 },
      { train_number: '12301', train_name: 'Howrah Rajdhani Express', current_delay_minutes: 18.0, predicted_eta_impact_minutes: 22, risk_level: 'High', congestion_score: 84 },
      { train_number: '12259', train_name: 'Sealdah Duronto Express', current_delay_minutes: 15.0, predicted_eta_impact_minutes: 14, risk_level: 'Medium', congestion_score: 55 },
      { train_number: '12019', train_name: 'Howrah Ranchi Shatabdi', current_delay_minutes: 8.0, predicted_eta_impact_minutes: 7, risk_level: 'Medium', congestion_score: 55 }
    ];
  }

  // =========================================================================
  // 10. LARGE-SCALE LIVE TRAIN MAP SNAPSHOT FOR OFFICERS
  // =========================================================================
  async getNetworkLiveSnapshot(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/network/live`);
      if (res.ok) {
        const data = await res.json();
        return data.trains || [];
      }
    } catch (e) {
      // Fallback
    }
    return this.trains;
  }

  // =========================================================================
  // 10. SIMULATION TRIGGER
  // =========================================================================
  async triggerSimulationEvent(trainId: string, eventType: string, active: boolean) {
    try {
      await fetch(`${API_BASE_URL}/simulation/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          train_id: trainId,
          event_type: eventType,
          active: active
        })
      });
    } catch (e) {
      // Offline fallback
    }
  }

  getHotspots(): NetworkHotspot[] {
    return this.hotspots;
  }

  getAlerts(): OperationalAlert[] {
    return this.alerts;
  }
}

export const mockTrainService = new MockTrainService();
