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

io.sockets.on('connection', function (socket) {

    console.log('socket connected'.yellow);

    socket.on('message', function (data) { //any object
        console.log('Message: ', data);
        data = JSON.parse(data);
        
        console.log(data.apiKey + ":" + data.roomId);
        io.to(data.apiKey + ":" + data.roomId).emit('message', data.payload);
    });

    socket.on('disconnect', function () {
        console.log('user disconnected: '.red, socket.id);
        // delete from participants and broadcast it.
    });
});

server.listen(app.get('port'), function () {
  console.log('Express server listening on port '.yellow + app.get('port'));
});