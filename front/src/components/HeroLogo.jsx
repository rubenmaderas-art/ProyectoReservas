import React from 'react';

export default function HeroLogo({ dark = true, size = 220 }) {
  // uid único para que los IDs de gradiente no colisionen si hay varias instancias
  const uid = `hl_${dark ? 'd' : 'l'}_${size}`;

  return (
    <div style={{ width: size, height: size * 0.72, position: 'relative', overflow: 'visible' }}>
      <svg
        width={size}
        height={size * 0.72}
        viewBox="0 0 400 287"
        fill="none"
        style={{ overflow: 'visible' }}
        xmlns="http://www.w3.org/2000/svg">

        <defs>
          {/* Filtro: halo exterior suave */}
          <filter id={`outerGlow_${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Filtro: resplandor interior fino */}
          <filter id={`innerGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradiente principal que fluye — rota + cambia de color */}
          <linearGradient
            id={`flow_${uid}`}
            x1="0%" y1="0%" x2="100%" y2="100%"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor="#ff80c8">
              <animate
                attributeName="stop-color"
                values="#ff80c8;#ff003c;#E5007D;#ff80c8"
                dur="4s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="40%" stopColor="#E5007D">
              <animate
                attributeName="stop-color"
                values="#ff80c8;#b5005f;#E5007D;#ff80c8"
                dur="4s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#b5005f">
              <animate
                attributeName="stop-color"
                values="#c71370ff;#E5007D;#ff80c8;#b5005f"
                dur="4s"
                repeatCount="indefinite"
              />
            </stop>
            <animateTransform
              attributeName="gradientTransform"
              type="rotate"
              values="0 0.5 0.5;360 0.5 0.5"
              dur="6s"
              repeatCount="indefinite"
            />
          </linearGradient>


        </defs>

        {/* Capa 1 — halo exterior difuso (escala 1.22×) */}
        <path
          fill={`url(#flow_${uid})`}
          filter={`url(#innerGlow_${uid})`}
          d={LOGO_PATH}
        />
      </svg>
    </div>
  );
}

// Path del isotipo Macrosad (pétalos)
const LOGO_PATH =
  'M316.4,121c-16.1,0-34.3,6-54.2,17.8,11.3-19.2,17-36.9,17-52.6,' +
  '0-44-35.7-79.7-79.7-79.7s-79.7,35.7-79.7,79.7,5.7,32.9,17,52c' +
  '-19.5-11.5-37.4-17.3-53.2-17.3-44,0-79.7,35.7-79.7,79.7s35.7,79.7,' +
  '79.7,79.7,100.3-50.5,116.4-69.4c16,18.8,64,69.4,116.4,69.4s79.7-35.7,' +
  '79.7-79.7-35.7-79.7-79.7-79.7h0ZM83.6,264.7c-35.3,0-64-28.7-64-64s' +
  '28.7-64,64-64,73.2,33.4,93.9,53.2c3.1,3.2,6,6.1,8.4,8.4.8.8,1.6,1.6,' +
  '2.3,2.4-12.3,14.3-58.5,64-104.5,64h0ZM203.2,186.9c-1.2,1.1-2.3,2.2-3.2,' +
  '3.1-.9-.8-1.9-1.8-2.9-2.8-2.4-2.4-5.2-5.3-8.4-8.4-19.8-20.5-53.1-59.7,' +
  '-53.1-92.5s28.7-64,64-64,64,28.7,64,64-33.6,73.3-53.6,93.9c-2.5,2.5-4.8,' +
  '4.8-6.7,6.8h0ZM316.4,264.7c-46,0-92.2-49.7-104.5-64,.7-.8,1.6-1.6,2.4-2.5,' +
  '2.1-2,4.4-4.3,6.9-6.9,20.9-20.4,61.2-54.6,95.2-54.6s64,28.7,64,64-28.7,64,-64,64h0Z';
