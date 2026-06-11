type Props = { size?: "sm" | "md"; href?: string };

export default function Logo({ size = "md" }: Props) {
  const orbSize = size === "sm" ? 18 : 22;
  const fontSize = size === "sm" ? 14 : 16;

  return (
    <span className="inline-flex items-center" style={{ fontSize, fontWeight: 800, letterSpacing: "-0.02em" }}>
      <span className="text-white">gener</span>
      <span
        aria-hidden
        style={{
          width: orbSize,
          height: orbSize,
          borderRadius: "50%",
          margin: "0 2px",
          display: "inline-block",
          background: "radial-gradient(circle at 35% 30%, #C9A8FF 0%, #8E5DF7 35%, #5E3FD2 75%, #2E1F77 100%)",
          boxShadow:
            "0 0 14px rgba(142,93,247,0.55), inset 0 0 6px rgba(255,255,255,0.4)",
          verticalAlign: "middle",
          flexShrink: 0,
        }}
      />
      <span className="text-white">agent</span>
    </span>
  );
}
