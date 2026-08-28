import React, { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

import OverviewDashboard from './components/overview/OverviewDashboard';
import LiveTrainMonitor from './components/monitor/LiveTrainMonitor';
import EtaPredictionsView from './components/predictions/EtaPredictionsView';
import NetworkIntelligenceView from './components/network/NetworkIntelligenceView';
import DelayAnalyticsView from './components/analytics/DelayAnalyticsView';
import TrainDetailsView from './components/details/TrainDetailsView';
import AlertsEventsView from './components/alerts/AlertsEventsView';
import ApiPlaygroundView from './components/api/ApiPlaygroundView';
import LiveSimulationBar from './components/simulation/LiveSimulationBar';

import { useLiveTrainData } from './hooks/useLiveTrainData';
import { OPERATIONAL_ALERTS } from './data/mockData';
import { NavPage } from './types';

export default function App() {
  const [activePage, setActivePage] = useState<NavPage>('overview');

  const {
    trains,
    selectedTrain,
    selectedTrainId,
    setSelectedTrainId,
    simulationState,
    toggleEvent,
    resetSimulation,
    toastNotification
  } = useLiveTrainData();

  const criticalAlertCount = OPERATIONAL_ALERTS.filter(a => a.severity === 'critical').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased">
      {/* 1. PERSISTENT LEFT SIDEBAR */}
      <Sidebar
        activePage={activePage}
        onPageChange={setActivePage}
        criticalAlertCount={criticalAlertCount}
      />

      {/* MAIN CONTAINER (OFFSET BY SIDEBAR WIDTH W-64 = 16REM) */}
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        {/* 2. TOP HEADER */}
        <Header
          activePage={activePage}
          trains={trains}
          selectedTrain={selectedTrain}
          onSelectTrain={setSelectedTrainId}
          onNavigateToDetails={() => setActivePage('details')}
          lastUpdated={simulationState.lastTickTimestamp}
        />

        {/* 3. DYNAMIC PAGE CONTENT VIEW */}
        <main className="p-8 flex-1 max-w-7xl w-full mx-auto space-y-6">
          {activePage === 'overview' && (
            <OverviewDashboard
              trains={trains}
              selectedTrain={selectedTrain}
              onSelectTrain={setSelectedTrainId}
              onNavigatePage={setActivePage}
            />
          )}

          {activePage === 'monitor' && (
            <LiveTrainMonitor
              trains={trains}
              onSelectTrain={setSelectedTrainId}
              onNavigateToDetails={() => setActivePage('details')}
            />
          )}

          {activePage === 'predictions' && (
            <EtaPredictionsView
              trains={trains}
              selectedTrain={selectedTrain}
              onSelectTrain={setSelectedTrainId}
              onNavigateToDetails={() => setActivePage('details')}
            />
          )}

          {activePage === 'network' && <NetworkIntelligenceView />}

          {activePage === 'analytics' && <DelayAnalyticsView />}

          {activePage === 'details' && (
            <TrainDetailsView
              train={selectedTrain}
              trains={trains}
              onSelectTrain={setSelectedTrainId}
            />
          )}

          {activePage === 'alerts' && <AlertsEventsView />}

          {activePage === 'api' && <ApiPlaygroundView />}
        </main>
      </div>

      {/* 4. FLOATING SIMULATION ENGINE CONTROLLER */}
      <LiveSimulationBar
        simulationState={simulationState}
        onToggleEvent={toggleEvent}
        onReset={resetSimulation}
        toastMessage={toastNotification}
      />
    </div>
  );
}
