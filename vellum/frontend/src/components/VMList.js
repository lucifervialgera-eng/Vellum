import React, { useState } from 'react';

const VMList = ({ vms, onSelect, onCreate, onStart, onStop }) => {
  const [newVM, setNewVM] = useState({ id: '', kernelPath: '', initrdPath: '', memoryMB: 256, vcpus: 1 });

  const handleCreate = () => {
    onCreate(newVM);
    setNewVM({ id: '', kernelPath: '', initrdPath: '', memoryMB: 256, vcpus: 1 });
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-4">VM Instances</h2>
      <ul className="mb-4">
        {vms.map(vm => (
          <li key={vm.id} className="flex justify-between items-center p-2 border-b">
            <span>{vm.id} ({vm.state})</span>
            <div>
              <button
                onClick={() => onStart(vm.id)}
                className="bg-green-500 text-white px-2 py-1 rounded mr-2"
                disabled={vm.state === 'Running'}
              >
                Start
              </button>
              <button
                onClick={() => onStop(vm.id)}
                className="bg-red-500 text-white px-2 py-1 rounded mr-2"
                disabled={vm.state !== 'Running'}
              >
                Stop
              </button>
              <button
                onClick={() => onSelect(vm.id)}
                className="bg-blue-500 text-white px-2 py-1 rounded"
              >
                Select
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="border-t pt-4">
        <h3 className="text-lg font-bold mb-2">Create New VM</h3>
        <input
          type="text"
          placeholder="VM ID"
          value={newVM.id}
          onChange={e => setNewVM({...newVM, id: e.target.value})}
          className="w-full p-2 border rounded mb-2"
        />
        <input
          type="text"
          placeholder="Kernel Path"
          value={newVM.kernelPath}
          onChange={e => setNewVM({...newVM, kernelPath: e.target.value})}
          className="w-full p-2 border rounded mb-2"
        />
        <input
          type="text"
          placeholder="Initrd Path (optional)"
          value={newVM.initrdPath}
          onChange={e => setNewVM({...newVM, initrdPath: e.target.value})}
          className="w-full p-2 border rounded mb-2"
        />
        <input
          type="number"
          placeholder="Memory (MB)"
          value={newVM.memoryMB}
          onChange={e => setNewVM({...newVM, memoryMB: parseInt(e.target.value)})}
          className="w-full p-2 border rounded mb-2"
        />
        <input
          type="number"
          placeholder="vCPUs"
          value={newVM.vcpus}
          onChange={e => setNewVM({...newVM, vcpus: parseInt(e.target.value)})}
          className="w-full p-2 border rounded mb-2"
        />
        <button
          onClick={handleCreate}
          className="bg-blue-500 text-white px-4 py-2 rounded w-full"
        >
          Create VM
        </button>
      </div>
    </div>
  );
};

export default VMList;