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
      lifetime = 500,

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
      light = new THREE.DirectionalLight(0xffffff, 1),
      light2 = new THREE.PointLight(0xffffff, 1, 3000),

    // the paddle to hit the ball with
      paddle = new THREE.Mesh(
        new THREE.CubeGeometry(paddleWidth, 1, 10),
        new THREE.MeshPhongMaterial( {color: 0x00ff00} )
      ),

    // The ball
      ball = new THREE.Mesh(
        new THREE.SphereGeometry(ballSize, 32, 32),
        new THREE.MeshPhongMaterial( {color: 0xffff00} )
      ),

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
      introCamera = function (startLocation, endLocation) {
        $({alpha: 0}).animate({alpha: 1}, {
          duration: 5000,
          step: function() {
            camera.position = startLocation.lerp(endLocation, this.alpha)
            camera.lookAt(cameraTarget);
          },
          always: function () {
            camera.position = endLocation;
            camera.lookAt(cameraTarget);
            // unpause the game
            gameState = 1;
          }
        });
      },

    // Script for moving the paddle
      movePaddle = function (moveDiff) {
        paddle.moving = moveDiff;
        if (moveDiff !== 0) {
          // move the paddle by that amount
          if (moveDiff < 0 && borders.left < paddle.position.x + moveDiff - paddleWidth / 2) {
            paddle.position.x -= paddleMoveRate * timeSegment;
          } else if(moveDiff > 0 && borders.right > paddle.position.x + moveDiff + paddleWidth / 2) {
            paddle.position.x += paddleMoveRate * timeSegment;
          }
        }
        camera.position.x = paddle.position.x * .8;
        camera.lookAt(cameraTarget);
      },

      cursorMove = function (e) {
        if (gameState === 1) {
          movePaddle(-(paddle.lastx - e.x));
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
          movePaddle(-paddleMoveRate * timeSegment);
        } else if (keys.right === 1) {
          movePaddle(paddleMoveRate * timeSegment);
        }
      },

    // The render engine
      render = function () {
        // The moment the render sequence is called
        var renderTime = Date.now();

        // The length of time since the last render sequence
        // This can be used to linear interpolate the movement
        timeSegment = (renderTime - currentMs) / 1000;

        // Then assign the render time to the current time
        currentMs = renderTime;

        // These statements tell the browser to start doing its animation loop
        // it will call this according to how it calls render sequences
        requestAnimationFrame(render);
        renderer.render(scene, camera);

        // Apply the momentum to the ball if the game isn't paused
        if (gameState === 1) {
          doKeys();
          // The momentum is the rate of movement per second
          ball.position.x += ball.momentum.x * timeSegment;
          ball.position.y += ball.momentum.y * timeSegment;

          pCount = parts.length;
          while (pCount--) {
            parts[pCount].update();
          }
        }
        // detect any collision
        detectCollision(ball);

        // Reset the tracker about the paddle moving or not
        paddle.moving = 0;
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
        levelSpec = levelSpec || {};
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
          for (var x = 0; x < 18; x++) {
            for (var y = 1; y < 15; y++) {
              targets.push(new target({
                row:        y,
                column:     x,
                size:       new THREE.Vector3(targetWidth, targetHeight, targetHeight * 2),
                material:   new THREE.MeshPhongMaterial({
                              color:     colors[x],
                              specular:  0x000000,
                              shininess: 90}),
                onCollide:  function (collided, projector) {
                  var targetIndex = getTargetIndex(collided);
                    if (targetIndex !== -1) {
                      destroyTarget(targetIndex);
                    }
                  // If the point of contact is to the side, it should reverse
                  // on the x axis instead of the y axis for this collision
                  if (Math.abs(projector.x) && !Math.abs(projector.y)) {
                    reverseBall('x');
                  } else {
                    reverseBall('y');
                  }
                }
              }).object);
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
        this.object.column = (typeof targetOptions.row === 'number')
                              ? targetOptions.column
                              : 5;

        // Reposition target according to row/column settings
        // @todo This needs a centering mechanism which isn't manual -Belin
        this.object.position.y = 300 - this.object.row * (targetHeight + 2);
        this.object.position.x = -160 + this.object.column * (targetWidth + 2);

        // This will be called by the render phase on each pass
        this.update = function () {
          // @todo add some sparklies or some such shit
        }

        // Call this when a collision is detected on this target
        this.object.onCollide = (typeof targetOptions.onCollide === 'function')
          ? targetOptions.onCollide
          : function () {
            console.log ('default collision function executed for ', this.object);
          };

        scene.add(this.object);
      },

      /**
       * Call to destroy a target
       * 
       * @param integer targetIndex The array index of the item to be destroyed
       */
      destroyTarget = function (targetIndex) {
        var clickIndex = Math.floor(targets[targetIndex].column / 3);
        
        // Make the target explode
        parts.push(new ExplodeAnimation({
          position: new THREE.Vector3(
            targets[targetIndex].position.x,
            targets[targetIndex].position.y,
            0),
          color: targets[targetIndex].material.color
        }));
        
        scene.remove(targets[targetIndex]);
        targets.splice(targetIndex, 1);
        clickSound(clickIndex);

        console.log('targets remaining: %s', targets.length);
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

      /**
       * Operate the paddle
       */
      paddleBall = function () {
        // The maximum horizontal momentum
        var maxSpeed = (ballMoveRate * .75),

        // The proposed modification to the horizontal momentum
          modSpeed = (ball.momentum.x + paddle.moving * 5);

        // Reverse the vertical direction of the ball
        reverseBall('y');

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

      },

      reverseBall = function (axis) {
        debounce = currentMs + 50;
        ball.momentum[axis] = -ball.momentum[axis];
      },

      detectCollision = function () {
        var i, h;
        // Check for collision with the wall, reverse momentum if struck
        if (debounce < currentMs) {
          if (ball.position.y > borders.top - ballSize
              || ball.position.y < borders.bottom + ballSize)
          {
            reverseBall('y');

            // Play wall sound
            sounds.wall.play();
          }
          if (ball.position.x < borders.left + ballSize
            || ball.position.x > borders.right - ballSize) {
            reverseBall('x');

            // Play wall sound
            sounds.wall.play();
          }
        }

        // Test if we intersect with any obstacle mesh
        // @todo may need to add a debounce to target collision


        // Check for collision with any targets
        for (i = 0; i < ball.rays.length; i += 1) {
          // We reset the raycaster to this direction
          ball.caster.set(ball.position, ball.rays[i]);

          // Test for the paddle mesh
          if (paddle.debounce < currentMs) {
            collisions = ball.caster.intersectObject(paddle);
            for (h in collisions) {
              if (collisions[h].distance < ballSize) {
                paddle.debounce = currentMs + 50;
                paddleBall();
              }
            }
          }

          // Fast, but not ideal way to ensure this is an array
          if (targets.length) {
            collisions = ball.caster.intersectObjects(targets);
          } else {
            collisions = ball.caster.intersectObject(targets);
          }

          for (h in collisions) {
            if (collisions[h].distance < ballSize) {
              // If the object has a collision function, use it
              if (collisions[h].object && typeof collisions[h].object.onCollide === 'function') {
                collisions[h].object.onCollide(collisions[h].object, ball.rays[i]);
              } else if (typeof onCollide === 'function') {
                // Else run the collision function passed in to this
                onCollide(collisions[h].object, ball.rays[i]);
              }
              break;
            }
          }
        }
      };

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
    light2.position.y = 100;
    light2.position.z = 200;
    scene.add(light);
    scene.add(light2);

    // start the renderer
    renderer.setSize(width, height);

    // attach the render-supplied DOM element
    $container.append(renderer.domElement);


    // Build the level (walls & targets)
    buildLevel();

    // Add the ball momentum
    ball.momentum = new THREE.Vector3(ballMoveRate / 3, -ballMoveRate, 0);
    // These are the impact rays to use for ball collision detection
    ball.rays = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(1, 1, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(-1, -1, 0)
    ]
    ball.caster = new THREE.Raycaster();
    scene.add(ball);

    // Add the paddle
    paddle.position.y = -20;
    scene.add(paddle);

    // Control the paddle
    paddle.lastx = 0;
    paddle.moving = 0;
    paddle.debounce = 0;

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

    // Do the fancy intro camera move
    introCamera(new THREE.Vector3(0, 1000, 200), new THREE.Vector3(0, 150, 450));

    // request new frame
    requestAnimationFrame(render);
  }  
}));
});