import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { color, font } from "./theme";

export function Stage({
  tone,
  children
}: {
  tone: "dark" | "light";
  children: React.ReactNode;
}) {
  const dark = tone === "dark";
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: dark
          ? `radial-gradient(900px 520px at 18% 0%, rgba(66,136,201,0.38), transparent 60%), linear-gradient(180deg, #1c242c 0%, ${color.slate} 48%, #1a2128 100%)`
          : `radial-gradient(820px 480px at 90% -10%, rgba(66,136,201,0.22), transparent 55%), linear-gradient(180deg, ${color.white} 0%, ${color.mist} 100%)`,
        color: dark ? color.white : color.ink,
        fontFamily: font.body
      }}
    >
      {children}
    </div>
  );
}

export function Rise({
  children,
  delay = 0,
  distance = 28
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.7 }
  });
  return (
    <div
      style={{
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)`
      }}
    >
      {children}
    </div>
  );
}

export function Kicker({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div
      style={{
        fontFamily: font.body,
        fontWeight: 700,
        fontSize: 22,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: light ? "rgba(255,255,255,0.72)" : color.deep
      }}
    >
      {children}
    </div>
  );
}

export function Headline({
  children,
  size = 78,
  light = false
}: {
  children: React.ReactNode;
  size?: number;
  light?: boolean;
}) {
  return (
    <div
      style={{
        fontFamily: font.display,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 0.98,
        letterSpacing: "-0.045em",
        color: light ? color.white : color.slate,
        maxWidth: 1100
      }}
    >
      {children}
    </div>
  );
}

export function Caption({ children }: { children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [4, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 48,
        right: 48,
        bottom: 36,
        opacity
      }}
    >
      <div
        style={{
          background: color.slate,
          color: color.white,
          borderRadius: 22,
          padding: "22px 32px",
          fontFamily: font.body,
          fontSize: 34,
          fontWeight: 500,
          lineHeight: 1.25,
          boxShadow: "0 18px 50px rgba(41,50,61,0.18)"
        }}
      >
        {children}
      </div>
    </div>
  );
}

type Shot = {
  src: string;
  at: number;
  focusX?: number;
  focusY?: number;
  zoom?: number;
};

export function KenBurns({
  src,
  focusX = 58,
  focusY = 42,
  zoom = 1.08
}: {
  src: string;
  focusX?: number;
  focusY?: number;
  zoom?: number;
}) {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 90], [1.02, zoom], { extrapolateRight: "clamp" });
  return (
    <Img
      src={staticFile(src)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: `scale(${scale})`,
        transformOrigin: `${focusX}% ${focusY}%`
      }}
    />
  );
}

export function ShotStack({ shots }: { shots: Shot[] }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: color.white }}>
      {shots.map((shot, index) => {
        const nextAt = shots[index + 1]?.at ?? Number.POSITIVE_INFINITY;
        if (frame < shot.at - 10 || frame > nextAt + 8) return null;
        const fadeIn = interpolate(frame, [shot.at, shot.at + 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp"
        });
        const local = Math.max(0, frame - shot.at);
        const scale = interpolate(local, [0, 80], [1.03, shot.zoom ?? 1.1], { extrapolateRight: "clamp" });
        return (
          <Img
            key={shot.src + shot.at}
            src={staticFile(shot.src)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: index === 0 ? 1 : fadeIn,
              transform: `scale(${scale})`,
              transformOrigin: `${shot.focusX ?? 60}% ${shot.focusY ?? 40}%`
            }}
          />
        );
      })}
    </div>
  );
}

export function Laptop({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 90, mass: 0.8 } });
  return (
    <div
      style={{
        width: 1180,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [36, 0])}px) scale(${interpolate(enter, [0, 1], [0.97, 1])})`
      }}
    >
      <div
        style={{
          borderRadius: 28,
          padding: 14,
          background: "linear-gradient(180deg, #3c4652 0%, #242b33 100%)",
          boxShadow: "0 40px 80px rgba(41,50,61,0.28), 0 2px 0 rgba(255,255,255,0.25) inset"
        }}
      >
        <div style={{ height: 18, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ width: 8, height: 8, borderRadius: 99, background: "#6d7782" }} />
        </div>
        <div style={{ height: 610, borderRadius: 12, overflow: "hidden", background: color.white }}>{children}</div>
      </div>
      <div
        style={{
          height: 16,
          margin: "0 80px",
          borderRadius: "0 0 16px 16px",
          background: "linear-gradient(180deg, #d5dde4, #b7c2cc)"
        }}
      />
    </div>
  );
}

export function Phone({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 100, mass: 0.75 } });
  return (
    <div
      style={{
        width: 390,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px)`
      }}
    >
      <div
        style={{
          borderRadius: 46,
          padding: 12,
          background: "linear-gradient(180deg, #3a4450, #1d242b)",
          boxShadow: "0 36px 70px rgba(41,50,61,0.32)"
        }}
      >
        <div style={{ height: 22, display: "flex", justifyContent: "center" }}>
          <div style={{ width: 96, height: 16, borderRadius: 20, background: "#101418" }} />
        </div>
        <div style={{ height: 700, borderRadius: 32, overflow: "hidden", background: color.white }}>{children}</div>
      </div>
    </div>
  );
}

export function Wordmark({ light = false, size = 92 }: { light?: boolean; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
      <div
        style={{
          width: size * 0.72,
          height: size * 0.72,
          borderRadius: size * 0.16,
          background: light ? color.white : color.primary,
          color: light ? color.slate : color.white,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: font.display,
          fontWeight: 700,
          fontSize: size * 0.42,
          boxShadow: "0 16px 40px rgba(48,101,176,0.28)"
        }}
      >
        M
      </div>
      <div
        style={{
          fontFamily: font.display,
          fontWeight: 700,
          fontSize: size,
          letterSpacing: "-0.05em",
          color: light ? color.white : color.slate,
          lineHeight: 1
        }}
      >
        Meridiqa
      </div>
    </div>
  );
}

export function Card({
  title,
  body,
  delay
}: {
  title: string;
  body: string;
  delay: number;
}) {
  return (
    <Rise delay={delay}>
      <div
        style={{
          background: color.white,
          borderRadius: 24,
          padding: "28px 32px",
          boxShadow: "0 16px 40px rgba(41,50,61,0.08)",
          borderTop: `6px solid ${color.amber}`
        }}
      >
        <div style={{ fontFamily: font.display, fontSize: 40, fontWeight: 700, letterSpacing: "-0.04em", color: color.slate }}>
          {title}
        </div>
        <div style={{ marginTop: 10, fontSize: 28, lineHeight: 1.35, color: "#3d4854" }}>{body}</div>
      </div>
    </Rise>
  );
}
