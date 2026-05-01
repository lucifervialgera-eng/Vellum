import React from 'react';

const VMMetrics = ({ vmId, metrics }) => {
  if (!metrics) {
    return <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4" style={{ color: '#e6e2d7' }}>Loading metrics...</div>;
  }

  return (
    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4" style={{ color: '#e6e2d7' }}>
      <h3 className="text-lg font-bold mb-4">VM Metrics - {vmId}</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center bg-gray-800 p-3 rounded border border-gray-700">
          <div className="text-2xl font-bold text-blue-400">{metrics.cpuUsage.toFixed(1)}%</div>
          <div className="text-sm text-gray-400">CPU Usage</div>
        </div>
        <div className="text-center bg-gray-800 p-3 rounded border border-gray-700">
          <div className="text-2xl font-bold text-green-400">{(metrics.memoryUsage / 1024).toFixed(1)} MB</div>
          <div className="text-sm text-gray-400">Memory Usage</div>
        </div>
        <div className="text-center bg-gray-800 p-3 rounded border border-gray-700">
          <div className="text-2xl font-bold text-purple-400">{(metrics.diskUsage / 1024).toFixed(1)} MB</div>
          <div className="text-sm text-gray-400">Disk Usage</div>
        </div>
      </div>
    </div>
  );
};

export default VMMetrics;