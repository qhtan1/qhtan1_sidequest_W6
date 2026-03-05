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
let wallLImg, wallRImg;

// Impact sound (wall bump / attack)
let hitOsc, hitEnv;

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
let wallL, wallR;

// Separate cooldowns (do NOT reuse landCooldown for hits)
let hitCooldown = 0;

// Collectibles
let coins = [];
let coinCount = 0;

// Exit / win state
let exitDoor;
let exitActive = false;

let winTimer = 0;

// Win sound
let winOsc, winEnv;

// Pickup sound
let pickupOsc, pickupEnv;

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
  wallLImg = loadImage("assets/wallL.png");
  wallRImg = loadImage("assets/wallR.png");
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
  player.w = 20;
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

  // --- Walls (static colliders) ---
  // Make walls thicker so visuals match physics and the player can't "half-enter" the wall
  let wallThickness = 20;

  // Place walls slightly inside the canvas
  wallL = new Sprite(
    wallThickness / 2,
    height / 2,
    wallThickness,
    height,
    "static",
  );
  wallR = new Sprite(
    width - wallThickness / 2,
    height / 2,
    wallThickness,
    height,
    "static",
  );

  wallL.friction = 0.2;
  wallR.friction = 0.2;

  // Hide colliders, we draw textures manually
  wallL.visible = false;
  wallR.visible = false;

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
  landEnv.setADSR(0.001, 0.01, 0.0, 0.03);
  landEnv.setRange(0.18, 0);

  // --- Hit sound (wall bump / attack) ---
  hitOsc = new p5.Oscillator("square");
  hitEnv = new p5.Envelope();
  hitOsc.start();
  hitOsc.amp(0);

  hitEnv.setADSR(0.001, 0.03, 0.0, 0.05);
  hitEnv.setRange(0.16, 0);

  // --- Pickup sound (collectibles) ---
  pickupOsc = new p5.Oscillator("triangle");
  pickupEnv = new p5.Envelope();
  pickupOsc.start();
  pickupOsc.amp(0);
  pickupEnv.setADSR(0.001, 0.03, 0.0, 0.06);
  pickupEnv.setRange(0.18, 0);

  // --- Collectibles (simple invisible sensors + we draw them ourselves) ---
  coins = [];
  coinCount = 0;

  // Place a few coins near platforms
  coins.push(new Sprite(70, 100, 10, 10, "static"));
  coins.push(new Sprite(110, 100, 10, 10, "static"));
  coins.push(new Sprite(230, 65, 10, 10, "static"));

  for (let c of coins) {
    c.collider = "static";
    c.visible = false;
  }

  // Audio will be enabled on first user input (reliable browser behavior)
  audioEnabled = false;
  ground.visible = false;
  for (let p of platforms) p.visible = false;

  // --- Exit door ---
  exitDoor = new Sprite(width - 60, height - 40, 20, 30, "static");
  exitDoor.visible = false;

  // --- Win sound ---
  winOsc = new p5.Oscillator("triangle");
  winEnv = new p5.Envelope();
  winOsc.start();
  winOsc.amp(0);

  winEnv.setADSR(0.001, 0.1, 0.0, 0.2);
  winEnv.setRange(0.22, 0);
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
  if (hitCooldown > 0) hitCooldown--;

  // --- Track grounded transitions ---
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

  // --- Landing trigger (state + collision fallback) ---
  // Some edge cases won't flip isGrounded cleanly on the exact landing frame,
  // so we also use collided() as a reliable "new contact" signal.
  let landedByState = !wasGrounded && isGrounded;
  let landedByCollision = player.collided(ground);

  for (let p of platforms) {
    if (player.collided(p)) landedByCollision = true;
  }

  if (
    (landedByState || landedByCollision) &&
    lastVy > 0.2 &&
    landCooldown === 0
  ) {
    spawnDust(player.x, player.y + player.h / 2, 12);
    startShake(10, 2.5);

    if (audioEnabled) {
      landOsc.amp(0);
      landOsc.freq(140);
      landEnv.play(landOsc);
    }

    landCooldown = 10;
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

  // --- Attack ---
  if (kb.presses(" ")) {
    player.changeAni("attack");

    // Attack feedback: sparks in front of player
    let fx = player.mirror.x ? player.x - 14 : player.x + 14;
    spawnSparks(fx, player.y, 14);

    if (audioEnabled) {
      hitOsc.amp(0);
      hitOsc.freq(420);
      hitEnv.play(hitOsc);
    }
  } else if (player.ani?.name !== desiredAni) {
    player.changeAni(desiredAni);
  }

  // --- Wall bump feedback (uses hitCooldown, NOT landCooldown) ---
  if (
    (player.colliding(wallL) || player.colliding(wallR)) &&
    hitCooldown === 0
  ) {
    spawnSparks(player.x, player.y, 10);
    startShake(6, 1.8);

    if (audioEnabled) {
      hitOsc.amp(0);
      hitOsc.freq(220);
      hitEnv.play(hitOsc);
    }

    hitCooldown = 6;
  }

  // --- Collectible pickup ---
  for (let i = coins.length - 1; i >= 0; i--) {
    let c = coins[i];
    if (player.overlaps(c)) {
      coins.splice(i, 1);
      c.remove();
      coinCount++;

      spawnSparks(player.x, player.y - 6, 18);
      startShake(6, 1.5);

      if (audioEnabled) {
        pickupOsc.amp(0);
        pickupOsc.freq(880);
        pickupEnv.play(pickupOsc);
      }
    }

    // --- Activate exit when all coins collected ---
    if (coinCount >= 3) {
      exitActive = true;
    }

    // --- Player reaches exit ---
    if (exitActive && player.overlaps(exitDoor) && winTimer === 0) {
      winTimer = 60;

      startShake(15, 3);

      if (audioEnabled) {
        winOsc.freq(620);
        winEnv.play(winOsc);
      }
    }

    // --- Win flash ---
    if (winTimer > 0) {
      winTimer--;

      push();
      camera.off();

      fill(255, 255, 255, map(winTimer, 0, 60, 0, 200));
      rect(0, 0, width, height);

      pop();

      if (winTimer === 1) {
        resetLevel();
      }
    }
  }

  // --- Hard bounds clamp (prevents edge launch / tunneling) ---
  // Keep the player inside the walls even if physics steps get weird near corners
  let leftBound = wallL.x + wallL.w / 2 + player.w / 2;
  let rightBound = wallR.x - wallR.w / 2 - player.w / 2;

  if (player.x < leftBound) {
    player.x = leftBound;
    if (player.vel.x < 0) player.vel.x = 0;
  } else if (player.x > rightBound) {
    player.x = rightBound;
    if (player.vel.x > 0) player.vel.x = 0;
  }

  // Optional: prevent leaving the top of the screen
  let topBound = player.h / 2 + 2;
  if (player.y < topBound) {
    player.y = topBound;
    if (player.vel.y < 0) player.vel.y = 0;
  }

  // --- Draw sprites (player uses sprite sheet) ---
  allSprites.draw();

  // --- Draw tile textures (visual only) ---
  drawWallTiles();
  drawPlatformTiles();
  drawGroundTiles();

  // --- Draw collectibles (simple gold circles) ---
  drawCoins();
  drawExitDoor();

  // --- VFX ---
  updateParticles();
  updateTrail();

  // --- UI ---
  drawUI();

  lastVy = player.vel.y;
}

function updateParticles() {
  // Update and draw particles (dust + sparks)
  noStroke();
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];

    p.x += p.vx;
    p.y += p.vy;

    // Gravity
    if (p.type === "spark") p.vy += 0.12;
    else p.vy += 0.08;

    // Slight drag
    p.vx *= 0.98;

    p.life--;

    let aMax = p.type === "spark" ? 220 : 180;
    let a = map(p.life, 0, 22, 0, aMax);

    if (p.type === "spark") fill(255, 235, 120, a);
    else fill(255, 255, 255, a);

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

function spawnSparks(x, y, count) {
  // Spawn quick bright sparks (reuses particle system)
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + random(-4, 4),
      y: y + random(-6, 2),
      vx: random(-2.2, 2.2),
      vy: random(-3.0, -0.8),
      life: int(random(8, 14)),
      r: random(2, 4),
      // mark type for color
      type: "spark",
    });
  }
}

function drawWallTiles() {
  // Draw wall textures aligned to collider (visual only)
  if (!wallLImg || !wallRImg) return;

  push();
  imageMode(CENTER);

  let tileW = 32;
  let tileH = 32;

  // Left wall
  {
    let x = wallL.x + wallL.w / 2 - 16;
    let top = wallL.y - wallL.h / 2;
    for (let y = top; y < top + wallL.h; y += tileH) {
      image(wallLImg, x, y + tileH / 2, tileW, tileH);
    }
  }

  // Right wall
  {
    let x = wallR.x - wallR.w / 2 + 16;
    let top = wallR.y - wallR.h / 2;
    for (let y = top; y < top + wallR.h; y += tileH) {
      image(wallRImg, x, y + tileH / 2, tileW, tileH);
    }
  }

  pop();
}

function drawCoins() {
  // Draw collectibles as simple circles (keeps assets optional)
  push();
  noStroke();
  fill(255, 215, 80);

  for (let c of coins) {
    circle(c.x, c.y, 8);
    fill(255, 240, 160);
    circle(c.x - 2, c.y - 2, 3);
    fill(255, 215, 80);
  }

  pop();
}

function drawUI() {
  // Minimal UI overlay (kept away from wall tiles)
  push();
  camera.off();

  fill(0);
  noStroke();
  textSize(12);

  // Move UI inward so it won't overlap wall art
  text("Coins: " + coinCount, 44, 18);

  camera.on();
  pop();
}

function drawExitDoor() {
  if (!exitActive) return;

  push();

  fill(80, 200, 120);
  stroke(0);
  rectMode(CENTER);

  rect(exitDoor.x, exitDoor.y, 20, 30);

  fill(255);
  circle(exitDoor.x, exitDoor.y - 6, 6);

  pop();
}

function resetLevel() {
  coinCount = 0;
  exitActive = false;

  // remove existing coins
  for (let c of coins) {
    c.remove();
  }

  coins = [];

  // respawn coins
  coins.push(new Sprite(70, 100, 10, 10, "static"));
  coins.push(new Sprite(110, 100, 10, 10, "static"));
  coins.push(new Sprite(230, 65, 10, 10, "static"));

  for (let c of coins) {
    c.visible = false;
  }

  // reset player
  player.x = 40;
  player.y = height - 60;
}
