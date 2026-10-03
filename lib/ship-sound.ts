export async function playShipHorn(): Promise<boolean> {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return false;

  let context: AudioContext | undefined;
  try {
    context = new AudioContext();
    if (context.state === "suspended") await context.resume();

    const now = context.currentTime;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(620, now);

    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.11, now + 0.08);
    master.gain.setValueAtTime(0.11, now + 0.85);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
    filter.connect(master);
    master.connect(context.destination);

    const lowTone = context.createOscillator();
    lowTone.type = "sawtooth";
    lowTone.frequency.setValueAtTime(146.83, now);
    lowTone.connect(filter);

    const highTone = context.createOscillator();
    highTone.type = "triangle";
    highTone.frequency.setValueAtTime(220, now);
    highTone.connect(filter);

    lowTone.onended = () => { void context?.close(); };
    lowTone.start(now);
    highTone.start(now);
    lowTone.stop(now + 1.3);
    highTone.stop(now + 1.3);
    return true;
  } catch {
    if (context && context.state !== "closed") void context.close();
    return false;
  }
}
