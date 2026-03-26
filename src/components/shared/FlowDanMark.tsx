import iconUrl from "../../assets/icon.png";

export function FlowDanMark({ size = 24, animate = false }: { size?: number; animate?: boolean }) {
  return (
    <img
      src={iconUrl}
      alt="FlowDan"
      width={size}
      height={size}
      style={{
        borderRadius: size > 40 ? 12 : size > 24 ? 8 : 6,
        animation: animate ? "pulse-glow 2s ease-in-out infinite" : undefined,
      }}
      draggable={false}
    />
  );
}
