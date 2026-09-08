import { useState, useEffect } from 'react';
import { Network, type ConnectionStatus } from '@capacitor/network';

// Global simulated offline state so all components stay in sync
let globalSimulatedOffline = false;
const simulationListeners = new Set<(simulated: boolean) => void>();

export function setSimulatedOffline(simulated: boolean) {
  globalSimulatedOffline = simulated;
  simulationListeners.forEach((listener) => listener(simulated));
}

export function toggleSimulatedOffline() {
  setSimulatedOffline(!globalSimulatedOffline);
}

export function getSimulatedOffline(): boolean {
  return globalSimulatedOffline;
}

export function useNetworkStatus() {
  const [realStatus, setRealStatus] = useState<ConnectionStatus>({
    connected: navigator.onLine,
    connectionType: 'unknown',
  });
  const [isSimulated, setIsSimulated] = useState<boolean>(globalSimulatedOffline);

  useEffect(() => {
    // 1. Initial status from Capacitor Network
    Network.getStatus()
      .then((status) => setRealStatus(status))
      .catch(() => {
        setRealStatus({
          connected: navigator.onLine,
          connectionType: 'unknown',
        });
      });

    // 2. Capacitor Network listener
    const handler = Network.addListener('networkStatusChange', (status) => {
      setRealStatus(status);
    });

    // 3. Browser fallback listeners
    const onOnline = () => {
      setRealStatus((prev) => ({ ...prev, connected: true }));
    };
    const onOffline = () => {
      setRealStatus((prev) => ({ ...prev, connected: false }));
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // 4. Simulation listener
    const onSimulationChange = (sim: boolean) => {
      setIsSimulated(sim);
    };
    simulationListeners.add(onSimulationChange);

    return () => {
      handler.then((h) => h.remove()).catch(() => {});
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      simulationListeners.delete(onSimulationChange);
    };
  }, []);

  const isConnected = !isSimulated && realStatus.connected;

  return {
    isConnected,
    isOnline: isConnected,
    isOffline: !isConnected,
    connectionType: realStatus.connectionType,
    isSimulated,
    toggleSimulatedOffline,
    setSimulatedOffline,
  };
}
