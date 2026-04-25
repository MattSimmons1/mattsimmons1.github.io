/**
 * A simple game engine for a 2D platformer. 
 */

/**
 * The Player is represented by an HTML element with position: absolute.
 * The player can run, jump, and move left and right in the air.
 */
class Player {
  constructor(playerElement) {
    this.element = playerElement   
    this.isAirborne = false
    this.isSubmerged = false
    this.position = {
      x: 100,
      y: 50
    }
    this.velocity = {
      x: 0,
      y: 0
    }
    this.acceleration = {
      x: 0,
      y: 0
    }
    this.width = 7  // must be small to allow player to fit between blocks
    this.height = 7
    this.heldKeys = {

    }
  }

  render() {
    this.element.style.left = this.position.x + "px"
    this.element.style.top = this.position.y - 3 + "px"

    if (this.velocity.x < 0) {
    // flip the sprite horizontally
    this.element.style.transform = "scale(-1, 1)"
    } else if (this.velocity.x > 0) {
      this.element.style.transform = "unset"
    }

  }
  
  initControls() {
    document.addEventListener("keydown", (event) => {
      console.log(event.key);
      switch (event.key) {
        case "ArrowUp":
          this.heldKeys["ArrowUp"] = true
          if (!this.isAirborne) {
            // jump
            this.acceleration.y = -150
            this.isAirborne = true
          } else {
            // holding jump extends the jump slightly
            this.acceleration.y += -5
          }
          break;
        case "ArrowDown":
          this.heldKeys["ArrowDown"] = true
          break;
        case "ArrowLeft":
          this.heldKeys["ArrowLeft"] = true
          break;
        case "ArrowRight":
          this.heldKeys["ArrowRight"] = true
          break;
      }
    })
    document.addEventListener("keyup", event => {
      switch (event.key) {
        case "ArrowUp":
          this.heldKeys["ArrowUp"] = false
          break;
        case "ArrowDown":
          this.heldKeys["ArrowDown"] = false
          break;
        case "ArrowLeft":
          this.heldKeys["ArrowLeft"] = false
          break;
        case "ArrowRight":
          this.heldKeys["ArrowRight"] = false
          break;
      }
    })
  }
}

class Rect {
  constructor(x, y, width, height) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }
}

/**
 * The world is made up of blocks on a grid of a set size
 */
class World {
  constructor(blocks, worldHeight, worldWidth) {
    const rows = blocks.split("\n")
    this.height = rows.length
    this.width = rows[0].length
    this.blocks = blocks
    this.timeStep = 0.15
    // level is a grid reference
    this.level = {
      x: 1,
      y: 0,
    }

    // physics
    // every block that isn't an empty space is a hard platform on all sides
    // the player can jump on top of blocks
    this.gravity = 9.81
    // height and width of a block
    this.blockHeight = worldHeight / this.height;
    this.blockWidth = worldWidth / this.width;

    
    this.rects = []
    this.water = []

    rows.forEach((row, rowIndex) => {
      let start = -1
      let waterStart = -1
      for (let colIndex = 0; colIndex <= row.length; colIndex++) {
        const char = row[colIndex]
        const isBlock = char && char !== ' ' && char != '~'
        const isWater = char && char === '~'
        
        if (isBlock && start === -1) {
          start = colIndex
        } else if (!isBlock && start !== -1) {
          // End of a run
          const length = colIndex - start
          this.rects.push(new Rect(
            start * this.blockWidth,
            rowIndex * this.blockHeight,
            length * this.blockWidth,
            this.blockHeight
          ))
          start = -1
        }

        if (isWater && waterStart === -1) {
          waterStart = colIndex
        } else if (!isWater && waterStart !== -1) {
          // End of a water run
          const length = colIndex - waterStart
          this.water.push(new Rect(
            waterStart * this.blockWidth,
            rowIndex * this.blockHeight,
            length * this.blockWidth,
            this.blockHeight
          ))
          waterStart = -1
        }
      }
    })
  }

  checkCollision(player, rect) {
    const EPSILON = 0.01;
    return player.position.x < rect.x + rect.width - EPSILON &&
           player.position.x + player.width > rect.x + EPSILON &&
           player.position.y < rect.y + rect.height - EPSILON &&
           player.position.y + player.height > rect.y + EPSILON
  }

  updatePlayerPosition(player, onLevelLoad) {
    // console.log(player.acceleration.y, player.isAirborne, player.velocity.y, player.position.y)
    // base x velocity
    if (player.heldKeys["ArrowLeft"]) {
      player.velocity.x = -10
    } else if (player.heldKeys["ArrowRight"]) {
      player.velocity.x = 10
    } else {
      player.velocity.x = 0
    }

    if (player.isSubmerged) {
      if (player.heldKeys["ArrowUp"]) {
        player.velocity.y = -5
      } else if (player.heldKeys["ArrowDown"]) {
        player.velocity.y = 5
      }
    }
    // terminal velocity in water is 5 unless holding down
    if (player.isSubmerged) {
      if (player.heldKeys["ArrowDown"]) {
        if (player.velocity.y > 7) {
          player.velocity.y = 7
        }
      } else {
        if (player.velocity.y > 5) {
          player.velocity.y = 5
        }
      }
      if (player.velocity.y < -5) {
        player.velocity.y = -5
      }
      if (player.velocity.x > 5) {
        player.velocity.x = 5
      }
      if (player.velocity.x < -5) {
        player.velocity.x = -5
      }
    }

    player.velocity.x += player.acceleration.x * this.timeStep
    player.velocity.y += player.acceleration.y * this.timeStep

    
    // Horizontal movement & collision
    player.position.x += player.velocity.x * this.timeStep
    this.rects.forEach(rect => {
      if (this.checkCollision(player, rect)) {
        if (player.velocity.x > 0) {
          player.position.x = rect.x - player.width
        } else if (player.velocity.x < 0) {
          player.position.x = rect.x + rect.width
        }
        player.velocity.x = 0
        player.acceleration.x = 0
      }
    })

    // water collision
    player.isSubmerged = false
    this.water.forEach(rect => {
      if (this.checkCollision(player, rect)) {
        player.isSubmerged = true
      }
    })

    // Vertical movement & collision
    player.position.y += player.velocity.y * this.timeStep
    // gravity will be applied from the next frame to allow accelleration from jumps to apply
    if (player.isAirborne && !player.isSubmerged) {
      player.acceleration.y = this.gravity
    } else if (player.isSubmerged) {
      player.acceleration.y = player.heldKeys["ArrowDown"] ? this.gravity / 2 : this.gravity / 10
    }
    

    // Assume airborne, unless collision or a "resting" state is detected
    player.isAirborne = true

    this.rects.forEach(rect => {
      const isOverlapping = this.checkCollision(player, rect);
      // Check for "resting" state (exactly on top) which standard check might miss due to EPSILON.
      // We check if the player's bottom is very close to the platform's top and horizontally aligned.
      const isResting = player.velocity.y >= 0 && 
                        Math.abs(player.position.y + player.height - rect.y) < 0.1 &&
                        player.position.x < rect.x + rect.width - 0.01 &&
                        player.position.x + player.width > rect.x + 0.01;

      if (isOverlapping || isResting) {
        if (player.velocity.y >= 0) {
          // Snap to the top of the platform and reset vertical physics
          player.position.y = rect.y - player.height
          player.isAirborne = false
          player.velocity.y = 0
          player.acceleration.y = 0
        } else if (player.velocity.y < 0 && isOverlapping) {
          // Ceiling collision - only trigger if actually overlapping
          player.position.y = rect.y + rect.height
          player.velocity.y = 0
        }
      }
    })

    // detect collisions with the world boundries
    if (player.position.x < 0) {
      // load the next level to the left
      this.level.x -= 1
      onLevelLoad(this.level)
      player.position.x = this.width * this.blockWidth - player.width
      // player.position.x = 0
      // player.velocity.x = player.acceleration.x = 0
    }
    else if (player.position.x > this.width * this.blockWidth - player.width) {
      // load the next level to the right
      this.level.x += 1
      onLevelLoad(this.level)
      player.position.x = 0
      // player.position.x = this.width * this.blockWidth - player.width
      // player.velocity.x = player.acceleration.x = 0
    }
    // ceiling collision
    if (player.position.y < 0) {
      // load the next level up
      this.level.y -= 1
      onLevelLoad(this.level)
      player.position.y = this.height * this.blockHeight - player.height
      // player.position.y = 0
      // player.velocity.y = player.acceleration.y = 0
    }
    // floor collision
    else if (player.position.y >= this.height * this.blockHeight - player.height) {
      // load the next level down
      this.level.y += 1
      onLevelLoad(this.level)
      player.position.y = 0
      // player.position.y = this.height * this.blockHeight - player.height
      // player.velocity.y = player.acceleration.y = 0
      // player.isAirborne = false
    }
  }
    
}

class Game {
  constructor(playerElement, worldString, worldHeight, worldWidth, onLevelLoad) {
    this.player = new Player(playerElement)
    this.world = new World(worldString, worldHeight, worldWidth)
    this.player.initControls()
    this.onLevelLoad = onLevelLoad
  }

  gameLoop() {
    this.world.updatePlayerPosition(this.player, this.onLevelLoad)
    this.player.render()
    requestAnimationFrame(this.gameLoop.bind(this))
  }

  resetWorld(worldString, worldHeight, worldWidth) {
    const level = this.world.level
    this.world = new World(worldString, worldHeight, worldWidth)
    this.world.level = level
  }
}
