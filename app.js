//------------------------------------------------------------------------------
// Requires
//------------------------------------------------------------------------------
var heatmap = require('heatmap-fix');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var path = require('path');

var EventEmitter = require('events').EventEmitter;
var filesEE = new EventEmitter();
var myfiles=[];
var dir1 = './log_files/';
var curdir = dir1 + 'P5'; //change this for different participants
var files_loaded = false;

//------------------------------------------------------------------------------
// Setup
//------------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));
http.listen(3000, function(){console.log('listening on *:3000');});
app.get('/', function(req, res){
  res.sendfile('index.html');
});


//------------------------------------------------------------------------------
// Socket
//------------------------------------------------------------------------------
io.on('connection', function(socket){
	console.log('Connected!');
	connected = true;
	socket.on('start',function(){
		for (f in myfiles) {
			io.emit('data_send',myfiles[f]);
		}
        io.emit('done_sending');
        console.log('Sent all data.');
	});

	socket.on('request_files', function() {
		if (files_loaded) {
			io.emit('files_ready');
		}
	});
});

//------------------------------------------------------------------------------
// Load files
//------------------------------------------------------------------------------
// this event will be called when all files have been added to myfiles
filesEE.on('files_ready',function(){
	files_loaded = true;
	io.emit('files_ready');
});

// read all files from current directory
fs.readdir(curdir,function(err,files){
	if(err) throw err;
	var counter = 0;
	var gaze_files = [];
	var properties_files = [];
	var touch_files = [];
	var gestures = [];

	files.forEach(function(file){
		var filename = file.split('-');
		var header = filename[0];
		if ( header == "GazeLogfile") {
			gaze_files.push(file);
		} else if (header == "Properties") {
			properties_files.push(file);
		} else if (header == "TouchLogfile") {
			touch_files.push(file);
		}
		gestures.push(filename[filename.length - 1].split('.')[0]);
	});
	if (gaze_files.length != properties_files.length || properties_files.length != touch_files.length) {
		console.log("Error : file type lengths unequal");
	}
	for (var i=0;i<gaze_files.length;i++) {
		var f = {
			gaze: fs.readFileSync(curdir + '/' + gaze_files[i], 'utf8'),
			touch: fs.readFileSync(curdir + '/' + touch_files[i], 'utf8'),
			gesture: gestures[i],
			properties: fs.readFileSync(curdir + '/' + properties_files[i], 'utf8')
		}
		myfiles.push(f);
	}
	filesEE.emit('files_ready'); // trigger files_ready event
});
