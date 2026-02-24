interface VoiceBarsProps {
  barHeights: number[];
  isActive: boolean;
}

export function VoiceBars({ barHeights, isActive }: VoiceBarsProps) {
  return (
    <div className="voice-bars">
      {barHeights.map((h, i) => (
        <div
          key={i}
          className={`bar ${isActive ? "active" : ""}`}
          style={{ height: `${Math.max(2.5, h * 18)}px` }}
        />
      ))}
    </div>
  );
}
