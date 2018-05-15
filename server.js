// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');

var app = express();
var server = http.Server(app);
var io = socketIO(server);

var xMax = 800; //Canvas width
var yMax = 600; //Canvas height

var projectiles = []; //track bullets
var players = {}; //track players
var numObs = 18;
var obstacles = [];
var tanks = { //track tanks in use
  brown: false,
  red: false,
  blue: false,
  green: false,
  pink: false
};

app.set('port', 5000);
app.use('/static', express.static(__dirname + '/static'));
app.use('/img', express.static(__dirname + '/img'));

// Routing
app.get('/', function(request, response) {
  response.sendFile(path.join(__dirname, 'index.html'));
});

// Starts the server.
server.listen(5000, function() {
  console.log('Starting server on port 5000');
  spawnObs(); //spawn obstacles
});

// Add the WebSocket handlers
io.on('connection', function(socket) {
});

function spawnObs(){
  for(var i = 0; i < numObs; ++i){
    var newObstacle = { x: Math.random() * xMax,
                        y: Math.random() * yMax,
                        width: 20 + (Math.random() * 40),
                        height: 20 + (Math.random() * 40)
                      };
    obstacles.push(newObstacle);
  }
}

function areColliding(object1, object2){
  if(object1.x < object2.x + object2.width &&
    object1.x + object1.width > object2.x &&
    object1.y < object2.y + object2.height &&
    object1.height + object1.y > object2.y)
  { //detected collision
    return true;
  }
  return false;
}

//check for projectile collisions remove if found
function checkProjCollision(index){
  var proj = projectiles[index];
  var collided = false;

  //check for collisions with players if it still exists
  for (var id in players) {
    var player = players[id];
    if (areColliding(player, proj) && proj.color != player.color && player.dead == 0) {
      projectiles.splice(index, 1);
      players[id].dead = 36;
      collided = true;
      if (players[id] != null && players[proj.id] != null) {
        players[id].score -= 1;
        players[proj.id].score += 1;
      }
      break;
    }
  }
  //check for collisions with obstacles
  if(!collided) {
    for (var i = 0; i < numObs; ++i) {
      var obstacle = obstacles[i];
      if (areColliding(proj, obstacle)) {
        projectiles.splice(index, 1);
        break;
      }
    }
  }
}

function getPlayerCollisions(player) {
  //check collisions with players
  var collidingObjs = [];
  for (var id in players) {
    var otherPlayer = players[id];
    if (id != player.id) {
      if (areColliding(player, otherPlayer) && otherPlayer.dead == 0) {
        collidingObjs.push(otherPlayer);
      }
    }
  }

  //check collisions with obstacles
  for (var i = 0; i < numObs; ++i) {
    var obstacle = obstacles[i];
    if (areColliding(player, obstacle)) {
      collidingObjs.push(obstacle);
    }
  }
  return collidingObjs;
}

function getAvailDirections(collidingObjs, player){
  var availDirections = {left: true, right: true, up: true, down: true};

  for(var i = 0; i < collidingObjs.length; ++i){
    var obj = collidingObjs[i];
    if(obj.x < player.x){
      availDirections.left = false;
    }
    if(obj.x > player.x){
      availDirections.right = false;
    }
    if(obj.y < player.y){
      availDirections.up = false;
    }
    if(obj.y > player.y){
      availDirections.down = false;
    }
  }
  return availDirections;
}

function correctPlayerPosition(){
  for(var id in players){
    var player = players[id]; //get each player
    if(player.x >= (xMax-40)){
      player.x = xMax-40;
    }
    if(player.y >= (yMax-40)){
      player.y = yMax-40;
    }
  }
}

function updateProj(){
  for(var i = 0; i < projectiles.length; ++i){
    var proj = projectiles[i];
    var outOfBounds = false;
    var deltaX = 5 * Math.cos(proj.angle);
    var deltaY = 5 * Math.sin(proj.angle);

    if ((deltaX >= 0 && proj.x <= (xMax - 20)) || (deltaX <= 0 && proj.x >= 0)) {
      proj.x += deltaX;
    }
    else {
      projectiles.splice(i, 1);
      outOfBounds = true;
    }
    if ((deltaY >= 0 && proj.y <= (yMax - 20)) || (deltaY <= 0 && proj.y >= 5)) {
      proj.y += deltaY;
    }
    else {
      projectiles.splice(i, 1);
      outOfBounds = true;
    }
    if(!outOfBounds){
      checkProjCollision(i)
    }
  }
}

function updatePlayerPos(player){
  if(player != null) {
    var deltaX = player.speed * Math.cos(player.angle);
    var deltaY = player.speed * Math.sin(player.angle);

    var collidingObjs = getPlayerCollisions(player);
    var availDirections = getAvailDirections(collidingObjs, player);


    if ((deltaX >= 0 && player.x <= (xMax - 40) && availDirections.right) || (deltaX <= 0 && player.x >= 0 && availDirections.left)) {
      player.x += deltaX;
    }
    if ((deltaY >= 0 && player.y <= (yMax - 40) && availDirections.down) || (deltaY <= 0 && player.y >= 5) && availDirections.up) {
      player.y += deltaY;
    }
  }
}

io.on('connection', function(socket) {
  socket.on('new player', function() {
    var newColor;
    xMax += 75;
    yMax += 75;
    if(tanks.brown == false){
      newColor = 'brown';
      tanks.brown = true;
    }
    else if(tanks.red == false){
      newColor = 'red';
      tanks.red = true;
    }
    else if(tanks.blue == false){
      newColor = 'blue';
      tanks.blue = true;
    }
    else if(tanks.green == false){
      newColor = 'green';
      tanks.green = true;
    }
    else if(tanks.pink == false){
      newColor = 'pink';
      tanks.pink = true;
    }
    else
      newColor = 'brown';
    players[socket.id] = {
      x: Math.random() * xMax,
      y: Math.random() * yMax,
      width: 40,
      height: 40,
      angle: 0,
      speed: 0,
      name: (Object.keys(players).length +1),
      color: newColor,
      reloading: false,
      dead: 0,
      score: 0
    };
    console.log("Player " + socket.id + " connected with coordinates: " + players[socket.id].x + ", " + players[socket.id].y);
    //console.log("and angle " + players[socket.id].angle);

    socket.on('disconnect', function() {
      console.log(socket.id + " disconnected");
      xMax -= 75;
      yMax -= 75;
      correctPlayerPosition();
      var color = players[socket.id].color;
      tanks[color] = false;
      delete players[socket.id];
    });
  });

  socket.on('controls', function(data) {
    var player = players[socket.id] || {};

    if(player.dead == 0) {
      if (data.shoot && player.reloading <= 0) {
        projectiles.push({
          id: socket.id,
          color: player.color,
          x: player.x + 15,
          y: player.y + 20,
          angle: player.angle,
          width: 5,
          height: 5
        });
        player.reloading = 30;
      }

      if (data.left) {
        if (player.angle >= .05) {
          player.angle -= .05;
        }
        else
          player.angle = 2 * Math.PI;
      }
      if (data.up) {
        player.speed = 3;
      }
      if (data.right) {
        if (player.angle <= 2 * Math.PI) {
          player.angle += .05;
        }
        else
          player.angle = 0;

      }
      if (data.down) {
        player.speed = -3;
      }
    }
    updatePlayerPos(players[socket.id]);
    player.speed = 0;
    player.reloading -= 1; //tick down each frame
  });
});
setInterval(function() {
  for(var id in players){
    var player = players[id];
    player.reloading -= 1;
    if(player.dead > 0) {
      player.dead -= 1;
      if(player.dead == 0){//if the player is now alive, spawn in random spot
        player.x = Math.random() * (xMax - 25);
        player.y = Math.random() * (yMax - 25);
      }
    }
  }
  updateProj();
  io.sockets.emit('state', players, projectiles, obstacles, xMax, yMax);
}, 1000 / 60);