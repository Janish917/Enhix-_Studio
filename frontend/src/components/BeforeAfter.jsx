export function BeforeAfter({ beforeCanvasRef, afterCanvasRef, enabled }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-slate-900">
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: enabled ? 0 : 1, transition: 'opacity 0.2s', pointerEvents: enabled ? 'none' : 'auto' }}
      >
        <canvas ref={afterCanvasRef} className="max-h-full max-w-full" />
      </div>
      <div 
        className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
        style={{ opacity: enabled ? 1 : 0, transition: 'opacity 0.2s' }}
      >
        <canvas ref={beforeCanvasRef} className="max-h-full max-w-full" />
      </div>
    </div>
  )
}
