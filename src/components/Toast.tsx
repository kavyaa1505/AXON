import React, { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-card border border-border shadow-lg rounded-lg p-3 flex items-start gap-3 max-w-sm">
        <CheckCircle2 size={18} className="text-success mt-0.5 flex-shrink-0" />
        <p className="text-sm text-primary leading-tight">{message}</p>
        <button 
          onClick={onClose}
          className="text-muted hover:text-primary transition-colors flex-shrink-0 ml-2"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
