import { motion } from 'framer-motion'

export function Toggle({ checked, onChange, label }) {
  return (
    <motion.button
      type="button"
      onClick={() => onChange(!checked)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      className="flex w-full items-center justify-between rounded-[2rem] border-2 border-pink-100 dark:border-white/10 bg-white/80 dark:bg-black/40 px-4 py-3 text-left text-sm font-bold shadow-sm transition hover:border-pink-300 dark:hover:border-rose-400"
    >
      <span className="text-slate-700 dark:text-slate-200 font-['Quicksand']">{label}</span>
      <div
        className={[
          'relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300',
          checked ? 'bg-gradient-to-r from-pink-400 to-purple-400 dark:from-rose-500 dark:to-orange-500 shadow-[0_2px_10px_rgba(236,72,153,0.3)] dark:shadow-none' : 'bg-slate-200 dark:bg-slate-700'
        ].join(' ')}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="inline-block h-5 w-5 rounded-full bg-white shadow-md mx-1"
          style={{ x: checked ? 20 : 0 }}
        />
      </div>
    </motion.button>
  )
}
