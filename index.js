var util = require('util');
var Device = require('./Device.js');
var discover = require('./discover.js');

module.exports = {
	create: _create,
	discover: discover
};

function _create(conf) {
	if (typeof (conf) === 'object') {
		return (new Device(conf));
	} else {
		throw new Error('invalid create() argument:' +
		    util.inspect(conf));
	}
}
