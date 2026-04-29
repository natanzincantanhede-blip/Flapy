
const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

let isMuted = false;

export const setMuted = (muted: boolean) => {
  isMuted = muted;
};

export const toggleMuted = () => {
  isMuted = !isMuted;
  return isMuted;
};

const playTone = (freqs: number[], duration: number, type: OscillatorType = 'square', volume: number = 0.1) => {
  if (!audioContext || isMuted) return;

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = type;
  osc.connect(gain);
  gain.connect(audioContext.destination);

  const now = audioContext.currentTime;
  
  freqs.forEach((freq, i) => {
    osc.frequency.setValueAtTime(freq, now + (duration / freqs.length) * i);
  });

  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.start(now);
  osc.stop(now + duration);
};

export const sounds = {
  jump: () => playTone([400, 600], 0.1, 'square', 0.05),
  orb: () => playTone([800, 1200], 0.08, 'sine', 0.1),
  damage: () => playTone([300, 100], 0.3, 'sawtooth', 0.1),
  levelUp: () => playTone([523.25, 659.25, 783.99, 1046.50], 0.5, 'square', 0.1),
  bossAttack: () => playTone([200, 50], 0.4, 'sawtooth', 0.1),
  bossHit: () => playTone([100, 200], 0.15, 'square', 0.1),
  bossDefeat: () => playTone([1000, 500, 1000, 200], 0.8, 'square', 0.15),
  gameOver: () => playTone([400, 300, 200, 100], 1, 'sawtooth', 0.15),
  perkSelect: () => playTone([600, 900], 0.1, 'sine', 0.1)
};
