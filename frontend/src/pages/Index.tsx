import React, { useState, useRef, useEffect } from 'react';
import { useInterviewSession } from '@/hooks/useInterviewSession';
import Header from '@/components/Header';
import InterviewSession from '@/components/InterviewSession';
import PostInterviewReport from '@/components/PostInterviewReport';
import BackendDownNotification from '@/components/BackendDownNotification';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles, BarChart3, Bot, BriefcaseBusiness, Building2, FileText, UploadCloud,
  Settings, ArrowRight, Target, CheckCircle,
  Brain, Search, Clock, MessageSquare,
  Mic, Shield, ScrollText
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { InterviewStartRequest, api } from '@/services/api';
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { 
    state,
    messages,
    isLoading,
    results,
    postInterviewState,
    selectedVoice,
    coachFeedbackStates,
    sessionId,
    showSessionWarning,
    sessionTimeRemaining,
    actions
  } = useInterviewSession();
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Backend health check states
  const [isBackendDown, setIsBackendDown] = useState(false);
  const [showBackendNotification, setShowBackendNotification] = useState(false);
  const [hasCheckedBackend, setHasCheckedBackend] = useState(false);
  
  // Configuration state
  const [jobRole, setJobRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeContent, setResumeContent] = useState('');
  const [style, setStyle] = useState<'formal' | 'casual' | 'aggressive' | 'technical'>('formal');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [interviewDuration, setInterviewDuration] = useState(10);
  const [company, setCompany] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showRequiredError, setShowRequiredError] = useState(false);
  
  const heroRef = useRef<HTMLDivElement>(null);
  const configSectionRef = useRef<HTMLDivElement>(null);
  const jobRoleSectionRef = useRef<HTMLDivElement>(null);
  const featuresSectionRef = useRef<HTMLDivElement>(null);

  // Backend health check
  const checkBackendHealth = async () => {
    if (hasCheckedBackend) return;
    
    try {
      setHasCheckedBackend(true);
      await api.checkHealth();
      // Backend is up, no need to show notification
      setIsBackendDown(false);
    } catch (error) {
      // Backend is down, show notification
      setIsBackendDown(true);
      setShowBackendNotification(true);
      console.log('Backend health check failed:', error);
    }
  };

  // Check backend health on component mount
  useEffect(() => {
    checkBackendHealth();
  }, []);

  // Clear required error when user starts typing job role
  useEffect(() => {
    if (jobRole.trim() && showRequiredError) {
      setShowRequiredError(false);
    }
  }, [jobRole, showRequiredError]);

  const scrollToConfig = () => {
    configSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Feature Constellation Data - Interactive floating elements
  const featureConstellation = [
    {
      id: 'interview-agent',
      title: 'AI Interview Agent',
      subtitle: 'Your Personal Interviewer',
      description: 'Experience natural conversations with an AI that adapts to your responses and asks thoughtful follow-up questions.',
      features: [
        'Natural voice conversations',
        'Adapts to the JD and your resume', 
        'Multiple interview styles available'
      ],
      icon: Bot,
      position: { x: 75, y: 30 }, // Percentage positions for responsive layout
      color: '#06b6d4',
      gradient: 'from-cyan-500 to-blue-600',
      glowColor: 'rgba(6, 182, 212, 0.4)',
    },
    {
      id: 'coach-agent', 
      title: 'Real-time Coach Agent',
      subtitle: 'Background Performance Analysis',
      description: 'Get instant feedback on your communication patterns, confidence levels, and areas for improvement.',
      features: [
        'Analyzes your responses',
        'Detects clarity and answer relevance',
        'Provides actionable feedback to improve'
      ],
      icon: Brain,
      position: { x: 20, y: 25 },
      color: '#8b5cf6',
      gradient: 'from-purple-500 to-pink-600',
      glowColor: 'rgba(139, 92, 246, 0.4)',
    },
    {
      id: 'learning-engine',
      title: 'Resource Search Engine', 
      subtitle: 'Personalized Resource Search',
      description: 'Receive curated learning resources and practice recommendations based on your performance.',
      features: [
        'Identifies skill gaps',
        'Search for resources based on your performance',
        'Curated learning resources'
      ],
      icon: Search,
      position: { x: 75, y: 75 },
      color: '#10b981',
      gradient: 'from-emerald-500 to-teal-600',
      glowColor: 'rgba(16, 185, 129, 0.4)',
    },
    {
      id: 'speech-processing',
      title: 'Speech Processing',
      subtitle: 'Advanced Voice Technology', 
      description: 'Powered by Amazon Nova Sonic for real-time voice understanding and natural speech generation.',
      features: [
        'Real-time voice understanding via Nova Sonic',
        'Natural AI voice responses',
        'Bidirectional streaming for real-time voice'
      ],
      icon: Mic,
      position: { x: 25, y: 70 },
      color: '#f97316',
      gradient: 'from-orange-500 to-red-600',
      glowColor: 'rgba(249, 115, 22, 0.4)',
    },
    {
      id: 'data-security',
      title: 'Database',
      subtitle: 'Your Session Data Protected',
      description: 'Secure cloud storage with Supabase ensures your interview data remains private and protected.',
      features: [
        'Secure cloud storage in Supabase',
        'Row-level security for data access control',
        'Session data persistence and recovery'
      ],
      icon: Shield,
      position: { x: 50, y: 85 },
      color: '#22c55e',
      gradient: 'from-green-500 to-emerald-600',
      glowColor: 'rgba(34, 197, 94, 0.4)',
    }
  ];

  // Popular job roles for quick selection
  const popularRoles = [
    { title: 'Software Engineer', icon: '💻', gradient: 'from-blue-500 to-cyan-500' },
    { title: 'Backend Developer', icon: '⚙️', gradient: 'from-slate-500 to-gray-600' },
    { title: 'Frontend Developer', icon: '🎨', gradient: 'from-orange-500 to-red-500' },
    { title: 'Full Stack Developer', icon: '🔗', gradient: 'from-indigo-500 to-purple-500' },
    { title: 'Data Scientist', icon: '📈', gradient: 'from-green-500 to-teal-500' },
    { title: 'ML Engineer', icon: '🧠', gradient: 'from-purple-500 to-pink-500' },
    { title: 'DevOps Engineer', icon: '🚀', gradient: 'from-yellow-500 to-orange-500' },
    { title: 'Product Manager', icon: '📊', gradient: 'from-cyan-500 to-blue-500' }
  ];

  // Interview style configurations
  const interviewStyles = [
    { value: 'formal', label: 'Professional', description: 'Traditional corporate interview style', color: 'blue' },
    { value: 'casual', label: 'Conversational', description: 'Relaxed and friendly approach', color: 'green' },
    { value: 'technical', label: 'Technical Deep-dive', description: 'Focus on technical skills and problem-solving', color: 'purple' },
    { value: 'aggressive', label: 'Challenging', description: 'High-pressure scenario simulation', color: 'red' }
  ];

  // Difficulty levels with visual indicators
  const difficultyLevels = [
    { value: 'easy', label: 'Beginner', description: 'Basic questions, gentle pace', bars: 1, color: 'green' },
    { value: 'medium', label: 'Intermediate', description: 'Standard interview complexity', bars: 2, color: 'orange' },
    { value: 'hard', label: 'Advanced', description: 'Complex scenarios and follow-ups', bars: 3, color: 'red' }
  ];

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Unsupported File Type",
        description: "Please upload a .txt, .pdf, or .docx file.",
        variant: "destructive",
      });
      return;
    }

    if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setResumeContent(event.target.result as string);
          toast({ title: "Success", description: "Resume content loaded successfully." });
        }
      };
      reader.readAsText(file);
    } else {
      setIsUploading(true);
      try {
        const response = await api.uploadResumeFile(file);
        if (response.resume_text) {
          setResumeContent(response.resume_text);
          toast({
            title: "Resume Processed",
            description: `${response.filename} content extracted successfully.`,
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Failed to upload resume.";
        toast({
          title: "Upload Error",
          description: errorMsg,
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    }
    e.target.value = '';
  };

  // Start interview handler
  const handleStartInterview = () => {
    if (!jobRole.trim()) {
      // Show visual error state
      setShowRequiredError(true);
      
      // Scroll to job role section with smooth animation
      setTimeout(() => {
        jobRoleSectionRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
      
      // Show helpful toast message
      toast({ 
        title: "Required Field Missing", 
        description: "Please enter a job role to start your interview practice.", 
        variant: "destructive" 
      });
      
      // Clear error state after a few seconds
      setTimeout(() => {
        setShowRequiredError(false);
      }, 5000);
      
      return;
    }
    
    const config: InterviewStartRequest = {
      job_role: jobRole,
      job_description: jobDescription || undefined,
      resume_content: resumeContent || undefined,
      style,
      difficulty,
      company_name: company || undefined,
      interview_duration_minutes: interviewDuration,
      use_time_based_interview: true,
    };
    
    actions.startInterview(config);
  };

  // ── Theme 03 Hero Section ──
  const renderHeroSection = () => (
    <section 
      id="hero-section"
      ref={heroRef}
      className="relative text-center pt-16 pb-16 sm:pt-20 sm:pb-20 px-4 sm:px-10 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FEF3C7 100%)'
      }}
    >
      <div className="container mx-auto max-w-4xl relative z-10">
        {/* College Tag Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#FEF3C7] text-xs font-bold text-[#92400E] mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#EAB308]" />
          <span>St. Joseph's College of Engineering &bull; Project 08</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-[44px] font-black text-[#111827] leading-[1.2] mb-4 tracking-tight">
          <span className="text-[#EAB308]">AI-Powered</span> Mock Interview<br />
          Platform
        </h1>

        {/* Hero Subtitle */}
        <p className="text-sm sm:text-base lg:text-lg text-[#4B5563] max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
          Prepare smarter with real-time AI assessments, adaptive questioning, and instant feedback &mdash; built for St. Joseph's College of Engineering.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={scrollToConfig}
            className="btn-theme-primary w-full sm:w-auto text-sm sm:text-base font-bold shadow-lg"
          >
            Start Interview
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('features-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn-theme-outline w-full sm:w-auto text-sm sm:text-base font-semibold"
          >
            How It Works
          </button>
        </div>
      </div>
    </section>
  );

  // Stats section removed — no real data source yet

  // Recent interviews section removed — no real data source yet

  // Configuration Form Section - Theme 03 Bold Red & Gold on White
  const renderConfigurationForm = () => (
    <div ref={configSectionRef} id="config-section" className="py-16 sm:py-24 bg-[#FAFAFA] relative overflow-hidden border-t border-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FEF3C7] border border-amber-300 shadow-sm mb-4">
              <Settings className="w-3.5 h-3.5 text-[#92400E]" />
              <span className="text-xs sm:text-sm font-bold text-[#92400E] tracking-wider uppercase">Interview Configuration</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111827] mb-3 tracking-tight font-display">
              Configure Your Practice Session
            </h2>
            <p className="text-[#4B5563] text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed">
              Customize your target role, difficulty, and duration with our intelligent interview wizard.
            </p>
          </div>

          {/* Bento Grid Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 sm:mb-10">
            
            {/* Job Role Selection - Large Featured Panel */}
            <div 
              ref={jobRoleSectionRef}
              className={`lg:col-span-8 bg-white border rounded-2xl p-6 lg:p-8 border-b-[3px] border-b-[#EAB308] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all duration-300 ${
                showRequiredError 
                  ? 'border-red-500 shadow-red-500/20' 
                  : 'border-gray-200 hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]'
              }`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2.5 rounded-xl shadow-sm text-white ${
                  showRequiredError 
                    ? 'bg-red-600' 
                    : 'bg-[#DC2626]'
                }`}>
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className={`text-xl sm:text-2xl font-bold ${
                    showRequiredError 
                      ? 'text-red-600' 
                      : 'text-[#111827]'
                  }`}>
                    Target Role
                  </h3>
                  <p className="text-[#4B5563] text-xs sm:text-sm">What position are you preparing for?</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full font-bold text-xs bg-red-50 text-red-600 border border-red-200">
                    Required
                  </span>
                </div>
              </div>
              
              {/* Popular roles grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {popularRoles.map((role) => (
                  <button
                    key={role.title}
                    type="button"
                    onClick={() => setJobRole(role.title)}
                    className={`relative p-3.5 rounded-xl border text-left transition-all duration-200 flex items-center justify-between ${
                      jobRole === role.title 
                        ? 'border-2 border-[#DC2626] bg-[#FEF3C7] text-[#92400E] font-bold shadow-sm' 
                        : 'border-gray-200 bg-white hover:border-[#DC2626]/40 hover:bg-red-50/20 text-[#111827]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="text-xl">{role.icon}</span>
                      <span className="text-xs sm:text-sm font-semibold">
                        {role.title}
                      </span>
                    </div>
                    {jobRole === role.title && (
                      <CheckCircle className="w-4 h-4 text-[#DC2626]" />
                    )}
                  </button>
                ))}
              </div>
              
              {/* Custom role input */}
              <div className="relative">
                <Input
                  placeholder="Or describe your custom role (e.g., Full Stack Engineer, ML Engineer)..."
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  className={`bg-white text-[#111827] placeholder-gray-400 border rounded-xl px-4 py-3.5 text-sm sm:text-base focus:border-[#DC2626] focus:ring-2 focus:ring-red-500/20 shadow-sm ${
                    showRequiredError && !jobRole.trim()
                      ? 'border-red-500'
                      : 'border-gray-300'
                  }`}
                />
                {jobRole && !popularRoles.find(r => r.title === jobRole) && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Sparkles className="w-4 h-4 text-[#EAB308]" />
                  </div>
                )}
              </div>
            </div>

            {/* Company & Duration - Right Side Panels */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Company Selection */}
              <div className="bg-white border border-gray-200 border-b-[3px] border-b-[#EAB308] rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-lg bg-[#DC2626] text-white shadow-sm">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#111827]">Company</h3>
                  </div>
                  <div className="ml-auto">
                    <span className="px-2.5 py-0.5 rounded-full font-medium text-xs bg-gray-100 text-gray-600">
                      Optional
                    </span>
                  </div>
                </div>
                <Input
                  placeholder="Google, Microsoft, TCS, Zoho..."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="bg-white border-gray-300 text-[#111827] rounded-xl focus:border-[#DC2626] focus:ring-2 focus:ring-red-500/20 text-sm"
                />
              </div>

              {/* Duration Slider */}
              <div className="bg-white border border-gray-200 border-b-[3px] border-b-[#EAB308] rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-lg bg-[#EAB308] text-[#111827] shadow-sm">
                    <Clock className="w-4 h-4 text-[#111827]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#111827]">Duration</h3>
                    <p className="text-xs font-semibold text-[#DC2626]">{interviewDuration} minutes</p>
                  </div>
                  <div className="ml-auto">
                    <span className="px-2.5 py-0.5 rounded-full font-medium text-xs bg-gray-100 text-gray-600">
                      Optional
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2 pt-2">
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={interviewDuration}
                    onChange={(e) => setInterviewDuration(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#DC2626]"
                  />
                  <div className="flex justify-between text-xs text-[#6B7280] font-medium">
                    <span className={interviewDuration <= 10 ? 'text-[#DC2626] font-bold' : ''}>5m • Quick</span>
                    <span className={interviewDuration > 10 && interviewDuration <= 20 ? 'text-[#92400E] font-bold' : ''}>15m • Standard</span>
                    <span className={interviewDuration > 20 ? 'text-[#DC2626] font-bold' : ''}>30m • Deep</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interview Style & Difficulty */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 sm:mb-10">
            
            {/* Interview Style Selection */}
            <div className="bg-white border border-gray-200 border-b-[3px] border-b-[#EAB308] rounded-2xl p-6 lg:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-[#DC2626] text-white shadow-sm">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#111827]">Interview Style</h3>
                  <p className="text-[#4B5563] text-xs sm:text-sm">Choose preferred interaction mode</p>
                </div>
                <div className="ml-auto">
                  <span className="px-2.5 py-0.5 rounded-full font-medium text-xs bg-gray-100 text-gray-600">
                    Optional
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {interviewStyles.map((styleOption) => (
                  <button
                    key={styleOption.value}
                    type="button"
                    onClick={() => setStyle(styleOption.value as any)}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                      style === styleOption.value
                        ? 'border-2 border-[#DC2626] bg-[#FEF3C7] text-[#92400E] font-bold shadow-sm'
                        : 'border-gray-200 bg-white hover:border-[#DC2626]/40 hover:bg-red-50/20 text-[#111827]'
                    }`}
                  >
                    <div className="text-sm sm:text-base font-bold mb-1">{styleOption.label}</div>
                    <div className="text-xs text-[#4B5563] font-normal leading-relaxed">{styleOption.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Level with Visual Bars */}
            <div className="bg-white border border-gray-200 border-b-[3px] border-b-[#EAB308] rounded-2xl p-6 lg:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-[#DC2626] text-white shadow-sm">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#111827]">Difficulty Level</h3>
                  <p className="text-[#4B5563] text-xs sm:text-sm">Adjust challenge complexity</p>
                </div>
                <div className="ml-auto">
                  <span className="px-2.5 py-0.5 rounded-full font-medium text-xs bg-gray-100 text-gray-600">
                    Optional
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {difficultyLevels.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setDifficulty(level.value as any)}
                    className={`w-full p-4 rounded-xl border text-left transition-all duration-200 flex items-center justify-between ${
                      difficulty === level.value
                        ? 'border-2 border-[#DC2626] bg-[#FEF3C7] text-[#92400E] font-bold shadow-sm'
                        : 'border-gray-200 bg-white hover:border-[#DC2626]/40 hover:bg-red-50/20 text-[#111827]'
                    }`}
                  >
                    <div>
                      <div className="text-sm sm:text-base font-bold">{level.label}</div>
                      <div className="text-xs text-[#4B5563] font-normal mt-0.5">{level.description}</div>
                    </div>
                    
                    <div className="flex space-x-1.5">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-5 rounded-full transition-all duration-200 ${
                            i < level.bars 
                              ? 'bg-[#DC2626]' 
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Job Description & Resume Upload */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

            {/* Job Description Panel */}
            <div className="bg-white border border-gray-200 border-b-[3px] border-b-[#EAB308] rounded-2xl p-6 lg:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-[#DC2626] text-white shadow-sm">
                  <ScrollText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#111827]">Job Description</h3>
                  <p className="text-[#4B5563] text-xs sm:text-sm">Paste target role description</p>
                </div>
                <div className="ml-auto">
                  <span className="px-2.5 py-0.5 rounded-full font-medium text-xs bg-gray-100 text-gray-600">
                    Optional
                  </span>
                </div>
              </div>
              <Textarea
                placeholder="Paste the full job description or key requirements here to focus interview questions..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={7}
                className="w-full bg-white border-gray-300 text-[#111827] placeholder-gray-400 rounded-xl focus:border-[#DC2626] focus:ring-2 focus:ring-red-500/20 text-sm leading-relaxed"
              />
            </div>

            {/* Resume Upload Panel */}
            <div className="bg-white border border-gray-200 border-b-[3px] border-b-[#EAB308] rounded-2xl p-6 lg:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-[#DC2626] text-white shadow-sm">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#111827]">Resume Upload</h3>
                  <p className="text-[#4B5563] text-xs sm:text-sm">Upload resume for customized questions</p>
                </div>
                <div className="ml-auto">
                  <span className="px-2.5 py-0.5 rounded-full font-medium text-xs bg-gray-100 text-gray-600">
                    Optional
                  </span>
                </div>
              </div>
              
              <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                resumeContent 
                  ? 'border-green-500 bg-green-50/50' 
                  : 'border-gray-300 bg-gray-50/60 hover:bg-red-50/10'
              }`}>
                {resumeContent ? (
                  <div className="space-y-3">
                    <CheckCircle className="w-10 h-10 text-green-600 mx-auto" />
                    <p className="text-green-800 font-bold text-sm">Resume content extracted successfully!</p>
                    <p className="text-[#4B5563] text-xs">AI agent will dynamically probe based on your project and work experience</p>
                    <button
                      type="button"
                      onClick={() => setResumeContent('')}
                      className="text-[#DC2626] hover:text-[#B91C1C] text-xs font-semibold underline"
                    >
                      Upload a different resume
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <UploadCloud className="w-10 h-10 text-[#DC2626] mx-auto" />
                    <div>
                      <p className="text-[#111827] font-semibold text-sm">
                        Drag &amp; drop resume or click to browse
                      </p>
                      <p className="text-[#6B7280] text-xs mt-1">
                        Supports PDF, DOCX, and TXT files
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".txt,.pdf,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="resume-upload"
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="resume-upload"
                      className="inline-flex items-center gap-2 btn-theme-primary text-xs py-2.5 px-5 cursor-pointer shadow-md"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Choose File</span>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Launch Button - Theme 03 Bold Red CTA */}
          <div className="text-center pt-2">
            <button
              onClick={handleStartInterview}
              disabled={isLoading}
              className={`btn-theme-primary text-base sm:text-lg py-4 px-12 rounded-xl shadow-xl transition-all duration-300 font-bold ${
                isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'
              }`}
            >
              <div className="flex items-center justify-center space-x-2.5">
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Initializing AI Interviewer...</span>
                  </>
                ) : (
                  <>
                    <span>Start Interview Practice</span>
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </>
                )}
              </div>
            </button>
            
            {!jobRole.trim() && (
              <p className="mt-3 text-xs sm:text-sm text-[#DC2626] font-medium">
                * Please select or enter a target role above to begin.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Platform Capabilities Section (Theme 03) ──
  const renderFeatureConstellation = () => {
    return (
      <div id="features-section" ref={featuresSectionRef} className="relative py-16 sm:py-24 bg-white overflow-hidden border-t border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FEF3C7] border border-amber-300 shadow-sm mb-4">
              <Bot className="w-3.5 h-3.5 text-[#92400E]" />
              <span className="text-xs sm:text-sm font-bold text-[#92400E] tracking-wider uppercase">System Architecture</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111827] mb-3 tracking-tight font-display">
              How The Platform Works
            </h2>
            <p className="text-base sm:text-lg text-[#4B5563] max-w-2xl mx-auto leading-relaxed">
              Explore our real-time interview simulation, dynamic probing, and coaching capabilities.
            </p>
          </div>

          {/* Feature Grid with Theme 03 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {featureConstellation.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={feature.id}
                  className="bg-white rounded-2xl p-6 border border-gray-200 border-b-[3px] border-b-[#EAB308] shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:-translate-y-1 hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-[#DC2626] text-white flex items-center justify-center shadow-md mb-4">
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-[#111827] mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-xs font-semibold text-[#92400E] mb-3">
                      {feature.subtitle}
                    </p>
                    <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed mb-4">
                      {feature.description}
                    </p>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-100">
                    <ul className="space-y-1.5">
                      {feature.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-[#111827]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#EAB308] flex-shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── Footer ──
  const renderFooter = () => {
    if (state !== 'configuring') return null;

    return (
      <footer className="w-full mt-auto">
        <div className="bg-[#DC2626] text-white text-center py-5 px-6 text-sm sm:text-base font-bold tracking-wide">
          St. Joseph's College of Engineering &mdash; Project 08 Placement Drive &amp; AI Mock Interview Platform
        </div>

        <div className="bg-[#111827] text-[#9CA3AF] text-center py-4 px-6 text-xs">
          <span>&copy; 2026 Project 08. All rights reserved.</span>
        </div>
      </footer>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#111827] relative overflow-hidden font-sans">
      {state !== 'interviewing' && state !== 'post_interview' && (
        <Header 
          showReset={state === 'completed'} 
          onReset={actions.resetInterview}
        />
      )}
      
      <main className="flex-1 flex flex-col">
        {state === 'configuring' && (
          <>
            {renderHeroSection()}
            {renderConfigurationForm()}
            {renderFeatureConstellation()}
            {renderFooter()}
          </>
        )}
        
        {state === 'interviewing' && (
          <InterviewSession 
            messages={messages}
            isLoading={isLoading}
            onSendMessage={actions.sendMessage}
            onEndInterview={actions.endInterview}
            onVoiceSelect={actions.setSelectedVoice}
            coachFeedbackStates={coachFeedbackStates}
            sessionId={sessionId}
            showSessionWarning={showSessionWarning}
            sessionTimeRemaining={sessionTimeRemaining}
            onExtendSession={actions.extendSession}
            onSessionTimeout={actions.handleSessionTimeout}
          />
        )}

        {state === 'post_interview' && postInterviewState && (
          <PostInterviewReport
            perTurnFeedback={postInterviewState.perTurnFeedback}
            finalSummary={postInterviewState.finalSummary}
            resources={postInterviewState.resources}
            onStartNewInterview={actions.resetInterview}
            onGoHome={actions.resetInterview}
          />
        )}
      </main>

      {/* Backend Down Notification */}
      <BackendDownNotification
        isOpen={showBackendNotification}
        onClose={() => setShowBackendNotification(false)}
      />

      <style dangerouslySetInnerHTML={{
        __html: `
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          @keyframes gentle-shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }
          .animate-gentle-shake {
            animation: gentle-shake 0.5s ease-in-out;
          }
        `
      }} />
    </div>
  );
};

export default Index;