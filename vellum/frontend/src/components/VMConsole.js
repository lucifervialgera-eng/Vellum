import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const VMConsole = ({ vmId }) => {
  const terminalRef = useRef(null);
  const wsRef = useRef(null);
  const terminalInstanceRef = useRef(null);

  useEffect(() => {
    if (!vmId) return;

    const terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#f8f8f2',
      }
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalRef.current);
    fitAddon.fit();

    terminalInstanceRef.current = terminal;

    const ws = new WebSocket(`ws://localhost:8080/ws/console/${vmId}`);
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'output') {
        terminal.write(msg.data);
      }
    };
    ws.onclose = () => {
      console.log('WebSocket closed');
    };
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;

    terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.dispose();
      }
    };
  }, [vmId]);

  useEffect(() => {
    const handleResize = () => {
      if (terminalInstanceRef.current) {
        const fitAddon = terminalInstanceRef.current.loadAddon(new FitAddon());
        fitAddon.fit();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-4">VM Console - {vmId}</h2>
      <div ref={terminalRef} className="w-full h-96 bg-black rounded"></div>
    </div>
  );
};

export default VMConsole;