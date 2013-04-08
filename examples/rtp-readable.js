var Readable = require('stream').Readable;
var util = require('util');
var assert = require('assert');

function RTPStream(socket) {
	if (!(this instanceof RTPStream))
		return (new RTPStream(socket));

	Readable.call(this);

	var self = this;

	this._source = socket;
	this._inbox = [];

	this._source.on('message', function (msg, rinfo) {
		self._inbox.push(msg);
		self.read(0);
	});

	this._source.on('close', function () {
		self.push(null);
	});

	this._sequence = 0xFFFF;
	this.sequence_errors = 0;

};

util.inherits(RTPStream, Readable);

RTPStream.prototype._read = function (n) {
	if (this._inbox.length == 0) {
		this.push('');
		return;
	}

	while (this._inbox.length > 0) {
		var pkt = this._inbox.shift();
		var prev = this._sequence;
		this._sequence = pkt.readUInt16BE(2);

		if ((this._sequence !== (prev + 1)) && (prev !== 0xFFFF)) {
			this.sequence_errors++;
			this.emit('error', new Error('RTP Sequence error'));
		}

		// peel off rtp header and pass on the rest
		if (!this.push(pkt.slice(12))) {
			break;
		}
	}
};

module.exports = {
	RTPStream: RTPStream,
	createRTPStream: function createRTPStream(socket) {
		return (new RTPStream(socket));
	}
}
