import React, { useState, useEffect } from 'react';
import VMList from './components/VMList';
import VMConsole from './components/VMConsole';
import VMMetrics from './components/VMMetrics';

function App() {
  const [selectedVM, setSelectedVM] = useState(null);
  const [vms, setVMs] = useState([]);
  const [telemetry, setTelemetry] = useState({});
  const [currentPage, setCurrentPage] = useState('HOME');

  useEffect(() => {
    fetchVMs();

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
      if (response.ok) fetchVMs();
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

  const renderContent = () => {
    switch (currentPage) {
      case 'HOME':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-fade-in">
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.4)] animate-glow">
              <span className="text-5xl">⚡</span>
            </div>
            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Vellum Hypervisor
            </h2>
            <p className="text-lg text-gray-400 max-w-lg">
              Experience the next generation of virtualization. Lightweight, real-time, and relentlessly fast.
            </p>
            <div className="flex space-x-4 pt-4">
              <button onClick={() => setCurrentPage('VM')} className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition duration-300 font-semibold shadow-lg backdrop-blur-md border border-white/10">
                Manage VMs
              </button>
            </div>
          </div>
        );
      case 'VM':
        return (
          <div className="flex flex-col h-full space-y-6 animate-fade-in overflow-y-auto pr-2">
            <h2 className="text-3xl font-bold text-gradient mb-2">Virtual Machines</h2>
            <div className="glass-dark rounded-2xl p-6">
              <VMList
                vms={vms}
                onSelect={setSelectedVM}
                onCreate={createVM}
                onStart={startVM}
                onStop={stopVM}
              />
            </div>
            {selectedVM && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-dark rounded-2xl p-6">
                  <VMMetrics vmId={selectedVM} metrics={telemetry[selectedVM]} />
                </div>
                <div className="glass-dark rounded-2xl p-6">
                  <VMConsole vmId={selectedVM} />
                </div>
              </div>
            )}
          </div>
        );
      case 'LOG':
        return (
          <div className="h-full animate-fade-in">
            <h2 className="text-3xl font-bold text-gradient mb-6">System Logs</h2>
            <div className="glass-dark rounded-2xl p-6 h-[80%] font-mono text-sm text-gray-300 overflow-y-auto">
              <p className="text-green-400">[OK] System initialized.</p>
              <p className="text-blue-400">[INFO] KVM module loaded successfully.</p>
              <p className="text-gray-400">Waiting for events...</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const navItems = ['HOME', 'VM', 'LOG'];

  return (
    <div className="flex h-screen w-full overflow-hidden text-gray-100">
      {/* Sidebar */}
      <div className="w-64 glass-dark border-r border-white/10 flex flex-col p-6 shadow-2xl relative z-10">
        <div className="flex items-center space-x-3 mb-12 mt-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="font-bold text-white text-xl">V</span>
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">
            VELLUM
          </h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          {navItems.map(item => (
            <button
              key={item}
              onClick={() => setCurrentPage(item)}
              className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 ${
                currentPage === item 
                  ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-white/10 shadow-[0_0_15px_rgba(139,92,246,0.15)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className={`h-2 w-2 rounded-full mr-3 transition-colors ${currentPage === item ? 'bg-purple-400' : 'bg-transparent'}`}></span>
              <span className="font-medium tracking-wide">{item}</span>
            </button>
          ))}
        </nav>
        
        <div className="mt-auto pt-6 border-t border-white/10">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs text-gray-400">Hypervisor Online</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative z-0 p-8 overflow-hidden flex flex-col">
        {/* Top bar */}
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold text-gray-300 opacity-50 tracking-wider">
            {currentPage} DASHBOARD
          </h2>
          <div className="flex items-center space-x-4">
            <div className="glass-dark px-4 py-2 rounded-full text-sm border border-white/5">
              <span>CPU: <span className="text-blue-400">3%</span></span>
              <span className="mx-3 text-gray-600">|</span>
              <span>MEM: <span className="text-purple-400">2.4 GB</span></span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 relative">
          <div className="absolute inset-0">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;