import React from 'react';

const VMMetrics = ({ vmId, metrics }) => {
  if (!metrics) {
    return <div className="bg-white p-4 rounded shadow mt-4">Loading metrics...</div>;
  }

  return (
    <div className="bg-white p-4 rounded shadow mt-4">
      <h3 className="text-lg font-bold mb-2">VM Metrics - {vmId}</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{metrics.cpuUsage.toFixed(1)}%</div>
          <div className="text-sm text-gray-600">CPU Usage</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{(metrics.memoryUsage / 1024).toFixed(1)} MB</div>
          <div className="text-sm text-gray-600">Memory Usage</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{(metrics.diskUsage / 1024).toFixed(1)} MB</div>
          <div className="text-sm text-gray-600">Disk Usage</div>
        </div>
      </div>
    </div>
  );
};

export default VMMetrics;