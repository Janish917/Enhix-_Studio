import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';

const COLORS = [
  '#ec4899', // pink-500
  '#a855f7', // purple-500
  '#3b82f6'  // blue-500
];

export function BubbleButton({ children, onClick, className = '', ...props }) {
  const [sparks, setSparks] = useState([]);
  const ref = useRef(null);

  // Magnetic Effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    
    // Magnetic pull distance (20% of distance from center)
    x.set(distanceX * 0.2);
    y.set(distanceY * 0.2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Generate explosive sparks
    const numSparks = Math.floor(Math.random() * 5) + 12; // 12-16 sparks
    const newSparks = Array.from({ length: numSparks }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / numSparks + Math.random() * 0.5;
      const velocity = Math.random() * 60 + 60; // 60-120px travel
      return {
        id: Date.now() + i + Math.random(),
        x: clickX,
        y: clickY,
        tx: Math.cos(angle) * velocity,
        ty: Math.sin(angle) * velocity,
        rotation: (angle * 180) / Math.PI, // Face outward
        scale: Math.random() * 0.5 + 0.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      };
    });

    setSparks((prev) => [...prev, ...newSparks]);
    if (onClick) onClick(e);
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`relative inline-block ${className}`}
      style={{ x: springX, y: springY }}
      {...props}
    >
      {children}
      <AnimatePresence>
        {sparks.map((s) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 1, x: s.x, y: s.y, scale: 0, rotate: s.rotation }}
            animate={{
              opacity: 0,
              x: s.x + s.tx,
              y: s.y + s.ty,
              scale: s.scale,
              rotate: s.rotation,
            }}
            transition={{ duration: 0.6 + Math.random() * 0.2, ease: "easeOut" }}
            onAnimationComplete={() => {
              setSparks((prev) => prev.filter((p) => p.id !== s.id));
            }}
            className="pointer-events-none absolute"
            style={{
              width: 15 + Math.random() * 15,
              height: 2,
              backgroundColor: s.color,
              boxShadow: `0 0 10px ${s.color}`,
              marginLeft: -10, // Center origin
              marginTop: -1,
              zIndex: 100,
              borderRadius: 10
            }}
          />
        ))}
      </AnimatePresence>
    </motion.button>
  );
}
