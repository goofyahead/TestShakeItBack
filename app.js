var express = require('express'),
http = require('http');

var DEBUG = require('debug');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var colors = require ('colors');
var lodash  = require('lodash').noConflict();
var _ = require('underscore');
var async = require('async');
var uuid = require('node-uuid');

var CHECK_DEAD_ROOMS_TIMEOUT = 10 * 60 * 1000;

app.set('port', process.env.PORT || 3111);

var apps = {};

// setInterval(function () {
//     for (apiKey in apps) {
//         for( room in apiKey) {
//             setImmediate(function ( currentApiKey, currentRoom) {
//                 if (apps[currentApiKey][currentRoom].participants.length == 0 && apps[currentApiKey][currentRoom].flagged == true) {
//                     delete apps[currentApiKey][currentRoom];
//                 } else if (apps[currentApiKey][currentRoom].participants.length == 0) {
//                     apps[currentApiKey][currentRoom].flagged = true;
//                 }
//             }, apiKey, room);
//         }
//     }
// }, CHECK_DEAD_ROOMS_TIMEOUT);

io.sockets.on('connection', function (socket) {

    console.log('socket connected'.yellow);

    socket.on('createRoom', function(data){ //data = { roomId: '1', apiKey : '1', userName: '', roomInfo : {} }
        console.log('Room created'.green, data);
        console.log('this user id: ' + socket.id);
        data = JSON.parse(data);
        apps[data.apiKey] = {};
        apps[data.apiKey][data.roomId] = { participants: [ data.userName ], roomInfo : data.roomInfo, roomSocket: socket, flagged : false };  
        console.log('joining room ' + data.apiKey + ":" + data.roomId);  
        console.log('participants ' + apps[data.apiKey][data.roomId].participants);
        // console.log(apps);
        socket.join(data.apiKey + ":" + data.roomId);
    });

    socket.on('leaveRoom', function (data){
        data = JSON.parse(data);
        console.log('leaving room'.red);
        socket.leave(data.apiKey + ":" + data.roomId);
    });

    socket.on('joinRoom', function (data){ //data = { roomId: '1', apiKey : '1', userName: '' }
        console.log('Joining to room: '.green, data);
        console.log('this user id: ' + socket.id);
        data = JSON.parse(data);
        // console.log(apps);
        // console.log("especific: ", apps[data.apiKey]);
        if (apps[data.apiKey] && apps[data.apiKey][data.roomId]) {
            apps[data.apiKey][data.roomId].participants.push(data.userName);
            //set flagged to false in case it was empty for some time;
            apps[data.apiKey][data.roomId].flagged = false;
            //Join this room
            socket.join(data.apiKey + ":" + data.roomId);
            //notifiy all a new client appeared
            socket.broadcast.to(data.apikey + ":" + data.roomId).emit('joined', data.playerName );
            //send back information to only this client of the room
            socket.emit('roomInfo', { participants: apps[data.apiKey][data.roomId].participants, roomInfo : apps[data.apiKey][data.roomId].roomInfo});
        } else {
            console.log('joining an unexistant room'.red);
        }
    });

    socket.on('me', function (data){ // change my info {userName: 'foo'}
        data = JSON.parse(data);
        _.without(apps[socket.apiKey][socket.roomId].participants, socket.userName);
        socket.userName = data.userName;
        apps[apiKey][socket.roomId].participants.push(socket.userName);
        socket.emit('roomInfo', { participants: apps[socket.apiKey][socket.roomId].participants, roomInfo : apps[socket.apiKey][socket.roomId].roomInfo});
    });

    socket.on('message', function (data) { //any object
        data = JSON.parse(data);
        console.log('Message: ', data);
        console.log(data.apiKey + ":" + data.roomId);
        io.to(data.apiKey + ":" + data.roomId).emit('message', data.payload);
    });

    socket.on('disconnect', function () {
        console.log('user disconnected: '.red, socket.id);
        // delete from participants and broadcast it.
        if (apps[socket.apiKey] && apps[socket.apiKey][socket.roomId]) {
            apps[socket.apiKey][socket.roomId].participants = _.without(apps[socket.apiKey][socket.roomId].participants, socket.userName);
        }
        socket.volatile.broadcast.to(socket.apiKey + ":" + socket.roomId).emit('disconnected', socket.playerName);
    });

    socket.on('destroyRoom', function (data) { // deletion of room and this socket { roomId: '1', apiKey : '1', userName: '' }
        delete apps[socket.apiKey][socket.roomId];
        io.socket.emit('roomDestroyed', {});
    });

    socket.on('editRoomInfo', function (data) { //whatever JSON object the user wants
        apps[socket.apiKey][socket.roomId].roomInfo = data;
        socket.emit('roomInfo', { participants: apps[socket.apiKey][socket.roomId].participants, roomInfo : apps[socket.apiKey][socket.roomId].roomInfo});
    });

});

server.listen(app.get('port'), function () {
  console.log('Express server listening on port '.yellow + app.get('port'));
});