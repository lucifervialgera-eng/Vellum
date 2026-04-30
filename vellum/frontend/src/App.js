import React, { useState, useEffect } from 'react';
import VMList from './components/VMList';
import VMConsole from './components/VMConsole';
import VMMetrics from './components/VMMetrics';

function App() {
  const [selectedVM, setSelectedVM] = useState(null);
  const [vms, setVMs] = useState([]);
  const [telemetry, setTelemetry] = useState({});

  useEffect(() => {
    fetchVMs();

    // Connect to telemetry WebSocket
    const ws = new WebSocket('ws://localhost:8080/ws/telemetry');
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'metrics') {
        setTelemetry(prev => ({
          ...prev,
          [msg.vmId]: {
            cpuUsage: msg.cpuUsage,
            memoryUsage: msg.memoryUsage,
            diskUsage: msg.diskUsage
          }
        }));
      }
    };

    return () => ws.close();
  }, []);

  const fetchVMs = async () => {
    try {
      const response = await fetch('/api/vm/list');
      const data = await response.json();
      setVMs(data);
    } catch (error) {
      console.error('Failed to fetch VMs:', error);
    }
  };

  const createVM = async (vmData) => {
    try {
      const response = await fetch('/api/vm/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vmData)
      });
      if (response.ok) {
        fetchVMs();
      }
    } catch (error) {
      console.error('Failed to create VM:', error);
    }
  };

  const startVM = async (id) => {
    try {
      await fetch(`/api/vm/${id}/start`, { method: 'POST' });
      fetchVMs();
    } catch (error) {
      console.error('Failed to start VM:', error);
    }
  };

  const stopVM = async (id) => {
    try {
      await fetch(`/api/vm/${id}/stop`, { method: 'POST' });
      fetchVMs();
    } catch (error) {
      console.error('Failed to stop VM:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-2xl font-bold">Vellum Manager</h1>
      </header>
      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <VMList
              vms={vms}
              onSelect={setSelectedVM}
              onCreate={createVM}
              onStart={startVM}
              onStop={stopVM}
            />
            {selectedVM && <VMMetrics vmId={selectedVM} metrics={telemetry[selectedVM]} />}
          </div>
          <div className="lg:col-span-2">
            {selectedVM && <VMConsole vmId={selectedVM} />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;