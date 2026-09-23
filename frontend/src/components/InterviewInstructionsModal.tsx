import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Headphones, CheckCircle } from 'lucide-react';

interface InterviewInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InterviewInstructionsModal: React.FC<InterviewInstructionsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="max-w-lg w-full">
        <Card className="bg-white border border-[#E5E7EB] border-b-[3px] border-b-[#EAB308] shadow-2xl rounded-xl overflow-hidden">
          <CardHeader className="text-center bg-[#FAFAFA] border-b border-[#F3F4F6] pb-4 pt-5">
            <span className="inline-block mx-auto px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] mb-2">
              Protocol Briefing
            </span>
            <CardTitle className="text-xl font-bold text-[#111827] font-display">
              Interview Instructions
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-6 space-y-5 bg-white">
            {/* Instruction 1 */}
            <div className="flex items-start space-x-3.5">
              <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mic className="w-4 h-4 text-[#DC2626]" />
              </div>
              <div>
                <h3 className="font-bold text-[#111827] text-sm mb-1">How to Talk</h3>
                <p className="text-[#4B5563] text-sm leading-relaxed">
                  Click the red mic button to speak and click it again once you have finished your response.
                </p>
              </div>
            </div>

            {/* Instruction 2 */}
            <div className="flex items-start space-x-3.5">
              <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Headphones className="w-4 h-4 text-[#EAB308]" />
              </div>
              <div>
                <h3 className="font-bold text-[#111827] text-sm mb-1">Best Audio Performance</h3>
                <p className="text-[#4B5563] text-sm leading-relaxed">
                  Use headphones or earphones and speak clearly in a quiet environment for optimal AI transcription.
                </p>
              </div>
            </div>

            {/* Instruction 3 */}
            <div className="flex items-start space-x-3.5">
              <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-[#DC2626]" />
              </div>
              <div>
                <h3 className="font-bold text-[#111827] text-sm mb-1">Timing & Latency Tip</h3>
                <p className="text-[#4B5563] text-sm leading-relaxed">
                  Wait about one second after finishing your sentence before toggling stop to ensure your complete answer is processed.
                </p>
              </div>
            </div>

            {/* Got it button */}
            <div className="pt-3">
              <Button 
                onClick={onClose}
                className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold py-3 rounded-lg shadow-[0_4px_14px_rgba(220,38,38,0.3)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.4)] transition-all"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Understood, Begin Interview
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InterviewInstructionsModal; 