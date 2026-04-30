import React, { useRef, useEffect } from 'react';

export default function WaveCanvas({ width, height, dark, mouseRef }) {
  const canvasRef = useRef(null);
  const frameRef  = useRef(null);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      tRef.current += 0.006;
      ctx.clearRect(0, 0, width, height);

      const mx = mouseRef.current.x; 
      const my = mouseRef.current.y; 

      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const baseY = height * (0.55 + i * 0.1);
        const amp   = 18 + i * 10 + my * 28;
        const freq  = 0.007 + i * 0.003;
        const phase = tRef.current * (1 + i * 0.3) + mx * 3.5;
        const alpha = dark
          ? 0.05 + (4 - i) * 0.018
          : 0.025 + (4 - i) * 0.01;

        ctx.moveTo(0, baseY);
        for (let x = 0; x <= width; x += 3) {
          const y =
            baseY +
            Math.sin(x * freq + phase) * amp +
            Math.sin(x * freq * 1.6 + phase * 1.2) * (amp * 0.35);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        // Rosa oscuro corporativo Macrosad
        ctx.fillStyle = `rgba(180, 0, 100, ${alpha})`;
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [dark, width, height, mouseRef]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
