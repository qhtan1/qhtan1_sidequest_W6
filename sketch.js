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

// level constants

// camera view size
const VIEWW = 320,
  VIEWH = 180;

// size of individual animation frames
const FRAME_W = 32,
  FRAME_H = 32;

// gravity
const GRAVITY = 0;

function preload() {
  // --- IMAGES ---
  playerImg = loadImage("assets/foxSpriteSheet.png");
}

function setup() {
  // pixelated rendering with autoscaling
  new Canvas(VIEWW, VIEWH, "pixelated");
  
  // needed to correct an visual artifacts from attempted antialiasing
  allSprites.pixelPerfect = true;
 
  world.gravity.y = GRAVITY;

  // --- PLAYER ---
  player = new Sprite(VIEWW/2, VIEWH/2, FRAME_W, FRAME_H); // create the player
  player.spriteSheet = playerImg; // use the sprite sheet
  player.rotationLock = true; // turn off rotations (player shouldn't rotate)

  // player animation parameters
  player.anis.w = FRAME_W;
  player.anis.h = FRAME_H;
  player.anis.offset.y = -4; // offset the collision box up
  player.addAnis(playerAnis); // add the player animations defined earlier
  player.ani = "idle"; // default to the idle animation
  player.w = 18; // set the width of the collsion box
  player.h = 20; // set the height of the collsion box
  player.removeColliders();
  player.friction = 0; // set the friciton to 0 so we don't stick to walls
  player.bounciness = 0; // set the bounciness to 0 so the player doesn't bounce
}

function draw() {
  // --- BACKGROUND ---
  background("skyblue");

  // --- PLAYER CONTROLS ---
  if (kb.presses("up")) {
    player.ani = "jump";
  } else if (kb.presses("right")){  
    player.ani = "run";
    player.mirror.x = false;  
  } else if (kb.presses("left")){  
    player.ani = "run";
    player.mirror.x = true;  
  } else if (kb.presses(" ")){  
    player.ani = "attack";  
  } else if (kb.presses("down")){  
    // Grounded: idle or run
    player.ani = "idle";  
  }
}