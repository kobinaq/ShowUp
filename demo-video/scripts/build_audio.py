#!/usr/bin/env python3
"""Build the narration, original piano bed, and a -16 LUFS mix.

Voice: Microsoft edge-tts, en-NG-AbeoNeural (Nigerian English). No API key.
Music: original composition for this film, rendered with FluidR3_GM (MIT).
"""

from __future__ import annotations

import json
import os
import random
import struct
import subprocess
import wave
from pathlib import Path

os.environ["PATH"] = str(Path.home() / ".local" / "bin") + os.pathsep + os.environ.get("PATH", "")

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "public" / "audio"
CHUNKS = AUDIO / "chunks"
FPS = 30
FADE_FRAMES = 14
SR = 48000
VOICE = "en-NG-AbeoNeural"
RATE = "-10%"
PITCH = "-3Hz"

# Each scene is a list of spoken chunks. "shot" selects which product still
# becomes visible when that sentence starts (the first shot is always on screen).
SCENES: list[dict] = [
    {
        "id": "hook",
        "lead": 1.45,
        "tail": 0.40,
        "chunks": [
            {"text": "The class was due at eight."},
            {"text": "The hall is full."},
            {"text": "The lecturer has not arrived."},
        ],
    },
    {
        "id": "origin",
        "lead": 0.32,
        "tail": 0.38,
        "chunks": [
            {"text": "A quality officer at Accra Technical University kept a WhatsApp group of class representatives."},
            {"text": "They wrote: the lecturer is not in class.", "shot": 1},
            {"text": "We are still waiting.", "shot": 2},
            {"text": "Lateness fell, once lecturers knew someone was watching. But it lived on one phone, and leadership had nothing they could act on."},
        ],
    },
    {
        "id": "problem",
        "lead": 0.28,
        "tail": 0.36,
        "chunks": [
            {"text": "A whole university cannot run on one phone. The evidence is scattered. And no one can see who reported, or what was decided."},
        ],
    },
    {
        "id": "meet",
        "lead": 0.30,
        "tail": 0.40,
        "chunks": [
            {"text": "This is Meridiqa. Class representatives report each session. Meridiqa checks the timetable and the course outline, and raises what needs a decision."},
        ],
    },
    {
        "id": "rep",
        "lead": 0.26,
        "tail": 0.32,
        "chunks": [
            {"text": "The report is short, and it is filed from the phone.", "shot": 0},
            {"text": "The representative signs in under a stand-in name.", "shot": 1},
            {"text": "It follows the class already on the timetable.", "shot": 2},
        ],
    },
    {
        "id": "alert",
        "lead": 0.26,
        "tail": 0.32,
        "chunks": [
            {"text": "If the lecturer is late, the representative sends an alert.", "shot": 0},
            {"text": "This class is seventy-one minutes late.", "shot": 1},
            {"text": "The lecturer can answer: I'm on my way. That answer is kept.", "shot": 2},
        ],
    },
    {
        "id": "flags",
        "lead": 0.26,
        "tail": 0.32,
        "chunks": [
            {"text": "The rules raise the issue. People decide it. Absence, lateness, leaving early, and falling behind the outline are marked from the report."},
        ],
    },
    {
        "id": "coverage",
        "lead": 0.26,
        "tail": 0.32,
        "chunks": [
            {"text": "The topics taught are set against the course outline. Nine of twelve are covered, in line with this point in the semester."},
        ],
    },
    {
        "id": "appeal",
        "lead": 0.26,
        "tail": 0.32,
        "chunks": [
            {"text": "A head of department can appeal. Quality assurance decides.", "shot": 0},
            {"text": "One appeal is waiting. The reason is written down, and there are five days to review it.", "shot": 1},
        ],
    },
    {
        "id": "privacy",
        "lead": 0.26,
        "tail": 0.34,
        "chunks": [
            {"text": "The real name stays sealed, until there is a reason.", "shot": 0},
            {"text": "That reason has to be written down."},
            {"text": "Here, the name that came back was A.T.U. Class Rep 1.", "shot": 1},
            {"text": "The student list still shows only the stand-in name."},
        ],
    },
    {
        "id": "roles",
        "lead": 0.24,
        "tail": 0.30,
        "chunks": [
            {"text": "Quality assurance runs the day.", "shot": 0},
            {"text": "A head of department sees one department.", "shot": 1},
            {"text": "The Vice-Chancellor sees the whole university.", "shot": 2},
            {"text": "The technology team sets the rules.", "shot": 3},
        ],
    },
    {
        "id": "ask",
        "lead": 0.26,
        "tail": 0.36,
        "chunks": [
            {"text": "The Vice-Chancellor can ask the week's record, in plain English.", "shot": 0},
            {"text": "Which lecturers have been late this week?", "shot": 1},
            {"text": "Six lecturers were each late once.", "shot": 2},
            {"text": "Abena Mensah."},
            {"text": "Akua Mensah."},
            {"text": "Ama Addo."},
            {"text": "Adjoa Agyemang."},
            {"text": "Efua Addo."},
            {"text": "And Esi Agyemang."},
        ],
    },
    {
        "id": "export",
        "lead": 0.26,
        "tail": 0.32,
        "chunks": [
            {"text": "The same record can be taken into a meeting, as a spreadsheet. Date, course, presence, minutes late, and any marks."},
        ],
    },
    {
        "id": "fairness",
        "lead": 0.26,
        "tail": 0.32,
        "chunks": [
            {"text": "If two representatives disagree, that disagreement stays visible. In this sample, none are open."},
        ],
    },
    {
        "id": "roadmap",
        "lead": 0.30,
        "tail": 0.38,
        "chunks": [
            {"text": "The report comes first. A camera can come later, beside the class representative, as a second witness. That is the road ahead. It is not a feature today."},
        ],
    },
    {
        "id": "close",
        "lead": 0.40,
        "tail": 0.30,
        "outro": 2.8,
        "chunks": [
            {"text": "Meridiqa. Teaching delivery, on the record."},
            {"text": "For the Dean and the Vice-Chancellor of Accra Technical University."},
            {"text": "hello at faithful quayson dot com."},
        ],
    },
]


def frames(seconds: float) -> int:
    return int(round(seconds * FPS))


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path), "rb") as handle:
        channels = handle.getnchannels()
        rate = handle.getframerate()
        if rate != SR or handle.getsampwidth() != 2:
            raise SystemExit(f"unexpected wav format: {path}")
        raw = handle.readframes(handle.getnframes())
    data = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    if channels == 1:
        return data.reshape(-1, 1)
    return data.reshape(-1, channels)


def write_wav(path: Path, data: np.ndarray) -> None:
    clipped = np.clip(data, -1.0, 1.0)
    pcm = (clipped * 32767.0).astype(np.int16)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(pcm.shape[1])
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes(pcm.tobytes())


def trim_silence(samples: np.ndarray, threshold: float = 0.012) -> np.ndarray:
    mono = np.max(np.abs(samples), axis=1)
    hot = np.where(mono > threshold)[0]
    if len(hot) == 0:
        return samples
    start = max(0, int(hot[0]) - int(0.02 * SR))
    end = min(len(samples), int(hot[-1]) + int(0.06 * SR))
    return samples[start:end]


def synthesize() -> list[list[np.ndarray]]:
    CHUNKS.mkdir(parents=True, exist_ok=True)
    spoken: list[list[np.ndarray]] = []
    for scene in SCENES:
        scene_audio: list[np.ndarray] = []
        for index, chunk in enumerate(scene["chunks"]):
            mp3 = CHUNKS / f"{scene['id']}-{index}.mp3"
            wav = CHUNKS / f"{scene['id']}-{index}.wav"
            if not mp3.exists():
                run(
                    [
                        "edge-tts",
                        "--voice",
                        VOICE,
                        f"--rate={RATE}",
                        f"--pitch={PITCH}",
                        "--text",
                        chunk["text"],
                        "--write-media",
                        str(mp3),
                    ]
                )
            run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(mp3),
                    "-ac",
                    "1",
                    "-ar",
                    str(SR),
                    str(wav),
                ]
            )
            scene_audio.append(trim_silence(read_wav(wav)))
        spoken.append(scene_audio)
    return spoken


def layout(spoken: list[list[np.ndarray]]) -> tuple[np.ndarray, dict]:
    gap = frames(0.12)
    pieces: list[tuple[int, np.ndarray]] = []
    plan: list[dict] = []
    cursor = 0
    for scene, clips in zip(SCENES, spoken):
        lead = frames(scene["lead"])
        tail = frames(scene["tail"])
        cues: dict[str, int] = {}
        shot_at: dict[str, int] = {}
        offset = lead
        for index, clip in enumerate(clips):
            cues[str(index)] = offset
            shot = scene["chunks"][index].get("shot")
            if shot is not None:
                shot_at[str(shot)] = 0 if shot == 0 else offset
            clip_frames = max(1, int(round(len(clip) / SR * FPS)))
            pieces.append((cursor + offset, clip))
            offset += clip_frames
            if index < len(clips) - 1:
                offset += gap
        if scene["id"] == "flags":
            shot_at["1"] = lead + max(1, (offset - lead) // 2)
        end_pad = frames(scene["outro"]) if scene.get("outro") else FADE_FRAMES
        scene_frames = offset + tail + end_pad
        plan.append(
            {
                "id": scene["id"],
                "frames": scene_frames,
                "cues": cues,
                "shots": shot_at,
            }
        )
        cursor += scene_frames - (0 if scene.get("outro") else FADE_FRAMES)
    total = cursor
    voice = np.zeros((int(total / FPS * SR) + SR, 1), dtype=np.float32)
    for start_frame, clip in pieces:
        start = int(start_frame / FPS * SR)
        end = start + len(clip)
        if end > len(voice):
            voice = np.pad(voice, ((0, end - len(voice) + SR), (0, 0)))
        voice[start:end, 0] += clip[:, 0]
    voice = voice[: int(total / FPS * SR)]
    return voice, {"fps": FPS, "fadeFrames": FADE_FRAMES, "totalFrames": total, "scenes": plan}


def vlq(value: int) -> bytes:
    buffer = [value & 0x7F]
    value >>= 7
    while value:
        buffer.append((value & 0x7F) | 0x80)
        value >>= 7
    return bytes(reversed(buffer))


def midi_track(events: list[tuple[int, bytes]]) -> bytes:
    payload = b"".join(vlq(delta) + body for delta, body in events)
    return b"MTrk" + struct.pack(">I", len(payload)) + payload


def write_music_midi(path: Path, seconds: float) -> None:
    ppq = 480
    bpm = 66
    us = int(60_000_000 / bpm)
    progression = [
        ([38, 45], [54, 57, 61, 66]),  # Dmaj7
        ([43, 50], [55, 59, 62, 66]),  # Gmaj7
        ([45, 52], [57, 61, 64, 69]),  # A6
        ([42, 49], [54, 57, 61, 64]),  # F#m7
        ([43, 50], [55, 59, 62, 67]),  # Gmaj7
        ([45, 52], [57, 61, 66, 69]),  # D/A
        ([40, 47], [52, 55, 59, 62]),  # Em7
        ([45, 52], [55, 60, 64, 69]),  # Asus
    ]
    ticks_per_chord = ppq * 8  # two bars of 4/4
    rng = random.Random(2026)
    absolute: list[tuple[int, bytes]] = []

    def add(tick: int, body: bytes) -> None:
        absolute.append((max(0, tick), body))

    add(0, bytes([0xC0, 0]))
    chord_count = int(seconds / (ticks_per_chord / ppq * 60 / bpm)) + 2
    for index in range(chord_count):
        start = index * ticks_per_chord
        left, right = progression[index % len(progression)]
        human = rng.randint(-12, 12)
        for note in left:
            velocity = rng.randint(34, 42)
            add(start + human, bytes([0x90, note, velocity]))
            add(start + ticks_per_chord - 40, bytes([0x80, note, 0]))
        for note in right:
            velocity = rng.randint(30, 40)
            add(start + 30 + human, bytes([0x90, note, velocity]))
            add(start + ticks_per_chord - 80, bytes([0x80, note, 0]))
        # A single high tone in the opening and the close, so the bed stays sparse under the voice.
        if index < 2 or index > chord_count - 4:
            melody = right[-1] + 12
            add(start + ppq * 2, bytes([0x90, melody, 36]))
            add(start + ppq * 5, bytes([0x80, melody, 0]))
    absolute.sort(key=lambda item: item[0])
    events: list[tuple[int, bytes]] = []
    previous = 0
    for tick, body in absolute:
        events.append((tick - previous, body))
        previous = tick
    events.append((0, bytes([0xFF, 0x2F, 0x00])))
    tempo_track = midi_track(
        [
            (0, bytes([0xFF, 0x51, 0x03]) + struct.pack(">I", us)[1:]),
            (0, bytes([0xFF, 0x2F, 0x00])),
        ]
    )
    header = b"MThd" + struct.pack(">IHHH", 6, 1, 2, ppq)
    path.write_bytes(header + tempo_track + midi_track(events))


def render_music(seconds: float, destination: Path) -> np.ndarray:
    midi = AUDIO / "bed.mid"
    raw = AUDIO / "bed.wav"
    write_music_midi(midi, seconds + 4)
    run(
        [
            "fluidsynth",
            "-q",
            "-ni",
            "-C",
            "0",
            "-R",
            "1",
            "-g",
            "0.65",
            "-r",
            str(SR),
            "-T",
            "wav",
            "-F",
            str(raw),
            "/usr/share/sounds/sf2/FluidR3_GM.sf2",
            str(midi),
        ]
    )
    music = read_wav(raw)
    need = int(seconds * SR)
    if len(music) < need:
        music = np.pad(music, ((0, need - len(music)), (0, 0)))
    return music[:need]


def envelope(voice: np.ndarray, seconds: float) -> np.ndarray:
    mono = np.max(np.abs(voice), axis=1)
    hop = SR // 100
    frames_n = int(np.ceil(len(mono) / hop))
    rms = np.zeros(frames_n, dtype=np.float32)
    for index in range(frames_n):
        window = mono[index * hop : (index + 1) * hop]
        if len(window):
            rms[index] = float(np.sqrt(np.mean(window**2)))
    gain = np.zeros(frames_n, dtype=np.float32)
    level = 1.0
    for index, value in enumerate(rms):
        target = 0.34 if value > 0.015 else 1.0
        speed = 0.28 if target < level else 0.06
        level += (target - level) * speed
        gain[index] = level
    sample_gain = np.repeat(gain, hop)[: len(mono)]
    time = np.arange(len(mono)) / SR
    intro = np.clip(time / 2.8, 0, 1)
    outro_start = seconds - 8.0
    swell = np.ones_like(time)
    late = time > outro_start
    swell[late] = 1 + 0.7 * np.clip((time[late] - outro_start) / 5.0, 0, 1)
    fade = np.ones_like(time)
    fade_start = seconds - 2.6
    ending = time > fade_start
    fade[ending] = np.clip(1 - (time[ending] - fade_start) / 2.6, 0, 1)
    opening = np.clip(time / 0.4, 0, 1)
    return (sample_gain * intro * swell * fade * opening).astype(np.float32)


def mix(voice: np.ndarray, music: np.ndarray, seconds: float) -> np.ndarray:
    if voice.shape[1] == 1:
        voice = np.repeat(voice, 2, axis=1)
    if len(music) < len(voice):
        music = np.pad(music, ((0, len(voice) - len(music)), (0, 0)))
    music = music[: len(voice)]
    voice_peak = np.max(np.abs(voice)) or 1
    music_peak = np.max(np.abs(music)) or 1
    voice = voice / voice_peak * 0.55
    music = music / music_peak * 0.42
    music = music * envelope(voice, seconds)[:, None]
    return voice + music


def loudnorm(source: Path, destination: Path) -> None:
    probe = subprocess.run(
        [
            "ffmpeg",
            "-i",
            str(source),
            "-af",
            "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
            "-f",
            "null",
            "-",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    text = probe.stderr
    start = text.rfind("{")
    measured = json.loads(text[start:])
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(source),
            "-af",
            (
                "loudnorm=I=-16:TP=-1.5:LRA=11:"
                f"measured_I={measured['input_i']}:"
                f"measured_TP={measured['input_tp']}:"
                f"measured_LRA={measured['input_lra']}:"
                f"measured_thresh={measured['input_thresh']}:"
                f"offset={measured['target_offset']}:"
                "linear=true:print_format=summary"
            ),
            "-ar",
            str(SR),
            "-c:a",
            "pcm_s16le",
            str(destination),
        ]
    )


def write_timing(plan: dict) -> None:
    lines = [
        "/* Generated by scripts/build_audio.py. Do not edit by hand. */",
        f"export const voiceFps = {plan['fps']};",
        f"export const voiceFadeFrames = {plan['fadeFrames']};",
        f"export const voiceTotalFrames = {plan['totalFrames']};",
        "export const scenePlan: Array<{ id: string; frames: number; cues: Record<string, number>; shots: Record<string, number> }> = "
        + json.dumps(plan["scenes"], indent=2)
        + ";",
        "",
    ]
    (ROOT / "src" / "timing.ts").write_text("\n".join(lines))


def write_narration(seconds: float) -> None:
    blocks = [
        "# Meridiqa narration",
        "",
        "Spoken by **en-NG-AbeoNeural** (Nigerian English, male), via [edge-tts](https://github.com/rany2/edge-tts) 7.x. No API key.",
        "Rate −10%, pitch −3 Hz, so the delivery stays slow enough for a formal room.",
        "",
        f"Picture length with this read: {seconds:.1f} seconds.",
        "",
        "Music is an original piano bed written for this film (66 bpm, D major, sparse chords). It is rendered with FluidSynth and the FluidR3 GM soundfont, which Frank Wen released under the MIT licence. Chorus is off. A little reverb is on. The bed ducks under the voice, swells at the open and the close, and the mix is loudness-normalised to −16 LUFS, true peak −1.5 dBTP.",
        "",
        "The FluidR3 copyright notice is in `demo-video/audio/FLUID-R3-MIT.txt`.",
        "",
    ]
    for scene in SCENES:
        blocks.append(f"## {scene['id']}")
        blocks.append("")
        for chunk in scene["chunks"]:
            blocks.append(chunk["text"])
            blocks.append("")
    text = "\n".join(blocks)
    (ROOT / "NARRATION.md").write_text(text)
    Path("/opt/cursor/artifacts").mkdir(parents=True, exist_ok=True)
    Path("/opt/cursor/artifacts/meridiqa_narration.md").write_text(text)


def main() -> None:
    AUDIO.mkdir(parents=True, exist_ok=True)
    spoken = synthesize()
    voice, plan = layout(spoken)
    seconds = plan["totalFrames"] / FPS
    print(f"timeline {seconds:.2f}s {plan['totalFrames']} frames")
    if seconds > 180:
        raise SystemExit(f"narration timeline is {seconds:.1f}s, over 3 minutes")
    write_wav(AUDIO / "voice.wav", voice)
    music = render_music(seconds, AUDIO / "bed.wav")
    premix = mix(voice, music, seconds)
    write_wav(AUDIO / "premix.wav", premix)
    loudnorm(AUDIO / "premix.wav", AUDIO / "mix.wav")
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(AUDIO / "mix.wav"),
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            str(AUDIO / "mix.m4a"),
        ]
    )
    stats = subprocess.run(
        [
            "ffmpeg",
            "-i",
            str(AUDIO / "mix.wav"),
            "-af",
            "loudnorm=print_format=json",
            "-f",
            "null",
            "-",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    print(stats.stderr[stats.stderr.rfind("{") :])
    write_timing(plan)
    write_narration(seconds)


if __name__ == "__main__":
    main()
