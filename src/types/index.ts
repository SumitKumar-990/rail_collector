export type UserRoleMode = 'passenger' | 'officer';

export type NavPage =
  | 'overview'
  | 'monitor'
  | 'predictions'
  | 'network'
  | 'analytics'
  | 'details'
  | 'alerts';

export type TrainStatus = 'on_time' | 'delayed' | 'critical' | 'approaching';

export interface StationStop {
  id: string;
  sequence?: number;
  stationName: string;
  stationCode: string;
  scheduledArrival: string;
  scheduledDeparture: string;
  actualArrival?: string;
  actualDeparture?: string;
  predictedArrival: string;
  predictedDeparture: string;
  delayMinutes: number;
  distanceFromOrigin: number; // km
  distanceKm?: number;
  status: 'DEPARTED' | 'AT_STATION' | 'APPROACHING' | 'UPCOMING' | 'PASSED' | 'TERMINUS' | 'completed' | 'current' | 'upcoming';
  platform?: string;
  isHalt?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface LiveTrainState {
  train_number: string;
  train_name: string;
  journey_date: string;
  source_station_name: string;
  source_station_code: string;
  destination_station_name: string;
  destination_station_code: string;
  is_live_available: boolean;
  running_status: string;
  current_location: string;
  current_segment?: string;
  current_station: string;
  previous_station: string;
  previous_station_code: string;
  next_station: string;
  next_station_code: string;
  destination: string;
  destination_code: string;
  current_delay_minutes: number;
  current_speed_kmph: number;
  latitude: number;
  longitude: number;
  distance_covered_km: number;
  total_distance_km: number;
  distance_remaining_km: number;
  journey_progress_pct: number;
  segment_progress_pct: number;
  total_halts: number;
  scheduled_duration: string;
  predicted_destination_eta: string;
  predicted_destination_delay_minutes: number;
  confidence_percentage: number;
  stations: StationStop[];
  last_updated: string;
  data_source: string;
  is_demo?: boolean;
}

export interface DelayFactor {
  id: string;
  name: string;
  category: 'congestion' | 'signal' | 'weather' | 'speed_restriction' | 'recovery' | 'maintenance' | 'current_delay' | 'route_history' | 'normal';
  impactMinutes: number; // positive for delay, negative for recovery
  type: 'delay' | 'gain';
  icon: string;
  description: string;
  source?: string;
}

export interface DataSourceTransparency {
  is_live_gps: boolean;
  is_estimated: boolean;
  is_simulated: boolean;
  model_type: string;
}

export interface DataQualityScore {
  score: number; // 0.0 - 1.0
  gps_freshness?: string;
  estimated_telemetry: boolean;
  weather_available: boolean;
  data_reliability_label?: string;
}

export interface ModelPredictions {
  schedule_baseline_minutes: number;
  random_forest_minutes: number;
  xgboost_minutes: number;
}

export interface DatasetMetadata {
  dataset_name: string;
  dataset_type: string;
  status_notice: string;
  record_counts: Record<string, number>;
  feature_count: number;
  evaluation_metrics: Record<string, any>;
  fallback_priority_hierarchy: string[];
}

export interface Train {
  id: string;
  number: string;
  name: string;
  type: 'Rajdhani' | 'Shatabdi' | 'Vande Bharat' | 'Duronto' | 'Superfast Express' | 'Express';
  zone: 'NR' | 'ER' | 'WR' | 'NCR' | 'ECR' | 'CR' | 'SER' | 'WCR' | 'SR' | 'NER';
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  currentLocation: string;
  currentLocationCode: string;
  nextStation: string;
  nextStationCode: string;
  currentSpeed: number; // km/h
  maxSpeed: number; // km/h
  distanceCovered: number; // km
  totalDistance: number; // km
  scheduledEta: string; // HH:MM
  traditionalEta: string; // HH:MM
  aiPredictedEta: string; // HH:MM
  randomForestEta?: string;
  scheduleBaselineEta?: string;
  remainingTravelTimeMinutes?: number;
  delayMinutes: number;
  status: TrainStatus;
  confidenceScore: number; // Data Reliability Score percentage
  dataReliabilityScore?: number;
  dataQuality?: DataQualityScore;
  dataSourceTransparency?: DataSourceTransparency;
  modelPredictions?: ModelPredictions;
  weatherScore?: number;
  rainfallMm?: number;
  congestionScore?: number;
  speedRestrictionScore?: number;
  signalDelayScore?: number;
  lat: number;
  lng: number;
  timeline: StationStop[];
  delayFactors: DelayFactor[];
  lastUpdated: string;
}

export interface StationItem {
  code: string;
  name: string;
  city?: string;
  state?: string;
  zone?: string;
}

export interface BetweenTrainResult {
  train_number: string;
  train_name: string;
  type: string;
  zone: string;
  source_station_code: string;
  source_station_name: string;
  destination_station_code: string;
  destination_station_name: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  total_distance_km: number;
  runs_on: string[];
}

export interface PassengerDelayExplanation {
  train_number: string;
  human_summary: string;
  has_advisory: boolean;
  confidence_percentage: number;
  breakdown: {
    factor: string;
    impact_minutes: number;
    icon: string;
  }[];
}

export interface AffectedTrain {
  train_number: string;
  train_name: string;
  current_station?: string;
  next_station?: string;
  destination?: string;
  current_delay_minutes: number;
  predicted_eta_impact_minutes: number;
  risk_level: 'Low' | 'Medium' | 'High';
  congestion_score?: number;
}

export interface CorridorDetail {
  corridor_id: string;
  corridor_name: string;
  from_station_code: string;
  to_station_code: string;
  zone: string;
  length_km: number;
  congestion_score: number;
  congestion_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  congestion_color: string;
  active_trains_count: number;
  average_delay_minutes: number;
  trend: 'Increasing' | 'Stable' | 'Decreasing';
  ai_assessment: string;
  affected_trains: AffectedTrain[];
}

export interface NetworkCongestionResponse {
  timestamp: string;
  network_health_score: number;
  overall_status: string;
  critical_corridors_count: number;
  high_corridors_count: number;
  corridors: CorridorDetail[];
}

export interface MapLayersConfig {
  liveTrains: boolean;
  congestion: boolean;
  delayRisk: boolean;
  etaImpact: boolean;
  weather: boolean;
}

export interface NetworkHotspot {
  id: string;
  sectionName: string;
  corridor: string;
  zone: string;
  congestionLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  avgDelayMinutes: number;
  affectedTrainsCount: number;
  primaryCause: string;
}

export interface OperationalAlert {
  id: string;
  title: string;
  category: 'critical' | 'operational' | 'weather' | 'congestion';
  severity: 'critical' | 'warning' | 'info';
  location: string;
  zone?: string;
  affectedRoute?: string;
  affectedTrains?: number;
  affectedTrainsCount?: number;
  expectedImpact: string;
  timestamp?: string;
  description?: string;
  data_source?: string;
}

export interface ApiEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST';
  path: string;
  description: string;
  queryParams?: { key: string; label: string; default: string; required: boolean }[];
  sampleResponseBody: object;
}

export interface SimulationState {
  rain: boolean;
  congestion: boolean;
  signal: boolean;
  recovery: boolean;
  simulationSpeed: number;
  lastTickTimestamp: string;
}
