export const TRAINS_DATA = [
  {
    id: "12345",
    name: "12345 - Prayagraj Express",
    routeShort: "NDLS ➔ PRYJ",
    destination: "Prayagraj Central",
    destinationCode: "PRYJ",
    scheduledEta: "18:00",
    baseEta: "18:27",
    baseRemaining: "47 min",
    baseDelay: "+18 min",
    delayType: "warning",
    origin: "Kanpur Central",
    originCode: "CNB",
    currentLocation: "Kanpur Central (Passed)",
    currentSpeed: "72 km/h",
    baseWeather: "Light Rain",
    baseTrackStatus: "Moderate Congestion",
    progressPct: 62,
    baseConfidence: 89,
    baseImpacts: [
      { id: 1, name: "Rainfall Ahead", icon: "🌧", value: "+3 min", type: "delay" },
      { id: 2, name: "Track Congestion", icon: "🚦", value: "+4 min", type: "delay" },
      { id: 3, name: "Speed Below Average", icon: "🚆", value: "+2 min", type: "delay" }
    ],
    timeline: [
      { name: "KANPUR", code: "CNB", eta: "17:40", status: "Completed", isCompleted: true, isActive: false },
      { name: "PRAYAGRAJ", code: "PRYJ", eta: "18:27", status: "LIVE ETA", isCompleted: false, isActive: true },
      { name: "MUGHALSARAI", code: "DDU", eta: "20:42", status: "Scheduled", isCompleted: false, isActive: false },
      { name: "PATNA", code: "PNBE", eta: "23:55", status: "Scheduled", isCompleted: false, isActive: false }
    ]
  },
  {
    id: "22436",
    name: "22436 - Vande Bharat Express",
    routeShort: "NDLS ➔ VNS",
    destination: "Varanasi Junction",
    destinationCode: "BSB",
    scheduledEta: "14:00",
    baseEta: "14:04",
    baseRemaining: "24 min",
    baseDelay: "+4 min",
    delayType: "success",
    origin: "Kanpur Central",
    originCode: "CNB",
    currentLocation: "Fatehpur Crossing",
    currentSpeed: "115 km/h",
    baseWeather: "Clear Sky",
    baseTrackStatus: "Clear Track",
    progressPct: 78,
    baseConfidence: 96,
    baseImpacts: [
      { id: 1, name: "High Speed Corridor", icon: "⚡", value: "-2 min", type: "gain" },
      { id: 2, name: "Minor Platform Wait", icon: "🚦", value: "+3 min", type: "delay" }
    ],
    timeline: [
      { name: "NEW DELHI", code: "NDLS", eta: "06:00", status: "Completed", isCompleted: true, isActive: false },
      { name: "KANPUR", code: "CNB", eta: "10:08", status: "Completed", isCompleted: true, isActive: false },
      { name: "PRAYAGRAJ", code: "PRYJ", eta: "12:12", status: "Completed", isCompleted: true, isActive: false },
      { name: "VARANASI", code: "BSB", eta: "14:04", status: "LIVE ETA", isCompleted: false, isActive: true }
    ]
  },
  {
    id: "12401",
    name: "12401 - Magadh Express",
    routeShort: "NDLS ➔ IPR",
    destination: "Buxar Junction",
    destinationCode: "BXR",
    scheduledEta: "21:30",
    baseEta: "22:15",
    baseRemaining: "1 hr 12 min",
    baseDelay: "+45 min",
    delayType: "danger",
    origin: "Mirzapur",
    originCode: "MZP",
    currentLocation: "Chunar Outer",
    currentSpeed: "54 km/h",
    baseWeather: "Heavy Fog",
    baseTrackStatus: "Signal Blockage",
    progressPct: 45,
    baseConfidence: 82,
    baseImpacts: [
      { id: 1, name: "Dense Fog Conditions", icon: "🌫", value: "+18 min", type: "delay" },
      { id: 2, name: "Signal Clearance Delay", icon: "🚨", value: "+15 min", type: "delay" },
      { id: 3, name: "Freight Precedence", icon: "🚆", value: "+12 min", type: "delay" }
    ],
    timeline: [
      { name: "KANPUR", code: "CNB", eta: "16:20", status: "Completed", isCompleted: true, isActive: false },
      { name: "PRAYAGRAJ", code: "PRYJ", eta: "19:10", status: "Completed", isCompleted: true, isActive: false },
      { name: "BUXAR", code: "BXR", eta: "22:15", status: "LIVE ETA", isCompleted: false, isActive: true },
      { name: "ISLAMPUR", code: "IPR", eta: "02:40", status: "Scheduled", isCompleted: false, isActive: false }
    ]
  }
];
