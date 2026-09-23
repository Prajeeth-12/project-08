import React, { useEffect, useRef, useState } from 'react';
import { X, Volume2, User, Bot, Download, Brain, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Message, CoachFeedbackState } from '../hooks/useInterviewSession';

interface TranscriptDrawerProps {
  isOpen: boolean;
  messages: Message[];
  onClose: () => void;
  onPlayMessage?: (message: string) => void;
  onSendTextFromTranscript: (message: string) => void;
  coachFeedbackStates: CoachFeedbackState;
  latestFeedbackToggled?: boolean;
  latestFeedbackIndex?: number | null;
}

const TranscriptDrawer: React.FC<TranscriptDrawerProps> = ({
  isOpen,
  messages,
  onClose,
  onPlayMessage,
  onSendTextFromTranscript,
  coachFeedbackStates,
  latestFeedbackToggled,
  latestFeedbackIndex
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const [expandedCoachFeedback, setExpandedCoachFeedback] = useState<Set<number>>(new Set());

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && contentRef.current) {
      const scrollToBottom = () => {
        contentRef.current?.scrollTo({
          top: contentRef.current.scrollHeight,
          behavior: 'smooth'
        });
      };
      
      // Delay to ensure content is rendered
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen]);

  // Handle latest feedback toggle from parent
  useEffect(() => {
    if (latestFeedbackIndex !== null && latestFeedbackIndex !== undefined) {
      if (latestFeedbackToggled) {
        setExpandedCoachFeedback(prev => new Set(prev).add(latestFeedbackIndex));
      } else {
        setExpandedCoachFeedback(prev => {
          const newSet = new Set(prev);
          newSet.delete(latestFeedbackIndex);
          return newSet;
        });
      }
    }
  }, [latestFeedbackToggled, latestFeedbackIndex]);

  // Close all coach feedback when transcript is closed
  useEffect(() => {
    if (!isOpen) {
      setExpandedCoachFeedback(new Set());
    }
  }, [isOpen]);

  // Helper to convert content to string
  const getContentAsString = (content: string | any): string => {
    if (typeof content === 'string') {
      return content;
    }
    // If it's an object, try to extract meaningful text
    if (content && typeof content === 'object') {
      return JSON.stringify(content, null, 2);
    }
    return String(content);
  };

  const handleDownloadTranscript = () => {
    const transcript = messages
      .map((message, index) => {
        const role = message.role === 'user' ? 'User' : 'AI Interviewer';
        const timestamp = new Date(message.timestamp || Date.now()).toLocaleString();
        const content = getContentAsString(message.content);
        return `[${timestamp}] ${role}: ${content}`;
      })
      .join('\n\n');

    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-transcript-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getMessageIcon = (role: string) => {
    if (role === 'user') {
      return <User className="w-4 h-4 text-white" />;
    }
    return <Bot className="w-4 h-4 text-[#111827]" />;
  };

  const getMessageStyling = (role: string) => {
    if (role === 'user') {
      return {
        container: 'bg-[#FEF3C7]/40 border border-[#FDE68A]',
        text: 'text-[#111827]',
        avatar: 'bg-[#DC2626] border-[#DC2626]'
      };
    }
    return {
      container: 'bg-white border border-[#E5E7EB] shadow-sm',
      text: 'text-[#111827]',
      avatar: 'bg-[#EAB308] border-[#EAB308]'
    };
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendTextFromTranscript(newMessage.trim());
      setNewMessage('');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Toggle coach feedback for a specific message
  const toggleCoachFeedback = (messageIndex: number) => {
    setExpandedCoachFeedback(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageIndex)) {
        newSet.delete(messageIndex);
      } else {
        newSet.add(messageIndex);
      }
      return newSet;
    });
  };

  // Get coach feedback for a message
  const getCoachFeedback = (messageIndex: number) => {
    return coachFeedbackStates[messageIndex];
  };

  // if (!isOpen) return null; // Keep the component in DOM for transitions, control visibility via transform

  return (
    <>
      {/* Backdrop - REMOVED for side panel style */}
      {/* 
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      */}

      {/* Drawer - MODIFIED for left slide-out panel */}
      <div 
        ref={drawerRef}
        className={`
          fixed inset-y-0 left-0 z-30 w-80 md:w-96 
          bg-white shadow-2xl flex flex-col border-r border-[#E5E7EB]
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-4 sm:px-6 py-4 border-b border-[#E5E7EB] bg-[#FAFAFA]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#111827] font-display">Interview Transcript</h2>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Download Button */}
              <button
                onClick={handleDownloadTranscript}
                className="
                  p-2 rounded-lg 
                  bg-white hover:bg-[#FEF3C7] 
                  border border-[#E5E7EB] hover:border-[#FDE68A]
                  transition-all duration-200
                  group
                "
                title="Download Transcript"
              >
                <Download className="w-4 h-4 text-[#4B5563] group-hover:text-[#DC2626]" />
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="
                  p-2 rounded-lg 
                  bg-white hover:bg-[#FEF3C7] 
                  border border-[#E5E7EB] hover:border-[#FDE68A]
                  transition-all duration-200
                  group
                "
              >
                <X className="w-4 h-4 text-[#4B5563] group-hover:text-[#DC2626]" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 bg-white"
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[#FEF3C7] flex items-center justify-center border border-[#FDE68A]">
                  <Bot className="w-7 h-7 text-[#92400E]" />
                </div>
                <p className="text-[#111827] font-semibold text-sm">No messages yet</p>
                <p className="text-[#6B7280] text-xs mt-1">Start speaking to begin the interview</p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const messageId = `${message.role}-${index}`;
              const styling = getMessageStyling(message.role);
              const contentText = getContentAsString(message.content);

              return (
                <div key={messageId}>
                  <div
                    className={`
                      border rounded-xl p-3.5 transition-all duration-300
                      ${styling.container}
                    `}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Avatar */}
                      <div className={`
                        w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0
                        ${styling.avatar}
                      `}>
                        {getMessageIcon(message.role)}
                      </div>

                      {/* Message Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-[#111827]">
                            {message.role === 'user' ? 'You' : 'AI Interviewer'}
                          </span>
                        </div>
                        
                        <p className={`text-sm leading-relaxed ${styling.text}`}>
                          {contentText}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Coach Feedback Section (only for user messages) */}
                  {message.role === 'user' && (
                    <>
                      {/* Coach Feedback Toggle Button */}
                      <div className="mt-2 ml-2">
                        {(() => {
                          const feedbackState = getCoachFeedback(index);
                          const hasAnalysis = feedbackState?.isAnalyzing;
                          const hasFeedback = feedbackState?.feedback;
                          const isExpanded = expandedCoachFeedback.has(index);

                          // Don't show button if no analysis and no feedback
                          if (!hasAnalysis && !hasFeedback) return null;

                          return (
                            <button
                              onClick={() => toggleCoachFeedback(index)}
                              className={`
                                flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold
                                transition-all duration-300 group
                                ${hasAnalysis 
                                  ? 'bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E]' 
                                  : hasFeedback 
                                    ? 'bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] hover:bg-[#FDE68A]'
                                    : 'bg-[#FAFAFA] border border-[#E5E7EB] text-[#6B7280]'
                                }
                              `}
                            >
                              <div className="flex items-center space-x-2">
                                {hasAnalysis ? (
                                  <>
                                    <div className="relative">
                                      <Brain className="w-3.5 h-3.5 text-[#DC2626]" />
                                      <Loader2 className="absolute inset-0 w-3.5 h-3.5 animate-spin text-[#DC2626]" />
                                    </div>
                                    <span>Coach is analyzing...</span>
                                  </>
                                ) : hasFeedback ? (
                                  <>
                                    <Brain className="w-3.5 h-3.5 text-[#92400E]" />
                                    <span>View coach feedback</span>
                                  </>
                                ) : (
                                  <>
                                    <Brain className="w-3.5 h-3.5 text-[#6B7280]" />
                                    <span>No feedback yet</span>
                                  </>
                                )}
                              </div>
                              {!hasAnalysis && (
                                isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />
                              )}
                            </button>
                          );
                        })()}
                      </div>

                      {/* Coach Feedback Content */}
                      {expandedCoachFeedback.has(index) && (() => {
                        const feedbackState = getCoachFeedback(index);
                        if (!feedbackState?.feedback) return null;

                        return (
                          <div className="mt-2.5 ml-2">
                            <div className="bg-[#FEF3C7]/60 border border-[#FDE68A] rounded-xl p-3.5">
                              <div className="flex items-start space-x-2.5">
                                <div className="w-7 h-7 rounded-full bg-[#EAB308] flex items-center justify-center flex-shrink-0 text-[#111827]">
                                  <Brain className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-[#92400E]">AI Coach Feedback</span>
                                  </div>
                                  <p className="text-xs leading-relaxed text-[#78350F]">
                                    {feedbackState.feedback}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer - MODIFIED to include text input */}
        <div className="sticky bottom-0 px-4 sm:px-6 py-3 border-t border-[#E5E7EB] bg-[#FAFAFA]">
          <div className="flex items-center space-x-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={1}
              className="flex-1 p-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] resize-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626] transition-all"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="p-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg disabled:opacity-50 transition-colors font-semibold text-sm shadow-sm"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TranscriptDrawer; 