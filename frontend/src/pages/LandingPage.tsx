import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { Mic, Brain, Search, Shield, ArrowRight, Sparkles, Bot, MessageSquare, BarChart3 } from 'lucide-react';

const LandingPage: React.FC = () => {
  const features = [
    { icon: Bot, title: 'Adaptive AI Interviewer', desc: 'Context-aware questions that adapt to your answers in real time.', color: '#DC2626' },
    { icon: Brain, title: 'Real-time Coach Agent', desc: 'Evaluates clarity, depth, and communication after every answer.', color: '#8B5CF6' },
    { icon: Search, title: 'Resource Discovery', desc: 'Curated learning resources based on your specific weak areas.', color: '#10B981' },
    { icon: Mic, title: 'Voice-First Interface', desc: 'Natural speech-to-speech interviews powered by Deepgram.', color: '#F97316' },
    { icon: BarChart3, title: 'Evidence-Grounded Scores', desc: 'Every score traces back to specific transcript turns.', color: '#3B82F6' },
    { icon: Shield, title: 'Secure Exam Portal', desc: 'Formal coding assessments with SEB lockdown and auto-scoring.', color: '#22C55E' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section id="hero-section" className="relative text-center pt-20 pb-20 px-4 overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FEF3C7 100%)' }}>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#FEF3C7] text-xs font-bold text-[#92400E] mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#EAB308]" />
            St. Joseph's College of Engineering · Placement AI
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-[#111827] leading-tight mb-4">
            <span className="text-[#EAB308]">AI-Powered</span> Mock Interview<br />& Assessment Platform
          </h1>
          <p className="text-base sm:text-lg text-[#4B5563] max-w-2xl mx-auto mb-8 leading-relaxed">
            Prepare smarter with real-time AI assessments, adaptive questioning, and instant feedback — built for placement success.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm shadow-lg hover:shadow-[0_4px_20px_rgba(220,38,38,0.35)] transition-all">
              Get started free <ArrowRight size={16} />
            </Link>
            <Link to="/login"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl border-2 border-[#111827] text-[#111827] font-bold text-sm hover:bg-gray-50 transition-all">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features-section" className="py-20 px-4 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FEF3C7] border border-amber-300 mb-4">
              <Bot className="w-3.5 h-3.5 text-[#92400E]" />
              <span className="text-xs font-bold text-[#92400E] uppercase tracking-wider">Platform Features</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#111827] mb-3">Everything you need to prepare</h2>
            <p className="text-[#6B7280] max-w-xl mx-auto">End-to-end interview preparation from voice practice to formal coding assessments.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-200 border-b-[3px] border-b-[#EAB308] shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:-translate-y-1 hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 shadow-sm" style={{ backgroundColor: color }}>
                  <Icon size={20} className="text-white" />
                </div>
                <h3 className="text-base font-bold text-[#111827] mb-2">{title}</h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#111827]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4">Ready to ace your placement?</h2>
          <p className="text-gray-400 mb-8">Join students from St. Joseph's College practicing with AI-powered interviews.</p>
          <Link to="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm transition-all shadow-lg">
            Start for free <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#DC2626] text-white text-center py-4 text-sm font-bold">
        St. Joseph's College of Engineering — AI Interview Agent
      </footer>
    </div>
  );
};

export default LandingPage;
