import { formatBytes } from '../lib/format'
import { motion } from 'framer-motion'

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  hint
}) {
  return (
    <motion.div 
      className="space-y-2 p-3 rounded-2xl hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between px-1">
        <label className="text-sm font-bold text-slate-700 dark:text-slate-200 font-['Quicksand']">
          {label}
        </label>
        <span className="text-xs font-bold px-2 py-1 bg-pink-100 dark:bg-slate-800 text-pink-600 dark:text-rose-400 rounded-full shadow-sm">
          {value}
        </span>
      </div>
      <div className="relative flex items-center py-2 group">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full opacity-0 cursor-pointer z-20 h-full"
        />
        <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner flex items-center">
          <div 
            className="h-full bg-gradient-to-r from-pink-300 to-purple-400 dark:from-rose-500 dark:to-orange-500 rounded-full transition-all duration-75"
            style={{ width: `${((Math.max(min, value) - min) / (max - min)) * 100}%` }}
          />
        </div>
        <div 
          className="absolute z-10 w-5 h-5 bg-white rounded-full shadow-[0_2px_8px_rgba(236,72,153,0.5)] dark:shadow-[0_2px_8px_rgba(244,63,94,0.5)] border-2 border-pink-300 dark:border-rose-400 transition-transform group-hover:scale-125"
          style={{ 
            left: `calc(${((Math.max(min, value) - min) / (max - min)) * 100}% - 10px)` 
          }}
        />
      </div>
      {hint ? (
        <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 px-1 italic">
          ✨ {hint}
        </div>
      ) : null}
    </motion.div>
  )
}

export function BytesRow({ beforeBytes, afterBytes }) {
  const before = formatBytes(beforeBytes)
  const after = formatBytes(afterBytes)
  const saved = beforeBytes > 0 ? Math.max(0, beforeBytes - afterBytes) : 0
  const savedPct = beforeBytes > 0 ? Math.round((saved / beforeBytes) * 100) : 0
  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-purple-100 dark:border-white/10 bg-white/60 dark:bg-black/30 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur">
      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
         <span>Original: <strong className="text-slate-800 dark:text-slate-100">{before}</strong></span>
         <span>Compressed: <strong className="text-slate-800 dark:text-slate-100">{after}</strong></span>
      </div>
      <div className="flex justify-between items-center bg-purple-100 dark:bg-slate-800/80 px-3 py-2 rounded-xl text-purple-700 dark:text-indigo-300">
         <span>Reduction</span>
         <span>{savedPct}% ({formatBytes(saved)} saved)</span>
      </div>
    </div>
  )
}
