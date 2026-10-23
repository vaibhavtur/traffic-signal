import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STANDARD = { stop: 60, go: 30 };
const LABEL = { red: 'STOP', orange: 'WAIT', green: 'GO' };
const pad = (n) => String(n).padStart(2, '0');
const fmt = (s) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
const makeCfg = (stop) => ({ stop, go: Math.max(1, Math.round(stop * 0.5)) });
const orangeSecs = (stop) => Math.max(1, Math.round(stop * 0.2));

function Arrow({ dir, glowing, on, onToggle }) {
  const rotations = { up: 0, left: -90, right: 90 };
  const name = dir[0].toUpperCase() + dir.slice(1);
  return (
    <div className={`arrow c-${dir}`}>
      <svg className={`arr ${glowing ? 'glow' : ''}`} viewBox="0 0 48 48" style={{ transform: `rotate(${rotations[dir]}deg)` }} role="img" aria-label={`${name} arrow ${glowing ? 'glowing green' : 'off'}`}>
        <polygon points="24,3 45,28 31,28 31,45 17,45 17,28 3,28" />
      </svg>
      <button className={`sw ${on ? 'on' : ''}`} role="switch" aria-checked={on} aria-label={`${name} arrow switch`} title={`${name} arrow: ${on ? 'on' : 'off'}`} onClick={onToggle}>
        <span className="knob" />
      </button>
    </div>
  );
}

function App() {
  const [cfg, setCfg] = useState(STANDARD);
  const [mode, setMode] = useState('standard');
  const [st, setSt] = useState({ phase: 'stop', rem: STANDARD.stop });
  const [running, setRunning] = useState(true);
  const [arrows, setArrows] = useState({ up: true, left: true, right: true });
  const [inp, setInp] = useState({ min: '1', sec: '0' });
  const [err, setErr] = useState('');
  const next = (s, c) => s.phase === 'stop' ? { phase: 'go', rem: c.go } : { phase: 'stop', rem: c.stop };

  useEffect(() => {
    if (!running) return undefined;
    const id = window.setInterval(() => {
      setSt((s) => s.rem > 1 ? { phase: s.phase, rem: s.rem - 1 } : next(s, cfg));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, cfg]);

  const restart = (c) => setSt({ phase: 'stop', rem: c.stop });
  const skip = () => setSt((s) => next(s, cfg));
  const toggleArrow = (dir) => setArrows((a) => ({ ...a, [dir]: !a[dir] }));
  const chooseMode = (m) => {
    setMode(m);
    if (m === 'standard') {
      setCfg(STANDARD); restart(STANDARD); setErr('');
    } else {
      setInp({ min: String(Math.floor(cfg.stop / 60)), sec: String(cfg.stop % 60) });
    }
  };
  const apply = () => {
    const seconds = (parseInt(inp.min, 10) || 0) * 60 + (parseInt(inp.sec, 10) || 0);
    if (seconds < 5 || seconds > 3599) {
      setErr('Stop countdown must be between 00:05 and 59:59.');
      return;
    }
    const c = makeCfg(seconds);
    setErr(''); setCfg(c); restart(c);
  };
  const resetCustom = () => {
    setInp({ min: '1', sec: '0' });
    setCfg(STANDARD); restart(STANDARD); setErr('');
  };
  const setField = (key) => (e) => setInp((p) => ({ ...p, [key]: e.target.value }));
  const oSecs = orangeSecs(cfg.stop);
  const light = st.phase === 'go' ? 'green' : (st.rem <= oSecs ? 'orange' : 'red');
  const total = st.phase === 'go' ? cfg.go : cfg.stop;
  const pct = Math.min(100, Math.max(0, ((total - st.rem + 1) / total) * 100));
  const go = light === 'green';
  const note = go ? 'Go time left, then the signal turns red' : light === 'orange' ? 'Get ready: green starts at zero' : 'Stop countdown: green starts at zero';

  return (
    <div className="wrap">
      <h1>Traffic Signal Control</h1>
      <main className={`box ${light}`}>
        <section className="signal" aria-label="Traffic signal">
          <div className="rig">
            <Arrow dir="up" glowing={go && arrows.up} on={arrows.up} onToggle={() => toggleArrow('up')} />
            <Arrow dir="left" glowing={go && arrows.left} on={arrows.left} onToggle={() => toggleArrow('left')} />
            <div className="head">
              <div className={`lamp r ${light === 'red' ? 'lit' : ''}`} aria-hidden="true" />
              <div className={`lamp o ${light === 'orange' ? 'lit' : ''}`} aria-hidden="true" />
              <div className={`lamp g ${light === 'green' ? 'lit' : ''}`} aria-hidden="true" />
            </div>
            <Arrow dir="right" glowing={go && arrows.right} on={arrows.right} onToggle={() => toggleArrow('right')} />
          </div>
          <div className="pole" />
        </section>
        <section className="panel">
          <div className="readout">
            <div className="message" role="status">{LABEL[light]}</div>
            <div className="count" role="timer">{fmt(st.rem)}</div>
            <div className="note">{note}</div>
            <div className={`bar ${st.phase === 'go' ? 'gobar' : 'stopbar'}`} aria-hidden="true"><div className="mark" style={{ left: `${pct}%` }} /></div>
            <div className="bar-legend">{st.phase === 'go' ? <><span>Green</span><span>Red next</span></> : <><span>Red 80%</span><span>Orange 20%</span></>}</div>
          </div>
          <div className="controls">
            <div className="row">
              <button className="btn" onClick={() => setRunning(!running)}>{running ? 'Pause' : 'Start'}</button>
              <button className="btn alt" onClick={skip}>Skip</button>
              <button className="btn alt" onClick={() => restart(cfg)}>Reset</button>
            </div>
            <div className="row">
              <div className="seg" role="group" aria-label="Countdown mode">
                <button aria-pressed={mode === 'standard'} onClick={() => chooseMode('standard')}>Standard 1:00</button>
                <button aria-pressed={mode === 'custom'} onClick={() => chooseMode('custom')}>Custom</button>
              </div>
            </div>
            {mode === 'custom' && (
              <div className="custom">
                <label className="field">Stop countdown
                  <span className="inline">
                    <input type="number" inputMode="numeric" min="0" max="59" value={inp.min} onChange={setField('min')} aria-label="Stop minutes" /> min
                    <input type="number" inputMode="numeric" min="0" max="59" value={inp.sec} onChange={setField('sec')} aria-label="Stop seconds" /> sec
                  </span>
                </label>
                <button className="btn" onClick={apply}>Apply</button>
                <button className="btn alt" onClick={resetCustom}>Reset custom</button>
              </div>
            )}
            <div className={`msg ${err ? 'err' : ''}`} role="status">
              {err || `Stop ${fmt(cfg.stop)} (orange for the last ${oSecs}s) · Go ${fmt(cfg.go)} (50% of stop)${running ? '' : ' · Paused'}`}
            </div>
          </div>
        </section>
      </main>
      <footer>Interactive signal simulator · Use the arrow switches to enable or disable directions</footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
