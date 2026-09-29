import React, { useState } from 'react';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { Mic, MessageSquare, BarChart3, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const VOICES = [
  { id: 'aura-2-asteria-en', label: 'Asteria (Female, Clear)' },
  { id: 'aura-2-orion-en',   label: 'Orion (Male, Professional)' },
  { id: 'aura-2-thalia-en',  label: 'Thalia (Female, Conversational)' },
  { id: 'aura-2-arcas-en',   label: 'Arcas (Male, Calm)' },
  { id: 'aura-2-luna-en',    label: 'Luna (Female, Warm)' },
  { id: 'aura-2-zeus-en',    label: 'Zeus (Male, Confident)' },
];

const STYLES = ['Formal', 'Conversational', 'Technical', 'Challenging'];
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [voice, setVoice] = useState(localStorage.getItem('aia_pref_voice') || 'aura-2-asteria-en');
  const [style, setStyle] = useState(localStorage.getItem('aia_pref_style') || 'Formal');
  const [difficulty, setDifficulty] = useState(localStorage.getItem('aia_pref_difficulty') || 'Intermediate');
  const [duration, setDuration] = useState(Number(localStorage.getItem('aia_pref_duration') || 10));
  const [dirty, setDirty] = useState(false);

  const mark = () => setDirty(true);

  const save = () => {
    localStorage.setItem('aia_pref_voice', voice);
    localStorage.setItem('aia_pref_style', style);
    localStorage.setItem('aia_pref_difficulty', difficulty);
    localStorage.setItem('aia_pref_duration', String(duration));
    setDirty(false);
    toast({ title: 'Preferences saved' });
  };

  const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-white rounded-2xl border border-gray-200 border-b-[3px] border-b-[#EAB308] p-6">
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center">{icon}</div>
        <h2 className="text-sm font-bold text-[#111827]">{title}</h2>
      </div>
      {children}
    </div>
  );

  const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <label className="text-sm text-[#6B7280] font-medium">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-[#111827]">Settings</h1>
          {dirty && (
            <button onClick={save}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-bold transition-all">
              <Save size={14} /> Save changes
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Voice */}
          <Section title="Voice Settings" icon={<Mic size={16} />}>
            <Field label="AI Voice">
              <select value={voice} onChange={e => { setVoice(e.target.value); mark(); }}
                className="text-sm font-semibold text-[#111827] bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#DC2626]">
                {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </Field>
          </Section>

          {/* Interview defaults */}
          <Section title="Interview Defaults" icon={<MessageSquare size={16} />}>
            <Field label="Default style">
              <div className="flex gap-1.5 flex-wrap justify-end">
                {STYLES.map(s => (
                  <button key={s} onClick={() => { setStyle(s); mark(); }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      style === s ? 'bg-[#DC2626] text-white' : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                    }`}>{s}</button>
                ))}
              </div>
            </Field>
            <Field label="Default difficulty">
              <div className="flex gap-1.5">
                {DIFFICULTIES.map(d => (
                  <button key={d} onClick={() => { setDifficulty(d); mark(); }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      difficulty === d ? 'bg-[#DC2626] text-white' : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                    }`}>{d}</button>
                ))}
              </div>
            </Field>
            <Field label={`Default duration: ${duration} min`}>
              <input type="range" min={5} max={30} value={duration} onChange={e => { setDuration(Number(e.target.value)); mark(); }}
                className="w-28 accent-[#DC2626]" />
            </Field>
          </Section>

          {/* Account */}
          <Section title="Account" icon={<BarChart3 size={16} />}>
            <Field label="Name"><span className="text-sm font-semibold text-[#111827]">{user?.name || '—'}</span></Field>
            <Field label="Email"><span className="text-sm font-semibold text-[#111827]">{user?.email || '—'}</span></Field>
            <Field label="Role"><span className="text-sm font-semibold text-[#111827] capitalize">{user?.role || '—'}</span></Field>
            <div className="pt-3">
              <button className="text-sm font-semibold text-[#DC2626] hover:underline">Change password →</button>
            </div>
          </Section>

          {!dirty && (
            <p className="text-xs text-center text-[#9CA3AF]">Changes are saved automatically to your browser preferences.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
