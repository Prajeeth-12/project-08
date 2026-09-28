/**
 * AdminDashboard — V4 Institutional Layer.
 * Faculty/admin panel: org stats, cohort overview, placement drives, candidate analytics.
 * Raw transcripts/answers are NEVER shown (anonymised per DPDPA).
 */

import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Building2, Target, TrendingUp, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8001';

async function apiFetch(path: string, token?: string) {
  const r = await fetch(`${API}${path}`, {
    headers: { Authorization: token ? `Bearer ${token}` : '' },
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

interface OrgStats {
  total_candidates: number;
  total_cohorts: number;
  total_drives: number;
  completed_interviews: number;
}

interface CohortRow {
  cohort_name: string;
  total_students: number;
  interviews_completed: number;
  avg_overall_score: number | null;
  avg_readiness: number | null;
}

interface CandidateRow {
  user_id: string;
  name: string;
  total_interviews: number;
  avg_score: number | null;
  avg_readiness: number | null;
  best_band: string | null;
  last_interview_at: string | null;
}

interface DriveRow {
  id: string;
  title: string;
  target_role: string;
  company: string | null;
  status: string;
  allocated_count: number;
  completed_count: number;
}

interface Props {
  orgId: string;
  token?: string;
}

const StatCard: React.FC<{ label: string; value: number | string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
    <div className="w-11 h-11 rounded-xl bg-[#DC2626]/10 flex items-center justify-center text-[#DC2626]">
      {icon}
    </div>
    <div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  </div>
);

const BandBadge: React.FC<{ band: string | null }> = ({ band }) => {
  const colors: Record<string, string> = {
    Exceptional: 'bg-green-100 text-green-700',
    Strong: 'bg-blue-100 text-blue-700',
    Developing: 'bg-amber-100 text-amber-700',
    'Needs Work': 'bg-red-100 text-red-700',
  };
  if (!band) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[band] ?? 'bg-gray-100 text-gray-600'}`}>
      {band}
    </span>
  );
};

export const AdminDashboard: React.FC<Props> = ({ orgId, token }) => {
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [drives, setDrives] = useState<DriveRow[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'candidates' | 'drives'>('overview');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, c, cands, d] = await Promise.all([
        apiFetch(`/orgs/${orgId}/stats`, token),
        apiFetch(`/orgs/${orgId}/analytics/overview`, token),
        apiFetch(`/orgs/${orgId}/analytics/candidates`, token),
        apiFetch(`/orgs/${orgId}/drives`, token),
      ]);
      setStats(s);
      setCohorts(c);
      setCandidates(cands);
      setDrives(d);
    } catch (e) {
      console.error('Dashboard load failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [orgId]);

  if (loading) return (
    <div className="p-8 text-center text-gray-500 animate-pulse">Loading dashboard…</div>
  );

  return (
    <div className="p-6 space-y-6 bg-[#FAFAFA] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Building2 size={24} className="text-[#DC2626]" /> Faculty Dashboard
        </h1>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Students" value={stats.total_candidates} icon={<Users size={18} />} />
          <StatCard label="Cohorts" value={stats.total_cohorts} icon={<BarChart3 size={18} />} />
          <StatCard label="Placement Drives" value={stats.total_drives} icon={<Target size={18} />} />
          <StatCard label="Interviews Done" value={stats.completed_interviews} icon={<TrendingUp size={18} />} />
        </div>
      )}

      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['overview', 'candidates', 'drives'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab ? 'bg-white text-[#DC2626] shadow' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview tab — cohort table */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Cohort Performance</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Cohort</th>
                <th className="px-4 py-3 text-right">Students</th>
                <th className="px-4 py-3 text-right">Interviews</th>
                <th className="px-4 py-3 text-right">Avg Score</th>
                <th className="px-4 py-3 text-right">Avg Readiness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cohorts.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No cohort data yet</td></tr>
              ) : cohorts.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-800">{r.cohort_name}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{r.total_students}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{r.interviews_completed}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    {r.avg_overall_score != null ? `${r.avg_overall_score}/10` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    {r.avg_readiness != null ? `${r.avg_readiness}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Candidates tab */}
      {activeTab === 'candidates' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Candidate Summary</h2>
            <p className="text-xs text-gray-400 mt-0.5">Aggregate scores only — raw answers not shown</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Candidate</th>
                <th className="px-4 py-3 text-right">Interviews</th>
                <th className="px-4 py-3 text-right">Avg Score</th>
                <th className="px-4 py-3 text-right">Readiness</th>
                <th className="px-4 py-3 text-left">Best Band</th>
                <th className="px-4 py-3 text-right">Last Interview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {candidates.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No candidate data yet</td></tr>
              ) : candidates.map(c => (
                <tr key={c.user_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{c.total_interviews}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {c.avg_score != null ? `${c.avg_score}/10` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {c.avg_readiness != null ? `${c.avg_readiness}%` : '—'}
                  </td>
                  <td className="px-4 py-3"><BandBadge band={c.best_band} /></td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs">
                    {c.last_interview_at ? new Date(c.last_interview_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drives tab */}
      {activeTab === 'drives' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-800">Placement Drives</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Drive</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Allocated</th>
                <th className="px-4 py-3 text-right">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {drives.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No drives yet</td></tr>
              ) : drives.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-800">{d.title}</td>
                  <td className="px-4 py-3 text-gray-600">{d.target_role}</td>
                  <td className="px-4 py-3 text-gray-500">{d.company || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      d.status === 'active' ? 'bg-green-100 text-green-700' :
                      d.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{d.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{d.allocated_count}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{d.completed_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
