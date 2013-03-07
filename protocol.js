var crc = require('buffer-crc32');

module.exports = {
	decode_pkt: decode_pkt,
	encode_msg: encode_msg,
	gen_msg: gen_msg
};

// these come from libhdhomerun/hdhomerun_pkt.h
HDHOMERUN_TYPE_DISCOVER_REQ = 0x0002
HDHOMERUN_TYPE_DISCOVER_RPY = 0x0003
HDHOMERUN_TYPE_GETSET_REQ = 0x0004
HDHOMERUN_TYPE_GETSET_RPY = 0x0005
HDHOMERUN_TAG_DEVICE_TYPE = 0x01
HDHOMERUN_TAG_DEVICE_ID = 0x02
HDHOMERUN_TAG_GETSET_NAME = 0x03
HDHOMERUN_TAG_GETSET_VALUE = 0x04
HDHOMERUN_TAG_GETSET_LOCKKEY = 0x15
HDHOMERUN_TAG_ERROR_MESSAGE = 0x05
HDHOMERUN_TAG_TUNER_COUNT = 0x10
HDHOMERUN_DEVICE_TYPE_WILDCARD = 0xFFFFFFFF
HDHOMERUN_DEVICE_TYPE_TUNER = 0x00000001
HDHOMERUN_DEVICE_ID_WILDCARD = 0xFFFFFFFF

// shorthand versions of the above constants
var types = {
	disc_req: HDHOMERUN_TYPE_DISCOVER_REQ,
	disc_rpy: HDHOMERUN_TYPE_DISCOVER_RPY,
	getset_req: HDHOMERUN_TYPE_GETSET_REQ,
	getset_rpy: HDHOMERUN_TYPE_GETSET_RPY
}

var tags = {
	device_type: { value: HDHOMERUN_TAG_DEVICE_TYPE, size: 4 },
	device_id: { value: HDHOMERUN_TAG_DEVICE_ID, size: 4 },
	getset_name: { value: HDHOMERUN_TAG_GETSET_NAME, size: undefined },
	getset_value: { value: HDHOMERUN_TAG_GETSET_VALUE, size: undefined },
	getset_lockkey: { value: HDHOMERUN_TAG_GETSET_LOCKKEY, size: 4 },
	error_message: { value: HDHOMERUN_TAG_ERROR_MESSAGE, size: undefined },
	tuner_count: { value: HDHOMERUN_TAG_TUNER_COUNT, size: 1 }
}

var dev_values = {
	device_type_tuner: HDHOMERUN_DEVICE_TYPE_TUNER,
	device_type_any: HDHOMERUN_DEVICE_TYPE_WILDCARD,
	device_id_any: HDHOMERUN_DEVICE_ID_WILDCARD
}

function encode_msg(msg) {
	// XXX: need some kind of error handling here

	var pkt = new Buffer(3072); // max buffer size from libhdhomerun
	var pos = 0;

	pkt.writeUInt16BE(msg.type, 0);  pos += 2;
	// leave room for the length
	pos += 2;

	Object.keys(msg).forEach(function (field) {
		if (field === 'type') {
			return;
		}
		pos = encode_tlv({ tag: field, value: msg[field] }, pkt, pos);
	});

	// trim buffer to size; leave room for checksum
	pkt = pkt.slice(0, pos + 4);

	// write packet size to header
	pkt.writeUInt16BE(pkt.length - 8, 2);

	var cksum = crc.unsigned(pkt.slice(0, pkt.length - 4));
	pkt.writeUInt32LE(cksum, pkt.length - 4);

	return (pkt);
}


function decode_pkt(pkt) {
	var tag, tag_len, tag_val;
	var pos = 0;
	var msg = {};

	var pkt_type = pkt.readUInt16BE(pos); pos += 2;
	var pkt_len = pkt.readUInt16BE(pos); pos += 2;

	msg.type = pkt_type;

	while (pos < (pkt_len + 4)) {
		tag = pkt.readUInt8(pos); pos += 1;
		tag_len = decode_varlen(pkt.slice(pos, pos + 2));
		(tag_len < 128) ? pos += 1 : pos += 2;

		switch (tag) {
		case (tags.device_type.value):
			var devtype = pkt.readUInt32BE(pos); pos += tag_len;
			(devtype == HDHOMERUN_DEVICE_TYPE_TUNER) ?
			    msg.device_type = 'tuner' :
			    msg.device_type = 'unknown';
			break;
		case (tags.device_id.value):
			var devid = pkt.readUInt32BE(pos); pos += tag_len;
			msg.device_id = devid.toString(16).toUpperCase();
			break;
		case (tags.tuner_count.value):
			var count = pkt.readUInt8(pos); pos += tag_len;
			msg.tuner_count = count;
			break;
		case (tags.getset_name.value):
			var gs_name = pkt.toString('ascii', pos, pos +
			    tag_len - 1);
			pos += tag_len;
			msg.getset_name = gs_name;
			break;
		case (tags.getset_value.value):
			var gs_val = pkt.toString('ascii', pos, pos +
			    tag_len - 1);
			pos += tag_len;
			msg.getset_value = gs_val;
			break;
		case (tags.getset_lockkey.value):
			var lockkey = pkt.readUInt32BE(pos); pos += tag_len;
			msg.lockkey = lockkey.toString(10).toUpperCase();
			break;
		case (tags.error_message.value):
			var err_msg = pkt.toString('ascii', pos, pos +
			    tag_len - 1);
			pos += tag_len;
			msg.error_message = err_msg;
			break;
		default:
			throw new Error('unknown tag type: ' + tag);
		}
	}

	return (msg);
}

function gen_msg(conf) {
	var msg = {};
	switch (conf.type) {
	case ('discover'):
		msg.type = types.disc_req;
		msg.device_type = dev_values.device_type_tuner;
		msg.device_id = conf.device_id || dev_values.device_id_any;
		return (msg);
	case ('getset'):
		msg.type = types.getset_req;
		msg.getset_name = conf.get || conf.set;
		if (conf.set)
			msg.getset_value = conf.value;

		return (msg);
	default:
		throw new Error('unsupported message type');
	}
}

function encode_varlen(length) {
	var varlen, tmpbuf;
	if (length <= 127) {
		varlen = new Buffer(1);
		varlen.writeUInt8(length, 0);
		return (varlen);
	} else {
		varlen = new Buffer(2);
		tmpbuf = new Buffer(2);
		tmpbuf.writeUInt16BE(length, 0);

		varlen[0] = 0x80 | tmpbuf[1];
		varlen[1] = (tmpbuf[0] << 1) | (tmpbuf[1] >> 7);

		return (varlen);
	}
}

function decode_varlen(varlen) {
	var tmpbuf;
	var fb;
	var length;

	fb = varlen.readUInt8(0);

	if (fb <= 127) {
		return (fb);
	} else {
		tmpbuf = new Buffer(2);
		tmpbuf[1] = (varlen[0] & 0x7f) | (varlen[1] << 7);
		tmpbuf[0] = varlen[1] >> 1;

		length = tmpbuf.readUInt16BE(0);
		return (length);
	}
}


function encode_tlv(tlv_obj, buf, offset) {
	// write the tag
	buf.writeUInt8(tags[tlv_obj.tag].value, offset);  offset += 1;

	if (tags[tlv_obj.tag].size) {
		buf.writeUInt8(tags[tlv_obj.tag].size, offset);  offset += 1;
	}

	switch (tags[tlv_obj.tag].value) {
	case (tags.device_type.value):
	case (tags.device_id.value):
	case (tags.getset_lockkey.value):
		buf.writeUInt32BE(tlv_obj.value, offset);
		offset += 4;
		return (offset);
		break;
	case (tags.tuner_count.value):
		buf.writeUInt8(tlv_obj.value, offset);
		offset += 1;
		return (offset);
		break;
	case (tags.getset_name.value):
	case (tags.getset_value.value):
		var tmpbuf = new Buffer(tlv_obj.value, 'ascii');
		var tmplen = tmpbuf.length;
		var varlen = encode_varlen(tmplen);
		tmpbuf = Buffer.concat([varlen, tmpbuf]);
		tmpbuf.copy(buf, offset);
		offset += tmpbuf.length;
		return (offset);
	default:
		throw new Error('cannot encode tag type ' +
		    tags[tlv_obj.tag].value);
	}
}
