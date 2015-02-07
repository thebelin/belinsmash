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

    // An array of targets to hit
      targets = [],

    // Balls array, add items as they are added to the scene
      balls = [],

    // The size of the ball (the radius)
      ballSize = 3,

    // So we don't have to divide multiple times
      ballBorder = ballSize / 2,

    // How wide is the paddle
      paddleWidth = 50,

    // How wide is each target
      targetWidth = 17,

    // How tall is each target
      targetHeight = 5,

    // Maximum move rate of the paddle (per second)
      paddleMoveRate = 200,

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
      cameraTarget = new THREE.Vector3(0, 150, 0),
      
    // Some light
      light = new THREE.DirectionalLight(0xffffff, .5),
      light2 = new THREE.PointLight(0xffffff, 1, 3000),

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

    // A sequence to use camera angles
      introCamera = function (startLocation, endLocation, onFinish) {
        $({alpha: 0}).animate({alpha: 1}, {
          duration: 5000,
          step: function() {
            camera.position = startLocation.lerp(endLocation, this.alpha)
            camera.lookAt(cameraTarget);
          },
          always: function () {
            camera.position = endLocation;
            camera.lookAt(cameraTarget);
            if (typeof onFinish === 'function') {
              onFinish()
            }
          }
        });
      },

      cursorMove = function (e) {
        if (gameState === 1) {
          paddle.movePaddle(-(paddle.lastx - e.x));
          paddle.lastx = e.x;
        }
      },

    // handle Sizing:
      sizer = function () {
        // set the scene size
        width  = window.innerWidth * .98;
        height = window.innerHeight * .98;

        console.log({height: height + 'px', width: width + 'px'});
        //Make the container the game canvas size
        $container.css({height: height + 'px', width: width + 'px'});
  
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
        options.momentum = options.momentum || new THREE.Vector3(ballMoveRate / 3, -ballMoveRate, 0);
        options.position = options.position || new THREE.Vector3();

        // Assign the mesh
        this.object = new THREE.Mesh(
          new THREE.SphereGeometry(options.radius, 32, 32),
          new THREE.MeshPhongMaterial( {color: options.color} )
        );

        // Assign position
        this.object.position = options.position;

        // Assign the momentum attribute
        this.object.momentum = options.momentum;

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
        ]
        this.object.caster = new THREE.Raycaster();

        // A function to reverse momentum
        this.object.reverse = function (axis) {
          self.object.debounce = currentMs + 50;
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
        };

        // finally, add the object to the scene
        scene.add(this.object);
      },

      /**
       * A function to create an animated explosion
       * 
       * @param Object options The options for this explosion
       *               position (Vector3) Where to place the explosion
       *               color    Hex What color to make the explosion
       */
      ExplodeAnimation = function (options) {
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
          vertex.z = 0;
        
          geometry.vertices.push(vertex);

          itemMomentum = {
            x:(Math.random() * movementSpeed)-(movementSpeed/2),
            y:(Math.random() * movementSpeed)-(movementSpeed/2),
            z:(Math.random() * movementSpeed)-(movementSpeed/2)
          };
          dirs.push(itemMomentum);
        }
        
        particles = new THREE.ParticleSystem(
          geometry,
          new THREE.ParticleBasicMaterial( { size: objectSize,  color: color })
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
            this.object.material.opacity = expTime;
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
        // Assign the argument as an object if its null
        levelSpec         = levelSpec || {};
        levelSpec.targets = levelSpec.targets || [];

        // Create the walls and ceiling lines
        for (var wallCount = 50; wallCount > 0; wallCount--) {
          var lineGeometry = new THREE.Geometry();
          lineGeometry.vertices.push(
            new THREE.Vector3(borders.left, borders.bottom, wallCount * 10),
            new THREE.Vector3(borders.left, borders.top, wallCount * 10),
            new THREE.Vector3(borders.right, borders.top, wallCount * 10),
            new THREE.Vector3(borders.right, borders.bottom, wallCount * 10)
          );
          wall = new THREE.Line( lineGeometry, new THREE.LineBasicMaterial({
            color: 0x0000ff, width:2
          }));
          scene.add(wall);
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
                                color:     colors[x],
                                specular:  0xffffff,
                                shininess: 98})
                }).object);
              }
            }
          }
        } else {
          //@todo iterate the targets provided and add them according to specification
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
              color: colors[this.column],
              specular: 0xffffff,
              shininess: 90,
            }),

        /**
         * The 3D geometry underpinning the target's mesh
         * @type {THREE.Geometry}
         */
          geometry = 
          (typeof targetOptions.geometry === 'object')
            ? targetOptions.geometry
            : new THREE.CubeGeometry(size.x, size.y, size.z);


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

      makePaddle = function () {
        var self = this;
        this.object = new THREE.Mesh(
          new THREE.CubeGeometry(paddleWidth, 1, 200),
          new THREE.MeshPhongMaterial( {color: 0x00ff00} )
        ),

        // Add the paddle
        this.object.position.y = -20;
        this.object.position.z = 50;

         // Control the paddle
        this.lastx = 0;
        this.moving = 0;

        // Script for moving the paddle
        this.movePaddle = function (moveDiff) {
          // Convert moveDiff to a value scaled within paddleMoveRate
          if (moveDiff < 0 && Math.abs(moveDiff) > paddleMoveRate) {
            moveDiff = -paddleMoveRate;
          } else if(moveDiff > 0 && moveDiff > paddleMoveRate) {
            moveDiff = paddleMoveRate;
          }

          this.moving = moveDiff;

          this.object.rotation.z = -moveDiff * .01;
          
          if (moveDiff !== 0) {
            // move the paddle by that amount
            if (moveDiff < 0 && borders.left < this.object.position.x + moveDiff - paddleWidth / 2) {
              this.object.position.x -= paddleMoveRate * timeSegment;
            } else if(moveDiff > 0 && borders.right > this.object.position.x + moveDiff + paddleWidth / 2) {
              this.object.position.x += paddleMoveRate * timeSegment;
            }
          }
          camera.position.x = this.object.position.x * .8;
          camera.lookAt(cameraTarget);
        },

        // The ball will call this on the paddle when it collides
        this.object.onCollide = function (collided, projector, ball) {
          console.log('paddleCollide');
          // The maximum horizontal momentum
          var maxSpeed = (ballMoveRate * .75),

          // The proposed modification to the horizontal momentum
            modSpeed = (ball.momentum.x + this.moving * 5);

          // Reverse the vertical direction of the ball
          ball.reverse('y');

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
        parts.push(new ExplodeAnimation({
          position: new THREE.Vector3(
            target.position.x,
            target.position.y,
            0),
          color: target.material.color
        }));
        
        scene.remove(target);
        clickSound(Math.floor(target.column / 3));
        targets.splice(getTargetIndex(target), 1);
      },

      clickSound = function (clickIndex) {
        // Play a click sound, according to the column
        if (sounds.click[clickIndex]) {
          sounds.click[clickIndex].load();
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
          if (ball.position.y > borders.top - ballSize
              || ball.position.y < borders.bottom + ballSize)
          {
            ball.reverse('y');

            // Play wall sound
            sounds.wall.play();
          }
          if (ball.position.x < borders.left + ballSize
            || ball.position.x > borders.right - ballSize) {
            ball.reverse('x');

            // Play wall sound
            sounds.wall.play();
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
              gameState = 1;
            } else {
              gameState = 0;
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

    // Add the lights
    light.position.z = 100;
    light2.position.y = 600;
    light2.position.z = 200;
    scene.add(light);
    scene.add(light2);

    // start the renderer
    renderer.setSize(width, height);

    // attach the render-supplied DOM element
    $container.append(renderer.domElement);

    // Build the level (walls & targets)
    buildLevel();

    // Add a ball
    balls.push(new ball());

    balls.push(new ball({
      position: new THREE.Vector3(20, 0, 50),
      color: 0xff0000
    }));

    balls.push(new ball({
      position: new THREE.Vector3(20, 0, 100),
      color: 0xff00ee
    }));

    // Add a paddle
    paddle = new makePaddle();
    targets.push(paddle.object);
    
    // Do the fancy intro camera move
    introCamera(
      new THREE.Vector3(0, 1000, 200),
      new THREE.Vector3(0, 150, 550),
      function () {
        // unpause the game
        gameState = 1;
      }
    );

    // Set up the control events
    doControls();

    // request new frame
    requestAnimationFrame(render);
  }  
}));
});