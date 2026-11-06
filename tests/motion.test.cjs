const test = require('node:test');
const assert = require('node:assert/strict');
const MotionTilt = require('../dist/motion.js');

function setup() {
  let now = 100;
  const listeners = new Map();
  const timers = new Map();
  const host = {
    DeviceOrientationEvent: {}, isSecureContext: true,
    document: {hidden: false}, screen: {orientation: {angle: 0}},
    performance: {now: () => now},
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name),
    setTimeout: fn => {const id = Symbol(); timers.set(id, fn); return id;},
    clearTimeout: id => timers.delete(id)
  };
  return {
    host, motion: new MotionTilt(host), listeners,
    sample: (gamma, beta = 35) => listeners.get('deviceorientation')?.({gamma, beta}),
    advance: ms => {now += ms;},
    timeout: () => [...timers.values()].forEach(fn => fn())
  };
}

test('calibrates held position, ignores hand jitter, smooths and bounds tilt', async () => {
  const {motion, sample} = setup();
  const start = motion.start(); sample(12); await start;
  assert.equal(motion.value(16), 0);
  sample(14); assert.equal(motion.value(16), 0);
  sample(30);
  const first = motion.value(16);
  assert.ok(first > 0 && first < 0.2);
  assert.ok(motion.value(1000) > 0.99);
  sample(-35); assert.ok(motion.value(1000) < -0.99);
  assert.ok(Math.abs(motion.value(1000)) <= 1);
  motion.recenter(); sample(-35); assert.equal(motion.value(16), 0);
});

test('maps horizontal tilt for both landscape directions and upside-down portrait', async () => {
  for (const [angle, gamma, beta] of [[90, 0, 53], [270, 0, 17], [180, -18, 35]]) {
    const {motion, sample, host} = setup();
    host.screen.orientation.angle = angle;
    const start = motion.start(); sample(0); await start;
    sample(gamma, beta); assert.ok(motion.value(1000) > 0.99);
    host.screen.orientation.angle = 0;
    sample(21); assert.equal(motion.value(16), 0, 'rotation establishes a new neutral');
  }
});

test('invalid, background, and stale readings cannot leave a stuck tilt', async () => {
  const {motion, sample, host, advance} = setup();
  const start = motion.start(); sample(null); assert.equal(motion.baseline, null);
  sample(0); await start;
  sample(18); assert.ok(motion.value(1000) > 0.99);
  host.document.hidden = true; sample(-18); assert.equal(motion.target, 1);
  advance(1300); assert.equal(motion.value(16), 0);
  host.document.hidden = false; sample(-18); assert.equal(motion.value(16), 0);
  motion.stop(); sample(18); assert.equal(motion.value(1000), 0);
});

test('reports unsupported, insecure, declined, and silent sensors', async () => {
  const unavailable = setup(); unavailable.host.DeviceOrientationEvent = null;
  await assert.rejects(unavailable.motion.start(), /supported phone/);
  const insecure = setup(); insecure.host.isSecureContext = false;
  await assert.rejects(insecure.motion.start(), /secure connection/);
  const denied = setup(); denied.host.DeviceOrientationEvent.requestPermission = async () => 'denied';
  await assert.rejects(denied.motion.start(), /declined/);
  const silent = setup(); const start = silent.motion.start(); silent.timeout();
  await assert.rejects(start, /No motion readings/);
  assert.equal(silent.motion.enabled, false);
  assert.equal(silent.listeners.size, 0);
});

test('granted permission still waits for real readings; stopping cancels setup', async () => {
  const device = setup();
  device.host.DeviceOrientationEvent.requestPermission = async () => 'granted';
  const start = device.motion.start(); await Promise.resolve();
  device.sample(5); await start; assert.equal(device.motion.enabled, true);
  device.motion.stop(); assert.equal(device.listeners.size, 0);
  const pending = device.motion.start(); device.motion.stop();
  await assert.rejects(pending, /cancelled/);
  assert.equal(device.motion.enabled, false);
  const reading = setup(); const waiting = reading.motion.start(); reading.motion.stop();
  await assert.rejects(waiting, /cancelled/);
  assert.equal(reading.listeners.size, 0);
});
