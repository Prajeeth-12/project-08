import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Eye, EyeOff, Mic, ArrowRight, AlertCircle, GraduationCap, Users } from 'lucide-react';

const RegisterPage: React.FC = () => {
  const { register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('candidate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'candidate' ? '/home' : '/dashboard', { replace: true });
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError(''); setLoading(true);
    try {
      await register(email, password, name, role);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const roleOptions: { value: UserRole; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: 'candidate', label: 'Candidate', desc: 'Practice interviews & track progress', icon: <GraduationCap size={18} /> },
    { value: 'faculty', label: 'Faculty', desc: 'Manage cohorts & view analytics', icon: <Users size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#111827] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="absolute border border-white rounded-full"
              style={{ width: `${(i+1)*120}px`, height: `${(i+1)*120}px`,
                top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
          ))}
        </div>
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#DC2626] flex items-center justify-center">
              <Mic size={18} className="text-white" />
            </div>
            <span className="text-white font-black text-lg">AI Interview Agent</span>
          </Link>
        </div>
        <div className="relative z-10 space-y-5">
          <h1 className="text-4xl font-black text-white leading-tight">
            Start your journey<br />
            <span className="text-[#EAB308]">to placement success.</span>
          </h1>
          <ul className="space-y-3">
            {['Adaptive AI voice interviews', 'Real-time coaching & feedback', 'Evidence-grounded scoring', 'Placement drive management'].map(f => (
              <li key={f} className="flex items-center gap-2.5 text-gray-400 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308] shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#DC2626]/20 border border-[#DC2626]/30 flex items-center justify-center">
            <span className="text-[#DC2626] text-xs font-bold">SJ</span>
          </div>
          <p className="text-gray-500 text-sm">St. Joseph's College of Engineering</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12">
        <div className="lg:hidden mb-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#DC2626] flex items-center justify-center">
              <Mic size={16} className="text-white" />
            </div>
            <span className="text-[#111827] font-black text-base">AI Interview Agent</span>
          </Link>
        </div>

        <div className="max-w-sm w-full mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-[#111827] mb-2">Create account</h2>
            <p className="text-[#6B7280] text-sm">Free forever for students and faculty</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle size={16} className="text-[#DC2626] shrink-0" />
                <p className="text-sm text-[#DC2626]">{error}</p>
              </div>
            )}

            {/* Role picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#111827]">I am a</label>
              <div className="grid grid-cols-2 gap-2">
                {roleOptions.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setRole(opt.value)}
                    className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                      role === opt.value
                        ? 'border-[#DC2626] bg-red-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                    <div className={`${role === opt.value ? 'text-[#DC2626]' : 'text-gray-400'}`}>{opt.icon}</div>
                    <span className={`text-sm font-bold ${role === opt.value ? 'text-[#DC2626]' : 'text-[#111827]'}`}>{opt.label}</span>
                    <span className="text-xs text-gray-400 leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#111827]">Full name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Prajeeth Kumar" autoComplete="name" required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-[#111827]
                  placeholder-gray-400 focus:outline-none focus:border-[#DC2626] focus:ring-2
                  focus:ring-[#DC2626]/10 transition-all" />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#111827]">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" autoComplete="email" required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-[#111827]
                  placeholder-gray-400 focus:outline-none focus:border-[#DC2626] focus:ring-2
                  focus:ring-[#DC2626]/10 transition-all" />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#111827]">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters" autoComplete="new-password" required
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 text-sm text-[#111827]
                    placeholder-gray-400 focus:outline-none focus:border-[#DC2626] focus:ring-2
                    focus:ring-[#DC2626]/10 transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl
                bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm
                disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm
                hover:shadow-[0_4px_16px_rgba(220,38,38,0.3)]">
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <>Create account <ArrowRight size={16} /></>}
            </button>

            <p className="text-xs text-gray-400 text-center">
              By registering, you agree to our terms and privacy policy.
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-[#6B7280]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#DC2626] font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
