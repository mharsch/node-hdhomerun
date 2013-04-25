var nodeunit = require('nodeunit');
var util = require('util');
var proto = require('../protocol');

exports['parse a control request pkt'] = function (test) {
	var pkt = proto.encode_msg({type: proto.types.getset_req, getset_name:
	    '/sys/version'});
	var msg = {};
	test.ok(proto.decode_pkt(pkt, msg), 'decode returns true');
	test.equal(msg.type, proto.types.getset_req);
	test.equal(msg.getset_name, '/sys/version');
	test.done();
};

exports['parse a control reply pkt'] = function (test) {
	var pkt = proto.encode_msg({type: proto.types.getset_rpy, getset_name:
	    '/sys/model', getset_value: 'hdhomerun3_atsc'});
	var msg = {};
	test.ok(proto.decode_pkt(pkt, msg, 'decode returns true'));
	test.equal(msg.type, proto.types.getset_rpy);
	test.equal(msg.getset_name, '/sys/model');
	test.equal(msg.getset_value, 'hdhomerun3_atsc');
	test.done();
};

exports['parse a discover request pkt'] = function (test) {
	var pkt = proto.encode_msg({
	    type: proto.types.disc_req,
	    device_type: proto.dev_values.device_type_tuner,
	    device_id: proto.dev_values.device_id_any
	});
	var msg = {};
	test.ok(proto.decode_pkt(pkt, msg, 'decode returns true'));
	test.equal(msg.type, proto.types.disc_req);
	test.equal(msg.device_type, 'tuner');
	test.equal(msg.device_id, proto.dev_values.device_id_any.toString(16).toUpperCase());
	test.done();
};

exports['parse a discover reply pkt'] = function (test) {
	var pkt = proto.encode_msg({
	    type: proto.types.disc_rpy,
	    device_type: proto.dev_values.device_type_tuner,
	    device_id: 0x1038A145,
	    tuner_count: 2
	});
	var msg = {};
	test.ok(proto.decode_pkt(pkt, msg, 'decode returns true'));
	test.equal(msg.type, proto.types.disc_rpy);
	test.equal(msg.device_type, 'tuner');
	test.equal(msg.device_id, '1038A145');
	test.equal(msg.tuner_count, 2);
	test.done();
};

exports['stream a request'] = function (test) {
	var encoder = new proto.RequestEncoder();

	encoder.on('readable', function onReadable() {
		var buf = encoder.read();
		test.ok(buf);
		var msg = {};
		test.ok(proto.decode_pkt(buf, msg));
		test.equal(msg.type, proto.types.getset_req);
		test.equal(msg.getset_name, '/sys/version');
		test.done();
	});
		
	var msg1 = {
		type: proto.types.getset_req,
		getset_name: '/sys/version'
	};

	encoder.send(msg1);
};

exports['stream a reply'] = function (test) {
	var encoder = new proto.RequestEncoder();
	var decoder = new proto.ReplyDecoder();

	var msg1 = {
		type: proto.types.getset_req,
		getset_name: '/sys/model'
	};

	decoder.on('reply', function (msg2) {
		test.ok(msg2);
		test.equal(msg2.type, proto.types.getset_req);
		test.equal(msg2.getset_name, '/sys/model');
		test.done();
	});

	encoder.pipe(decoder);
	encoder.send(msg1);
};

exports['receive reply from chunks'] = function (test) {
	var decoder = new proto.ReplyDecoder();

	decoder.on('reply', function (msg2) {
		test.ok(msg2);
		test.equal(msg2.type, proto.types.getset_req);
		test.equal(msg2.getset_name, '/sys/model');
		test.done();
	});

	var msg1 = {
		type: proto.types.getset_req,
		getset_name: '/sys/model',
		getset_value: 'hdhomerun3_atsc'
	};

	var pkt = proto.encode_msg(msg1);

	for (var i = 0; i < pkt.length; i++)
		decoder.write(pkt.slice(i, i + 1));
};
