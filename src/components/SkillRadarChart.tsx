import { useMemo } from 'react';

type SkillPoint = {
  label: string;
  shortLabel: string;
  value: number;
};

type SkillRadarChartProps = {
  title?: string;
  points: SkillPoint[];
};

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function SkillRadarChart({ title, points }: SkillRadarChartProps) {
  const size = 320;
  const center = size / 2;
  const outerRadius = 106;
  const levels = 5;

  const computed = useMemo(() => {
    const total = Math.max(points.length, 3);

    const labelPoints = points.map((point, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
      const axis = polarToCartesian(center, center, outerRadius, angle);
      const label = polarToCartesian(center, center, outerRadius + 24, angle);
      const plot = polarToCartesian(
        center,
        center,
        (outerRadius * point.value) / 100,
        angle
      );

      return {
        ...point,
        angle,
        axis,
        label,
        plot,
      };
    });

    const polygonPoints = labelPoints.map((point) => `${point.plot.x},${point.plot.y}`).join(' ');

    const gridLevels = Array.from({ length: levels }, (_, levelIndex) => {
      const radius = (outerRadius * (levelIndex + 1)) / levels;
      const coordinates = labelPoints
        .map((point) => {
          const gridPoint = polarToCartesian(center, center, radius, point.angle);
          return `${gridPoint.x},${gridPoint.y}`;
        })
        .join(' ');

      return {
        radius,
        coordinates,
      };
    });

    return {
      labelPoints,
      polygonPoints,
      gridLevels,
    };
  }, [points]);

  return (
    <div className="rounded-[28px] bg-white p-5 shadow-sm">
      {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}

      <div className="mt-4 flex justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-[320px] w-[320px] max-w-full">
          {computed.gridLevels.map((level, index) => (
            <polygon
              key={index}
              points={level.coordinates}
              fill={index === computed.gridLevels.length - 1 ? '#f8fafc' : 'transparent'}
              stroke="#cbd5e1"
              strokeWidth="1"
            />
          ))}

          {computed.labelPoints.map((point) => (
            <line
              key={point.shortLabel}
              x1={center}
              y1={center}
              x2={point.axis.x}
              y2={point.axis.y}
              stroke="#cbd5e1"
              strokeWidth="1"
            />
          ))}

          <polygon
            points={computed.polygonPoints}
            fill="rgba(14, 165, 233, 0.18)"
            stroke="#0f172a"
            strokeWidth="2"
          />

          {computed.labelPoints.map((point) => (
            <g key={`${point.shortLabel}-value`}>
              <circle cx={point.plot.x} cy={point.plot.y} r="4.5" fill="#0f172a" />
              <text
                x={point.label.x}
                y={point.label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-500 text-[11px] font-semibold uppercase tracking-[0.18em]"
              >
                {point.shortLabel}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {points.map((point) => (
          <div key={point.shortLabel} className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {point.shortLabel}
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">{point.value}</p>
            <p className="text-xs text-slate-500">{point.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SkillRadarChart;
