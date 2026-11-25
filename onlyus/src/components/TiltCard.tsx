import { type ReactNode, useState } from 'react';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
}

export default function TiltCard({ children, className = '' }: TiltCardProps) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 });

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      rx: (0.5 - py) * 7,
      ry: (px - 0.5) * 9,
      gx: px * 100,
      gy: py * 100,
    });
  }

  function handleLeave() {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 });
  }

  return (
    <div
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`relative transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={{
        transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-40 transition-opacity"
        style={{
          background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.14), transparent 55%)`,
        }}
      />
      {children}
    </div>
  );
}
