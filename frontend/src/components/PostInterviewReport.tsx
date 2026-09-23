import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  ExternalLink, Brain, Search, Loader2, CheckCircle, AlertCircle, 
  Globe, Video, FileText, GraduationCap, Target, 
  TrendingUp, Award, Lightbulb, Zap, ArrowRight, 
  Circle, Square, Triangle, Hexagon, Activity, Eye, Database,
  Code, Users, MessageSquare, BarChart3, Timer, Sparkles,
  Compass, Map, BookMarked, Telescope, Radar, Layers, Play,
  Filter, Cpu, Network, Scan, Bot,
  Clock, Mic, Volume2, Heart, Waves, Atom, Orbit, User,
  Github, Mail, Home
} from 'lucide-react';
import { PerTurnFeedbackItem } from '../services/api';

interface PostInterviewReportProps {
  perTurnFeedback: PerTurnFeedbackItem[];
  finalSummary: {
    status: 'loading' | 'completed' | 'error';
    data?: {
      patterns_tendencies?: string;
      strengths?: string;
      weaknesses?: string;
      improvement_focus_areas?: string;
      resource_search_topics?: string[];
      recommended_resources?: any[];
    };
    error?: string;
  };
  resources: {
    status: 'loading' | 'completed' | 'error';
    data?: any[];
    error?: string;
  };
  onStartNewInterview: () => void;
  onGoHome: () => void;
}

// Advanced particle system for immersive backgrounds
interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  pulsation: number;
  rotation: number;
  rotationSpeed: number;
}

// Enhanced floating orb system
interface FloatingOrb {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  speed: number;
  direction: number;
  pulse: number;
}

// FIXED: Add interface for search timeline stages
interface SearchStage {
  id: number;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  duration: number; // Duration in seconds for this stage
  color: string;
}

const PostInterviewReport: React.FC<PostInterviewReportProps> = ({
  perTurnFeedback,
  finalSummary,
  resources,
  onStartNewInterview,
  onGoHome,
}) => {
  // Advanced state management
  const [currentView, setCurrentView] = useState<'overview' | 'analysis' | 'resources'>('overview');
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [scrollY, setScrollY] = useState(0);
  const [isIntersecting, setIsIntersecting] = useState<Record<string, boolean>>({});
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floatingOrbs, setFloatingOrbs] = useState<FloatingOrb[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  const [timingControl, setTimingControl] = useState({
    summaryStartTime: Date.now(),
    resourcesStartTime: Date.now(),
    summaryForceLoading: false,
    resourcesForceLoading: false,
    actualSummaryData: null as any,
    actualResourcesData: null as any[],
  });

  // Feedback form state


  // FIXED: Search progress state for Perplexity-style timeline
  const [searchProgress, setSearchProgress] = useState({
    currentStage: 0,
    progress: 0,
    elapsedTime: 0,
    stages: [
      {
        id: 0,
        label: "Analyzing Interview Context",
        description: "Understanding your performance and identifying skill gaps",
        icon: Brain,
        duration: 3,
        color: "blue"
      },
      {
        id: 1, 
        label: "Building Search Queries",
        description: "Crafting targeted search queries based on your interview context",
        icon: Search,
        duration: 3,
        color: "cyan"
      },
      {
        id: 2,
        label: "Searching the Web",
        description: "Querying online resources and databases",
        icon: Database,
        duration: 5,
        color: "emerald"
      },
      {
        id: 3,
        label: "Filtering & Ranking",
        description: "Evaluating relevance and quality of found resources",
        icon: Filter,
        duration: 2,
        color: "purple"
      },
      {
        id: 4,
        label: "Consolidating Results",
        description: "Organizing and personalizing recommendations for you",
        icon: Target,
        duration: 2,
        color: "pink"
      }
    ] as SearchStage[]
  });
  
  // Analysis progress state (simplified for 10-second display)
  const [analysisProgress, setAnalysisProgress] = useState({
    progress: 0,
    currentStep: 'Initializing AI Analysis...',
    elapsedTime: 0
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentSection, setCurrentSection] = useState(0);

  useEffect(() => {
    const now = Date.now();
    setTimingControl(prev => ({
      ...prev,
      summaryStartTime: now,
      resourcesStartTime: now,
      summaryForceLoading: false,
      resourcesForceLoading: false,
    }));
  }, []);

  useEffect(() => {
    if (finalSummary.status === 'completed' && finalSummary.data && !timingControl.actualSummaryData) {
      setTimingControl(prev => ({
        ...prev,
        actualSummaryData: finalSummary.data,
        summaryForceLoading: false,
      }));
    }
    if (resources.status === 'completed' && resources.data && !timingControl.actualResourcesData) {
      setTimingControl(prev => ({
        ...prev,
        actualResourcesData: resources.data,
        resourcesForceLoading: false,
      }));
    }
  }, [finalSummary, resources, timingControl.actualSummaryData, timingControl.actualResourcesData]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const summaryElapsed = (now - timingControl.summaryStartTime) / 1000;
      const resourcesElapsed = (now - timingControl.resourcesStartTime) / 1000;

      if (finalSummary.status === 'loading') {
        const steps = [
          'Initializing AI Analysis...',
          'Processing conversation patterns...',
          'Identifying key strengths...',
          'Analyzing improvement areas...',
          'Generating insights...',
          'Finalizing recommendations...'
        ];
        const stepIndex = Math.min(Math.floor(summaryElapsed / 5), steps.length - 1);

        setAnalysisProgress({
          progress: Math.min(summaryElapsed * 3, 95),
          currentStep: steps[stepIndex],
          elapsedTime: summaryElapsed
        });
      }

      if (resources.status === 'loading') {
        let cumulativeTime = 0;
        let currentStage = 0;

        for (let i = 0; i < searchProgress.stages.length; i++) {
          cumulativeTime += searchProgress.stages[i].duration;
          if (resourcesElapsed <= cumulativeTime) {
            currentStage = i;
            break;
          }
        }

        setSearchProgress(prev => ({
          ...prev,
          currentStage,
          progress: Math.min(resourcesElapsed * 5, 95),
          elapsedTime: resourcesElapsed
        }));
      }
    }, 200);

    return () => clearInterval(interval);
  }, [timingControl.summaryStartTime, timingControl.resourcesStartTime, finalSummary.status, resources.status, searchProgress.stages]);

  // Enhanced mouse tracking with smoothing
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  }, []);

  // Advanced scroll tracking
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      
      // Determine current section based on scroll position
      const sections = ['overview', 'analysis', 'resources'];
      const sectionHeight = window.innerHeight;
      const newSection = Math.floor(window.scrollY / sectionHeight);
      setCurrentSection(Math.min(newSection, sections.length - 1));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Dynamic particle system
  useEffect(() => {
    const createParticles = () => {
      const summaryLoading = timingControl.summaryForceLoading || finalSummary.status === 'loading';
      const resourcesLoading = timingControl.resourcesForceLoading || resources.status === 'loading';
      const count = (summaryLoading || resourcesLoading) ? 20 : 8;
      
      return Array.from({ length: count }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        color: summaryLoading ? 'blue' : resourcesLoading ? 'green' : 'purple',
        life: 1,
        pulsation: Math.random() * Math.PI * 2,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.1
      }));
    };

    setParticles(createParticles());

    const animationLoop = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        x: (p.x + p.vx + 100) % 100,
        y: (p.y + p.vy + 100) % 100,
        pulsation: p.pulsation + 0.1,
        rotation: p.rotation + p.rotationSpeed,
        life: Math.max(0, p.life - 0.005)
      })).filter(p => p.life > 0));
    }, 50);

    return () => clearInterval(animationLoop);
  }, [timingControl.summaryForceLoading, timingControl.resourcesForceLoading, finalSummary.status, resources.status]);

  // Floating orbs system
  useEffect(() => {
    const createOrbs = () => {
      return Array.from({ length: 5 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 200 + 100,
        color: ['cyan', 'purple', 'pink', 'blue', 'green'][i],
        opacity: Math.random() * 0.3 + 0.1,
        speed: Math.random() * 0.5 + 0.2,
        direction: Math.random() * Math.PI * 2,
        pulse: Math.random() * Math.PI * 2
      }));
    };

    setFloatingOrbs(createOrbs());

    const orbAnimation = setInterval(() => {
      setFloatingOrbs(prev => prev.map(orb => ({
        ...orb,
        x: (orb.x + Math.cos(orb.direction) * orb.speed + 100) % 100,
        y: (orb.y + Math.sin(orb.direction) * orb.speed + 100) % 100,
        pulse: orb.pulse + 0.05,
        direction: orb.direction + 0.01
      })));
    }, 100);

    return () => clearInterval(orbAnimation);
  }, []);

  // Time tracking for animations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Custom handler for Go Home button - navigates to hero section
  const handleGoHome = () => {
    // Reset interview state
    onGoHome();
    
    // Scroll to top (hero section) after a small delay to ensure page has loaded
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };



  // Revolutionary background system with multiple layers
  const renderAdvancedBackground = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient that responds to mouse */}
      <div 
        className="absolute inset-0 transition-all duration-1000 ease-out"
        style={{
          background: `
            radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, 
              rgba(220, 38, 38, 0.06) 0%, 
              rgba(234, 179, 8, 0.05) 25%, 
              rgba(236, 72, 153, 0.08) 50%, 
              transparent 75%),
            radial-gradient(circle at ${100 - mousePosition.x}% ${100 - mousePosition.y}%, 
              rgba(34, 197, 94, 0.12) 0%, 
              rgba(234, 179, 8, 0.04) 30%, 
              transparent 60%),
            linear-gradient(135deg, 
              #FFFFFF 0%, 
              #FEF3C7 25%, 
              #FAFAFA 50%, 
              #FEF3C7 75%, 
              #FFFFFF 100%)
          `
        }}
      />

      {/* Floating orbs removed per design request */}

      {/* Dynamic particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: particle.color === 'blue' ? '#DC2626' : 
                       particle.color === 'green' ? '#EAB308' : '#FEF3C7',
            borderRadius: '50%',
            opacity: particle.life * (0.4 + 0.6 * Math.sin(particle.pulsation)),
            boxShadow: `0 0 ${particle.size * 2}px currentColor`,
            transform: `rotate(${particle.rotation}rad) scale(${0.5 + 0.5 * Math.sin(particle.pulsation * 2)})`
          }}
        />
      ))}

      {/* Parallax geometric shapes */}
      <div 
        className="absolute inset-0"
        style={{ transform: `translateY(${scrollY * 0.1}px)` }}
      >
        <Circle className="absolute top-1/4 left-1/6 w-6 h-6 text-[#DC2626]/20 animate-pulse" />
        <Square className="absolute top-1/3 right-1/4 w-4 h-4 text-[#DC2626]/20 animate-bounce" />
        <Triangle className="absolute bottom-1/3 left-1/3 w-5 h-5 text-[#DC2626]/20 animate-pulse" />
        <Hexagon className="absolute bottom-1/4 right-1/6 w-7 h-7 text-[#DC2626]/20 animate-bounce" />
      </div>
        </div>
      );

  // FIXED: Elegant loading state for analysis (without fake progress indicators)
  const renderAnalysisLoading = () => (
    <div className="relative">
      {/* Main analysis card */}
      <div className="bg-white border border-gray-200 border-b-[3px] border-b-[#EAB308] shadow-[0_2px_8px_rgba(0,0,0,0.05)] rounded-2xl p-6 relative overflow-hidden">
        {/* Static background - removed shimmer animation */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: `
              linear-gradient(45deg, 
                rgba(220, 38, 38, 0.05) 0%, 
                rgba(234, 179, 8, 0.05) 50%, 
                rgba(220, 38, 38, 0.03) 100%)
            `
          }}
        />
        
        <div className="relative z-10 space-y-8">
          {/* AI Brain Header */}
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-20 h-20">
              <div className="w-20 h-20 rounded-full bg-[#DC2626] flex items-center justify-center shadow-md">
                <Brain className="w-10 h-10 text-white animate-pulse" />
              </div>
              <div className="absolute -inset-2 rounded-full border-2 border-[#DC2626]/20 animate-ping" />
              <div className="absolute -inset-4 rounded-full border border-[#EAB308]/15 animate-pulse" />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-[#111827]">
                AI Coach Analyzing
              </h3>
              <p className="text-[#6B7280] text-lg">Deep analysis of your interview performance</p>
            </div>
          </div>

          {/* Current step without time/progress */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-3 px-6 py-3 bg-black/40 rounded-2xl border border-[#EAB308]/20">
              <Activity className="w-5 h-5 text-[#DC2626] animate-spin" />
              <span className="text-[#92400E] font-medium">{analysisProgress.currentStep}</span>
            </div>
          </div>

          {/* Analysis modules - simplified without progress indicators */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: MessageSquare, label: 'Response Analysis' },
              { icon: TrendingUp, label: 'Pattern Recognition' },
              { icon: Award, label: 'Strength Identification' },
              { icon: Target, label: 'Improvement Areas' }
            ].map((module, index) => {
              const isActive = analysisProgress.progress > (index * 25);
              return (
                <div 
                  key={index}
                  className={`flex items-center space-x-3 p-4 rounded-xl transition-all duration-500 ${
                    isActive 
                      ? 'bg-[#FEF3C7]/50 border border-[#DC2626]/30' 
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <module.icon className={`w-6 h-6 ${
                    isActive ? 'text-[#DC2626]' : 'text-gray-500'
                  }`} />
                  <span className={`text-sm font-medium ${
                    isActive ? 'text-[#92400E]' : 'text-gray-500'
                  }`}>
                    {module.label}
                  </span>
                  {isActive && (
                    <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // FIXED: Perplexity-style resource search loading with timeline (without fake progress indicators)
  const renderSearchLoading = () => {
    const currentStageData = searchProgress.stages[searchProgress.currentStage];
    
    return (
      <div className="relative">
        {/* Main search card */}
        <div className="bg-white border border-gray-200 border-b-[3px] border-b-[#EAB308] shadow-[0_2px_8px_rgba(0,0,0,0.05)] rounded-2xl p-6 relative overflow-hidden">
          {/* Static background - removed shimmer animation */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              background: `
                linear-gradient(45deg, 
                  rgba(254, 243, 199, 0.3) 0%, 
                  rgba(6, 182, 212, 0.1) 50%, 
                  rgba(220, 38, 38, 0.05) 100%)
              `
            }}
          />
          
                  <div className="relative z-10 space-y-6">
          {/* Search Agent Header */}
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-16 h-16">
              <div className="w-16 h-16 rounded-full bg-[#DC2626] flex items-center justify-center shadow-md">
                <Search className="w-8 h-8 text-white animate-bounce" />
              </div>
              <div className="absolute -inset-2 rounded-full border-2 border-[#EAB308]/30 animate-ping" />
              <div className="absolute -inset-4 rounded-full border border-[#EAB308]/15 animate-pulse" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[#111827]">
                AI Search Agent Active
              </h3>
              <p className="text-[#6B7280]">Curating personalized learning resources</p>
            </div>
          </div>

          {/* Current stage without time/progress */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center space-x-3 px-5 py-2 bg-black/40 rounded-xl border border-[#EAB308]/20">
              <currentStageData.icon className="w-4 h-4 text-[#DC2626] animate-pulse" />
              <span className="text-[#92400E] font-medium text-sm">{currentStageData.label}</span>
            </div>
            <p className="text-[#6B7280] text-xs">{currentStageData.description}</p>
          </div>

                      {/* Perplexity-style timeline with proper alignment */}
            <div className="space-y-4">
              {/* Timeline container with improved alignment */}
              <div className="relative max-w-3xl mx-auto">
                {/* Timeline line positioned for better alignment */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                
                {/* Progress line */}
                <div 
                  className="absolute left-6 top-0 w-0.5 bg-gradient-to-b from-[#DC2626] to-[#EAB308] transition-all duration-300"
                  style={{ 
                    height: `${(searchProgress.currentStage / (searchProgress.stages.length - 1)) * 100}%`
                  }}
                ></div>
                
                {/* Timeline stages with proper spacing */}
                <div className="space-y-4">
                  {searchProgress.stages.map((stage, index) => {
                    const isActive = index === searchProgress.currentStage;
                    const isCompleted = index < searchProgress.currentStage;
                    const isPending = index > searchProgress.currentStage;
                    
                    return (
                      <div key={stage.id} className="relative flex items-start">
                        {/* Timeline dot - properly centered without redundant checkmark */}
                        <div className="flex-shrink-0 relative">
                          <div className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                            isCompleted 
                              ? 'bg-emerald-400 border-emerald-400' 
                              : isActive 
                                ? 'bg-cyan-400 border-cyan-400 animate-pulse shadow-md' 
                                : 'bg-gray-600 border-gray-600'
                          }`}>
                          </div>
                        </div>
                        
                        {/* Stage content with proper alignment */}
                        <div className={`ml-6 flex-1 transition-all duration-300 ${
                          isActive ? 'opacity-100' : isPending ? 'opacity-50' : 'opacity-75'
                        }`}>
                          <div className="flex items-center space-x-3 mb-2">
                            <stage.icon className={`w-5 h-5 ${
                              isCompleted ? 'text-[#DC2626]' : isActive ? 'text-[#DC2626]' : 'text-gray-500'
                            }`} />
                            <h4 className={`text-lg font-medium ${
                              isCompleted ? 'text-[#92400E]' : isActive ? 'text-[#92400E]' : 'text-gray-500'
                            }`}>
                              {stage.label}
                            </h4>
                            {isActive && (
                              <span className="px-2 py-1 text-xs bg-[#FEF3C7] text-[#92400E] rounded-lg animate-pulse">
                                Active
                              </span>
                            )}
                            {isCompleted && (
                              <span className="px-2 py-1 text-xs bg-green-50 text-[#92400E] rounded-lg">
                                Complete
                              </span>
                            )}
                          </div>
                          <p className={`text-sm leading-relaxed ${
                            isActive ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            {stage.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };



  // Footer Section
  const renderFooter = () => (
    <footer className="mt-16 w-full">
      <div className="bg-[#DC2626] text-white text-center py-5 px-6 text-sm sm:text-base font-bold tracking-wide">
        St. Joseph's College of Engineering &mdash; Project 08 Placement Drive &amp; AI Mock Interview Platform
      </div>
      <div className="bg-[#111827] text-[#9CA3AF] text-center py-4 px-6 text-xs">
        <span>&copy; 2026 Project 08. All rights reserved.</span>
      </div>
    </footer>
  );

  // ✨ Clean Minimal Resource List
  const renderSearchResults = (actualResourcesData: any[]) => (
    <div className="relative">
      {/* Clean header */}
      <div className="text-center mb-16">
        <h3 className="text-3xl font-bold text-[#111827] mb-4">
          Learning Resources
        </h3>
        <p className="text-[#6B7280] text-sm">AI-curated resources based on your interview performance</p>
      </div>

      {/* Minimal list layout */}
      <div className="max-w-4xl mx-auto space-y-1">
        {actualResourcesData.map((resource: any, index: number) => (
          <div 
            key={index}
            className="group relative border-l-2 border-transparent hover:border-[#DC2626]/40 transition-all duration-300"
          >
            {/* Clean row container */}
            <div className="flex items-start space-x-4 p-6 hover:bg-[#FEF3C7]/30 transition-colors duration-300 rounded-r-xl">
              
              {/* Resource type badge */}
              <div className="flex-shrink-0 mt-1">
                {resource.resource_type && (
                  <span className="inline-block px-3 py-1 text-xs font-medium bg-[#FEF3C7] text-[#92400E] rounded-full border border-[#EAB308]/30">
                    {resource.resource_type}
                  </span>
                )}
              </div>

              {/* Content area */}
              <div className="flex-1 min-w-0">
                {/* Title and link */}
                <div className="mb-3">
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link inline-flex items-center"
                  >
                    <h4 className="text-lg font-medium text-white group-hover/link:text-[#92400E] transition-colors duration-300 mr-2">
                      {resource.title}
                    </h4>
                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover/link:text-[#DC2626] opacity-60 group-hover/link:opacity-100 transition-all duration-300" />
                  </a>
                </div>

                {/* Reasoning */}
                {resource.reasoning && (
                  <div className="flex items-start space-x-2 text-sm">
                    <Target className="w-4 h-4 text-[#DC2626] mt-0.5 flex-shrink-0" />
                    <p className="text-[#4B5563] leading-relaxed">
                      <span className="text-[#92400E] font-medium">Why this helps: </span>
                      {resource.reasoning}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Subtle separator line */}
            {index < actualResourcesData.length - 1 && (
              <div className="ml-6 mr-6 h-px bg-gradient-to-r from-transparent via-gray-700/50 to-transparent" />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // ✨ Revolutionary turn-wise feedback display - Conversation timeline with advanced visual design
  const renderInnovativeFeedback = (perTurnFeedback: any[]) => (
    <div className="relative">
      {/* Background artistic elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-32 left-20 w-24 h-24 bg-[#DC2626]/5 rounded-full blur-3xl animate-pulse delay-300" />
        <div className="absolute bottom-40 right-32 w-32 h-32 bg-[#EAB308]/5 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute top-20 right-20 w-20 h-20 bg-[#DC2626]/5 rounded-full blur-2xl animate-pulse delay-1000" />
      </div>



      {/* Innovative conversation timeline */}
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Central conversation river */}
        <div className="relative">
          {/* Main conversation flow line */}
          <div className="absolute left-1/2 transform -translate-x-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-[#DC2626]/20 via-[#EAB308]/20 to-[#DC2626]/20"></div>
          
          {/* Conversation bubbles */}
          <div className="space-y-8">
            {perTurnFeedback.map((item, index) => {
              
              return (
                <div key={index} className="relative">
                  {/* Timeline node with question number */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full bg-[#DC2626] flex items-center justify-center shadow-2xl z-20 border-4 border-white shadow-md">
                    <span className="text-white font-bold text-lg">{index + 1}</span>
                  </div>

                  {/* Question bubble (left side, attached to center line) */}
                  <div className="pt-20 mb-2">
                    <div className="flex">
                      <div className="relative max-w-md mr-2 ml-auto" style={{ marginRight: 'calc(50% + 0.125rem)' }}>
                        {/* Question container */}
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-br from-[#DC2626]/5 to-[#DC2626]/10 rounded-3xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity duration-500"></div>
                          <div className="relative bg-gradient-to-br from-black/60 via-purple-900/30 to-purple-800/30 backdrop-blur-xl border border-[#DC2626]/20 rounded-3xl p-6 shadow-2xl">
                            {/* Interviewer badge */}
                            <div className="flex items-center space-x-2 mb-3">
                              <div className="w-6 h-6 rounded-full bg-[#DC2626] flex items-center justify-center">
                                <Bot className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-xs font-semibold text-[#92400E] uppercase tracking-wide">Interviewer</span>
                            </div>
                            <p className="text-[#111827] leading-relaxed text-sm">{item.question}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Answer bubble (right side, attached to center line) */}
                  <div className="mb-4">
                    <div className="flex">
                      <div className="relative max-w-md ml-2 mr-auto" style={{ marginLeft: 'calc(50% + 0.125rem)' }}>
                        {/* Answer container */}
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-br from-[#EAB308]/5 to-[#EAB308]/10 rounded-3xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity duration-500"></div>
                          <div className="relative bg-gradient-to-br from-black/60 via-blue-900/30 to-cyan-800/30 backdrop-blur-xl border border-[#EAB308]/20 rounded-3xl p-6 shadow-2xl">
                            {/* User badge */}
                            <div className="flex items-center space-x-2 mb-3">
                              <div className="w-6 h-6 rounded-full bg-[#EAB308] flex items-center justify-center">
                                <User className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-xs font-semibold text-[#92400E] uppercase tracking-wide">Your Response</span>
                            </div>
                            <p className="text-[#111827] leading-relaxed text-sm">{item.answer}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Coach Feedback (center, simplified to match other bubbles) */}
                  <div className="flex justify-center mb-4">
                    <div className="relative max-w-4xl w-full">
                      {/* Simplified coaching feedback container */}
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FEF3C7]/30 to-[#FEF3C7]/50 rounded-3xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity duration-500"></div>
                        <div className="relative bg-gradient-to-br from-black/60 via-yellow-900/30 to-orange-900/30 backdrop-blur-xl border border-[#EAB308]/20 rounded-3xl p-6 shadow-2xl">
                          {/* Simple AI Coach badge (consistent with other bubbles) */}
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-[#EAB308] flex items-center justify-center">
                              <Brain className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-[#92400E] uppercase tracking-wide">AI Coach Analysis</span>
                          </div>
                          
                          {/* Simple feedback content */}
                          <p className="text-[#111827] leading-relaxed text-sm">{item.feedback}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress indicator between conversations */}
                  {index < perTurnFeedback.length - 1 && (
                    <div className="flex justify-center mb-8">
                      <div className="w-16 h-1 bg-gradient-to-r from-transparent via-[#EAB308]/50 to-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // Rest of component implementation continues...
  return (
    <div 
      ref={containerRef}
      className="min-h-screen relative"
      onMouseMove={handleMouseMove}
    >
      {/* Advanced background system */}
      {renderAdvancedBackground()}
      
      {/* Main content with revolutionary layout */}
      <div className="relative z-10 min-h-screen">
        
        {/* Minimal Hero Section */}
        <section className="py-12 sm:py-16 px-3 sm:px-4 md:px-8 relative">
          <div className="max-w-2xl sm:max-w-3xl lg:max-w-4xl mx-auto">
            {/* Compact header */}
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-[#DC2626] mb-4 sm:mb-6 shadow-lg">
                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 px-4 sm:px-0">
                <span className="text-[#111827]">
                  Interview Analysis Report
                </span>
              </h1>
              
              <p className="text-[#6B7280] text-sm sm:text-base max-w-lg sm:max-w-xl mx-auto px-4 sm:px-0">
                AI-powered insights into your interview performance
              </p>
            </div>

            {/* Compact navigation buttons */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-3 sm:gap-4">
              {[
                { 
                  id: 'analysis', 
                  label: 'Performance Analysis', 
                  icon: Brain, 
                  status: (timingControl.summaryForceLoading || finalSummary.status === 'loading') ? 'loading' as const : 
                         (timingControl.actualSummaryData || finalSummary.status === 'completed') ? 'completed' as const : 
                         finalSummary.status 
                },
                { 
                  id: 'resources', 
                  label: 'Learning Resources', 
                  icon: Search, 
                  status: (timingControl.resourcesForceLoading || resources.status === 'loading') ? 'loading' as const : 
                         (timingControl.actualResourcesData || resources.status === 'completed') ? 'completed' as const : 
                         resources.status 
                },
                { 
                  id: 'feedback', 
                  label: 'Turn-by-Turn Feedback', 
                  icon: MessageSquare, 
                  status: 'completed' as const 
                }
              ].map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    const element = document.getElementById(section.id);
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`group relative inline-flex items-center justify-center space-x-3 px-4 sm:px-6 py-3 backdrop-blur-xl border rounded-lg sm:rounded-xl transition-all duration-300 hover:scale-105 min-h-[48px] w-full sm:w-auto ${
                    section.status === 'completed' 
                      ? 'bg-green-50 border-green-200 hover:border-green-400' 
                      : section.status === 'loading' 
                        ? 'bg-[#FEF3C7] border-[#EAB308]/30 hover:border-[#EAB308]' 
                        : 'bg-white border-gray-200 hover:border-cyan-400/40'
                  }`}
                >
                  {/* Status indicator */}
                  <div className="flex-shrink-0">
                    {section.status === 'loading' ? (
                      <div className="w-2 h-2 bg-[#EAB308] rounded-full animate-pulse"></div>
                    ) : section.status === 'completed' ? (
                      <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    ) : (
                      <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                    )}
                  </div>
                  
                  {/* Icon */}
                  <section.icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${
                    section.status === 'completed' 
                      ? 'text-[#92400E] group-hover:text-[#92400E]' 
                      : section.status === 'loading' 
                        ? 'text-[#92400E] group-hover:text-[#92400E]' 
                        : 'text-[#6B7280] group-hover:text-[#DC2626]'
                  }`} />
                  
                  {/* Label */}
                  <span className={`text-sm font-medium transition-colors ${
                    section.status === 'completed' 
                      ? 'text-[#92400E] group-hover:text-[#111827]' 
                      : section.status === 'loading' 
                        ? 'text-[#92400E] group-hover:text-[#111827]' 
                        : 'text-white group-hover:text-[#DC2626]'
                  }`}>
                    {section.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Analysis section */}
        <section id="analysis" className="min-h-screen flex items-center px-3 sm:px-4 md:px-8 py-12 sm:py-16">
          <div className="w-full max-w-3xl sm:max-w-4xl lg:max-w-6xl mx-auto">
            {(timingControl.summaryForceLoading || finalSummary.status === 'loading') && renderAnalysisLoading()}
            {!timingControl.summaryForceLoading && (timingControl.actualSummaryData || (finalSummary.status === 'completed' && finalSummary.data)) && (
              <div className="space-y-6 sm:space-y-8">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-[#111827] mb-8 sm:mb-12 px-4 sm:px-0">
                  Performance Analysis
                </h2>
                
                {/* Analysis results grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                  {/* Patterns & Tendencies */}
                  <div className="bg-white border border-gray-200 border-b-[3px] border-b-[#EAB308] shadow-[0_2px_8px_rgba(0,0,0,0.05)] rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-8">
                    <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-6">
                      <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-[#DC2626]" />
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#111827]">Observed Patterns</h3>
                    </div>
                    <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                      {(timingControl.actualSummaryData?.patterns_tendencies || finalSummary.data?.patterns_tendencies) || 'No specific patterns identified.'}
                    </p>
                  </div>

                  {/* Strengths */}
                  <div className="bg-white border border-gray-200 border-b-[3px] border-b-[#EAB308] shadow-[0_2px_8px_rgba(0,0,0,0.05)] rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-8">
                    <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-6">
                      <Award className="w-6 h-6 sm:w-8 sm:h-8 text-[#DC2626]" />
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#111827]">Key Strengths</h3>
                    </div>
                    <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                      {(timingControl.actualSummaryData?.strengths || finalSummary.data?.strengths) || 'No specific strengths identified.'}
                    </p>
                  </div>

                  {/* Areas for Development */}
                  <div className="bg-white border border-gray-200 border-b-[3px] border-b-[#EAB308] shadow-[0_2px_8px_rgba(0,0,0,0.05)] rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-8">
                    <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-6">
                      <Target className="w-6 h-6 sm:w-8 sm:h-8 text-[#EAB308]" />
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#111827]">Development Areas</h3>
                    </div>
                    <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                      {(timingControl.actualSummaryData?.weaknesses || finalSummary.data?.weaknesses) || 'No specific weaknesses identified.'}
                    </p>
                  </div>

                  {/* Improvement Focus */}
                  <div className="bg-white border border-gray-200 border-b-[3px] border-b-[#EAB308] shadow-[0_2px_8px_rgba(0,0,0,0.05)] rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-8">
                    <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-6">
                      <Lightbulb className="w-6 h-6 sm:w-8 sm:h-8 text-[#DC2626]" />
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#111827]">Focus Areas</h3>
                    </div>
                    <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                      {(timingControl.actualSummaryData?.improvement_focus_areas || finalSummary.data?.improvement_focus_areas) || 'No specific focus areas identified.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {finalSummary.status === 'error' && (
              <div className="text-center space-y-4 sm:space-y-6">
                <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-[#DC2626] mx-auto" />
                <h3 className="text-xl sm:text-2xl font-bold text-[#DC2626]">Analysis Error</h3>
                <p className="text-[#DC2626] text-sm sm:text-base px-4 sm:px-0">{finalSummary.error}</p>
              </div>
            )}
          </div>
        </section>

        {/* Resources section */}
        <section id="resources" className="min-h-screen flex items-center px-4 md:px-8 py-8">
          <div className="w-full max-w-5xl mx-auto">
            {(timingControl.resourcesForceLoading || resources.status === 'loading') && renderSearchLoading()}
            {!timingControl.resourcesForceLoading && (timingControl.actualResourcesData || (resources.status === 'completed' && resources.data)) && 
              renderSearchResults(timingControl.actualResourcesData || resources.data)
            }
            {!timingControl.resourcesForceLoading && resources.status === 'error' && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-[#DC2626]/10 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-[#DC2626]" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#DC2626] mb-2">Resource Search Failed</h3>
                  <p className="text-[#6B7280] max-w-md mx-auto">
                    {resources.error || 'Unable to find learning resources at this time. Please try again later.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Feedback section */}
        <section id="feedback" className="min-h-screen flex items-center px-4 md:px-8 py-16">
          <div className="w-full max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center text-[#111827] mb-12">
              Detailed Feedback
            </h2>
            
            {perTurnFeedback && perTurnFeedback.length > 0 ? (
              renderInnovativeFeedback(perTurnFeedback)
            ) : (
              <div className="text-center space-y-6">
                <MessageSquare className="w-16 h-16 text-gray-500 mx-auto" />
                <h3 className="text-2xl font-bold text-gray-400">No Detailed Feedback</h3>
                <p className="text-gray-500">No turn-by-turn feedback available for this session.</p>
              </div>
            )}
          </div>
        </section>

        {/* Call to action section */}
        <section className="py-16 px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="w-20 h-20 rounded-full bg-[#DC2626] flex items-center justify-center mx-auto shadow-2xl">
              <Zap className="w-10 h-10 text-white" />
            </div>
            
            <h3 className="text-3xl font-bold text-[#111827]">Ready for Your Next Challenge?</h3>
            <p className="text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto">
              Apply what you've learned and practice again to improve further.
            </p>
            
            {/* Two action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button
                onClick={handleGoHome}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-lg font-semibold px-8 py-4 rounded-2xl shadow-2xl hover:shadow-[0_4px_14px_rgba(220,38,38,0.3)] transition-all duration-300 group border-0"
              >
                <Home className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                <span>Go Home</span>
              </Button>

              <Button
                onClick={onStartNewInterview}
                size="lg"
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-lg font-semibold px-8 py-4 rounded-2xl shadow-2xl hover:shadow-[0_4px_14px_rgba(220,38,38,0.3)] transition-all duration-300 group border-0"
              >
                <span>Start New Interview</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
                      </div>
          </section>

          {/* Footer */}
          {renderFooter()}
        </div>



        {/* Custom styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shimmer {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }

          @keyframes float {
            0%, 100% { 
              transform: translate(0, 0) rotate(0deg); 
            }
            33% { 
              transform: translate(10px, -10px) rotate(120deg); 
            }
            66% { 
              transform: translate(-5px, 5px) rotate(240deg); 
            }
          }

          @keyframes pulseGlow {
            0%, 100% { 
              box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
              transform: scale(1);
            }
            50% { 
              box-shadow: 0 0 40px rgba(34, 197, 94, 0.6);
              transform: scale(1.05);
            }
          }

          @keyframes slideInFromLeft {
            0% {
              opacity: 0;
              transform: translateX(-50px);
            }
            100% {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes slideInFromRight {
            0% {
              opacity: 0;
              transform: translateX(50px);
            }
            100% {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes bounceIn {
            0% {
              opacity: 0;
              transform: scale(0.3) translateY(50px);
            }
            50% {
              opacity: 1;
              transform: scale(1.1) translateY(-10px);
            }
            100% {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          
          .line-clamp-3 {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          /* Enhanced scrollbar styling */
          ::-webkit-scrollbar {
            width: 8px;
          }
          
          ::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
          }
          
          ::-webkit-scrollbar-thumb {
            background: linear-gradient(to bottom, #DC2626, #EAB308);
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(to bottom, #B91C1C, #92400E);
          }
        `
      }} />
    </div>
  );
};

export default PostInterviewReport; 