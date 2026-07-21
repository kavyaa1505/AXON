import { useEffect, useRef } from 'react';
import { Terminal as Xterm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Xterm({
      theme: {
        background: '#1a1a1a', // var(--bg-card)
        foreground: '#f0f0f0', // var(--text-primary)
        cursor: '#7c3aed', // var(--accent)
        selectionBackground: 'rgba(124, 58, 237, 0.3)',
      },
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontSize: 13,
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    term.writeln('\x1b[1;35mGRAVITY IDE \x1b[0m Terminal initialized.');
    term.write('\r\n$ ');

    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-card">
      <div className="px-4 py-1.5 border-b border-border text-xs text-secondary font-semibold">
        TERMINAL
      </div>
      <div className="flex-1 overflow-hidden p-2" ref={terminalRef}></div>
    </div>
  );
}
