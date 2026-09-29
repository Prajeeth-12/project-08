import React, { useState, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSEBGuard } from '@/hooks/useSEBGuard';
import { useAuth } from '@/contexts/AuthContext';
import {
  Shield, Clock, AlertTriangle, Maximize2, CheckCircle2,
  Monitor, Wifi, Eye, ArrowRight, X, Code2
} from 'lucide-react';

const MonacoEditor = lazy(() => import('@/components/team_a/MonacoEditor').then(m => ({ default: m.default ?? m.MonacoEditor })));

type Phase = 'instructions' | 'preflight' | 'exam' | 'disqualified' | 'submitted';

const API = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8002';

// Mock problem for now — will come from /api/exams/:id
const MOCK_PROBLEM = {
  title: 'TCS Digital — DSA Round 1',
  company: 'TCS',
  duration_minutes: 60,
  max_infractions: 3,
  problems: [
    {
      id: 'p1', title: 'Two Sum', difficulty: 'Easy',
      description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Example 1:
  Input: nums = [2,7,11,15], target = 9
  Output: [0,1]
  Explanation: nums[0] + nums[1] = 9

Example 2:
  Input: nums = [3,2,4], target = 6
  Output: [1,2]

Constraints:
  2 ≤ nums.length ≤ 10⁴
  -10⁹ ≤ nums[i] ≤ 10⁹`,
    },
    {
      id: 'p2', title: 'Reverse a Linked List', difficulty: 'Easy',
      description: `Given the head of a singly linked list, reverse the list, and return the reversed list.

Example:
  Input: head = [1,2,3,4,5]
  Output: [5,4,3,2,1]`,
    },
    {
      id: 'p3', title: 'Merge Intervals', difficulty: 'Medium',
      description: `Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals, and return an array of the non-overlapping intervals.

Example:
  Input: [[1,3],[2,6],[8,10],[15,18]]
  Output: [[1,6],[8,10],[15,18]]`,
    },
  ],
};

// ── Instructions Screen ───────────────────────────────────────────────────
const InstructionsScreen: React.FC<{ exam: typeof MOCK_PROBLEM; onNext: () => void; onBack: () => void }> = ({ exam, onNext, onBack }) => (
  <div className="min-h-screen bg-white flex flex-col">
    <div className="max-w-2xl mx-auto px-4 py-12 flex-1 flex flex-col justify-center">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 mb-4">
          <Shield size={14} className="text-[#DC2626]" />
          <span className="text-xs font-bold text-[#DC2626] uppercase tracking-wider">Formal Assessment</span>
        </div>
        <h1 className="text-2xl font-black text-[#111827] mb-1">{exam.title}</h1>
        {exam.company && <p className="text-sm text-[#6B7280]">{exam.company} · {exam.problems.length} Problems · {exam.duration_minutes} minutes</p>}
      </div>

      <div className="bg-[#FAFAFA] rounded-2xl border border-gray-200 p-6 space-y-5 mb-8">
        <h2 className="text-sm font-black text-[#111827] mb-4">Before you begin — read carefully</h2>

        {[
          { icon: <Maximize2 size={16} />, title: 'Fullscreen required', desc: 'The test runs in fullscreen mode. Exiting fullscreen counts as an infraction.', color: '#DC2626' },
          { icon: <Eye size={16} />, title: 'Tab monitoring active', desc: `Switching tabs or windows is detected. You get ${exam.max_infractions} infractions maximum before auto-disqualification.`, color: '#F97316' },
          { icon: <Clock size={16} />, title: `${exam.duration_minutes} minute time limit`, desc: 'The timer starts when you enter the exam. It cannot be paused.', color: '#8B5CF6' },
          { icon: <Monitor size={16} />, title: 'Use only this window', desc: 'Do not open documentation, IDE, or any other window. Copy-paste from external sources is considered malpractice.', color: '#6B7280' },
        ].map(({ icon, title, desc, color }) => (
          <div key={title} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${color}15`, color }}>
              {icon}
            </div>
            <div>
              <p className="text-xs font-bold text-[#111827]">{title}</p>
              <p className="text-xs text-[#6B7280] leading-relaxed mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-[#6B7280] hover:bg-gray-50 font-semibold transition-all">
          <X size={14} /> Cancel
        </button>
        <button onClick={onNext}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm shadow-md hover:shadow-[0_4px_16px_rgba(220,38,38,0.3)] transition-all">
          I understand — Continue <ArrowRight size={15} />
        </button>
      </div>
    </div>
  </div>
);

// ── Preflight Check ───────────────────────────────────────────────────────
const PreflightScreen: React.FC<{ onStart: () => void; onBack: () => void }> = ({ onStart, onBack }) => {
  const [checks] = useState([
    { label: 'Browser compatible', ok: true },
    { label: 'Stable internet connection', ok: true },
    { label: 'Camera not required', ok: true },
    { label: 'Fullscreen supported', ok: !!document.documentElement.requestFullscreen },
  ]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
            <Wifi size={22} className="text-green-600" />
          </div>
          <h2 className="text-xl font-black text-[#111827]">System Check</h2>
          <p className="text-sm text-[#6B7280] mt-1">Verifying your environment before the exam</p>
        </div>

        <div className="bg-[#FAFAFA] rounded-2xl border border-gray-200 p-5 space-y-3 mb-6">
          {checks.map(c => (
            <div key={c.label} className="flex items-center justify-between">
              <span className="text-sm text-[#374151]">{c.label}</span>
              {c.ok
                ? <CheckCircle2 size={16} className="text-green-500" />
                : <AlertTriangle size={16} className="text-amber-500" />}
            </div>
          ))}
        </div>

        <div className="bg-[#FEF3C7] border border-[#EAB308]/40 rounded-xl p-4 mb-6 flex items-start gap-2">
          <AlertTriangle size={15} className="text-[#92400E] shrink-0 mt-0.5" />
          <p className="text-xs text-[#92400E] leading-relaxed">
            Clicking "Enter Exam" will request fullscreen. <strong>Do not exit fullscreen</strong> during the test or it will count as an infraction.
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onBack} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-[#6B7280] hover:bg-gray-50 font-semibold transition-all">
            Back
          </button>
          <button onClick={onStart}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm shadow-md transition-all">
            <Maximize2 size={14} /> Enter Exam — Start Fullscreen
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Disqualified Screen ───────────────────────────────────────────────────
const DisqualifiedScreen: React.FC<{ onLeave: () => void }> = ({ onLeave }) => (
  <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center px-4">
    <div className="max-w-md text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-red-900/40 border border-red-700 flex items-center justify-center mx-auto">
        <AlertTriangle size={26} className="text-red-400" />
      </div>
      <h2 className="text-xl font-black text-white">Examination Terminated</h2>
      <p className="text-sm text-slate-400 leading-relaxed">
        You have accumulated 3 security infractions (window blur / tab switch / fullscreen exit).
        Your attempt has been automatically submitted.
      </p>
      <p className="text-xs text-slate-500">This incident has been recorded and reported to your faculty.</p>
      <button onClick={onLeave}
        className="mt-4 px-6 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-bold transition-all">
        Return to Dashboard
      </button>
    </div>
  </div>
);

// ── Submitted Screen ──────────────────────────────────────────────────────
const SubmittedScreen: React.FC<{ onLeave: () => void }> = ({ onLeave }) => (
  <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center px-4">
    <div className="max-w-md text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-green-900/40 border border-green-700 flex items-center justify-center mx-auto">
        <CheckCircle2 size={26} className="text-green-400" />
      </div>
      <h2 className="text-xl font-black text-white">Exam Submitted!</h2>
      <p className="text-sm text-slate-400 leading-relaxed">
        Your answers have been submitted successfully. Results will be available after evaluation.
      </p>
      <button onClick={onLeave}
        className="mt-4 px-6 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white text-sm font-bold transition-all">
        Return to Dashboard
      </button>
    </div>
  </div>
);

// ── Live Exam UI ──────────────────────────────────────────────────────────
const LiveExam: React.FC<{
  exam: typeof MOCK_PROBLEM;
  examId: string;
  userId: string;
  infractionCount: number;
  onSubmit: () => void;
}> = ({ exam, examId, userId, infractionCount, onSubmit }) => {
  const [selectedProblem, setSelectedProblem] = useState(exam.problems[0]);
  const [code, setCode] = useState('# Write your solution here\n\ndef solution():\n    pass\n');
  const [language, setLanguage] = useState('python');
  const [timeLeft, setTimeLeft] = useState(exam.duration_minutes * 60);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<{ status: string; stdout: string; stderr: string } | null>(null);

  React.useEffect(() => {
    const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const urgentTime = timeLeft < 300;

  const runCode = async () => {
    setRunning(true);
    setOutput(null);
    try {
      const r = await fetch(`${API}/execution/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_code: code, language, stdin: '' }),
      });
      const d = await r.json();
      setOutput({ status: d.status, stdout: d.stdout || '', stderr: d.stderr || '' });
    } catch {
      setOutput({ status: 'NETWORK_ERROR', stdout: '', stderr: 'Could not reach execution service.' });
    } finally { setRunning(false); }
  };

  const diffColor = (d: string) => d === 'Easy' ? 'text-green-400' : d === 'Medium' ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="h-screen flex flex-col bg-[#0d0d1a] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#13131f] border-b border-[#2d2d4e] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Shield size={14} className="text-[#EAB308]" />
            <span className="text-xs font-bold text-slate-300">{exam.title}</span>
          </div>
          <div className="w-px h-4 bg-[#2d2d4e]" />
          <span className="text-xs text-slate-500">{exam.company}</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Infraction counter */}
          <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${
            infractionCount > 0 ? 'text-amber-400 bg-amber-900/30 border border-amber-800' : 'text-slate-500 bg-[#1a1a2e] border border-[#2d2d4e]'
          }`}>
            <AlertTriangle size={11} />
            {infractionCount}/{exam.max_infractions} strikes
          </div>
          {/* Timer */}
          <div className={`font-mono text-sm font-bold px-3 py-1 rounded-lg border ${
            urgentTime ? 'text-red-400 bg-red-900/30 border-red-800 animate-pulse' : 'text-slate-300 bg-[#1a1a2e] border-[#2d2d4e]'
          }`}>
            <Clock size={12} className="inline mr-1" />{fmt(timeLeft)}
          </div>
          <button onClick={onSubmit}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all">
            <CheckCircle2 size={12} /> Submit All
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Problem sidebar */}
        <div className="w-48 shrink-0 bg-[#13131f] border-r border-[#2d2d4e] flex flex-col">
          <div className="px-3 py-2.5 border-b border-[#2d2d4e]">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Problems ({exam.problems.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {exam.problems.map((p, i) => (
              <button key={p.id} onClick={() => setSelectedProblem(p)}
                className={`w-full flex flex-col items-start gap-1 px-3 py-3 text-left transition-colors border-l-2 ${
                  selectedProblem.id === p.id ? 'border-[#DC2626] bg-[#DC2626]/10' : 'border-transparent hover:bg-[#1a1a2e]'
                }`}>
                <span className="text-[10px] text-slate-500">Problem {i + 1}</span>
                <span className={`text-xs font-semibold leading-tight ${selectedProblem.id === p.id ? 'text-white' : 'text-slate-300'}`}>{p.title}</span>
                <span className={`text-[9px] font-bold ${diffColor(p.difficulty)}`}>{p.difficulty}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Problem + Editor */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#2d2d4e]">
          <div className="h-[200px] shrink-0 overflow-y-auto bg-[#0d0d1a] border-b border-[#2d2d4e] p-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-black text-white">{selectedProblem.title}</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${diffColor(selectedProblem.difficulty)} bg-opacity-20`}>
                {selectedProblem.difficulty}
              </span>
            </div>
            <pre className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">{selectedProblem.description}</pre>
          </div>
          <div className="flex-1 min-h-0">
            <Suspense fallback={<div className="h-full bg-[#1e1e1e] animate-pulse" />}>
              <MonacoEditor userId={userId} sessionId={examId} questionId={selectedProblem.id} onCodeChange={(c, l) => { setCode(c); setLanguage(l); }} />
            </Suspense>
          </div>
        </div>

        {/* Console panel */}
        <div className="w-64 shrink-0 flex flex-col bg-[#1a1a2e]">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#13131f] border-b border-[#2d2d4e]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Test Console</span>
            <button onClick={runCode} disabled={running}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[10px] font-bold transition-all">
              {running ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Code2 size={11} />}
              {running ? 'Running…' : 'Run'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
            {output ? (
              <div className="space-y-2">
                <div className={`px-2 py-1.5 rounded text-[10px] font-bold ${
                  output.status === 'ACCEPTED' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                }`}>{output.status}</div>
                {output.stdout && <pre className="text-slate-300 whitespace-pre-wrap text-[11px]">{output.stdout}</pre>}
                {output.stderr && <pre className="text-red-300 whitespace-pre-wrap text-[11px]">{output.stderr}</pre>}
              </div>
            ) : (
              <p className="text-slate-600 text-center pt-6 text-[11px]">Click Run to test your code</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main ExamPage ─────────────────────────────────────────────────────────

const ExamPage: React.FC = () => {
  const { examId = 'exam-001' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('instructions');

  const { infractionCount, requestFullscreen } = useSEBGuard({
    examId,
    maxInfractions: MOCK_PROBLEM.max_infractions,
    onDisqualified: () => setPhase('disqualified'),
    onInfraction: () => {}, // count shown in live exam header
  });

  const handleStart = async () => {
    await requestFullscreen();
    setPhase('exam');
  };

  if (phase === 'instructions') return <InstructionsScreen exam={MOCK_PROBLEM} onNext={() => setPhase('preflight')} onBack={() => navigate('/home')} />;
  if (phase === 'preflight') return <PreflightScreen onStart={handleStart} onBack={() => setPhase('instructions')} />;
  if (phase === 'disqualified') return <DisqualifiedScreen onLeave={() => navigate('/home')} />;
  if (phase === 'submitted') return <SubmittedScreen onLeave={() => navigate('/home')} />;

  return (
    <LiveExam
      exam={MOCK_PROBLEM}
      examId={examId}
      userId={user?.id || 'candidate'}
      infractionCount={infractionCount}
      onSubmit={() => setPhase('submitted')}
    />
  );
};

export default ExamPage;
