/**
 * SEB (Secure Exam Browser) guard hook — V2.
 * Enforces fullscreen, detects tab/window blur, tracks infractions.
 * Used by ExamPortal for formal coding assessments.
 */

import { useEffect, useRef, useCallback, useState } from 'react';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8001';

export interface SEBConfig {
  examId: string;
  maxInfractions?: number;        // default 3
  onDisqualified?: () => void;    // called when infraction limit reached
  onInfraction?: (reason: string, count: number) => void;
}

export function useSEBGuard({ examId, maxInfractions = 3, onDisqualified, onInfraction }: SEBConfig) {
  const [infractionCount, setInfractionCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const infractionRef = useRef(0);

  const reportInfraction = useCallback(async (reason: string) => {
    infractionRef.current += 1;
    const count = infractionRef.current;
    setInfractionCount(count);
    onInfraction?.(reason, count);

    try {
      await fetch(`${API_BASE}/exams/${examId}/infraction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, infraction_number: count }),
      });
    } catch {
      // best-effort — don't block the UI
    }

    if (count >= maxInfractions) {
      onDisqualified?.();
    }
  }, [examId, maxInfractions, onDisqualified, onInfraction]);

  // Fullscreen enforcement
  const requestFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch {
      // browser may deny without user gesture — handled by ExamPortal button
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const full = !!document.fullscreenElement;
      setIsFullscreen(full);
      if (!full && infractionRef.current < maxInfractions) {
        reportInfraction('FULLSCREEN_EXIT');
      }
    };

    const handleBlur = () => {
      if (infractionRef.current < maxInfractions) {
        reportInfraction('WINDOW_BLUR');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && infractionRef.current < maxInfractions) {
        reportInfraction('TAB_SWITCH');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reportInfraction, maxInfractions]);

  return { infractionCount, isFullscreen, requestFullscreen };
}
