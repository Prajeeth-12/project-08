import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import {
  Mic, Code2, Clock, CheckCircle2, ChevronRight, AlertCircle,
  TrendingUp, Target, Calendar, Play, BarChart3, Flame,
  BookOpen, Award, ArrowRight, Bell, Star
} from 'lucide-react';

const API = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8002';

// ── Types ─────────────────────────────────────────────────────────────────

interface AssignedTest {
  id: string;
  title: string;
  company?: string;
  topic: string;
  duration_minutes: number;
  deadline?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  problem_count: number;
}

interface AssignedInterview {
  id: string;
  role: string;
  company?: string;
  style: string;
  duration_minutes: number;
  deadline?: string;
  status: 'pending' | 'completed';
  score?: number;
}

interface Stats {
  interviews_completed: number;
  avg_score: number | null;
  tests_pending: number;
  streak_days: number;
}

// ── Mock data for now (replace with real API when endpoints ready) ─────────
const MOCK_TESTS: AssignedTest[] = [
  { id: 'exam-001', title: 'TCS Digital — DSA Round 1', company: 'TCS', topic: 'Arrays & Strings', duration_minutes: 60, deadline: '2026-10-02T18:00:00', status: 'pending', difficulty: 'Medium', problem_count: 3 },
  { id: 'exam-002', title: 'Infosys SP — Python Basics', company: 'Infosys', topic: 'Python', duration_minutes: 45, deadline: '2026-10-05T10:00:00', status: 'pending', difficulty: 'Easy', problem_count: 2 },
  { id: 'exam-003', title: 'Zoho — Data Structures', company: 'Zoho', topic: 'Linked Lists', duration_minutes: 90, deadline: '2026-09-28T09:00:00', status: 'completed', difficulty: 'Hard', problem_count: 4 },
];

const MOCK_INTERVIEWS: AssignedInterview[] = [
  { id: 'int-001', role: 'Software Engineer', company: 'Wipro', style: 'Technical', duration_minutes: 30, deadline: '2026-10-03T14:00:00', status: 'pending' },
  { id: 'int-002', role: 'Backend Developer', company: 'HCL', style: 'Formal', duration_minutes: 20, deadline: '2026-10-06T11:00:00', status: 'pending' },
  { id: 'int-003', role: 'Full Stack Developer', company: 'Cognizant', style: 'Technical', duration_minutes: 30, status: 'completed', score: 78 },
];

// ── Helpers ───────────────────────────────────────────────────────────────

const relativeDate = (iso?: string) => {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 0) return { label: 'Expired', urgent: true };
  if (hrs < 24) return { label: `${hrs}h left`, urgent: true };
  const days = Math.floor(hrs / 24);
  return { label: `${days}d left`, urgent: days <= 2 };
};

const diffColor = (d: string) =>
  d === 'Easy' ? 'text-green-600 bg-green-50' :
  d === 'Medium' ? 'text-amber-600 bg-amber-50' :
  'text-red-600 bg-red-50';

const statusBadge = (s: string) =>
  s === 'completed' ? 'text-green-700 bg-green-50 border-green-200' :
  s === 'expired'   ? 'text-gray-500 bg-gray-50 border-gray-200' :
  s === 'in_progress' ? 'text-blue-700 bg-blue-50 border-blue-200' :
  'text-[#92400E] bg-[#FEF3C7] border-[#EAB308]/40';

// ── Sub-components ────────────────────────────────────────────────────────

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string }> =
  ({ icon, label, value, sub, color = '#DC2626' }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15`, color }}>
      {icon}
    </div>
    <div>
      <p className="text-xl font-black text-[#111827] leading-tight">{value}</p>
      <p className="text-xs text-[#6B7280] font-medium">{label}</p>
      {sub && <p className="text-[10px] text-[#9CA3AF]">{sub}</p>}
    </div>
  </div>
);

const TestCard: React.FC<{ test: AssignedTest }> = ({ test }) => {
  const navigate = useNavigate();
  const dl = relativeDate(test.deadline);
  const isDone = test.status === 'completed';
  const isExpired = test.status === 'expired' || (dl?.urgent && dl?.label === 'Expired');

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 border-b-[3px] p-5 transition-all hover:shadow-md ${
      isDone ? 'border-b-green-400 opacity-75' : isExpired ? 'border-b-gray-300' : 'border-b-[#EAB308] hover:-translate-y-0.5'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {test.company && (
              <span className="text-[10px] font-bold text-[#DC2626] bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                {test.company}
              </span>
            )}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diffColor(test.difficulty)}`}>
              {test.difficulty}
            </span>
          </div>
          <h3 className="text-sm font-bold text-[#111827] leading-tight">{test.title}</h3>
          <p className="text-xs text-[#6B7280] mt-0.5">{test.topic} · {test.problem_count} problems · {test.duration_minutes} min</p>
        </div>
        <span className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-lg border capitalize ${statusBadge(test.status)}`}>
          {test.status.replace('_', ' ')}
        </span>
      </div>

      <div className="flex items-center justify-between">
        {dl && !isDone ? (
          <div className={`flex items-center gap-1 text-xs font-semibold ${dl.urgent ? 'text-[#DC2626]' : 'text-[#6B7280]'}`}>
            {dl.urgent && <AlertCircle size={12} />}
            <Clock size={11} /> {dl.label}
          </div>
        ) : isDone ? (
          <div className="flex items-center gap-1 text-xs font-semibold text-green-600">
            <CheckCircle2 size={12} /> Completed
          </div>
        ) : <div />}

        {!isDone && !isExpired && (
          <button onClick={() => navigate(`/exam/${test.id}`)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all shadow-sm hover:shadow-[0_4px_12px_rgba(220,38,38,0.3)]">
            <Play size={11} /> Attempt <ChevronRight size={11} />
          </button>
        )}
      </div>
    </div>
  );
};

const InterviewCard: React.FC<{ interview: AssignedInterview }> = ({ interview }) => {
  const navigate = useNavigate();
  const dl = relativeDate(interview.deadline);
  const isDone = interview.status === 'completed';

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 border-b-[3px] p-5 transition-all hover:shadow-md ${
      isDone ? 'border-b-green-400 opacity-75' : 'border-b-[#EAB308] hover:-translate-y-0.5'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {interview.company && (
              <span className="text-[10px] font-bold text-[#DC2626] bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                {interview.company}
              </span>
            )}
            <span className="text-[10px] font-semibold text-[#6B7280] bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
              {interview.style}
            </span>
          </div>
          <h3 className="text-sm font-bold text-[#111827]">{interview.role}</h3>
          <p className="text-xs text-[#6B7280] mt-0.5">{interview.duration_minutes} min · AI Voice Interview</p>
        </div>
        {isDone && interview.score !== undefined ? (
          <div className="shrink-0 text-right">
            <div className="text-lg font-black text-[#111827]">{interview.score}%</div>
            <div className="text-[10px] text-green-600 font-semibold">Score</div>
          </div>
        ) : (
          <span className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-lg border ${statusBadge(interview.status)}`}>
            {interview.status}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        {dl && !isDone ? (
          <div className={`flex items-center gap-1 text-xs font-semibold ${dl.urgent ? 'text-[#DC2626]' : 'text-[#6B7280]'}`}>
            {dl.urgent && <AlertCircle size={12} />}
            <Clock size={11} /> {dl.label}
          </div>
        ) : isDone ? (
          <div className="flex items-center gap-1 text-xs font-semibold text-green-600">
            <CheckCircle2 size={12} /> Completed
          </div>
        ) : <div />}

        {!isDone && (
          <button onClick={() => navigate(`/interview?session=${interview.id}`)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-bold transition-all shadow-sm">
            <Mic size={11} /> Start <ChevronRight size={11} />
          </button>
        )}
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────

const CandidateHomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const firstName = user?.name?.split(' ')[0] || 'Student';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const pendingTests = MOCK_TESTS.filter(t => t.status === 'pending').length;
  const pendingInterviews = MOCK_INTERVIEWS.filter(i => i.status === 'pending').length;
  const completedInterviews = MOCK_INTERVIEWS.filter(i => i.status === 'completed').length;
  const avgScore = MOCK_INTERVIEWS.filter(i => i.score).reduce((s, i) => s + (i.score || 0), 0) / (completedInterviews || 1);

  const stats: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string }[] = [
    { icon: <BarChart3 size={18} />, label: 'Interviews Done', value: completedInterviews, sub: 'this semester', color: '#DC2626' },
    { icon: <Star size={18} />, label: 'Avg Score', value: completedInterviews ? `${Math.round(avgScore)}%` : '—', sub: 'across sessions', color: '#EAB308' },
    { icon: <Target size={18} />, label: 'Tests Pending', value: pendingTests + pendingInterviews, sub: 'due this week', color: '#8B5CF6' },
    { icon: <Flame size={18} />, label: 'Streak', value: '3 days', sub: 'keep it up!', color: '#F97316' },
  ];

  const urgentItems = [
    ...MOCK_TESTS.filter(t => t.status === 'pending').map(t => ({ ...t, type: 'test' as const })),
    ...MOCK_INTERVIEWS.filter(i => i.status === 'pending').map(i => ({ ...i, type: 'interview' as const })),
  ].filter(item => {
    const dl = relativeDate((item as any).deadline);
    return dl && !dl.label.includes('Expired');
  }).slice(0, 2);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      {/* Hero greeting strip — uses the landing page yellow gradient */}
      <div className="relative overflow-hidden px-4 sm:px-8 py-8"
        style={{ background: 'linear-gradient(135deg, #FFFFFF 0%, #FEF9E7 50%, #FEF3C7 100%)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#92400E] mb-1">{greeting},</p>
            <h1 className="text-2xl sm:text-3xl font-black text-[#111827]">{firstName} 👋</h1>
            <p className="text-sm text-[#6B7280] mt-1">
              {pendingTests + pendingInterviews > 0
                ? `You have ${pendingTests + pendingInterviews} pending assignment${pendingTests + pendingInterviews > 1 ? 's' : ''} this week.`
                : 'All caught up! Start a practice session.'}
            </p>
          </div>
        </div>
        {/* Subtle decorative circles matching landing page aesthetic */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#EAB308]/10 blur-xl" />
        <div className="absolute right-16 bottom-0 w-20 h-20 rounded-full bg-[#DC2626]/5 blur-lg" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Urgent due soon — alert strip */}
        {urgentItems.length > 0 && (
          <div className="bg-[#FEF3C7] border border-[#EAB308]/50 rounded-2xl p-4 flex items-center gap-3">
            <Bell size={16} className="text-[#92400E] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#92400E]">Coming up soon</p>
              <p className="text-xs text-[#92400E]/80 truncate">
                {urgentItems.map(i => (i as any).title || (i as any).role).join(' · ')}
              </p>
            </div>
            <ChevronRight size={14} className="text-[#92400E] shrink-0" />
          </div>
        )}

        {/* Main 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Assigned Coding Tests */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Code2 size={16} className="text-[#DC2626]" />
                <h2 className="text-sm font-black text-[#111827]">Coding Tests</h2>
                <span className="text-[10px] font-bold text-[#DC2626] bg-red-50 px-1.5 py-0.5 rounded-full">
                  {MOCK_TESTS.filter(t => t.status === 'pending').length} pending
                </span>
              </div>
              <Link to="/coding" className="text-xs text-[#6B7280] hover:text-[#DC2626] font-semibold flex items-center gap-0.5 transition-colors">
                Practice <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-3">
              {MOCK_TESTS.map(test => <TestCard key={test.id} test={test} />)}
            </div>
          </section>

          {/* Assigned AI Interviews */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Mic size={16} className="text-[#DC2626]" />
                <h2 className="text-sm font-black text-[#111827]">AI Interviews</h2>
                <span className="text-[10px] font-bold text-[#DC2626] bg-red-50 px-1.5 py-0.5 rounded-full">
                  {MOCK_INTERVIEWS.filter(i => i.status === 'pending').length} pending
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {MOCK_INTERVIEWS.map(interview => <InterviewCard key={interview.id} interview={interview} />)}
            </div>
          </section>
        </div>

        {/* Bottom action row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-6">
          {[
            { icon: <BookOpen size={16} />, label: 'View my scores', sub: 'Track progress', to: '/profile?tab=scorecard', color: '#8B5CF6' },
            { icon: <Award size={16} />, label: 'Resume & profile', sub: 'Keep it updated', to: '/profile?tab=resume', color: '#10B981' },
            { icon: <BarChart3 size={16} />, label: 'My results', sub: 'Past submissions', to: '/profile?tab=history', color: '#F97316' },
          ].map(({ icon, label, sub, to, color }) => (
            <Link key={label} to={to}
              className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15`, color }}>
                {icon}
              </div>
              <div>
                <p className="text-xs font-bold text-[#111827] group-hover:text-[#DC2626] transition-colors">{label}</p>
                <p className="text-[10px] text-[#9CA3AF]">{sub}</p>
              </div>
              <ChevronRight size={13} className="ml-auto text-gray-300 group-hover:text-[#DC2626] transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CandidateHomePage;
