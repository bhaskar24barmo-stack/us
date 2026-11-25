import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="min-h-full grid place-items-center px-5 bg-[radial-gradient(ellipse_at_top,#2a1050,#0b0614_60%)]">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass w-full max-w-sm rounded-3xl p-7">
        <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} className="text-4xl text-center">❤️</motion.div>
        <h1 className="mt-2 text-center text-2xl font-semibold bg-love-gradient bg-clip-text text-transparent">{title}</h1>
        {subtitle && <p className="mt-1 text-center text-sm text-white/60">{subtitle}</p>}
        <div className="mt-6 space-y-3">{children}</div>
      </motion.div>
    </main>
  );
}

export const inputCls = 'w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-pink-400/60 placeholder:text-white/30';
export const btnCls = 'w-full rounded-2xl bg-love-gradient py-3 font-medium disabled:opacity-50 active:scale-[0.98] transition';
