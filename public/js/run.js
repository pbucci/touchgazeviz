//------------------------------------------------------------------------------
// Globals
//------------------------------------------------------------------------------
var div_counter = 0;
var socket = io();
var files_loaded = false;
var messages = [];
var notouch;
var max_touch = 0; // JUSSI CHANGE 'contrast' HERE
//------------------------------------------------------------------------------
// Socket
//------------------------------------------------------------------------------
socket.on('files_ready', function() {
	$("#ready").remove();
	socket.emit('start');
	files_loaded = true;
});

socket.on('data_send', function(msg){
	messages.push(msg);
	console.log('Message pushed.');
});

socket.on('done_sending',function() {
	var notouches = [];
	for (m in messages) {
		var f = parse_file(messages[m]['touch']);
		set_touch_max(f);
		if (messages[m]['gesture'] == 'notouch') {
			notouches.push(f);
		}
	}
	var merged;
	for (var i=0;i<notouches.length;i++) {
		var current = notouches[i];
		if (!merged) {
			merged = current;
		} else {
			for (var j=0;j<Math.max(current.length,merged.length);j++) {
				if (current[j] && merged[j]) {
					for (var k=0;k<current.length;k++) {
						merged[j][k] = average(current[j][k],merged[j][k],notouches.length);
					}
				}
				else if (!merged[j]) {
					merged.push(current[j]);
				}
				else if (!current[j]) {
					// merged stays the same
				}
			}
		}
	}
	notouch = merged;

	for (m in messages) {
		make_map_with_msg(messages[m]);
		console.log('Making map....');
	}
});

function average(x,u,n) {
	var ret = (x + (u * (n-1))) * (1/n);
	return ret;
}

function make_map_with_msg(msg) {
	div_counter++;
	var name_div = "<div id='heatmap_name" + div_counter +
		"' class='heatmap_name'></div>";
	var gaze_div = "<div id='heatmap_gaze" + div_counter +
		"' class='heatmap'></div>";
	var touch_div = "<div id='heatmap_touch" + div_counter +
		"' class='heatmap'></div>";

	$("#heatmap_container").append("<div id='heatmap_wrapper" +
		div_counter + "' class='heatmap_wrapper'>" + name_div +
		gaze_div + touch_div + "</div>");
	parse_msg_and_make_heatmap(div_counter,msg);
};

var checkfiles = setInterval(function(){
	if (files_loaded == false) {
		socket.emit('request_files');
	}
	if (files_loaded == true) {
		clearInterval(checkfiles);
	}
},500);

//------------------------------------------------------------------------------
// Heatmap
//------------------------------------------------------------------------------
function parse_msg_and_make_heatmap(count,msg) {
	var gesture = msg['gesture'];

	var p = parse_properties(msg['properties']);
	var g = parse_file(msg['gaze']);
	var t = parse_file(msg['touch']);

	parse_properties(msg['properties']);
	make_gaze_heatmap($('#heatmap_gaze' + count)[0],g);
	make_touch_heatmap($('#heatmap_touch' + count)[0],t);
	$('#heatmap_name' + count).append("<p class='name'>" + gesture + "</div>");
}

function make_gaze_heatmap(div,array) {
	var points = [];
	var max = 10; // JUSSI CHANGE 'contrast' HERE (higher max == lower contrast)

	var heatmapInstance = h337.create({
	  container: div,
	  gradient: {
	    	'0.0': 'blue',
	    	'0.5': 'red',
			'1.0': 'white'
		},
	});

	for (var i=0;i<array.length;i++) {
		var x = Math.floor(array[i][1] * 0.4 - 100);
		var y = Math.floor(array[i][2] * 0.4);
		var v = array[i][0];
		//max = Math.max(max,v);
		var point = {
			x: x,
			y: y,
			value: 1,
		}
		points.push(point);
	}

	var data = {
	  max: max,
	  data: points
	};
	// if you have a set of datapoints always use setData instead of addData
	// for data initialization
	heatmapInstance.setData(data);
}

function set_touch_max(f) {
	for(i in f) {
		var j = f[i];
		for (k in j) {
			var q = j[k];
			if (q > max_touch) {
				max_touch = q;
			}
		}
	}
}

function parse_file(msg) {
	var arr = [];
	var lines = msg.split('\n');
	for (var i=0;i<lines.length;i++) {
		var items = lines[i].split('\t');
		var line = [];
		for (var j=0;j<items.length;j++) {
			item = items[j].split(',').join('.');
			line.push(parseFloat(item));
		}
		arr.push(line);
	}
	return arr;
}
function parse_properties(msg) {
	var ret = {};
	var lines = msg.split('\n');
	for (line in lines) {
		var l = lines[line];
		var s = l.split(' ');
		var header = l.split(':')[0];
		if (header == "") {}
		else if (header == "Recording started")
			ret['start'] = s[2];
		else if (header == "Recording ended")
			ret['end'] = s[2];
		else if (header == "Recording duration")
			ret['duration'] = s.slice(1);
		else if (header == "Gaze off duration")
			ret['gaze_off'] = s[1];
		else if (header == "Robot coordinate thresholds, left")
			ret['left'] = parseFloat(s[4].split(',').join('.'));
		else if (header == "Robot coordinate thresholds, right")
			ret['right'] = parseFloat(s[4].split(',').join('.'));
		else if (header == "Robot coordinate thresholds, front")
			ret['front'] = parseFloat(s[4].split(',').join('.'));
		else if (header == "Robot coordinate thresholds, back")
			ret['back'] = parseFloat(s[4].split(',').join('.'));
	}
}

function make_touch_heatmap(div,array) {
	var points = [];
	var maximum = 0;
	var grid_x = 10; // Size of 
	var grid_y = 10; // Side of

	var width = 500;
	var height = 500;

	var pix_w = width / grid_x;
	var pix_h = height / grid_y;

	var offset_x = pix_w / 2;
	var offset_y = pix_h / 2;

	for (var j=0;j<array.length;j++) {
		var line = array[j];
		var diff;
		if (notouch) {
			if (notouch[j]) {
				diff = notouch[j];
			}
		} else {
			diff = new Array(array.length - 1).join('0').split('').map(parseFloat);
		}

		for (var i=1;i<line.length;i++) {
			var val = line[i] - diff[i];
			if (line[i] > maximum) {
				maximum = line[i];
			}
			var point = {
				x: offset_x + ((i % 10) * pix_w) + getRand(-15,15),
				y: offset_y + ((Math.floor(i / 10) - 1) * pix_h) + getRand(-15,15),
				value: val,
			}
			points.push(point);
		}
	}

	var heatmapInstance = h337.create({
	  container: div,
	  gradient: {
	    	'0.0': 'green',
	    	'0.5': 'yellow',
			'1.0': 'white'
		},
	});

	var data = {
	  max: maximum,
	  data: points
	};
	// if you have a set of datapoints always use setData instead of addData
	// for data initialization
	heatmapInstance.setData(data);
}

function getRand(min, max) {
    return Math.random() * (max - min) + min;
}

//
// Recording started: 13.8.2015 11:15:45
// Gaze off duration: 500 milliseconds
// Robot coordinate thresholds, left: 1491,12918757943
// Robot coordinate thresholds, right: 35,9916439796551
// Robot coordinate thresholds, front: 42,1344306600039
// Robot coordinate thresholds, back: 905,447616096183
//
// Recording ended: 13.8.2015 11:15:55
// Recording duration: 00:00:10 (10016 milliseconds)
