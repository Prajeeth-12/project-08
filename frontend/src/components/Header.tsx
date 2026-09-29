import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, Mic, Menu, X, LayoutDashboard, Code2, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface HeaderProps {
  onReset?: () => void;
  showReset?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onReset, showReset = false }) => {
  const { user, logout, isAuthenticated, isCandidate, isFaculty, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getInitials = () => {
    if (user?.name) {
      const p = user.name.trim().split(' ');
      return p.length >= 2 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : user.name.slice(0, 2).toUpperCase();
    }
    return user?.email?.slice(0, 2).toUpperCase() ?? 'U';
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  // Role-aware nav links
  const navLinks = isAuthenticated ? [
    ...(isCandidate ? [
      { to: '/interview', label: 'Interview', icon: <Mic size={14} /> },
      { to: '/coding',    label: 'Coding',    icon: <Code2 size={14} /> },
    ] : []),
    ...((isFaculty || isAdmin) ? [
      { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
    ] : []),
  ] : [
    { to: '/#hero-section',     label: 'Home',       icon: null },
    { to: '/#config-section',   label: 'Practice',   icon: null },
    { to: '/#features-section', label: 'How it Works', icon: null },
  ];

  const handleNavClick = (to: string) => {
    setMobileOpen(false);
    if (to.startsWith('/#')) {
      navigate('/');
      setTimeout(() => {
        const id = to.replace('/#', '');
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      navigate(to);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-8 h-16">

        {/* Brand */}
        <Link to={isAuthenticated ? (isCandidate ? '/interview' : '/dashboard') : '/'} className="flex items-center gap-2.5 group select-none">
          <div className="w-8 h-8 rounded-xl bg-[#DC2626] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <Mic size={16} className="text-white" />
          </div>
          <div>
            <div className="text-[13px] font-black text-[#111827] leading-tight tracking-tight">AI Interview Agent</div>
            <div className="text-[9px] text-[#6B7280] font-medium tracking-wider uppercase leading-none">St. Joseph's CE</div>
          </div>
        </Link>

        {/* Desktop nav */}
        {!isMobile && (
          <nav className="flex items-center gap-1">
            {navLinks.map(link => (
              <button key={link.to} onClick={() => handleNavClick(link.to)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive(link.to) && !link.to.startsWith('/#')
                    ? 'text-[#DC2626] bg-red-50'
                    : 'text-[#6B7280] hover:text-[#111827] hover:bg-gray-50'
                }`}>
                {link.icon}{link.label}
              </button>
            ))}
          </nav>
        )}

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {showReset && (
            <button onClick={onReset}
              className="hidden sm:flex text-xs font-semibold text-[#6B7280] hover:text-[#DC2626] border border-gray-200 hover:border-[#DC2626]/30 px-3 py-1.5 rounded-lg transition-all">
              New Interview
            </button>
          )}

          {isAuthenticated && user ? (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-7 h-7 rounded-full bg-[#DC2626] text-white text-xs font-bold flex items-center justify-center">
                  {getInitials()}
                </div>
                {!isMobile && (
                  <div className="text-left">
                    <div className="text-xs font-semibold text-[#111827] leading-tight">{user.name?.split(' ')[0] || 'User'}</div>
                    <div className="text-[10px] text-[#6B7280] capitalize leading-tight">{user.role}</div>
                  </div>
                )}
                <ChevronDown size={12} className={`text-[#6B7280] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-gray-100 shadow-lg py-1 z-50">
                  <div className="px-3 py-2 border-b border-gray-50">
                    <div className="text-xs font-bold text-[#111827] truncate">{user.name || user.email}</div>
                    <div className="text-[10px] text-[#6B7280] capitalize">{user.role} account</div>
                  </div>
                  <button onClick={() => { setUserMenuOpen(false); navigate('/profile'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#374151] hover:bg-gray-50 hover:text-[#DC2626] transition-colors">
                    <User size={13} />Profile
                  </button>
                  <button onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#374151] hover:bg-gray-50 hover:text-[#DC2626] transition-colors">
                    <Settings size={13} />Settings
                  </button>
                  <div className="border-t border-gray-50 mt-1" />
                  <button onClick={() => { setUserMenuOpen(false); logout(); navigate('/login'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#DC2626] hover:bg-red-50 transition-colors">
                    <LogOut size={13} />Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="text-sm font-semibold text-[#6B7280] hover:text-[#111827] px-3 py-1.5 transition-colors">
                Sign In
              </Link>
              <Link to="/register" className="text-sm font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] px-4 py-1.5 rounded-lg shadow-sm transition-all">
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          {isMobile && (
            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 ml-1">
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      {isMobile && mobileOpen && (
        <div className="bg-white border-t border-gray-100 px-4 py-3 space-y-1">
          {navLinks.map(link => (
            <button key={link.to} onClick={() => handleNavClick(link.to)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isActive(link.to) && !link.to.startsWith('/#')
                  ? 'text-[#DC2626] bg-red-50'
                  : 'text-[#374151] hover:bg-gray-50'
              }`}>
              {link.icon}{link.label}
            </button>
          ))}
          {isAuthenticated && (
            <>
              <button onClick={() => { setMobileOpen(false); navigate('/profile'); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#374151] hover:bg-gray-50">
                <User size={14} />Profile
              </button>
              <button onClick={() => { setMobileOpen(false); navigate('/settings'); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#374151] hover:bg-gray-50">
                <Settings size={14} />Settings
              </button>
              <button onClick={() => { setMobileOpen(false); logout(); navigate('/login'); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#DC2626] hover:bg-red-50">
                <LogOut size={14} />Sign out
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
