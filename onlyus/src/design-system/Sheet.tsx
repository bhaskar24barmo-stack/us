import { type ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  showClose?: boolean;
}

export function Sheet({ open, onClose, title, children, showClose = true }: SheetProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative z-10 w-full max-w-[430px] rounded-t-[32px] glass-strong border-t border-white/20 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] max-h-[88vh] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Grab Handle */}
            <div className="w-10 h-1 rounded-full bg-white/25 mx-auto mb-3 shrink-0" />

            {/* Header */}
            {(title || showClose) && (
              <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
                {title ? (
                  <h3 className="text-base font-bold text-white truncate">{title}</h3>
                ) : (
                  <div />
                )}
                {showClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-8 w-8 rounded-full glass flex items-center justify-center text-white/70 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
