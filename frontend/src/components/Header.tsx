import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, User, UserPlus, LogIn, Menu, X, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import AuthModal from './AuthModal';

interface HeaderProps {
  onReset?: () => void;
  showReset?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onReset, showReset = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignInClick = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const handleSignUpClick = () => {
    setAuthModalMode('register');
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleTitleClick = () => {
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  // Derive initials for avatar
  const getInitials = () => {
    if (user?.name) {
      const parts = user.name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return user.name.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      {/* ── Sticky Navbar ── */}
      <header className="sticky top-0 z-40 w-full bg-white border-b-2 border-[#FEF3C7] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="container mx-auto flex items-center justify-between px-4 sm:px-8 lg:px-10 h-16 max-w-7xl">
          
          {/* Navbar Brand: Bold Red '08' + 'PROJECT 08' */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer group select-none" 
            onClick={handleTitleClick}
          >
            <span className="text-[28px] font-extrabold text-[#DC2626] leading-none tracking-tight group-hover:scale-105 transition-transform duration-200">
              08
            </span>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold text-[#111827] tracking-[1.5px] uppercase leading-tight font-display">
                Project 08
              </span>
              <span className="text-[10px] text-gray-500 font-medium tracking-wide">
                AI Interview Platform
              </span>
            </div>
          </div>
          
          {/* Desktop Navigation Links */}
          {!isMobile && (
            <nav className="flex items-center gap-8">
              <ul className="flex items-center gap-7 list-none m-0 p-0">
                <li>
                  <button
                    onClick={() => scrollToSection('hero-section')}
                    className="theme-nav-link text-sm font-semibold hover:text-[#DC2626] transition-colors"
                  >
                    Home
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('config-section')}
                    className="theme-nav-link text-sm font-semibold hover:text-[#DC2626] transition-colors"
                  >
                    Practice
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('features-section')}
                    className="theme-nav-link text-sm font-semibold hover:text-[#DC2626] transition-colors"
                  >
                    How It Works
                  </button>
                </li>
              </ul>

              {/* Action Buttons & Avatar */}
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                {showReset && (
                  <Button 
                    variant="outline" 
                    onClick={onReset}
                    className="btn-theme-outline text-xs px-3 py-1.5 h-9"
                  >
                    New Interview
                  </Button>
                )}

                {user ? (
                  <div className="flex items-center gap-2.5">
                    {/* User Avatar Circle */}
                    <div 
                      title={user.name || user.email || 'User'}
                      className="w-9 h-9 rounded-full bg-[#DC2626] text-white flex items-center justify-center text-xs font-bold tracking-wider cursor-pointer hover:bg-[#B91C1C] transition-colors shadow-sm"
                    >
                      {getInitials()}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleLogout}
                      className="text-gray-600 hover:text-[#DC2626] hover:bg-red-50 text-xs px-2.5 h-8 font-medium"
                    >
                      <LogOut className="h-3.5 w-3.5 mr-1" />
                      Logout
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handleSignInClick}
                      className="text-sm font-semibold text-[#111827] hover:text-[#DC2626] px-3 py-1.5 transition-colors"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={handleSignUpClick}
                      className="btn-theme-primary text-xs py-2 px-4 rounded-lg shadow-sm"
                    >
                      Sign Up
                    </button>
                  </div>
                )}
              </div>
            </nav>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        {/* Mobile Menu Overlay */}
        {isMobile && isMobileMenuOpen && (
          <div className="w-full bg-white border-b-2 border-[#FEF3C7] shadow-lg animate-in slide-in-from-top-2 duration-200">
            <div className="container mx-auto p-4 space-y-4">
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => scrollToSection('hero-section')}
                  className="text-left py-2 px-3 text-sm font-semibold text-gray-800 hover:text-[#DC2626] hover:bg-red-50 rounded-lg"
                >
                  Home
                </button>
                <button
                  onClick={() => scrollToSection('config-section')}
                  className="text-left py-2 px-3 text-sm font-semibold text-gray-800 hover:text-[#DC2626] hover:bg-red-50 rounded-lg"
                >
                  Practice
                </button>
                <button
                  onClick={() => scrollToSection('features-section')}
                  className="text-left py-2 px-3 text-sm font-semibold text-gray-800 hover:text-[#DC2626] hover:bg-red-50 rounded-lg"
                >
                  How It Works
                </button>
              </div>

              <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                {user ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#DC2626] text-white flex items-center justify-center text-xs font-bold">
                        {getInitials()}
                      </div>
                      <span className="text-xs font-medium text-gray-700">{user.name || user.email}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleLogout}
                      className="text-xs"
                    >
                      <LogOut className="h-3 w-3 mr-1" />
                      Logout
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { handleSignInClick(); setIsMobileMenuOpen(false); }}
                      className="flex-1 py-2 text-center text-xs font-semibold text-[#111827] border border-gray-300 rounded-lg"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => { handleSignUpClick(); setIsMobileMenuOpen(false); }}
                      className="flex-1 py-2 text-center text-xs font-bold text-white bg-[#DC2626] rounded-lg shadow-sm"
                    >
                      Sign Up
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </>
  );
};

export default Header;
