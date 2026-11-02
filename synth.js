/**
 * RETRO MIDI & SOUND EFFECTS ENGINE
 * Synthesizes authentic 90s Web Audio FM/Chiptune BGM & Sound FX
 * No external audio files or plugins required!
 */

class RetroMidiSynth {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.currentTrack = 0;
    this.volume = 0.25;
    this.timerId = null;
    this.step = 0;
    this.tempo = 125; // ms per 16th note

    // Track definitions
    this.tracks = [
      {
        name: "Crypt_of_the_Red_Dragon.mid (28 KB)",
        tempo: 130,
        // Melody notes (freq in Hz), duration in 16th notes
        bassline: [110, 110, 130.8, 110, 98, 98, 123.5, 98, 87.3, 87.3, 98, 87.3, 110, 110, 130.8, 146.8],
        melody: [
          220, 0, 261.6, 293.7, 329.6, 0, 293.7, 261.6, 220, 0, 196, 220, 261.6, 293.7, 220, 0,
          329.6, 0, 392, 349.2, 329.6, 0, 293.7, 261.6, 246.9, 0, 261.6, 293.7, 220, 0, 0, 0
        ],
        harmony: [
          440, 0, 0, 0, 523.3, 0, 0, 0, 392, 0, 0, 0, 440, 0, 0, 0,
          659.3, 0, 0, 0, 587.3, 0, 0, 0, 493.9, 0, 0, 0, 440, 0, 0, 0
        ]
      },
      {
        name: "Tavern_of_the_Flumph.mid (34 KB)",
        tempo: 110,
        bassline: [146.8, 0, 146.8, 174.6, 196, 0, 196, 174.6, 164.8, 0, 164.8, 146.8, 130.8, 146.8, 164.8, 174.6],
        melody: [
          293.7, 329.6, 349.2, 392, 440, 392, 349.2, 329.6, 293.7, 349.2, 392, 440, 523.3, 440, 392, 349.2,
          440, 523.3, 587.3, 523.3, 440, 392, 349.2, 329.6, 293.7, 261.6, 293.7, 349.2, 293.7, 0, 0, 0
        ],
        harmony: [
          587.3, 0, 0, 0, 698.5, 0, 0, 0, 523.3, 0, 0, 0, 587.3, 0, 0, 0,
          880, 0, 0, 0, 698.5, 0, 0, 0, 587.3, 0, 0, 0, 587.3, 0, 0, 0
        ]
      },
      {
        name: "Underdark_Wandering.mid (42 KB)",
        tempo: 160,
        bassline: [73.4, 0, 0, 73.4, 82.4, 0, 73.4, 0, 65.4, 0, 0, 65.4, 69.3, 0, 73.4, 0],
        melody: [
          146.8, 0, 220, 0, 207.7, 0, 174.6, 0, 164.8, 0, 146.8, 0, 138.6, 0, 146.8, 0,
          293.7, 0, 277.2, 0, 261.6, 0, 246.9, 0, 233.1, 0, 220, 0, 207.7, 0, 196, 0
        ],
        harmony: [
          440, 0, 415.3, 0, 349.2, 0, 329.6, 0, 293.7, 0, 277.2, 0, 293.7, 0, 0, 0,
          587.3, 0, 554.4, 0, 523.3, 0, 493.9, 0, 466.2, 0, 440, 0, 415.3, 0, 392, 0
        ]
      }
    ];
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
  }

  playTone(freq, type = "square", duration = 0.15, gainVal = 0.1, detune = 0) {
    if (!this.ctx || freq <= 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.detune.setValueAtTime(detune, this.ctx.currentTime);

    const adjustedGain = gainVal * this.volume;
    gain.gain.setValueAtTime(adjustedGain, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playDrum(type = "snare") {
    if (!this.ctx) return;
    if (type === "kick") {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(130, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3 * this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } else {
      // Noise buffer for retro snare/hihat
      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08 * this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      noise.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    }
  }

  tick() {
    if (!this.isPlaying) return;
    const track = this.tracks[this.currentTrack];

    // Bassline (triangle/sawtooth retro synth)
    const bassIdx = this.step % track.bassline.length;
    const bassFreq = track.bassline[bassIdx];
    if (bassFreq > 0) {
      this.playTone(bassFreq, "triangle", 0.18, 0.22);
    }

    // Melody lead (classic square wave)
    const melIdx = this.step % track.melody.length;
    const melFreq = track.melody[melIdx];
    if (melFreq > 0) {
      this.playTone(melFreq, "square", 0.14, 0.15, 4);
    }

    // Chords / Arp Harmony (sine/triangle)
    const harmIdx = this.step % track.harmony.length;
    const harmFreq = track.harmony[harmIdx];
    if (harmFreq > 0) {
      this.playTone(harmFreq, "sine", 0.2, 0.09, -4);
    }

    // Retro rhythm drum ticks
    if (this.step % 4 === 0) {
      this.playDrum("kick");
    } else if (this.step % 4 === 2) {
      this.playDrum("snare");
    }

    this.step++;
    this.timerId = setTimeout(() => this.tick(), track.tempo);
  }

  togglePlay() {
    this.initContext();
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.isPlaying = true;
      this.step = 0;
      this.tick();
      return true;
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  nextTrack() {
    this.currentTrack = (this.currentTrack + 1) % this.tracks.length;
    if (this.isPlaying) {
      this.stop();
      this.isPlaying = true;
      this.step = 0;
      this.tick();
    }
    return this.tracks[this.currentTrack].name;
  }

  getCurrentTrackName() {
    return this.tracks[this.currentTrack].name;
  }

  /* Sound FX for interactions */
  playClickSound() {
    this.initContext();
    if (!this.ctx) return;
    this.playTone(880, "square", 0.03, 0.08);
  }

  playDiceRollSound() {
    this.initContext();
    if (!this.ctx) return;
    const notes = [220, 330, 440, 550, 440, 330, 550, 660];
    notes.forEach((f, i) => {
      setTimeout(() => {
        this.playTone(f + Math.random() * 50, "triangle", 0.04, 0.1);
      }, i * 40);
    });
  }

  playCritSuccessSound() {
    this.initContext();
    if (!this.ctx) return;
    // Triumphant 8-bit fanfare (C E G C!)
    const fanfare = [523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((f, i) => {
      setTimeout(() => {
        this.playTone(f, "square", 0.18, 0.2);
      }, i * 110);
    });
  }

  playCritFumbleSound() {
    this.initContext();
    if (!this.ctx) return;
    // Sad descending wah-wah-wah
    const notes = [300, 270, 240, 180];
    notes.forEach((f, i) => {
      setTimeout(() => {
        this.playTone(f, "sawtooth", 0.22, 0.15);
      }, i * 160);
    });
  }
}

// Global instance
window.retroSynth = new RetroMidiSynth();
