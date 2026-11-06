(function (root) {
  'use strict';

  class MotionTilt {
    constructor(host = root) {
      this.host = host;
      this.enabled = false;
      this.baseline = null;
      this.target = 0;
      this.filtered = 0;
      this.lastSample = 0;
      this.angle = null;
      this.attempt = 0;
      this.onReading = this.onReading.bind(this);
    }

    async start() {
      this.stop();
      const attempt = this.attempt;
      const api = this.host.DeviceOrientationEvent;
      if (!api || !this.host.isSecureContext) {
        throw new Error('Phone tilt needs a supported phone browser and a secure connection.');
      }
      if (typeof api.requestPermission === 'function') {
        const permission = await api.requestPermission();
        if (attempt !== this.attempt) throw new Error('Phone tilt setup was cancelled.');
        if (permission !== 'granted') {
          throw new Error('Motion access was declined. You can allow it in your browser’s site settings.');
        }
      }
      this.enabled = true;
      this.host.addEventListener('deviceorientation', this.onReading);
      return new Promise((resolve, reject) => {
        this.finishStart = error => {
          this.host.clearTimeout(this.startTimer);
          this.finishStart = null;
          if (error) reject(error);
          else resolve();
        };
        this.startTimer = this.host.setTimeout(() => {
          this.finishStart(new Error('No motion readings received. Check motion-sensor access in your browser’s site settings, then try again.'));
          this.stop();
        }, 4000);
      });
    }

    stop() {
      this.attempt++;
      this.enabled = false;
      this.host.removeEventListener('deviceorientation', this.onReading);
      this.host.clearTimeout(this.startTimer);
      this.finishStart?.(new Error('Phone tilt setup was cancelled.'));
      this.recenter();
    }

    recenter() {
      this.baseline = null;
      this.target = 0;
      this.filtered = 0;
      this.lastSample = 0;
    }

    onReading(event) {
      if (!this.enabled || this.host.document.hidden ||
          !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
      const angle = this.host.screen?.orientation?.angle ?? this.host.orientation ?? 0;
      // Project the tilt onto the screen's horizontal axis in either orientation.
      const radians = angle * Math.PI / 180;
      const tilt = event.gamma * Math.cos(radians) + event.beta * Math.sin(radians);
      if (this.angle !== angle) this.recenter();
      this.angle = angle;
      if (this.baseline === null) this.baseline = tilt;
      const delta = ((tilt - this.baseline + 540) % 360) - 180;
      this.target = Math.sign(delta) * Math.min(1, Math.max(0, Math.abs(delta) - 3) / 15);
      this.lastSample = this.host.performance.now();
      if (this.finishStart) {
        this.host.clearTimeout(this.startTimer);
        this.finishStart();
        this.finishStart = null;
      }
    }

    value(dt) {
      if (!this.enabled) return 0;
      if (this.host.performance.now() - this.lastSample > 1200) {
        this.recenter();
        return 0;
      }
      this.filtered += (this.target - this.filtered) * (1 - Math.exp(-dt / 110));
      return this.filtered;
    }
  }

  if (typeof module === 'object' && module.exports) module.exports = MotionTilt;
  else root.PotatoMotionTilt = MotionTilt;
})(typeof window === 'object' ? window : globalThis);
