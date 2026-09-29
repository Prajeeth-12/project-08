import React, { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Mic, Play, CheckCircle2, Clock, ChevronRight, Circle, RotateCcw, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const MonacoEditor = lazy(() => import('@/components/team_a/MonacoEditor').then(m => ({ default: m.default ?? m.MonacoEditor })));

// ── Inline TestConsole (redesigned, no legacy) ─────────────────────────────
const API = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8002';

interface TestResult {
  status: string;
  stdout: string;
  stderr: string;
  executionTime: number;
  memoryUsed: number;
}

const TestConsolePanel: React.FC<{ sourceCode: string; language: string }> = ({ sourceCode, language }) => {
  const [stdin, setStdin] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const r = await fetch(`${API}/execution/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_code: sourceCode, language, stdin }),
      });
      const data = await r.json();
      setResult({ status: data.status, stdout: data.stdout || '', stderr: data.stderr || '',
        executionTime: data.execution_time ?? 0, memoryUsed: data.memory_used ?? 0 });
    } catch {
      setResult({ status: 'NETWORK_ERROR', stdout: '', stderr: 'Could not reach execution service.', executionTime: 0, memoryUsed: 0 });
    } finally { setRunning(false); }
  };

  const statusColor = (s: string) => {
    if (s === 'ACCEPTED') return 'text-green-400 bg-green-900/40 border-green-700';
    if (s === 'WRONG_ANSWER') return 'text-red-400 bg-red-900/40 border-red-700';
    if (s === 'TIME_LIMIT_EXCEEDED') return 'text-amber-400 bg-amber-900/40 border-amber-700';
    return 'text-red-400 bg-red-900/40 border-red-700';
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e] border-l border-[#2d2d4e]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#13131f] border-b border-[#2d2d4e]">
        <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">Test Console</span>
        <button onClick={run} disabled={running || !sourceCode.trim()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500
            disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all">
          {running
            ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
            : <Play size={12} />}
          {running ? 'Running…' : 'Run Code'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-xs">
        {/* Stdin */}
        <div>
          <label className="text-[#6B7280] text-[10px] font-semibold uppercase tracking-wider block mb-1">Standard Input</label>
          <textarea value={stdin} onChange={e => setStdin(e.target.value)} rows={3}
            placeholder="Custom test input…"
            className="w-full bg-[#13131f] text-slate-300 border border-[#2d2d4e] rounded-lg p-2.5 resize-none
              focus:outline-none focus:border-slate-500 placeholder-slate-600 text-xs" />
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-2">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold ${statusColor(result.status)}`}>
              {result.status === 'ACCEPTED' ? <CheckCircle2 size={13} /> : <Circle size={13} />}
              {result.status.replace(/_/g, ' ')}
              <span className="ml-auto font-normal opacity-70">
                {result.executionTime.toFixed(3)}s · {result.memoryUsed} KB
              </span>
            </div>
            {result.stdout && (
              <div className="bg-[#13131f] border border-[#2d2d4e] rounded-lg p-2.5">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Output</div>
                <pre className="text-slate-200 whitespace-pre-wrap text-[11px] leading-relaxed">{result.stdout}</pre>
              </div>
            )}
            {result.stderr && (
              <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-2.5">
                <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1.5">Error</div>
                <pre className="text-red-300 whitespace-pre-wrap text-[11px] leading-relaxed">{result.stderr}</pre>
              </div>
            )}
          </div>
        )}

        {!result && !running && (
          <div className="text-center py-8 text-slate-600">
            <Play size={20} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs">Click Run to execute your code</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Problem list ────────────────────────────────────────────────────────────
// Fallback problems if question bank not yet loaded
const FALLBACK_PROBLEMS = [
  { id: 'q-001', title: 'Two Sum', difficulty: 'Easy', topic: 'Arrays', description: 'Given nums and target, return indices of two numbers that add to target.' },
  { id: 'q-002', title: 'Valid Parentheses', difficulty: 'Easy', topic: 'Stack', description: 'Determine if bracket string is valid.' },
];

const difficultyStyle = (d: string) => {
  if (d === 'Easy') return 'text-green-400 bg-green-900/30';
  if (d === 'Medium') return 'text-amber-400 bg-amber-900/30';
  return 'text-red-400 bg-red-900/30';
};

const CodingPage: React.FC = () => {
  const { user } = useAuth();
  const [problems, setProblems] = useState(FALLBACK_PROBLEMS);
  const [loadingProblems, setLoadingProblems] = useState(true);
  const [selectedProblem, setSelectedProblem] = useState(FALLBACK_PROBLEMS[0]);
  const [code, setCode] = useState('# Write your solution here\n\ndef solution():\n    pass\n');
  const [language, setLanguage] = useState('python');
  const [elapsed, setElapsed] = useState(0);

  // Load real problems from Supabase question bank
  React.useEffect(() => {
    fetch(`${API}/api/questions`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((q: any) => ({
            id: String(q.id),
            title: q.title,
            difficulty: q.difficulty_level || 'Medium',
            topic: q.topic || 'General',
            description: q.description || '',
          }));
          setProblems(mapped);
          setSelectedProblem(mapped[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProblems(false));
  }, []);

  React.useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="h-screen flex flex-col bg-[#0d0d1a] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#13131f] border-b border-[#2d2d4e] shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/interview" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs">
            <ArrowLeft size={14} /> Back
          </Link>
          <div className="w-px h-4 bg-[#2d2d4e]" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-[#DC2626] flex items-center justify-center">
              <Mic size={12} className="text-white" />
            </div>
            <span className="text-white text-xs font-black">AI Interview Agent</span>
          </div>
          <span className="text-slate-500 text-xs">/ Coding Assessment</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono">
            <Clock size={13} />
            <span className={elapsed > 1800 ? 'text-red-400' : ''}>{fmt(elapsed)}</span>
          </div>
          <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all">
            <CheckCircle2 size={12} /> Submit
          </button>
        </div>
      </div>

      {/* 3-panel layout */}
      <div className="flex-1 flex min-h-0">
        {/* Panel 1: Problem list */}
        <div className="w-52 shrink-0 bg-[#13131f] border-r border-[#2d2d4e] flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 border-b border-[#2d2d4e]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Problems</span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {loadingProblems && <div className="px-3 py-2 text-[10px] text-slate-500 animate-pulse">Loading…</div>}
            {problems.map(p => (
              <button key={p.id} onClick={() => setSelectedProblem(p)}
                className={`w-full flex flex-col items-start gap-1 px-3 py-2.5 text-left transition-colors border-l-2 ${
                  selectedProblem.id === p.id
                    ? 'border-[#DC2626] bg-[#DC2626]/10'
                    : 'border-transparent hover:bg-[#1a1a2e]'
                }`}>
                <span className={`text-xs font-semibold leading-tight ${selectedProblem.id === p.id ? 'text-white' : 'text-slate-300'}`}>
                  {p.title}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${difficultyStyle(p.difficulty)}`}>{p.difficulty}</span>
                  <span className="text-[9px] text-slate-500">{p.topic}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Panel 2: Problem + Editor */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#2d2d4e]">
          {/* Problem description */}
          <div className="h-[200px] shrink-0 overflow-y-auto bg-[#0d0d1a] border-b border-[#2d2d4e] p-4">
            <div className="flex items-center gap-2.5 mb-2">
              <h2 className="text-sm font-black text-white">{selectedProblem.title}</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${difficultyStyle(selectedProblem.difficulty)}`}>
                {selectedProblem.difficulty}
              </span>
              <span className="text-[10px] text-slate-500 bg-[#1a1a2e] px-2 py-0.5 rounded-full">{selectedProblem.topic}</span>
            </div>
            <pre className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">{selectedProblem.description}</pre>
          </div>

          {/* Monaco editor */}
          <div className="flex-1 min-h-0">
            <Suspense fallback={<div className="h-full bg-[#1e1e1e] animate-pulse" />}>
              <MonacoEditor
                userId={user?.id || 'demo'}
                sessionId="coding-session"
                questionId={selectedProblem.id}
                onCodeChange={(c, l) => { setCode(c); setLanguage(l); }}
              />
            </Suspense>
          </div>
        </div>

        {/* Panel 3: Test console */}
        <div className="w-72 shrink-0 flex flex-col min-h-0">
          <TestConsolePanel sourceCode={code} language={language} />
        </div>
      </div>
    </div>
  );
};

export default CodingPage;
