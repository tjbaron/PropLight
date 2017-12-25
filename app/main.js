const dialog = require('electron').remote.dialog
const convert = require('color-convert');
const mathjs = require('mathjs');
const fs = require('fs');

mathjs.import({
	squarewave: function(t) {
		return Math.cos(t*3.14) > 0 ? 1 : 0;
	},
	wave: function(t) {
		return (Math.cos(t)+1)/2;
	},
	saw: function(t) {
		return t%1;
	}
});

var data = {sequence: []};

window.onload = function() {
	can.width = can.height = 200;
	var context = can.getContext('2d');
	setInterval(function() {
		if(player.paused || player.ended) return false;
		context.drawImage(player,0,0,can.width,can.height);
		var pxl = context.getImageData(50, 50, 100, 100).data;
		var tot = [0,0,0];
		for (var i=0; i<40000; i+=4) {
			tot[0] += pxl[i];
			tot[1] += pxl[i+1];
			tot[2] += pxl[i+2];
		}
		tot[0] = tot[0]/10000;
		tot[1] = tot[1]/10000;
		tot[2] = tot[2]/10000;
		var vHsv = convert.rgb.hsv(tot[0], tot[1], tot[2]);
		data.sequence.push(vHsv);
	}, 20);
	player.addEventListener('play', function(){
		console.log('Play Started');
		data.sequence = [];
	});

	var frame = 0;
	var counter = 0;
	var current = {hue: 0, saturation: 0, brightness: 0};
	setInterval(function() {
		counter++;
		//console.log(data.sequence.length);
		if (data.sequence.length > 0) {
			frame++;
			if (frame >= data.sequence.length) frame = 0;
			current.hue = data.sequence[frame][0];
			current.saturation = data.sequence[frame][1];
			current.brightness = data.sequence[frame][2];
		}
		current.time = (new Date()).getTime()/1000;
		try {
			var res = mathjs.eval(brightnessEq.value, current);
			//if (res) 
			if (typeof(res) === 'object') {
				var vlines = JSON.parse(res);
				for (var i=0; i<vlines.length; i++) vlines[i] = Math.round(vlines[i]*1000)/1000;
				equationResult.value = vlines.join('\n');
			} else if (res !== undefined) equationResult.value = Math.round(res*1000)/1000;
			equationResult.scrollTop = brightnessEq.scrollTop;
			for (var e in current) {
				if (typeof(current[e]) !== 'number') current[e] = 0;
			}
		} catch(e) {}

		if (counter%20 === 0) hue.style.backgroundPosition = (hue.offsetWidth/2)-(current.hue*(hue.offsetWidth/360))+'px';

		var fin = {};
		fin.h = current.hue + (hue.value/1);
		
		var bri = brightness.value>100 ? 100 : brightness.value;
		fin.b = current.brightness * (bri/100);
		var briBoost = brightness.value<100 ? 0 : brightness.value-100;
		fin.b = fin.b + ((100-fin.b) * (briBoost/100));
		
		var sat = saturation.value>100 ? 100 : saturation.value;
		fin.s = current.saturation * (saturation.value/100);
		var satBoost = saturation.value<100 ? 0 : saturation.value-100;
		fin.s = fin.s + ((100-fin.s) * (satBoost/100));
		
		fin.h = fin.h%360;
		while (fin.h < 0) fin.h += 360;
		//current.saturation = clamp(current.saturation, 0, 100);
		//current.brightness = clamp(current.brightness, 0, 100);

		var rgb = convert.hsv.rgb(fin.h, fin.s, fin.b);
		outputBox.style.background = 'rgb('+rgb[0]+','+rgb[1]+','+rgb[2]+')';
	}, 20);

	document.getElementById('initButton').onclick = function() {
		current = {hue: 0, saturation: 0, brightness: 0};
		mathjs.eval(initEq.value, current);
	}
	loadLast.onclick = function() {
		var filePath = dialog.showOpenDialog({});
		console.log(filePath);
		var res = fs.readFileSync(filePath[0]);
		data = JSON.parse(res);
		projname.value = data.name;
		initEq.value = data.initEquation;
		brightnessEq.value = data.equation;
		hue.value = data.hue;
		saturation.value = data.saturation;
		brightness.value = data.brightness;
		if (data.saturationBoost > 0) saturation.value = data.saturationBoost+100;
		if (data.brightnessBoost > 0) brightness.value = data.brightnessBoost+100;
		player.src = data.video;
	};
	function updateData() {
		data.name = projname.value;
		data.initEquation = initEq.value;
		data.equation = brightnessEq.value;
		data.hue = hue.value;
		data.saturation = saturation.value;
		if (data.saturation > 100) data.saturation = 100;
		data.saturationBoost = saturation.value-100;
		if (data.saturationBoost < 0) data.saturationBoost = 0;
		data.brightness = brightness.value;
		if (data.brightness > 100) data.brightness = 100;
		data.brightnessBoost = brightness.value-100;
		if (data.brightnessBoost < 0) data.brightnessBoost = 0;
	}
	saveLast.onclick = function() {
		var filePath = dialog.showSaveDialog({});
		console.log(filePath);
		updateData();
		var jso = JSON.stringify(data, null, 2);
		fs.writeFileSync(filePath, jso);
		
		var tempVid = data.video;
		data.video = undefined;
		jso = JSON.stringify(data, null, 2);
		fs.writeFileSync(filePath+'.mini', jso);
		data.video = tempVid;
	};
	uploadbutton.onclick = function() {
		updateData();
		var tempVid = data.video;
		data.video = undefined;
		jso = JSON.stringify(data, null, 2);
		request('http://192.168.0.1:8000/load', function(){}, jso);
		data.video = tempVid;
	}
	clear.onclick = function() {
		player.src = data.video = undefined;
		data.sequence = [];
		current.brightness = current.saturation = current.hue = data.brightness = data.saturation = data.hue = 0;
	};
	reset.onclick = function() {
		brightness.value = saturation.value = 100;
		hue.value = 0;
	};
	inputvideo.onchange = function() {
		//data.video = URL.createObjectURL(inputvideo.files[0]);
		//player.src = data.video;
		var file = inputvideo.files[0];
		var reader  = new FileReader();
		reader.addEventListener("load", function () {
			player.src = data.video = reader.result;
		}, false);
		if (file) {
			reader.readAsDataURL(file);
		}
	};

	request('http://192.168.0.1:8000/list', function(res) {
		var clips = JSON.parse(res.responseText);
		for (let c of clips) {
			c = c.split('.')[0];
			var el = document.createElement('input');
			el.setAttribute('type', 'button');
			el.setAttribute('value', c);
			el.onclick = function () {
				request('http://192.168.0.1:8000/play?name='+c);
			};
			mainarea.appendChild(el);
		}
	});
};

function clamp(value, min, max) {
	value = Math.min(max, Math.max(min, value));
}
function request(url, callback, sendData) {
	var req = new XMLHttpRequest();
	req.onreadystatechange = function() {
	  if (req.readyState == 4 && req.status == 200) {
	    callback(req);
	  }
	};
	if (arguments.length === 2) {
	  req.open('GET', url, true);
	  req.send();
	} else if (arguments.length === 3) {
	  req.open('POST', url, true);
	  req.send(sendData);
	}
}

/*var darr = [];
var app = require('electron').remote; 
var fs = require('fs');

var dialog = app.dialog;
dialog.showOpenDialog((fileNames) => {
vid.setAttribute('src', fileNames);
});

var context = can.getContext('2d');

var DMX = require('dmx');
var dmx = new DMX();

var universe;
vid.addEventListener('play', function(){
	console.log('reset');
	darr = [];
	universe = dmx.addUniverse('lightName', 'artnet', devip.value||'2.2.2.1');
	//var universe = dmx.addUniverse('lightName', 'null')
	//can.width = vid.videoWidth/2; can.height = vid.videoHeight/2;
	can.width = can.height = 200;
	can.style.width = '50px'; can.style.height = '50px';
	draw(this,context,can.width,can.height);
},false);

function draw(v,c,w,h) {
	if(v.paused || v.ended) return false;
	c.drawImage(v,0,0,w,h);
	var r = channel.value/1;
	var g = r+1; var b = r+2;
	var pxl = context.getImageData(50, 50, 100, 100).data;
	var tot = [0,0,0];
	for (var i=0; i<40000; i+=4) {
	tot[0] += pxl[i];
	tot[1] += pxl[i+1];
	tot[2] += pxl[i+2];
	}
	//console.log(pxl);
	var ref = {};
	tot[0] = tot[0]/10000;
	tot[1] = tot[1]/10000;
	tot[2] = tot[2]/10000;
	ref[r] = tot[0]/10000;
	ref[g] = tot[1]/10000;
	ref[b] = tot[2]/10000;
	console.log(convert.rgb.hsl(tot[0], tot[1], tot[2]));
	var hsl = convert.rgb.hsl(tot[0], tot[1], tot[2]);
	darr.push([hsl[0], hsl[1]*2.55, hsl[2]*2.55]);
	setTimeout(draw,33,v,c,w,h);
	universe.update(ref);
}

todevice.onclick = function() {
	var jso = JSON.stringify(darr);
	fs.writeFileSync('save.json', jso);
	request('http://192.168.1.76/load', function(){}, jso);
	console.log(darr);
};*/