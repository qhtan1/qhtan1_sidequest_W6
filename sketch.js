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
}

function setup() {
  new Canvas(VIEWW, VIEWH, "pixelated");
  allSprites.pixelPerfect = true;

  world.gravity.y = GRAVITY;

  player = new Sprite(VIEWW / 2, VIEWH / 2, FRAME_W, FRAME_H);
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

  // --- Ground ---
  ground = new Sprite(width / 2, height - 20, width, 40, "static");

  // --- Platforms (must be inside the 320x180 view) ---
  let p1 = new Sprite(90, 120, 90, 12, "static");
  let p2 = new Sprite(230, 85, 90, 12, "static");

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
}

function draw() {
  background(170, 220, 255);

  // --- Ground check first ---
  isGrounded = player.colliding(ground);
  for (let p of platforms) {
    if (player.colliding(p)) isGrounded = true;
  }

  // --- Clamp tiny landing bounce ---
  if (isGrounded && player.vel.y > 0) {
    player.vel.y = 0;
  }

  // --- Movement ---
  let moveSpeed = 5;

  if (kb.pressing("a") || kb.pressing("left")) {
    player.vel.x = -moveSpeed;
    player.mirror.x = true;
  } else if (kb.pressing("d") || kb.pressing("right")) {
    player.vel.x = moveSpeed;
    player.mirror.x = false;
  } else {
    player.vel.x = 0;
  }

  // --- Jump (press once) ---
  if ((kb.presses("w") || kb.presses("up")) && isGrounded) {
    player.vel.y = -jumpForce;

    // Prevent extreme jump velocities
    if (player.vel.y < -8) player.vel.y = -8;

    isGrounded = false;
  }

  // --- Decide animation once per frame ---
  let desiredAni = "idle";
  if (!isGrounded) desiredAni = "jump";
  else if (player.vel.x !== 0) desiredAni = "run";

  if (player.ani?.name !== desiredAni) {
    player.changeAni(desiredAni);
  }
}
