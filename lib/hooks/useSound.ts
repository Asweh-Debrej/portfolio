"use client";

import { useEffect, useRef } from "react";
import { useSettingsStore } from "@/lib/store/settingsStore";

/**
 * `useSound` — synth-based click/open/close blips. No audio files downloaded.
 *
 * AudioContext is created lazily on first call (browser autoplay policy
 * requires a user gesture). If the user hasn't enabled sound in Settings,
 * `play()` is a no-op.
 */
type SoundName = "click" | "open" | "close" | "error";

type SoundProfile = { freq: number; type: OscillatorType; duration: number; gain: number };

const PROFILES: Record<SoundName, SoundProfile> = {
  click: { freq: 880, type: "triangle", duration: 0.04, gain: 0.06 },
  open: { freq: 660, type: "sine", duration: 0.12, gain: 0.08 },
  close: { freq: 440, type: "sine", duration: 0.12, gain: 0.08 },
  error: { freq: 220, type: "sawtooth", duration: 0.18, gain: 0.06 },
};

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const enabled = useSettingsStore((s) => s.soundEnabled);
  const hydrated = useSettingsStore((s) => s.hydrated);

  useEffect(
    () => () => {
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    },
    [],
  );

  return (name: SoundName) => {
    if (!hydrated || !enabled) return;
    if (typeof window === "undefined") return;
    if (!ctxRef.current) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctxRef.current = new AC();
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") void ctx.resume();
    const profile = PROFILES[name];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = profile.type;
    osc.frequency.value = profile.freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(profile.gain, ctx.currentTime + 0.005);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + profile.duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + profile.duration + 0.01);
  };
}
