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

var playerWidth = 40;
var playerHeight = 40;

var dummyObj = {
  x: 0,
  y: 0,
  width: 0,
  height: 0
};

var projectiles = []; //track bullets
var players = {}; //track players
var numObs = Math.floor((xMax * yMax)/ 20000);
var obstacles = []; //track obstacles
var tanks = { //track tanks in use
  brown: false,
  red: false,
  blue: false,
  green: false,
  pink: false,
  orange: false,
  purple: false,
  white: false
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
    var newObstacle = { x: 0,
                        y: 0,
                        width: 20 + (Math.random() * 40),
                        height: 20 + (Math.random() * 40)
                      };
    randomSpawn(newObstacle);
    obstacles.push(newObstacle);
  }
}

function randomSpawn(object){
  var newX;
  var newY;
  var successful = false;
  var colliding;

  while(!successful) {
    newX = Math.floor(Math.random() * (xMax - object.width));
    newY = Math.floor(Math.random() * (yMax - object.height));

    //attempt to move dummy object to new spawn
    dummyObj.height = object.height;
    dummyObj.width = object.width;
    dummyObj.x = newX;
    dummyObj.y = newY;

    colliding = getObjCollisions(dummyObj).length;
    if(colliding == 0) //no collisions
    {
      object.x = newX;
      object.y = newY;
      successful = true;
      break;
    }
  }
}

function getCenter(object){
  center={
    x: (object.x + (object.width/2)),
    y: (object.y + (object.height/2))
  }
  return center;
}

function createNewPlayer(newColor, USER){
  var newPlayer = {
    x: 0,
    y: 0,
    width: playerWidth,
    height: playerHeight,
    angle: Math.random() * (2 * Math.PI),
    speed: 0,
    name: USER,
    color: newColor,
    reloading: false,
    dead: 0,

    score: 0
  };
  randomSpawn(newPlayer);
  return newPlayer;
}

function setPlayerLoc(player, newX, newY) {
  dummyPlayer.x = newX;
  dummyPlayer.y = newY;
  var collisions = getPlayerCollisions(dummyPlayer);
  if(collisions.length != 0 || newX > (xMax - 25) || newY > (yMax -25)){ //don't allow placement on other objects
    return false;
  }
  else{
    player.x = newX;
    player.y = newY;
    return true;
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

function getObjCollisions(obj) {
  //check collisions with players
  var collidingObjs = [];
  for (var id in players) {
    var otherPlayer = players[id];
    if (obj != players[id]) {
      if (areColliding(obj, otherPlayer) && otherPlayer.dead == 0) {
        collidingObjs.push(otherPlayer);
      }
    }
  }

  //check collisions with obstacles
  for (var i = 0; i < obstacles.length; ++i) {
    var obstacle = obstacles[i];
    if (areColliding(obj, obstacle) && obj != obstacle) { //dont match the same object
      collidingObjs.push(obstacle);
    }
  }
  return collidingObjs;
}

function getObjEdges(object){
  var objCen = getCenter(object);
  var edges={
    top: objCen.y - (object.height/2),
    right: objCen.x + (object.width/2),
    bottom: objCen.y + (object.height/2),
    left: objCen.x - (object.width/2)
  }
  return edges;
}

function getAvailDirections(collidingObjs, player){
  var availDirections = {left: true, right: true, up: true, down: true};

  for(var i = 0; i < collidingObjs.length; ++i){
    var obj = collidingObjs[i];
    var playerCenter = getCenter(player);
    var objEdges = getObjEdges(obj);
    var pHalfWidth = player.width/2;
    var pHalfHeight = player.height/2;


    if((objEdges.right < playerCenter.x) && (playerCenter.y - 15 < objEdges.bottom && playerCenter.y + 15 > objEdges.top)){
      availDirections.left = false;
    }
    if((objEdges.left > playerCenter.x)&& (playerCenter.y - 15 < objEdges.bottom && playerCenter.y + 15 > objEdges.top)){
      availDirections.right = false;
    }
    if((objEdges.bottom < playerCenter.y) && (playerCenter.x - 15 < objEdges.right && playerCenter.x + 15 > objEdges.left)){
      availDirections.up = false;
    }
    if((objEdges.top > playerCenter.y) && (playerCenter.x - 15 < objEdges.right && playerCenter.x + 15 > objEdges.left)){
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

    var collidingObjs = getObjCollisions(player);
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
    else if(tanks.orange == false){
      newColor = 'orange';
      tanks.orange = true;
    }
    else if(tanks.purple == false){
      newColor = 'purple';
      tanks.purple = true;
    }
    else if(tanks.white == false){
      newColor = 'white';
      tanks.white = true;
    }
    else
      newColor = 'brown';
    players[socket.id] = createNewPlayer(newColor, 'unknown');
    console.log("Player " + socket.id + " connected with coordinates: " + players[socket.id].x + ", " + players[socket.id].y);
    //console.log("and angle " + players[socket.id].angle);

    socket.on('disconnect', function() {
      console.log(socket.id + " disconnected");
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