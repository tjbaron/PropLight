
var fs = require('fs');
var http = require('http');
var url = require('url');
var connect = require('connect')();
let convert = require('color-convert');
let mathjs = require('mathjs');

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

var save = null;
try {
	save = fs.readFileSync('save.json', 'utf8');
	save = JSON.parse(save);
} catch (e) {
	console.error('Parse Error');
	save = null;
}

const DMX = require( 'dmx4pi' )({
	pinTx: 27,
	pinEn: 21,
	invTx: false,
    invEn: false
});

var app = http.createServer(connect);

/*var settings = {h: 0, s: 255, l: 255};
connect.use('/set', function(req, res, next) {
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;

	res.setHeader("Content-Type", "text/plain");
	settings.h = query.h/1;
	settings.s = query.s/1;
	settings.l = query.l/1;
	if (save === null) {
		let data = Buffer.from([settings.l, 128, 0, 0, settings.h, settings.s]);
		DMX.transmit(data);
	}
	res.end('OK');
});*/

connect.use('/load', function(req, res, next) {
	var body = '';
	req.on('data', function (data) {
	    body += data;
	    if (body.length > 1e7) // 10 mb
	        request.connection.destroy();
	});
	req.on('end', function () {
		save = JSON.parse(body);
		fs.writeFileSync('save.json', body);
		if (save.name) fs.writeFileSync(save.name+'.json', body);
		res.end('OK');
	});
});

connect.use('/play', function(req, res, next) {
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;
	fs.readFileSync(query.name+'.json');
	res.end('OK');
});

connect.use('/list', function(req, res, next) {
	var d = fs.readdirSync('./');
	var files = [];
	for (var f of d) {
		var pts = f.split('.');
		if (pts[pts.length-1] === 'json' && pts !== 'package.json') files.push(f);
	}
	res.end(JSON.stringify(files));
});

/*connect.use('/', function(req, res, next) {
	res.setHeader("Content-Type", "text/html");
	res.end(fs.readFileSync('www/index.html'));
});*/

var frame = 0;
var current = {hue: 0, saturation: 0, brightness: 0};
setInterval(function() {
	if (save === null) return;

	if (save.sequence.length > 0) {
		frame++;
		if (frame >= save.sequence.length) frame = 0;
		current.hue = save.sequence[frame][0];
		current.saturation = save.sequence[frame][1];
		current.brightness = save.sequence[frame][2];
	}
	current.time = (new Date()).getTime()/1000;
	try {
		var res = mathjs.eval(save.equation, current);
		for (var e in current) {
			if (typeof(current[e]) !== 'number') current[e] = 0;
		}
	} catch(e) {}
	var fin = {};
	fin.h = current.hue + (save.hue/1);
	fin.b = current.brightness * (save.brightness/100);
	fin.b = fin.b + ((100-fin.b) * (save.brightnessBoost/100));
	fin.s = current.saturation * (save.saturation/100);
	fin.s = fin.s + ((100-fin.s) * (save.saturationBoost/100));
	fin.h = fin.h%360;
	while (fin.h < 0) fin.h += 360;
	while (fin.h > 360) fin.h -= 360;
	if (fin.s < 0) fin.s = 0;
	if (fin.s > 100) fin.s = 100;
	if (fin.b < 0) fin.b = 0;
	if (fin.b > 100) fin.b = 100;
	
	let data = Buffer.from([Math.floor(fin.b*2.55), 128, 0, 0, Math.floor(fin.h*(255/360)), Math.floor(fin.s*2.55)]);
	DMX.transmit(data);
}, 34);

app.listen(8000);
