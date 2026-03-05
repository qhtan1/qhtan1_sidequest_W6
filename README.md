## Project Title

GBDA302 Week 6 Side Quest: Reactive Platformer Prototype

---

## Group Members

Kiki Tan (WatID: qhtan)

---

## Description

This sketch extends the sprite animation and physics examples by creating a small interactive platformer experience.

The player controls a fox character that can move, jump, and attack while navigating platforms. Coins are placed in the environment and increase a counter when collected. Once all coins are collected, an exit door appears. Touching the door completes the level and restarts the game.

The sketch focuses on combining player input, physics interactions, sound cues, and visual feedback such as particle sparks and motion effects. These elements demonstrate how small reactive systems can make simple platform mechanics feel more responsive and dynamic.

---

## Setup and Interaction Instructions

Open the sketch in p5.js and run the program.

Controls:

A / D – Move left and right  
W – Jump  
Space – Attack

Objective:

Collect all coins in the level.  
After collecting every coin, an exit door will appear.  
Touch the door to trigger the win state and restart the level.

Visual and sound feedback will respond to movement, attacks, and collisions.

---

## Iteration Notes

### Post-Playtest

1. Adjusted the coin counter position to avoid overlapping with the level boundary.
2. Improved landing detection so the landing sound and visual feedback trigger more consistently.
3. Added small collision feedback (spark effects and sound) when the player hits walls or attacks.

### Post-Showcase

1. Improve animation polish by adding smoother transitions between running, jumping, and attacking states.
2. Expand the level with additional platforms or obstacles to create a longer gameplay experience.

---

## Assets

Fox sprite and environment tileset sourced from public pixel-art game assets used for educational prototyping.

Sound effects used for jump, landing, and interaction feedback are from publicly available game sound effect libraries.

---

## References

p5.js. n.d. _p5.js Reference_. Available at: https://p5js.org/reference/
