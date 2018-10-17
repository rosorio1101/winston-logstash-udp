/**
 * (C) 2013 Sazze, Inc.
 * MIT LICENCE
 *
 * Based on a gist by mbrevoort.
 * Available at: https://gist.github.com/mbrevoort/5848179
 *
 * Inspired by winston-logstash
 * Available at: https://github.com/jaakkos/winston-logstash
 */

// Really simple Winston Logstash UDP Logger

var dgram = require('dgram'),
    util = require('util'),
    os = require('os'),
    Transport = require('winston-transport');

exports.LogstashUDP = class LogstashUDP extends Transport {
    constructor(options) {
        super(options)

        options = options || {};

        this.name = 'logstashUdp';
        this.level = options.level || 'info';
        this.localhost = options.localhost || os.hostname();
        this.host = options.host || (options.udpType === 'udp6' ? '::1' : '127.0.0.1');
        this.port = options.port || 9999;
        this.application = options.appName || process.title;
        this.pid = options.pid || process.pid;
        this.trailingLineFeed = options.trailingLineFeed === true;
        this.trailingLineFeedChar = options.trailingLineFeedChar || os.EOL;
        this.udpType = options.udpType === 'udp6' ? 'udp6' : 'udp4';

        this.client = null;

        this.connect();
    }

    connect() {
        this.client = dgram.createSocket(this.udpType);

        // Attach an error listener on the socket
        // It can also avoid top level exceptions like UDP DNS errors thrown by the socket
        this.client.on('error', function (err) {
            // in node versions <= 0.12, the error event is emitted even when a callback is passed to send()
            // we always pass a callback to send(), so it's safe to do nothing here
        });

        if (this.client.unref) {
            this.client.unref();
        }
    }

    log(info, callback) {
        var self = this;

        info.application = self.application;
        info.serverName = self.localhost
        info.pid = self.pid

        if (this.trailingLineFeed === true) {
            info = JSON.stringify(info).replace(/\s+$/, '') + this.trailingLineFeedChar;
        } else {
            info = JSON.stringify(info);
        }

        try {
            var buf = Buffer.from(info);
        } catch (e) {
            console.log(e);
        }

        callback = (callback || function () { });

        self.client.send(buf, 0, buf.length, self.port, self.host, callback);
    }
}
