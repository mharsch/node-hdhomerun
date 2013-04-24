var dgram = require('dgram');
var proto = require('./protocol');
var util = require('util');

module.exports = function (search_id, cb) {
	if ((arguments.length == 1) && (typeof (search_id) == 'function')) {
		var cb = search_id;
		search_id = null;
	} else if ((arguments.length != 2) ||
	    (typeof (search_id) !== 'string') ||
	    (typeof (cb) !== 'function')) {
		throw new Error('invalid discover() args');
	}

	var limit = 64;

	var err = null;
	var found = [];
	var disc_pkt, disc_msg;
	var disc_obj;
	var timer;

	var sock = dgram.createSocket('udp4', function (pkt, remote) {
		var disc_obj = {};
		if (!proto.decode_pkt(pkt, disc_obj)) {
			console.log('bogus reply message');
		}
		delete disc_obj.type;

		disc_obj.device_ip = remote.address;

		if (search_id) {
			if (search_id == disc_obj.device_id)
				found.push(disc_obj);
		} else {
			found.push(disc_obj);
		}

		if ((found.length >= limit) ||
		    (disc_obj.device_id == search_id)) {
			clearTimeout(timer);
			sock.close();
			cb(err, found);
		}
	});

	timer = setTimeout(function () {
		sock.close();
		cb(err, found);
	}, 500);

	disc_msg = {
		type: proto.types.disc_req,
		device_type: proto.dev_values.device_type_tuner,
		device_id: (search_id) ? parseInt(search_id, 16) :
                    proto.dev_values.device_id_any
	};

	disc_pkt = proto.encode_msg(disc_msg);

	sock.on('listening', function () {
		sock.setBroadcast(true);
		sock.send(disc_pkt, 0, disc_pkt.length, 65001, '255.255.255.255',
		    function (err, bytes) {
			if (err) throw new Error('problem sending discover req');
		});
	});
	sock.bind();
}
