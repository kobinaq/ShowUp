import { AbsoluteFill, Audio, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { FontFaces } from "./fonts";
import { fadeFrames } from "./theme";
import { scenePlan } from "./timing";
import { Caption, Card, Headline, KenBurns, Kicker, Laptop, Phone, Rise, ShotStack, Stage, Wordmark } from "./ui";
import { color, font } from "./theme";

function cue(sceneId: string, key: string) {
  return scenePlan.find((scene) => scene.id === sceneId)?.cues[key] ?? 0;
}

function shotAt(sceneId: string, key: string) {
  return scenePlan.find((scene) => scene.id === sceneId)?.shots[key] ?? 0;
}

const fadeTiming = linearTiming({ durationInFrames: fadeFrames });

function DarkCopy({
  kicker,
  title,
  lines
}: {
  kicker: string;
  title?: string;
  lines: Array<{ text: string; delay: number; amber?: boolean }>;
}) {
  return (
    <Stage tone="dark">
      <div style={{ position: "absolute", left: 96, right: 96, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 28 }}>
        <Rise>
          <Kicker light>{kicker}</Kicker>
        </Rise>
        {title ? (
          <Rise delay={6}>
            <Headline light size={84}>
              {title}
            </Headline>
          </Rise>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 8 }}>
          {lines.map((line) => (
            <Rise key={line.text} delay={line.delay}>
              <div
                style={{
                  fontFamily: font.display,
                  fontWeight: 600,
                  fontSize: line.amber ? 64 : 48,
                  letterSpacing: "-0.04em",
                  lineHeight: 1.12,
                  color: line.amber ? color.amber : "rgba(255,255,255,0.92)",
                  maxWidth: 1500
                }}
              >
                {line.text}
              </div>
            </Rise>
          ))}
        </div>
      </div>
    </Stage>
  );
}

function Hook() {
  return (
    <DarkCopy
      kicker="Accra Technical University"
      lines={[
        { text: "The class was due at 8.", delay: cue("hook", "0") },
        { text: "The hall is full.", delay: cue("hook", "1") },
        { text: "The lecturer has not arrived.", delay: cue("hook", "2"), amber: true }
      ]}
    />
  );
}

function Origin() {
  return (
    <Stage tone="dark">
      <div style={{ position: "absolute", left: 96, right: 96, top: 80 }}>
        <Rise>
          <Kicker light>Where it began</Kicker>
        </Rise>
        <Rise delay={8}>
          <Headline light size={68}>
            A quality officer’s WhatsApp group of class reps.
          </Headline>
        </Rise>
      </div>
      <div style={{ position: "absolute", left: 96, top: 340, width: 820, display: "flex", flexDirection: "column", gap: 16 }}>
        <Bubble delay={cue("origin", "1")} text="Sir, the lecturer is not in class." />
        <Bubble delay={cue("origin", "2")} text="We are still waiting." mine />
      </div>
      <div style={{ position: "absolute", left: 96, right: 96, bottom: 90 }}>
        <Rise delay={cue("origin", "3")}>
          <div style={{ fontSize: 36, lineHeight: 1.35, maxWidth: 1400, color: "rgba(255,255,255,0.9)" }}>
            Lateness fell once lecturers knew someone was watching. It lived on one phone, and leadership had nothing they could act on.
          </div>
        </Rise>
      </div>
    </Stage>
  );
}

function Bubble({ text, delay, mine = false }: { text: string; delay: number; mine?: boolean }) {
  return (
    <Rise delay={delay}>
      <div
        style={{
          alignSelf: mine ? "flex-end" : "flex-start",
          marginLeft: mine ? 180 : 0,
          background: mine ? color.primary : color.white,
          color: mine ? color.white : color.slate,
          borderRadius: 22,
          padding: "18px 24px",
          fontSize: 32,
          fontWeight: 600,
          width: "fit-content",
          boxShadow: "0 12px 30px rgba(0,0,0,0.18)"
        }}
      >
        {text}
      </div>
    </Rise>
  );
}

function Problem() {
  return (
    <Stage tone="light">
      <div style={{ position: "absolute", left: 80, right: 80, top: 70 }}>
        <Rise>
          <Kicker>The problem at scale</Kicker>
        </Rise>
        <Rise delay={6}>
          <Headline size={68}>A whole university cannot run on one phone.</Headline>
        </Rise>
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 340, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
        <Card delay={16} title="No visibility" body="Attendance, punctuality, and syllabus delivery are not visible session by session." />
        <Card delay={28} title="Scattered evidence" body="Messages, memory, and paper do not add up to a record for review." />
        <Card delay={40} title="No audit" body="Leadership cannot see who reported, what was checked, or what was decided." />
      </div>
    </Stage>
  );
}

function Meet() {
  return (
    <Stage tone="light">
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, paddingBottom: 40 }}>
        <Rise>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: color.deep }}>Meet</div>
        </Rise>
        <Rise delay={8}>
          <Wordmark size={120} />
        </Rise>
        <Rise delay={18}>
          <div style={{ fontFamily: font.display, fontSize: 48, fontWeight: 600, letterSpacing: "-0.04em", color: color.slate, textAlign: "center" }}>
            Quality assurance for teaching delivery.
          </div>
        </Rise>
        <Rise delay={30}>
          <div style={{ fontSize: 30, color: "#3d4854", textAlign: "center", maxWidth: 980 }}>
            Class reps report each session. Meridiqa checks the timetable and the outline, then flags what needs a decision.
          </div>
        </Rise>
      </div>
    </Stage>
  );
}

function PhoneScene({
  kicker,
  title,
  caption,
  shots
}: {
  kicker: string;
  title: string;
  caption: string;
  shots: Array<{ src: string; at: number; focusX?: number; focusY?: number; zoom?: number }>;
}) {
  return (
    <Stage tone="light">
      <div style={{ display: "flex", height: "100%", padding: "56px 72px 190px", alignItems: "center", gap: 56 }}>
        <div style={{ flex: 1 }}>
          <Rise>
            <Kicker>{kicker}</Kicker>
          </Rise>
          <Rise delay={6}>
            <Headline size={64}>{title}</Headline>
          </Rise>
        </div>
        <Phone>
          <ShotStack shots={shots} />
        </Phone>
      </div>
      <Caption>{caption}</Caption>
    </Stage>
  );
}

function Rep() {
  return (
    <PhoneScene
      kicker="Class representative"
      title="A short report, filed from the phone."
      caption="The reporter signs in under an alias. The report follows the session on the timetable."
      shots={[
        { src: "captures/rep-session.png", at: shotAt("rep", "0"), focusX: 50, focusY: 28, zoom: 1.08 },
        { src: "captures/rep-presence.png", at: shotAt("rep", "1"), focusX: 50, focusY: 42, zoom: 1.12 },
        { src: "captures/rep-topics.png", at: shotAt("rep", "2"), focusX: 50, focusY: 35, zoom: 1.08 }
      ]}
    />
  );
}

function Alert() {
  return (
    <PhoneScene
      kicker="During the class"
      title="The live late alert."
      caption="Once the lecturer is late, the representative sends an alert. “I’m on my way” is kept on the record."
      shots={[
        { src: "captures/rep-ping.png", at: shotAt("alert", "0"), focusX: 50, focusY: 62, zoom: 1.18 },
        { src: "captures/rep-ping-sent.png", at: shotAt("alert", "1"), focusX: 50, focusY: 58, zoom: 1.14 },
        { src: "captures/acknowledge.png", at: shotAt("alert", "2"), focusX: 50, focusY: 46, zoom: 1.06 }
      ]}
    />
  );
}

function LaptopScene({
  kicker,
  title,
  caption,
  shots
}: {
  kicker: string;
  title: string;
  caption: string;
  shots: Array<{ src: string; at: number; focusX?: number; focusY?: number; zoom?: number }>;
}) {
  return (
    <Stage tone="light">
      <div style={{ position: "absolute", left: 72, top: 22, right: 72 }}>
        <Kicker>{kicker}</Kicker>
        <div style={{ height: 6 }} />
        <Headline size={44}>{title}</Headline>
      </div>
      <div style={{ position: "absolute", top: 118, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ transform: "scale(0.82)", transformOrigin: "top center" }}>
          <Laptop>
            <ShotStack shots={shots} />
          </Laptop>
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Stage>
  );
}

function Flags() {
  return (
    <LaptopScene
      kicker="Automatic flags"
      title="Rules raise the issue. People decide it."
      caption="Absence, lateness, leaving early, and falling behind the outline are marked from the report."
      shots={[
        { src: "captures/qa-flags.png", at: shotAt("flags", "0"), focusX: 62, focusY: 38, zoom: 1.12 },
        { src: "captures/qa-flags-late.png", at: shotAt("flags", "1"), focusX: 68, focusY: 48, zoom: 1.22 }
      ]}
    />
  );
}

function Coverage() {
  return (
    <LaptopScene
      kicker="Syllabus"
      title="Topics taught, against the outline."
      caption="Nine of twelve topics are covered, in line with this point in the semester."
      shots={[{ src: "captures/course-coverage.png", at: 0, focusX: 68, focusY: 46, zoom: 1.16 }]}
    />
  );
}

function Appeal() {
  return (
    <LaptopScene
      kicker="Due process"
      title="A head of department can appeal."
      caption="Quality assurance decides. One appeal is waiting. The reason is written down. Five days to review."
      shots={[
        { src: "captures/contests.png", at: shotAt("appeal", "0"), focusX: 66, focusY: 42, zoom: 1.18 },
        { src: "captures/contest-report.png", at: shotAt("appeal", "1"), focusX: 62, focusY: 36, zoom: 1.12 }
      ]}
    />
  );
}

function Privacy() {
  return (
    <Stage tone="light">
      <div style={{ position: "absolute", left: 64, top: 28, right: 64 }}>
        <Kicker>Sealed identity</Kicker>
        <div style={{ height: 8 }} />
        <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 42, letterSpacing: "-0.045em", lineHeight: 1, color: color.slate }}>
          The name stays sealed until there is a reason.
        </div>
      </div>
      <div style={{ position: "absolute", top: 160, left: 28, transform: "scale(0.62)", transformOrigin: "top left" }}>
        <Laptop>
          <ShotStack
            shots={[
              { src: "captures/students-sealed.png", at: shotAt("privacy", "0"), focusX: 58, focusY: 58, zoom: 1.12 },
              { src: "captures/lookups.png", at: shotAt("privacy", "1"), focusX: 64, focusY: 40, zoom: 1.1 }
            ]}
          />
        </Laptop>
      </div>
      <div
        style={{
          position: "absolute",
          left: 820,
          top: 176,
          width: 1040,
          background: color.white,
          borderRadius: 24,
          padding: "28px 32px",
          boxShadow: "0 24px 60px rgba(41,50,61,0.14)",
          borderTop: `6px solid ${color.amber}`
        }}
      >
        <Rise delay={cue("privacy", "2")}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: color.deep }}>
            What the reveal returned
          </div>
        </Rise>
        <Rise delay={cue("privacy", "2") + 8}>
          <div style={{ marginTop: 16, fontFamily: font.display, fontWeight: 700, fontSize: 48, letterSpacing: "-0.04em", color: color.slate }}>
            ATU Class Rep 1
          </div>
        </Rise>
        <Rise delay={cue("privacy", "2") + 16}>
          <div style={{ marginTop: 8, fontSize: 30, fontWeight: 600, color: color.deep }}>rep1@atu.edu.gh</div>
        </Rise>
        <Rise delay={cue("privacy", "1")}>
          <div style={{ marginTop: 22, fontSize: 28, lineHeight: 1.35, color: "#3d4854" }}>
            Reason written down: Quality review of a contested session.
          </div>
        </Rise>
        <Rise delay={cue("privacy", "3")}>
          <div style={{ marginTop: 14, fontSize: 28, lineHeight: 1.35, color: "#3d4854" }}>
            The student list still shows only the stand-in name.
          </div>
        </Rise>
      </div>
      <Caption>The real name stays sealed until there is a reason. The reason is written down.</Caption>
    </Stage>
  );
}

function Roles() {
  return (
    <LaptopScene
      kicker="Who sees what"
      title="Each person sees only their own part."
      caption="Quality assurance runs the day. A head of department sees one department. The Vice-Chancellor sees the university. The technology team sets the rules."
      shots={[
        { src: "captures/qa-dashboard.png", at: shotAt("roles", "0"), focusX: 64, focusY: 36, zoom: 1.14 },
        { src: "captures/hod-dashboard.png", at: shotAt("roles", "1"), focusX: 64, focusY: 36, zoom: 1.14 },
        { src: "captures/vc-analytics.png", at: shotAt("roles", "2"), focusX: 66, focusY: 34, zoom: 1.12 },
        { src: "captures/it-settings-ai.png", at: shotAt("roles", "3"), focusX: 62, focusY: 55, zoom: 1.16 }
      ]}
    />
  );
}

const lateThisWeek = [
  ["Abena Mensah", "ACCT301"],
  ["Akua Mensah", "CENG301"],
  ["Ama Addo", "CIV301"],
  ["Adjoa Agyemang", "EST301"],
  ["Efua Addo", "PROC301"],
  ["Esi Agyemang", "STAT301"]
] as const;

function Ask() {
  return (
    <Stage tone="light">
      <div style={{ position: "absolute", left: 64, top: 28, right: 64 }}>
        <Kicker>Vice-Chancellor</Kicker>
        <div style={{ height: 8 }} />
        <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 44, letterSpacing: "-0.045em", lineHeight: 1, color: color.slate }}>
          Ask the week’s record, in plain English.
        </div>
      </div>
      <div style={{ position: "absolute", top: 168, left: 28, transform: "scale(0.62)", transformOrigin: "top left" }}>
        <Laptop>
          <ShotStack
            shots={[
              { src: "captures/ask-open.png", at: shotAt("ask", "0"), focusX: 78, focusY: 48, zoom: 1.12 },
              { src: "captures/ask-question.png", at: shotAt("ask", "1"), focusX: 78, focusY: 52, zoom: 1.16 },
              { src: "captures/ask-answer.png", at: shotAt("ask", "2"), focusX: 80, focusY: 58, zoom: 1.2 }
            ]}
          />
        </Laptop>
      </div>
      <div
        style={{
          position: "absolute",
          left: 820,
          top: 176,
          width: 1040,
          background: color.white,
          borderRadius: 24,
          padding: "26px 32px 22px",
          boxShadow: "0 24px 60px rgba(41,50,61,0.14)",
          borderTop: `6px solid ${color.primary}`
        }}
      >
        <Rise delay={8}>
          <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 32, letterSpacing: "-0.03em", color: color.slate, lineHeight: 1.2 }}>
            Which lecturers have been late this week?
          </div>
        </Rise>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {lateThisWeek.map(([name, course], index) => (
            <Rise key={course} delay={cue("ask", String(3 + index))}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 16,
                  borderTop: `1px solid ${color.line}`,
                  paddingTop: 8
                }}
              >
                <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 32, letterSpacing: "-0.03em", color: color.slate }}>{name}</div>
                <div style={{ fontWeight: 700, fontSize: 26, color: color.deep }}>{course}</div>
              </div>
            </Rise>
          ))}
        </div>
        <Rise delay={cue("ask", "2")}>
          <div style={{ marginTop: 14, fontSize: 24, color: "#3d4854" }}>Each was recorded late once, in this week’s reports.</div>
        </Rise>
      </div>
      <Caption>The answer is Meridiqa’s own count for this week. Six lecturers. One late report each.</Caption>
    </Stage>
  );
}

function ExportScene() {
  return (
    <Stage tone="light">
      <div style={{ position: "absolute", left: 72, top: 22 }}>
        <Kicker>For the meeting</Kicker>
        <div style={{ height: 6 }} />
        <Headline size={44}>Take the evidence with you.</Headline>
      </div>
      <div style={{ position: "absolute", top: 130, left: 36, transform: "scale(0.62)", transformOrigin: "top left" }}>
        <Laptop>
          <KenBurns src="captures/reports-export.png" focusX={72} focusY={28} zoom={1.08} />
        </Laptop>
      </div>
      <div
        style={{
          position: "absolute",
          left: 900,
          top: 220,
          width: 900,
          background: color.white,
          borderRadius: 20,
          padding: "22px 24px",
          boxShadow: "0 20px 50px rgba(41,50,61,0.12)",
          fontFamily: font.body
        }}
      >
        <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 28, color: color.slate }}>meridiqa-reports.csv</div>
        <div style={{ marginTop: 14, fontSize: 22, lineHeight: 1.45, color: "#31404c" }}>
          16 Oct 2026 · STAT302 · Present
          <br />
          16 Oct 2026 · MKT301 · Absent · 1 flag
          <br />
          16 Oct 2026 · CIV301 · Present · 10 min late · 1 flag
          <br />
          15 Oct 2026 · STAT301 · Present · 10 min late · 1 flag
        </div>
      </div>
      <Caption>The record can leave as a spreadsheet: date, course, presence, minutes late, and any marks.</Caption>
    </Stage>
  );
}

function Fairness() {
  return (
    <LaptopScene
      kicker="Two reporters"
      title="A disagreement stays visible."
      caption="If two representatives disagree, that disagreement stays visible. This sample has none open."
      shots={[{ src: "captures/discrepancies.png", at: 0, focusX: 64, focusY: 40, zoom: 1.12 }]}
    />
  );
}

function Roadmap() {
  return (
    <Stage tone="dark">
      <div style={{ position: "absolute", left: 96, right: 96, top: 90 }}>
        <Rise>
          <Kicker light>Roadmap</Kicker>
        </Rise>
        <Rise delay={8}>
          <Headline light size={72}>
            The report first. A camera later.
          </Headline>
        </Rise>
      </div>
      <div style={{ position: "absolute", left: 96, right: 96, top: 380, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
        <RoadCard delay={20} step="Next" title="Hybrid" body="A camera in the room would sit beside the class representative’s report. Two witnesses, one record." />
        <RoadCard delay={34} step="Later" title="Camera-led" body="When the university is ready, the camera can lead. The record of every decision stays. Not a feature today." />
      </div>
    </Stage>
  );
}

function RoadCard({ delay, step, title, body }: { delay: number; step: string; title: string; body: string }) {
  return (
    <Rise delay={delay}>
      <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 24, padding: "32px 34px" }}>
        <div style={{ color: color.amber, fontWeight: 700, letterSpacing: "0.14em", fontSize: 20, textTransform: "uppercase" }}>{step}</div>
        <div style={{ marginTop: 12, fontFamily: font.display, fontSize: 48, fontWeight: 700, letterSpacing: "-0.04em" }}>{title}</div>
        <div style={{ marginTop: 12, fontSize: 30, lineHeight: 1.35, color: "rgba(255,255,255,0.88)" }}>{body}</div>
      </div>
    </Rise>
  );
}

function Close() {
  return (
    <Stage tone="dark">
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26 }}>
        <Rise>
          <Wordmark light size={108} />
        </Rise>
        <Rise delay={10}>
          <div style={{ fontFamily: font.display, fontSize: 42, fontWeight: 600, letterSpacing: "-0.04em" }}>Teaching delivery, on the record.</div>
        </Rise>
        <Rise delay={22}>
          <div style={{ fontSize: 32, color: color.amber, fontWeight: 700 }}>hello@faithfulquayson.com</div>
        </Rise>
        <Rise delay={32}>
          <div style={{ fontSize: 24, color: "rgba(255,255,255,0.7)" }}>For the Dean and Vice-Chancellor, Accra Technical University</div>
        </Rise>
      </div>
    </Stage>
  );
}

const sceneComponents: Record<string, React.FC> = {
  hook: Hook,
  origin: Origin,
  problem: Problem,
  meet: Meet,
  rep: Rep,
  alert: Alert,
  flags: Flags,
  coverage: Coverage,
  appeal: Appeal,
  privacy: Privacy,
  roles: Roles,
  ask: Ask,
  export: ExportScene,
  fairness: Fairness,
  roadmap: Roadmap,
  close: Close
};

const scenes = scenePlan.map((scene) => ({
  id: scene.id,
  frames: scene.frames,
  Component: sceneComponents[scene.id]
}));

export const demoDuration = scenes.reduce((sum, scene) => sum + scene.frames, 0) - fadeFrames * (scenes.length - 1);

export function Demo() {
  return (
    <AbsoluteFill>
      <FontFaces />
      <Audio src={staticFile("audio/mix.m4a")} />
      <TransitionSeries>
        {scenes.map((scene, index) => (
          <TransitionSeries.Sequence key={scene.id} durationInFrames={scene.frames}>
            <scene.Component />
          </TransitionSeries.Sequence>
        )).flatMap((node, index) =>
          index < scenes.length - 1
            ? [
                node,
                <TransitionSeries.Transition key={`fade-${scenes[index].id}`} presentation={fade()} timing={fadeTiming} />
              ]
            : [node]
        )}
      </TransitionSeries>
    </AbsoluteFill>
  );
}
