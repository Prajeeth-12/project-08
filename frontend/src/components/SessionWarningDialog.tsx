import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, AlertTriangle } from 'lucide-react';

interface SessionWarningDialogProps {
  open: boolean;
  timeRemaining: number | null;
  onExtend: () => void;
  onEndNow: () => void;
}

export const SessionWarningDialog: React.FC<SessionWarningDialogProps> = ({
  open,
  timeRemaining,
  onExtend,
  onEndNow,
}) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md bg-white border border-[#E5E7EB] border-b-[3px] border-b-[#EAB308] shadow-2xl rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-[#DC2626] font-bold font-display">
            <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <div className="flex items-center gap-2 text-[#111827]">
              <Clock className="w-4 h-4 text-[#EAB308]" />
              <span>
                Your session will expire in{' '}
                <span className="font-bold text-[#DC2626]">
                  {timeRemaining} minute{timeRemaining !== 1 ? 's' : ''}
                </span>
                {' '}due to inactivity limit.
              </span>
            </div>
            <p className="text-sm text-[#4B5563]">
              Would you like to extend your session or conclude the interview now?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2 pt-2">
          <AlertDialogCancel onClick={onEndNow} className="flex-1 border-[#E5E7EB] hover:bg-[#FEF3C7] text-[#111827] font-semibold">
            End Interview
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onExtend} 
            className="flex-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold shadow-[0_4px_14px_rgba(220,38,38,0.3)]"
          >
            Extend Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}; 