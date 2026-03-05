/*
  Week 6 — Example 1: Sprites, Sprite Sheets, & Animation

  Course: GBDA302 | Instructors: Dr. Karen Cochrane & David Han
  Date: Feb. 26, 2026

  Controls:
    A or D (Left / Right Arrow)   Horizontal movement
    W (Up Arrow)                  Jump
    S (Down Arrow)                Idle
    Space Bar                     Attack
 
*/

let player;
let playerImg;

let playerAnis = {
  idle: { row: 0, frames: 4, frameDelay: 10 },
  run: { row: 1, frames: 4, frameDelay: 3 },
  jump: { row: 2, frames: 3, frameDelay: 8, frame: 0 },
  attack: { row: 3, frames: 6, frameDelay: 2 },
};

// --- Globals ---
let ground;
let platforms = [];

// level constants
let isGrounded = false;
let jumpForce = 6;

// --- VFX: particles ---
let particles = [];

// --- VFX: camera shake ---
let shakeFrames = 0;
let shakeStrength = 0;

// --- Jump trail ---
let trail = [];

// --- Sound ---
let jumpOsc;
let jumpEnv;

let landOsc;
let landEnv;

let groundImg, platformLCImg, platformRCImg;
let audioEnabled = false;

// --- Control tuning ---
const MOVE_ACCEL = 0.45;
const MOVE_FRICTION = 0.82;
const MAX_RUN_SPEED = 3.5;

const MAX_FALL_SPEED = 8; // clamp falling
const COYOTE_FRAMES = 6; // small forgiveness window
let coyoteTimer = 0;
let landCooldown = 0; // landing trigger cooldown in frames
let lastVy = 0; // last frame vertical speed (for reliable landing detection)
let wasGrounded = isGrounded;

const JUMP_FORCE = 6; // keep it modest

// camera view size
const VIEWW = 320,
  VIEWH = 180;

// size of individual animation frames
const FRAME_W = 32,
  FRAME_H = 32;

// gravity
const GRAVITY = 10;

function preload() {
  // --- IMAGES ---
  playerImg = loadImage("assets/foxSpriteSheet.png");

  // --- Tiles (provided assets) ---
  groundImg = loadImage("assets/groundTile.png");
  platformLCImg = loadImage("assets/platformLC.png");
  platformRCImg = loadImage("assets/platformRC.png");
}

function setup() {
  new Canvas(VIEWW, VIEWH, "pixelated");
  allSprites.pixelPerfect = true;
  allSprites.autoDraw = false; // disable auto draw to prevent sprites disappearing

  world.gravity.y = GRAVITY;
  player = new Sprite(VIEWW / 2, 50, FRAME_W, FRAME_H);
  player.spriteSheet = playerImg;
  player.rotationLock = true;
  player.collider = "dynamic";

  player.anis.w = FRAME_W;
  player.anis.h = FRAME_H;
  player.anis.offset.y = -4;
  player.addAnis(playerAnis);
  player.ani = "idle";

  // Use a smaller collider box
  player.w = 18;
  player.h = 20;

  // Do NOT remove colliders in commit 1 (keeps physics stable)
  player.friction = 0;
  player.bounciness = 0;

  // --- Ground collider (thin, aligned to tile top) ---
  ground = new Sprite(width / 2, height - 16, width, 10, "static");

  // --- Platform colliders (thin, aligned to tile top) ---
  let p1 = new Sprite(90, 120, 60, 10, "static");
  let p2 = new Sprite(230, 85, 60, 10, "static");

  platforms.push(p1, p2);
  // --- Style sprites (simple palette) ---
  ground.color = color(70, 60, 90);
  ground.stroke = color(20, 20, 30);
  ground.strokeWeight = 2;

  for (let p of platforms) {
    p.color = color(120, 160, 90);
    p.stroke = color(30, 40, 25);
    p.strokeWeight = 2;
  }
  ground.friction = 0.8;
  for (let p of platforms) p.friction = 0.8;

  // --- Jump sound ---
  jumpOsc = new p5.Oscillator("triangle");
  jumpEnv = new p5.Envelope();
  jumpOsc.start();
  jumpOsc.amp(0);
  jumpEnv.setADSR(0.005, 0.04, 0.0, 0.06);
  jumpEnv.setRange(0.22, 0);

  // --- Land sound ---
  landOsc = new p5.Oscillator("sine");
  landEnv = new p5.Envelope();
  landOsc.start();
  landOsc.amp(0);
  landEnv.setADSR(0.005, 0.06, 0.0, 0.08);
  landEnv.setRange(0.18, 0);

  // Audio will be enabled on first user input (reliable browser behavior)
  audioEnabled = false;
  ground.visible = false;
  for (let p of platforms) p.visible = false;
}

function draw() {
  applyShake();
  background(170, 220, 255);

  // --- Enable audio only after a real user gesture ---
  if (
    !audioEnabled &&
    (kb.presses("a") ||
      kb.presses("d") ||
      kb.presses("w") ||
      kb.presses("up") ||
      kb.presses(" ") ||
      kb.presses("left") ||
      kb.presses("right"))
  ) {
    userStartAudio();
    audioEnabled = true;
  }

  if (landCooldown > 0) landCooldown--;

  // --- Track grounded transitions reliably ---
  let wasGrounded = isGrounded;

  // --- Ground check (top-only) ---
  isGrounded = isStandingOn(ground);
  for (let p of platforms) {
    if (isStandingOn(p)) isGrounded = true;
  }

  // --- Coyote time ---
  if (isGrounded) coyoteTimer = COYOTE_FRAMES;
  else coyoteTimer = max(0, coyoteTimer - 1);

  // --- Horizontal movement ---
  if (kb.pressing("a") || kb.pressing("left")) {
    player.vel.x -= MOVE_ACCEL;
    player.mirror.x = true;
  } else if (kb.pressing("d") || kb.pressing("right")) {
    player.vel.x += MOVE_ACCEL;
    player.mirror.x = false;
  } else {
    player.vel.x *= MOVE_FRICTION;
    if (abs(player.vel.x) < 0.05) player.vel.x = 0;
  }
  player.vel.x = constrain(player.vel.x, -MAX_RUN_SPEED, MAX_RUN_SPEED);

  // --- Jump ---
  if (
    (kb.presses("w") || kb.presses("up")) &&
    (isGrounded || coyoteTimer > 0)
  ) {
    player.vel.y = -JUMP_FORCE;
    coyoteTimer = 0;

    spawnDust(player.x, player.y + player.h / 2, 8);

    if (audioEnabled) {
      jumpOsc.amp(0);
      jumpOsc.freq(520);
      jumpEnv.play(jumpOsc);
    }
  }

  // --- Velocity clamps ---
  if (player.vel.y > MAX_FALL_SPEED) player.vel.y = MAX_FALL_SPEED;
  if (player.vel.y < -8) player.vel.y = -8;

  // --- Trail only while falling ---
  if (!isGrounded && player.vel.y > 0.5) {
    trail.push({ x: player.x, y: player.y, life: 6 });
  }

  // --- Landing trigger (state transition, guaranteed) ---
  // Play landing feedback when we transition from air -> grounded
  if (!wasGrounded && isGrounded && landCooldown === 0) {
    spawnDust(player.x, player.y + player.h / 2, 12);
    startShake(12, 3);

    if (audioEnabled) {
      landOsc.amp(0);
      landOsc.freq(140);
      landEnv.play(landOsc);
    }

    landCooldown = 12;
  }

  // --- Clamp tiny landing bounce ---
  if (isGrounded && player.vel.y > 0) {
    player.vel.y = 0;
  }

  // --- Run dust ---
  if (isGrounded && abs(player.vel.x) > 2.5 && player.colliding(ground)) {
    spawnDust(player.x, player.y + player.h / 2, 2);
  }

  // --- Animation ---
  let desiredAni = "idle";
  if (!isGrounded) desiredAni = "jump";
  else if (abs(player.vel.x) > 0.2) desiredAni = "run";

  if (kb.presses(" ")) {
    player.changeAni("attack");
  } else if (player.ani?.name !== desiredAni) {
    player.changeAni(desiredAni);
  }

  // --- Draw sprites (player uses sprite sheet) ---
  allSprites.draw();

  // --- Draw tile textures on top of colliders (visual only) ---
  drawPlatformTiles();
  drawGroundTiles();

  // --- VFX ---
  updateParticles();
  updateTrail();

  lastVy = player.vel.y;
}

function updateParticles() {
  // Update and draw particles
  noStroke();
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08; // gravity for dust
    p.life--;

    let a = map(p.life, 0, 22, 0, 180);
    fill(255, 255, 255, a);
    circle(p.x, p.y, p.r);

    if (p.life <= 0) particles.splice(i, 1);
  }
}

function updateTrail() {
  // Draw jump trail as short-lived puffs
  noStroke();
  for (let i = trail.length - 1; i >= 0; i--) {
    let t = trail[i];

    let a = map(t.life, 0, 6, 0, 80);
    fill(255, 255, 255, a);
    circle(t.x, t.y + 6, 8);

    t.life--;

    if (t.life <= 0) {
      trail.splice(i, 1);
    }
  }
}

function startShake(frames, strength) {
  // Start a short camera shake
  shakeFrames = max(shakeFrames, frames);
  shakeStrength = max(shakeStrength, strength);
}

function applyShake() {
  // Apply camera shake without using translate()
  if (shakeFrames > 0) {
    camera.x = width / 2 + random(-shakeStrength, shakeStrength);
    camera.y = height / 2 + random(-shakeStrength, shakeStrength);
    camera.zoom = 1;

    shakeFrames--;
    if (shakeFrames === 0) {
      shakeStrength = 0;
      camera.x = width / 2;
      camera.y = height / 2;
      camera.zoom = 1;
    }
  } else {
    camera.x = width / 2;
    camera.y = height / 2;
    camera.zoom = 1;
  }
}

function isStandingOn(s, tolerance = 5) {
  // True only when the player is on top of the surface (not hitting sides/underside)
  let playerBottom = player.y + player.h / 2;
  let surfaceTop = s.y - s.h / 2;

  // Allow a bit more tolerance to avoid missing the landing frame
  let closeEnough = abs(playerBottom - surfaceTop) <= tolerance;

  // Player must be above the surface center (prevents underside hits)
  let aboveSurface = player.y < s.y;

  // Only count as grounded when falling or nearly still vertically
  let fallingOrStill = player.vel.y >= -0.1;

  return player.colliding(s) && closeEnough && aboveSurface && fallingOrStill;
}

function spawnDust(x, y, count) {
  // Spawn simple dust particles
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + random(-6, 6),
      y: y + random(-2, 2),
      vx: random(-1.2, 1.2),
      vy: random(-1.8, -0.2),
      life: int(random(12, 22)),
      r: 3,
    });
  }
}

function drawGroundTiles() {
  // Draw ground tiles with TOP aligned to the collider top (so player stands on the top edge)
  if (!groundImg) return;

  push();
  imageMode(CENTER);

  let left = ground.x - ground.w / 2;
  let right = ground.x + ground.w / 2;

  let colliderTop = ground.y - ground.h / 2;

  let tileW = 32;
  let tileH = 32;

  // Place tile so its bottom sits on colliderTop
  let tileCenterY = colliderTop + tileH / 2;

  for (let x = left; x < right; x += tileW) {
    image(groundImg, x + tileW / 2, tileCenterY, tileW, tileH);
  }

  pop();
}

function drawPlatformTiles() {
  // Draw platform tiles with TOP aligned to the collider top
  if (!platformLCImg || !platformRCImg) return;

  push();
  imageMode(CENTER);

  let tileW = 32;
  let tileH = 32;

  for (let p of platforms) {
    let left = p.x - p.w / 2;
    let right = p.x + p.w / 2;

    let colliderTop = p.y - p.h / 2;
    let tileCenterY = colliderTop + tileH / 2;

    // Left cap
    image(platformLCImg, left + tileW / 2, tileCenterY, tileW, tileH);

    // Middle fill
    for (let x = left + tileW; x < right - tileW; x += tileW) {
      image(platformLCImg, x + tileW / 2, tileCenterY, tileW, tileH);
    }

    // Right cap
    image(platformRCImg, right - tileW / 2, tileCenterY, tileW, tileH);
  }

  pop();
}
