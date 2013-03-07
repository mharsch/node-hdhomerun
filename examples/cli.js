#!/usr/bin/env node

/*
 * This script implements a node.js/JavaScript version of the hdhomerun_config
 * utility that ships with the libhdhomerun C library.
 */

var hdhr = require('../index.js');
var util = require('util');
var fs = require('fs');
var channelscan = require('./channelscan.js');
var vidstream = require('./vidstream.js');

var argv = process.argv;
var argc = argv.length - 2;

function usage() {
	console.log('Usage:\n' +
	    '\tcli.js discover\n' +
	    '\tcli.js <id> get help\n' +
	    '\tcli.js <id> get <item>\n' +
	    '\tcli.js <id> set <item> <value>\n' +
	    '\tcli.js <id> scan <tuner> [<filename>]\n' +
	    '\tcli.js <id> save <tuner> [<filename>]\n');
	process.exit(0);
}

if ((argc == 0) || (argv[2].match(/^[-]*help/)))
	usage();

if (argv[2] == 'discover') {
	hdhr.discover(function (err, res) {
		if (err) throw new Error('discover error');

		res.forEach(function (dev) {
			console.log('hdhomerun device %s found at %s',
			    dev.device_id, dev.device_ip);
		});
		process.exit(0);
	});
} else if (argv[2].match(/^[0-9a-fA-F]{8}$/)) {
	hdhr.discover(argv[2], function (err, res) {
		if (err) throw err;

		var device = hdhr.create(res[0]);

		switch (argv[3]) {
		case ('get'):
			device.get(argv[4], function (err, res) {
				if (err) throw err;

				console.log(res.value)
				process.exit(0);
			});
			break;
		case ('set'):
			device.set(argv[4], argv[5], function (err, res) {
				if (err) throw err;

				process.exit(0);
			});
			break;
		case ('scan'):
			if (argv[4]) {
				var scanner = channelscan.create(
				    {device: device, tuner: argv[4]});
				scanner.on('found', function (channel) {
					console.log('--- channel found ---');
					console.log(channel.status);
					console.log(channel.streaminfo);
				});
				scanner.on('done', function (num_found) {
					console.log('found %d channels',
					    num_found);
					process.exit(0);
				});
				scanner.scan();
			} else {
				usage();
			}
			break;
		case ('save'):
			if (argv[4] && argv[5]) {
				var outfile = fs.createWriteStream(argv[5]);
				var progress = 0;
				vidstream.start(device, argv[4]).on('message',
				    function (msg, rinfo) {
					outfile.write(msg);
					if (progress >= 2000000) {
						progress = 0;
						util.print('.');
					} else {
						progress += msg.length
					}
				});
				process.on('SIGINT', function () {
					vidstream.stop(device, argv[4],
					    function () {
						outfile.end();
						console.log('%d bytes received',
						    outfile.bytesWritten);
						process.exit(0);
					});
				});
			} else {
				usage();
			}
			break;
		default:
			usage();
		}
	});
} else {
	usage();
}
