$().ready(function () {
(function (d, config) {
  config = 
    {
      init:   config.init || null
    };

  // Run the init if it's a function
  if (typeof config.init === 'function') {
    config.init();
  }
}(document, {
  init: function () {
    var 
    // The game is paused
      gameState = 0,

    // The current score of the game
      gameScore = 0,

    // Where in the array of levels is the player?
      levelIndex = 0,

    // Current ms from real time clock
      currentMs = Date.now(),

    // During render, this is set to a float of the percentage of one second taken
    // since the last render loop
      timeSegment = 0,

    // Time to stop ignoring contact
      debounce = 0,

    // The width of the game
      width = 640,

    // The height of the game
      height = 480,

    // outside borders
      borders = {
        left:   -175,
        right:  175,
        bottom: -50,
        top:    300
      },

    // Whether the walls are built
      wallsBuilt = false,

    // An array of targets to hit
      targets = [],

    // Balls array, add items as they are added to the scene
      balls = [],

    // The size of the ball (the radius)
      ballSize = 5,

    // So we don't have to divide multiple times
      ballBorder = ballSize / 2,

    // How wide is the paddle
      paddleWidth = 50,

    // How wide is each target
      targetWidth = 17,

    // The space between the targets
      targetBuffer = 2,

    // How tall is each target
      targetHeight = 5,

    // Maximum move rate of the paddle (per second)
      paddleMoveRate = 275,

    // Starting move rate of the ball (per second)
      ballMoveRate = 150,

    //////////////explosion settings/////////
      movementSpeed = 30,
      totalObjects = 100,
      objectSize = 10,
      sizeRandomness = 40000,
      lifetime = 300,

      dirs = [],
      parts = [],
    /////////////////////////////////

    // The web page element to put the game into;
      $container = $('#container'),

    // A jQuery reference to the scoreIndicator DOM object
      $scorebox = $container.find('#scoreIndicator'),

    // A collection of sounds from the DOM
      sounds = {
        bump: document.getElementById("soundBump"),
        click: [
          document.getElementById("soundClick0"),
          document.getElementById("soundClick1"),
          document.getElementById("soundClick2"),
          document.getElementById("soundClick3"),
          document.getElementById("soundClick4"),
          document.getElementById("soundClick5")
        ],
        wall: document.getElementById("soundWall")
      },

    // create a WebGL renderer, camera
    // and a scene
      renderer = new THREE.WebGLRenderer(),

    // set some camera attributes
      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000),

    // create the scene
      scene = new THREE.Scene(),

    // the camera points at this
      cameraTarget = new THREE.Vector3(0, 125, 0),
      
    // Some light
      light = new THREE.DirectionalLight(0xffffff, .5),
      light2 = new THREE.PointLight(0xffffff, 1, 4000),

    // the paddle to hit the ball with
      paddle = null,

    // A tracker if keys are being pressed
      keys = {
        left: 0,
        right: 0
      },

    // Color scheme
      colors = [
        0xf80c12, 0xee1100, 0xff3311, 0xff4422, 0xff6644,
        0xff9933, 0xfeae2d, 0xccbb33, 0xd0c310, 0xaacc22,
        0x69d025, 0x22ccaa, 0x12bdb9, 0x11aabb, 0x4444dd,
        0x3311bb, 0x3b0cbd, 0x442299,
      ],

    // Linear interpolation between two values
      lerp = function(min, max, k) {
        return min + (max - min) * k;
      },

    // A sequence to use camera angles
      introCamera = function (start, end, onFinish) {
        var doAttribs = function(alpha) {
          for (var attrib in start) {
            if (end[attrib] && camera.position[attrib]) {
              camera.position[attrib] = lerp(start[attrib], end[attrib], alpha);
              camera.lookAt(cameraTarget);
            }
          }
        }

        $({alpha: 0}).animate({alpha: 1}, {
          duration: 2000,
          easing: 'linear',
          step: function() {
            doAttribs(this.alpha);
          },
          always: function () {
            doAttribs(this.alpha);
            if (typeof onFinish === 'function') {
              onFinish()
            }
          }
        });
      },

      togglePause = function (forceState) {
        if (forceState) {
          gameState = 1;
        } else {
          gameState = 0;
        }
        $('#pauseIndicator').toggle(!gameState);
      },

      cursorMove = function (e) {
        if (gameState === 1) {
          paddle.movePaddle(-(paddle.lastx - e.x), -(paddle.lasty - e.y));
          paddle.lasty = e.y;
          paddle.lastx = e.x;
        }
      },

    // handle Sizing:
      sizer = function () {
        var marginLeft = 0,
        marginTop = 0;

        // set the scene size
        if (window.innerWidth * .56 < window.innerHeight) {
          width  = window.innerWidth;
          height = width * .56;
          marginTop = (window.innerHeight - height) / 2;
        } else {
          height = window.innerHeight;
          width  = height * 1.7
          marginLeft = (window.innerWidth - width) / 2;
        }

        console.log({height: height + 'px', width: width + 'px'});
        //Make the container the game canvas size
        $container.css({height: height + 'px', width: width + 'px', 'margin-top': marginTop, 'margin-left': marginLeft});
  
        // re-start the renderer at the new size
        renderer.setSize(width, height);
      },

    // Handle user keyboard controls
      doKeys = function () {
        if (keys.left === 1) {
          paddle.movePaddle(-paddleMoveRate * timeSegment);
        } else if (keys.right === 1) {
          paddle.movePaddle(paddleMoveRate * timeSegment);
        }
      },

    // Main loop for active game session
    // called every render sequence
      runGame = function () {
        doKeys();

        this.bCount = balls.length;
        while (this.bCount --) {
          // Run onRender on each ball
          if (typeof balls[this.bCount].object.onRender === 'function') {
            balls[this.bCount].object.onRender();
          }
          // Run checkCollisions on each ball
          if (typeof balls[this.bCount].object.checkCollision === 'function') {
            balls[this.bCount].object.checkCollision();
          }
        }

        // Run onRender on each target
        this.tCount = targets.length;
        while (this.tCount --) {
          if (typeof targets[this.tCount].onRender === 'function') {
            targets[this.tCount].onRender();
          }
        }

        // Explosion particle animation
        this.pCount = parts.length;
        while (this.pCount--) {
          parts[this.pCount].update();
        }

        // Migrate the camera towards the desired x position
        camera.position.x -= (camera.position.x - camera.desiredPosition.x ) * timeSegment;
        camera.lookAt(cameraTarget);
       
        // tilt paddle closer to 0 rotation
        paddle.object.rotation.z -= paddle.object.rotation.z * timeSegment * 10;

      },

    // The render engine
      render = function () {
        // The moment the render sequence is called
        this.renderTime = Date.now();

        // The length of time since the last render sequence
        // This can be used to linear interpolate movements
        timeSegment = (this.renderTime - currentMs) / 1000;

        // Then assign the render time to the current time
        currentMs = this.renderTime;

        // These statements tell the browser to start doing its animation loop
        // it will call this according to how it calls render sequences
        requestAnimationFrame(render);
        renderer.render(scene, camera);

        if (gameState === 1) {
          runGame();
        }

        // Reset the tracker about the paddle moving or not
        paddle.moving = 0;
      },

    // A functional ball
      ball = function (options) {
        var self = this;
        // clean and set the options for the ball
        options          = options          || {};
        options.radius   = options.radius   || ballSize;
        options.color    = options.color    || 0xffff00;
        options.momentum = options.momentum || new THREE.Vector3(ballMoveRate / 3, ballMoveRate, 0);
        options.position = options.position || new THREE.Vector3();

        // Assign the mesh
        this.object = new THREE.Mesh(
          new THREE.SphereGeometry(options.radius, 32, 32),
          new THREE.MeshPhongMaterial( {color: options.color} )
        );

        // Assign position
        this.object.position.x = options.position.x;
        this.object.position.y = options.position.y;
        this.object.position.z = options.position.z;

        // Assign the momentum attribute after a delay
        self.object.momentum = new THREE.Vector3();
        setTimeout(function(){
          self.object.momentum = options.momentum;
        }, 500);

        // The debounce is to keep collisions from being called multiple times
        this.object.debounce = currentMs;

        // These are the impact rays to use for ball collision detection
        // note that there are no z index rays, since balls will always be impacting
        // at the existing height
        this.object.rays = [
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(1, 1, 0),
          new THREE.Vector3(-1, 0, 0),
          new THREE.Vector3(0, -1, 0),
          new THREE.Vector3(-1, -1, 0)
        ];
        this.object.caster = new THREE.Raycaster();

        // This is the follow - shadow, to be shown on the paddle
        this.shadow = new THREE.Mesh(
          new THREE.BoxGeometry(options.radius / 2, options.radius / 2, options.radius / 2),
          new THREE.MeshBasicMaterial( {color: options.color} )
        );
        this.shadow.position.y = borders.bottom;
        this.shadow.position.z = this.object.position.z;

        // A function to reverse momentum
        this.object.reverse = function (axis) {
          self.object.debounce = currentMs + 100;
          self.object.momentum[axis] = -self.object.momentum[axis];
        };

        // Attach a collider to the ball by having it check for collisions
        this.object.checkCollision = function () {
          detectCollision(self.object);
        }

        // A function to handle collisions
        this.object.onCollide = function (collision) {
          // @todo invoke any onCollide function available on the target
          console.log('Ball onCollide', collision);

        };

        // Run on each render
        this.object.onRender = function () {
          // The momentum is the rate of movement per second
          // So the animation for this item is to move it by its momentum
          self.object.position.x += self.object.momentum.x * timeSegment;
          self.object.position.y += self.object.momentum.y * timeSegment;
         
          // Project a shadow downward
          self.shadow.position.x = self.object.position.x;
         
        };

        // finally, add the object to the scene
        scene.add(this.object);
        // and the shadow
        scene.add(this.shadow);
      },

      /**
       * A function to create an animated explosion
       * 
       * @param Object options The options for this explosion
       *               position (Vector3) Where to place the explosion
       *               color    Hex What color to make the explosion
       */
      explodeAnimation = function (options) {
        var geometry = new THREE.Geometry(),
          x = options.position.x || 0,
          y = options.position.y || 0,
          z = options.position.z || 0,

          color = options.color || colors[Math.round(Math.random() * colors.length)],

          itemMomentum = {},

          i, vertex, particles;
        
        for (i = 0; i < totalObjects; i ++) { 
          vertex = new THREE.Vector3();
          vertex.x = x;
          vertex.y = y;
          vertex.z = z;
        
          geometry.vertices.push(vertex);

          itemMomentum = {
            x:(Math.random() * movementSpeed)-(movementSpeed/2),
            y:(Math.random() * movementSpeed)-(movementSpeed/2),
            z:(Math.random() * movementSpeed)-(movementSpeed/2)
          };
          dirs.push(itemMomentum);
        }
        
        particles = new THREE.PointCloud(
          geometry,
          new THREE.PointCloudMaterial( { size: objectSize,  color: color, opacity: .7})
        );
        
        this.object = particles;
        this.status = true;
        
        this.xDir = (Math.random() * movementSpeed)-(movementSpeed/2);
        this.yDir = (Math.random() * movementSpeed)-(movementSpeed/2);
        this.zDir = (Math.random() * movementSpeed)-(movementSpeed/2);
        
        this.expiration = Date.now() + lifetime;
        scene.add(this.object); 
        
        // This will be called by the render phase for each particle
        this.update = function () {
          // Check for individual expiration (this will be a float between -1 and 1)
          var expTime = (this.expiration - Date.now()) / lifetime;
          if (expTime <= 0) {
            scene.remove(this.object);
          } else {
            // Adjust the opacity down towards invisible
            // console.log(this.object);
            // this.object.material.opacity = expTime;
            // console.log(this.object.material.opacity);
          }
          if (this.status === true) {
            //console.log(this.object);
            var pCount = totalObjects;
            while (pCount--) {
              var particle =  this.object.geometry.vertices[pCount]
              particle.y += dirs[pCount].y;
              particle.x += dirs[pCount].x;
              particle.z += dirs[pCount].z;
            }
            this.object.geometry.verticesNeedUpdate = true;
          }
        }
      },

      /**
       * Build the level according to specification or build the default level
       *
       * @param {Object} levelSpec The level specification including the following data
       *        {array}    targets   * an array of targets to add to the stage
       *        {function} onFall    * A function to run when the paddle misses
       *        {function} onStart   * run on startup
       *        {function} onWin     * run on win
       *        {function} onLose    * run on lost all lives
       * 
       * @return {[type]} [description]
       */
      buildLevel = function (levelSpec)
      {
        var makeLine = function(vertices, material, color) {
          var lineGeometry = new THREE.Geometry(), line, v;

          vertices = (!!vertices.length) ? vertices : [];
          color    = color || 0x0000ff;
          material = material || new THREE.LineDashedMaterial({color: color, width:2});

          for (v in vertices) {
            lineGeometry.vertices.push(vertices[v]);
          }
          lineGeometry.computeLineDistances();
          line = new THREE.Line(lineGeometry, material);
          scene.add(line);
        }
        // Assign the argument as an object if its null
        levelSpec         = levelSpec || {};
        levelSpec.targets = levelSpec.targets || [];

        levelSpec.wallColors = levelSpec.wallColors && levelSpec.wallColors.length
                              ? levelSpec.wallColors
                              : [0xffff00, 0xff0000, 0xff00ee, 0x0000ff, 0x0000ff]

        if (!wallsBuilt) {
          wallsBuilt = true;
          // Create the walls and ceiling lines
          for (var wallCount = 0; wallCount < 5; wallCount++) {
            var lineGeometry = new THREE.Geometry();
            lineGeometry.vertices.push(
              new THREE.Vector3(borders.left, borders.bottom, wallCount * 50),
              new THREE.Vector3(borders.left, borders.top, wallCount * 50),
              new THREE.Vector3(borders.right, borders.top, wallCount * 50),
              new THREE.Vector3(borders.right, borders.bottom, wallCount * 50),
              new THREE.Vector3(borders.left, borders.bottom, wallCount * 50)  
            );
            var wall = new THREE.Line( lineGeometry, new THREE.LineBasicMaterial({
              color: levelSpec.wallColors[wallCount], width:2
            }));
            scene.add(wall);

            // Create the grid lines
            if (wallCount < 3) {
              var lineMaterial = new THREE.LineDashedMaterial({
                  color: levelSpec.wallColors[wallCount],
                  dashSize: 1,
                  gapSize: targetHeight * 4,
                  linewidth: 2,
                  scale: 1,
                  transparent:true,
                  opacity:.5
                });
              for (var column = -8; column < 10; column ++) {
                // create a vertical column line
                makeLine(
                  [
                     new THREE.Vector3((column - .5) * (targetWidth + targetBuffer), borders.top, wallCount * 50),
                     new THREE.Vector3((column - .5) * (targetWidth + targetBuffer), borders.bottom, wallCount * 50)
                  ], 
                  lineMaterial
                );
              }
            }
          }
        }

        // Add the default targets
        if (levelSpec.targets.length === 0) {
          for (var x = 0; x < 18; x+=2) {
            for (var y = 7; y < 15; y++) {
              for (var z = 0; z < 3; z++) {
                targets.push(new target({
                  row:        (y * 2) - (z * 3),
                  column:     x,
                  depth:      z, 
                  size:       new THREE.Vector3(targetWidth, targetHeight, targetHeight * 2),
                  material:   new THREE.MeshPhongMaterial({
                                color:     colors[z*5 + Math.floor(x /3)],
                                specular:  0xffffff,
                                shininess: 98})
                }).object);
              }
            }
          }
        } else {
          // Iterate the targets provided and add them according to specification
          for (var x = 0,targetLength = levelSpec.targets.length; x < targetLength; x++) {
            targets.push(new target(levelSpec.targets[x]).object);
          }
        }
      },

      /**
       * Create a target and assign it all the attributes which it will
       * need in the level
       * 
       * @param {object} targetOptions All the options to assign
       * 
       *        {number}         column    The column to place the item in
       *        {number}         row       The row to place the item in
       *        {THREE.Mesh}     geometry  *optional* The geometry to use, default is brick
       *        {THREE.Vector3}  size      *optional* if mesh isn't provided, this size
       *        {THREE.Material} material  *optional* The material to display with
       *        {number}         points    *optional* The number of points for destruction (default 10)
       *        {function}       onCollide *optional* Behavior for collision
       * 
       * @return {target} A functional target for the scene
       */
      target = function (targetOptions)
      {
        var 
        /**
         * The vector based size information
         * @type {THREE.Vector3}
         */
          size = 
          (typeof targetOptions.size === 'object')
            ? targetOptions.size
            : new THREE.Vector3(targetWidth, targetHeight, targetHeight * 2),

        /**
         * The material the target will be made from
         * @type {[type]}
         */
          material = 
          (typeof targetOptions.material === 'object')
            ? targetOptions.material
            : new THREE.MeshPhongMaterial({
              color: colors[targetOptions.column],
              specular: 0xffffff,
              shininess: .1,
            }),

        /**
         * The 3D geometry underpinning the target's mesh
         * @type {THREE.Geometry}
         */
          geometry = 
          (typeof targetOptions.geometry === 'object')
            ? targetOptions.geometry
            : new THREE.BoxGeometry(size.x, size.y, size.z);


        this.object = new THREE.Mesh(geometry, material);

        // Keep the target's row and column as attributes
        this.object.row    = (typeof targetOptions.row === 'number')
                              ? targetOptions.row
                              : 1;
        this.object.column = (typeof targetOptions.column === 'number')
                              ? targetOptions.column
                              : 5;

        this.object.depth = (typeof targetOptions.depth === 'number')
                              ? targetOptions.depth
                              : 0;

        // Reposition target according to row/column settings
        // @todo This needs a centering mechanism which isn't manual -Belin
        this.object.position.y = 300 - this.object.row * (targetHeight + 2);
        this.object.position.x = -160 + this.object.column * (targetWidth + 2);
        this.object.position.z = this.object.depth * 50;

        this.object.points = targetOptions.points || 10;

        // This will be called by the render phase on each pass
        this.onRender = function () {
          // @todo add some sparklies or some such shit
        }

        // Call this when a collision is detected on this target
        this.object.onCollide = (typeof targetOptions.onCollide === 'function')
          ? targetOptions.onCollide
          : function (collided, projector, ball) {
            // Destroy this item
            destroyTarget(this);
            
            // If the point of contact is to the side, it should reverse
            // on the x axis instead of the y axis for this collision
            if (Math.abs(projector.x) && !Math.abs(projector.y)) {
              ball.reverse('x');
            } else {
              ball.reverse('y');
            }
          };

        scene.add(this.object);
      },

      /**
       * Create the paddle
       * @return {[type]} [description]
       */
      makePaddle = function () {
        var self = this;
        this.object = new THREE.Mesh(
          new THREE.BoxGeometry(paddleWidth, 1, 200),
          new THREE.MeshPhongMaterial( {color: 0x00ff00} )
        ),

        // Add the paddle
        this.object.position.y = -20;
        this.object.position.z = 50;

         // Control the paddle
        this.lastx = 0;
        this.moving = 0;

        // Script for moving the paddle
        this.movePaddle = function (moveDiff, vertMove) {
          // Convert moveDiff to a value scaled within paddleMoveRate
          if (moveDiff < 0 && Math.abs(moveDiff) > paddleMoveRate) {
            moveDiff = -paddleMoveRate;
          } else if(moveDiff > 0 && moveDiff > paddleMoveRate) {
            moveDiff = paddleMoveRate;
          }
          this.moving = moveDiff;

          var maxPaddleTilt = 0.2,
            rotationRate = moveDiff * -.005;
          
          if (moveDiff !== 0) {
            // Rotate the paddle according to current movement
            if (Math.abs(this.object.rotation.z + rotationRate) < maxPaddleTilt) {
              this.object.rotation.z += rotationRate;
            }
            // move the paddle by that amount, if it's not too close to the wall
            if (moveDiff < 0 ) {
              if (borders.left < this.object.position.x + moveDiff - paddleWidth / 2) {
                this.object.position.x -= paddleMoveRate * timeSegment;
              }
            } else if(moveDiff > 0) {

              if (borders.right > this.object.position.x + moveDiff + paddleWidth / 2) {
                this.object.position.x += paddleMoveRate * timeSegment;
              }
            }
          }

          camera.desiredPosition.x = this.object.position.x * .8;
        },

        // The ball will call this on the paddle when it collides
        this.object.onCollide = function (collided, projector, ball) {
          // The maximum horizontal momentum absolute value
          var maxSpeed = (ballMoveRate * .75),

          // The current angle of the paddle
            paddleDeg = self.object.rotation.z;

          // The proposed modification to the horizontal momentum
            modSpeed = ball.momentum.x - (ballMoveRate * (paddleDeg*2));
          
          // Reverse the vertical direction of the ball
          if (ball.momentum.y < 0) {
            ball.reverse('y');
          }

          // console.log('moving: %s, maxSpeed: %s, modSpeed: %s, current: %s', paddle.moving, maxSpeed, modSpeed, ball.momentum.x);

          // if the platform is currently moving, make the ball reflect in that direction
          if (paddle.moving >= 1) {
            ball.momentum.x = Math.min(maxSpeed, modSpeed);
          } else if (paddle.moving < -1) {
            ball.momentum.x = Math.max(-maxSpeed, modSpeed);
          }

          // Play a bumping sound
          if (sounds.bump.play) {
            sounds.bump.play();
          }
        };

        scene.add(this.object);
      },

      /**
       * Call to destroy a target
       * 
       * @param integer targetIndex The array index of the item to be destroyed
       */
      destroyTarget = function (target) {
        // Make the target explode
        parts.push(new explodeAnimation({
          position: new THREE.Vector3(
            target.position.x,
            target.position.y,
            0),
          color: target.material.color
        }));
        
        scene.remove(target);
        clickSound(Math.floor(target.column / 3));
        targets.splice(getTargetIndex(target), 1);

        // Get the points and add them to the gameScore
        gameScore += target.points || 0;
        $scorebox.html(gameScore);


        // If there are no more targets (only paddle), go on to the next level
        if (targets.length === 1) {
          nextLevel();
        }
      },

      clickSound = function (clickIndex) {
        // Play a click sound, according to the column
        if (sounds.click[clickIndex]) {
          sounds.click[clickIndex].pause();
          sounds.click[clickIndex].play();
        }
      },

      /**
       * Get the target index from the object
       * 
       * @param Object The object being examined to find the index
       *
       * @return integer The index of the target in the array of targets or -1
       */
      getTargetIndex = function (targetObj) {
        for (var t in targets) {
          if (targets[t].id === targetObj.id) {
            return t;
          }
        }
        return -1;
      },

 
      detectCollision = function (ball) {
        var i, h;
        // Check for collision with the wall, reverse momentum if struck
        if (ball.debounce < currentMs) {
          if (ball.position.y > borders.top - ballSize) {
            ball.position.y = borders.top - ballSize;

            ball.reverse('y');

            // Play wall sound
            playWallSound()
          } else if(ball.position.y < borders.bottom + ballSize) {
            //@todo This is the bottom wall,  so there probably should be an event here
            ball.position.y = borders.bottom + ballSize;

            ball.reverse('y');

            // Play wall sound
            playWallSound();
          }
          if (ball.position.x < borders.left + ballSize) {
            ball.position.x = borders.left + ballSize;

            ball.reverse('x');

            // Play wall sound
            playWallSound();

          } else if (ball.position.x > borders.right - ballSize) {
            ball.position.x = borders.right - ballSize;

            ball.reverse('x');

            // Play wall sound
            playWallSound();
          }
        }

        // Test if we intersect with any obstacle mesh

        // Check for collision with any targets and the paddle
        for (i = 0; i < ball.rays.length; i += 1) {
          // We reset the raycaster to this direction
          ball.caster.set(ball.position, ball.rays[i]);

          collisions = ball.caster.intersectObjects(targets);

          for (h in collisions) {
            if (collisions[h].distance < ballSize) {
              // If the object has a collision function, use it
              if (collisions[h].object && typeof collisions[h].object.onCollide === 'function') {
                collisions[h].object.onCollide(collisions[h].object, ball.rays[i], ball);
              } else if (typeof onCollide === 'function') {
                // Else run the collision function passed in to this
                onCollide(collisions[h].object, ball.rays[i], ball);
              } else {
                console.log('no collider', collisions[h]);
              }
              break;
            }
          }
        }
      },

      playWallSound = function() {
        // Play wall sound
        sounds.wall.pause();
        sounds.wall.play();
      }


      doControls = function () {
        // handle controls:    
        window.onmousemove = function (e) {
          cursorMove(e);
        }

        window.onkeydown = function (e) {
          console.log(e);
          if (e.keyCode === 39 || e.keyCode === 68) {
            keys.right = 1;
          } else if(e.keyCode === 37 || e.keyCode === 65) {
            keys.left = 1;
          }
          if (e.keyCode === 80) {
            if (gameState === 0) {
              togglePause(1);
            } else {
              togglePause(0);
            }
          } 
        }

        window.onkeyup = function (e) {
          paddle.moving = 0;
          if (e.keyCode === 39 || e.keyCode === 68) {
            keys.right = 0;
          } else if(e.keyCode === 37 || e.keyCode === 65) {
            keys.left = 0;
          }
        }

        // mobile controls:
        $('#container').bind('touchmove', function (e) {
          e.preventDefault();
          var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
          touch.y = touch.pageY;
          touch.x = touch.pageX;
          cursorMove(touch);
        });
      },

      // Load the next level
      nextLevel = function() {
        gameState = 0;
        // Do the fancy intro camera move
        introCamera(
          new THREE.Vector3(0, 150, 550),
          new THREE.Vector3(0, 1000, 150),
          function () {
            var levelSpec = {};
            if (window.levels.length >= levelIndex + 1) {
              levelSpec = window.levels[levelIndex];
            }
            levelIndex++;
            buildLevel(levelSpec);
            introCamera(
              new THREE.Vector3(0, 1000, 150),
              new THREE.Vector3(0, 150, 550),
              function () {
                // unpause the game
                togglePause(1);
              }
            );
          }
        );
      };
    // End var declaration for main function body


    // Run the resizer and link it to the window resize event
    sizer();
    window.onresize = function() {
      console.log('sizer');
      sizer();
    }

    // add the camera to the scene
    scene.add(camera);

    camera.position.z = 500;

    camera.position.y = 200;

    camera.desiredPosition = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);  
    // Add the lights
    light.position.y = 500;
    light.position.z = 1000;
    light2.position.y = 500;
    light2.position.z = 200;
    scene.add(light);
    scene.add(light2);

    // start the renderer
    renderer.setSize(width, height);

    // attach the render-supplied DOM element
    $container.append(renderer.domElement);

    //levelIndex = -1;
    nextLevel();

    // // Build the level (walls & targets)
    // if (window.levels && window.levels.length > levelIndex) {
    //   console.log('loading');
    //   buildLevel(window.levels[levelIndex]);
    // } else {
    //   // There's no level to load, build the default level
    //   buildLevel();
    // }

    // Add a ball
    balls.push(new ball());

    setTimeout(
      function() {
        balls.push(new ball({
          position: new THREE.Vector3(20, 0, 50),
          color: 0xff0000
        }));
      },
      8800
    );
    setTimeout(
      function() {
        balls.push(new ball({
          position: new THREE.Vector3(20, 0, 100),
          color: 0xff00ee
        }));
      },
      12000
    );
    // Add a paddle
    paddle = new makePaddle();
    targets.push(paddle.object);
    
    // Do the fancy intro camera move
    // introCamera(
    //   new THREE.Vector3(0, 1000, 150),
    //   new THREE.Vector3(0, 150, 550),
    //   function () {
    //     // unpause the game
    //     togglePause(1);
    //   }
    // );

    // Set up the control events
    doControls();

    // request new frame
    requestAnimationFrame(render);
  }  
}));
});