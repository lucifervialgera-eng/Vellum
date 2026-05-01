import React, { useState } from 'react';

const VMList = ({ vms, onSelect, onCreate, onStart, onStop }) => {
  const [newVM, setNewVM] = useState({ id: '', kernelPath: '', initrdPath: '', diskPath: '', kernelCmdline: '', memoryMB: 256, vcpus: 1 });
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleCreate = () => {
    onCreate(newVM);
    setNewVM({ id: '', kernelPath: '', initrdPath: '', diskPath: '', kernelCmdline: '', memoryMB: 256, vcpus: 1 });
    setAdvancedOpen(false);
  };

  return (
    <div className="w-full text-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-300">Active Instances</h3>
        <span className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30">
          {vms.length} Total
        </span>
      </div>

      <div className="space-y-4 mb-8 max-h-64 overflow-y-auto pr-2">
        {vms.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-dashed border-gray-700 rounded-xl bg-black/20">
            No virtual machines found. Create one below.
          </div>
        ) : (
          vms.map(vm => (
            <div key={vm.id} className="group flex justify-between items-center p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all duration-300 shadow-md">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] ${vm.state === 'Running' ? 'bg-green-400 text-green-400' : 'bg-red-400 text-red-400'}`}></div>
                <div>
                  <h4 className="font-medium text-lg">{vm.id}</h4>
                  <p className="text-xs text-gray-400 opacity-80">{vm.state}</p>
                </div>
              </div>
              
              <div className="flex space-x-2 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onStart(vm.id)}
                  className="bg-green-500/20 hover:bg-green-500/40 text-green-300 border border-green-500/30 px-4 py-1.5 rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={vm.state === 'Running'}
                >
                  Start
                </button>
                <button
                  onClick={() => onStop(vm.id)}
                  className="bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/30 px-4 py-1.5 rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={vm.state !== 'Running'}
                >
                  Stop
                </button>
                <button
                  onClick={() => onSelect(vm.id)}
                  className="bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 border border-blue-500/30 px-4 py-1.5 rounded-lg text-sm transition-all"
                >
                  Manage
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-white/10 pt-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-300">Provision New VM</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="Instance Identifier (ID)"
            value={newVM.id}
            onChange={e => setNewVM({...newVM, id: e.target.value})}
            className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
          />
          <input
            type="text"
            placeholder="Kernel Path (/boot/vmlinuz...)"
            value={newVM.kernelPath}
            onChange={e => setNewVM({...newVM, kernelPath: e.target.value})}
            className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
          />
        </div>

        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="w-full text-left px-4 py-2 text-sm text-purple-400 hover:text-purple-300 mb-4 flex justify-between items-center bg-white/5 rounded-lg border border-white/5 transition-colors"
        >
          <span>{advancedOpen ? '− Hide Advanced Configuration' : '+ Show Advanced Configuration'}</span>
        </button>

        {advancedOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-black/20 rounded-xl border border-white/5 animate-fade-in">
            <input
              type="text"
              placeholder="Initrd Path (optional)"
              value={newVM.initrdPath}
              onChange={e => setNewVM({...newVM, initrdPath: e.target.value})}
              className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
            />
            <input
              type="text"
              placeholder="Disk Image Path (optional)"
              value={newVM.diskPath}
              onChange={e => setNewVM({...newVM, diskPath: e.target.value})}
              className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
            />
            <input
              type="text"
              placeholder="Kernel CMDLine (optional)"
              value={newVM.kernelCmdline}
              onChange={e => setNewVM({...newVM, kernelCmdline: e.target.value})}
              className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all md:col-span-2"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <label className="absolute -top-2 left-3 bg-[#111116] px-1 text-xs text-gray-500">Memory (MB)</label>
            <input
              type="number"
              value={newVM.memoryMB}
              onChange={e => setNewVM({...newVM, memoryMB: parseInt(e.target.value)})}
              className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-gray-200 focus:outline-none focus:border-purple-500/50 transition-all"
            />
          </div>
          <div className="relative">
            <label className="absolute -top-2 left-3 bg-[#111116] px-1 text-xs text-gray-500">vCPUs</label>
            <input
              type="number"
              value={newVM.vcpus}
              onChange={e => setNewVM({...newVM, vcpus: parseInt(e.target.value)})}
              className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-gray-200 focus:outline-none focus:border-purple-500/50 transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleCreate}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold tracking-wide shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all duration-300"
        >
          Initialize Instance
        </button>
      </div>
    </div>
  );
};

export default VMList;