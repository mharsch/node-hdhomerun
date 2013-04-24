var Writable = require('stream').Writable;
var util = require('util');
var proto = require('./functions.js');

function ReplyDecoder() {
	Writable.call(this);

	this._buf = null;
	this._msg = null;
};

util.inherits(ReplyDecoder, Writable);

ReplyDecoder.prototype._write = function _write(buf, encoding, cb) {
	var msg;
	var self = this;

	if (this._buf) {
		var len = this._buf.length + buf.length;
		buf = Buffer.concat([this._buf, buf], len);
	}

	msg = this._msg || {};

	while (buf.length > 0) {
		if (!proto.decode_pkt(buf, msg)) {
			this._buf = buf;
			this._msg = msg;
			cb();
			return;
		}

		// checksum verification here

		this.emit('reply', msg);

		buf = buf.slice(msg._offset);
		msg = {};
	}

	this._buf = null;
	this._msg = null;
	cb();

};

module.exports = {
	ReplyDecoder: ReplyDecoder
}
