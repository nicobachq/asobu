type SkillValueBarProps = {
  value: number;
  min?: number;
  max?: number;
  isLocked?: boolean;
  onChange?: (value: number) => void;
  ariaLabel: string;
};

function clampPercentage(value: number, min: number, max: number) {
  if (max <= min) return 0;
  const normalized = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

function SkillValueBar({
  value,
  min = 20,
  max = 99,
  isLocked = false,
  onChange,
  ariaLabel,
}: SkillValueBarProps) {
  const fillPercentage = clampPercentage(value, min, max);

  return (
    <div className="mt-4">
      <div className="relative">
        <div className="h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200 shadow-inner">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${
              isLocked
                ? 'shadow-[0_0_16px_rgba(13,148,136,0.18)]'
                : 'shadow-[0_0_14px_rgba(37,99,235,0.18)]'
            }`}
            style={{
              width: `${fillPercentage}%`,
              background: isLocked
                ? 'linear-gradient(90deg, #2563eb 0%, #14b8a6 58%, #d4a017 100%)'
                : 'linear-gradient(90deg, #2563eb 0%, #3b82f6 52%, #22d3ee 100%)',
            }}
          />
        </div>

        <div className="pointer-events-none absolute inset-[1px] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0))]" />

        {!isLocked && onChange ? (
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            aria-label={ariaLabel}
            className="asobu-skill-slider absolute inset-x-0 top-1/2 h-8 -translate-y-1/2 appearance-none bg-transparent"
          />
        ) : null}
      </div>
    </div>
  );
}

export default SkillValueBar;
