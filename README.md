#hdhomerun

Control your [SiliconDust](http://www.silicondust.com) HDHomeRun network-attached digital TV tuner from node.js.  This module provides a JavaScript interface to discover devices, and to get and set device control variables.  While not a complete solution in itself, hdhomerun provides the low-level functionality necessary to build higher level tools and applications (such as DVR).  Users of hdhomerun will certainly want to refer to [libhdhomerun](http://github.com/mharsch/libhdhomerun) (the C library provided by the manufacturer) for details on how the low-level get/set API can be used to implement higher-level functionality.  See [examples/cli.js](examples/cli.js) for a node version of the libhdhomerun 'hdhomerun\_config' CLI utility.  

##Installation:

	npm install hdhomerun

##Usage:

Use the discover() method to find devices on the local network:
```javascript
var hdhr = require('hdhomerun');

hdhr.discover(function (err, res) {
	console.log(res);
});
> [ { device_id: '1038A145',
device_type: 'tuner',
tuner_count: 2,
device_ip: '192.168.2.123' } ]
```

Now create a device object:
```javascript
var device = hdhr.create({device_id: '1038A145',
    device_ip: '192.168.2.123'});
```

Using the device object, you can get and set named control variables:
```javascript
device.get('/sys/model', function (err, res) {
	console.log(res);
});
> { name: '/sys/model', value: 'hdhomerun3_atsc' }
```

Control variables are used to interact with the device.  Most importantly, they let you change channels and initiate a video stream:
```javascript
device.set('/tuner0/channel', 'auto:9', function (err, res) {
	console.log(res);
});
> { name: '/tuner0/channel', value: 'auto:9' }

device.get('/tuner0/streaminfo', ...
> 1: 9.1 KUSA-DT
> 2: 9.2 9News N
> tsid=0x01CF

device.set('/tuner0/program', 1, ...
device.get('/tuner0/status', ...
> value: 'ch=auto:9 lock=8vsb ss=92 snq=77 seq=100 bps=19394080 pps=0'

device.set('/tuner0/target', 'udp://localhost:54321', ...
> // Now MPEG2 data is streaming to the specified host/port
```

##API:

### discover([search\_id], callback)
* `search_id` {String} Optional device\_id of device we wish to discover
* `callback` {Function} Callback function
    * `err` {Error Object} not yet implemented
    * `found` {Array} Array of discovered device objects
The `found` array contains objects representing discovered devices.  Each
object contains the following fields:
        * `device_id` {String}
        * `device_type` {String} Will always be 'tuner'
        * `tuner_count` {Number} number of tuners in the device
        * `device_ip` {String} IP address of the device

When called without a `search_id` argument, discover() will accept responses from all devices on the local network that respond to it's broadcast request within the timeout period (currently 500ms).  

If `search_id` is specified, only a matching device will respond to the broadcast.  Once a matching response is received, callback() is immediately called.

### create(conf)
* `conf` {Object}
    * `device_id` {String}
    * `device_ip` {String}
* Returns: {Object} new Device object

### Class: Device
Device objects maintain a TCP connection with their corresponding physical device.  This control socket is used to send get/set messages and receive responses.  Device instances initiate the control socket connection immediately and emit `connected` when the connection is ready.  

### Device.get(variable, callback)
* `variable` {String} named control variable to retrieve
* `callback` {Function} called when a response from the device arrives
    * `err` {Error Object}
    * `res` {Object} response object with the following members:
        * `name` {String} the requested control variable
        * `value` {String} the value of the requested variable

### Device.set(variable, value, callback)
* `variable` {String} named control variable to set
* `value` {String} value to set the control variable
* `callback` {Function} called when a response from the device arrives
    * `err` {Error Object}
    * `res` {Object} response object with the following members:
        * `name` {String} the requested control variable
        * `value` {String} the (updated) value of the requested variable

##Examples:

[examples/cli.js](examples/cli.js) implements (roughly) the same functionality as [libhdhomerun](http://github.com/mharsch/libhdhomerun) 'hdhomerun\_config'.  This toy program demonstrates how one could implement common functionality such as channel scanning and saving video streams (in a node-y way).  

##Testing:

Currently, an actual HDHomeRun device is required to execute the tests.  Set an environment variable 'MY\_HDHR' to the device\_id (aka serial #) of your local device before running 'npm test'.  

##Supported Devices

* HDHR3-US (Dual Tuner ATSC)

##TODO:

* proper tests
* additional device support
* more complete and standardized error handling

##License:
MIT.
