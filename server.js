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
});

// Add the WebSocket handlers
io.on('connection', function(socket) {
});


//n^2 this is gross
function collidingWith(proj){
  for(var id in players){
    var player = players[id];
    if(proj.color != player.color && player.dead == 0 && proj.x < player.x + player.width &&
      proj.x + proj.width > player.x &&
      proj.y < player.y + player.height &&
      proj.height + proj.y > player.y){
      return id;
    }
  }
  return null;
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
    var deltaX = 5 * Math.cos(proj.angle);
    var deltaY = 5 * Math.sin(proj.angle);

    if((deltaX >= 0 && proj.x <= (xMax - 20)) || (deltaX <= 0 && proj.x >= 0)) {
      proj.x += deltaX;
    }
    else{
      projectiles.splice(i, 1);
    }
    if((deltaY >= 0 && proj.y <= (yMax - 20)) || (deltaY <= 0 && proj.y >= 5)) {
      proj.y += deltaY;
    }
    else{
      projectiles.splice(i, 1);
    }
    var collidingId = collidingWith(proj);
    if(collidingId){
      projectiles.splice(i, 1);
      players[collidingId].dead = 36;
      if(players[collidingId] != null && players[proj.id] != null) {
        players[collidingId].score -= 1;
        players[proj.id].score += 1;
      }
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

      var deltaX = player.speed * Math.cos(player.angle);
      var deltaY = player.speed * Math.sin(player.angle);
      if ((deltaX >= 0 && player.x <= (xMax - 40)) || (deltaX <= 0 && player.x >= 0)) {
        player.x += deltaX;
      }
      if ((deltaY >= 0 && player.y <= (yMax - 40)) || (deltaY <= 0 && player.y >= 5)) {
        player.y += deltaY;
      }

    }
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
  io.sockets.emit('state', players, projectiles, xMax, yMax);
}, 1000 / 60);