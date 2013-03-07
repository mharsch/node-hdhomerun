var dgram = require('dgram');
var proto = require('./protocol.js');

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
		disc_obj = proto.decode_pkt(pkt);
		// XXX: add error checking

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

	disc_msg = proto.gen_msg({type: 'discover', device_id:
	    parseInt(search_id, 16)});
	disc_pkt = proto.encode_msg(disc_msg);

	sock.send(disc_pkt, 0, disc_pkt.length, 65001, '255.255.255.255',
	    function (err, bytes) {
		if (err) throw new Error('problem sending discover req dgram');
	});
}
