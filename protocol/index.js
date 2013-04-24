var RequestEncoder = require('./request_encoder.js').RequestEncoder;
var ReplyDecoder = require('./reply_decoder.js').ReplyDecoder;

module.exports = {
	RequestEncoder: RequestEncoder,
	ReplyDecoder: ReplyDecoder
};

var proto = require('./protocol.js');
Object.keys(proto).forEach(function (k) {
	module.exports[k] = proto[k];
});

var funcs = require('./functions.js');
Object.keys(funcs).forEach(function (f) {
	module.exports[f] = funcs[f];
});
