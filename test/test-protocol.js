var nodeunit = require('nodeunit');
var util = require('util');
var proto = require('../protocol');

exports['parse a discover request pkt'] = function (test) {
	var pkt = proto.encode_msg({type: proto.types.getset_req, getset_name:
	    '/sys/version'});
	var msg = {};
	test.ok(proto.decode_pkt(pkt, msg), 'decode returns true');
	test.equal(msg.type, proto.types.getset_req);
	test.equal(msg.getset_name, '/sys/version');
	test.done();
};

