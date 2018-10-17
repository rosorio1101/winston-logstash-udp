process.env.NODE_ENV = 'test';

var chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = chai.expect,
    dgram = require('dgram'),
    winston = require('winston'),
    timekeeper = require('timekeeper'),
    os = require('os'),
    common = require('winston/lib/winston/common'),
    freezed_time = new Date(1330688329321),
    LogstashUDP = require('../lib/winston-logstash-udp'),
    testingPort = 9988
    ;

chai.config.includeStack = true;
chai.should();
chai.use(sinonChai);

const sampleData = {"stream":"sample","level":"info","message":"hello world","application":"test","serverName":"localhost","pid":12345};

describe('winston-logstash-udp transport', function () {
    var test_server, commonLogStored, port = testingPort;

    function createTestServer(port, onMessage, udpType) {
        udpType = udpType || 'udp4';
        var server = dgram.createSocket(udpType);

        server.on("error", function (err) {
            console.log("server error:\n" + err.stack);
            server.close();
        });

        server.on("message", onMessage);

        server.on("listening", function () {
            var address = server.address();
            console.log("server listening " +
                address.address + ":" + address.port);
        });

        server.bind(port);

        return server;
    }

    function createLogger(port, options) {
        var defaultOptions = {
            port: port,
            appName: 'test',
            localhost: 'localhost',
            pid: 12345
        },
        options = options || {},
        field;

        for (field in defaultOptions) {
            if (defaultOptions.hasOwnProperty(field) && !options.hasOwnProperty(field)) {
                options[field] = defaultOptions[field];
            }
        }

        return  winston.createLogger(
            {
                transports: new LogstashUDP.LogstashUDP(options)
            }
        );
    }

    describe('with logstash server (udp4)', function () {
        var test_server, port = testingPort;

        beforeEach(function (done) {
            timekeeper.freeze(freezed_time);
            done();
        });

        it('send logs over UDP as valid json', function (done) {
            var response;
            var logger = createLogger(port);
            var expected = {"stream": "sample", "application": "test", "serverName": "localhost", "pid": 12345, "level": "info", "message": "hello world"};

            test_server = createTestServer(port, function (data) {
                response = JSON.parse(data);
                expect(response).to.be.eql(expected);
                done();
            });

            logger.log('info', 'hello world', {stream: 'sample'});
        });

        describe('with the option \'trailing line-feed\' on', function () {

            before(function () {
                commonLogStored = common.log;
                common.log = sinon.stub().returns('{"what":"ever"}' + "\r\n\t ");
            });

            it('remove all trailing blank characters and replace them with the operating system\'s EOL character', function (done) {
                var logger = createLogger(
                    port,
                    {
                        trailingLineFeed: true
                    }
                );

                common.log = sinon.stub().returns('{"what":"ever"}' + "\r\n\t ");

                test_server = createTestServer(port, function (data) {
                    expect(data.toString()).to.be.eql(expect + os.EOL);
                    done();
                });

                logger.log('info', 'hello world', {stream: 'sample'});
            });

            it('if set in the options, remove all trailing blank characters and replace them with a custom character', function (done) {
                var logger = createLogger(
                    port,
                    {
                        trailingLineFeed: true,
                        trailingLineFeedChar: os.EOL + "\n"
                    }
                );

                test_server = createTestServer(port, function (data) {
                    expect(data.toString()).to.be.eql(sampleData + os.EOL + "\n");
                    done();
                });

                logger.log('info', 'hello world', {stream: 'sample'});
            });

            after(function () {
                common.log = commonLogStored;
            });
        });

        // Teardown
        afterEach(function () {
            if (test_server) {
                test_server.close(function () {
                });
            }
            timekeeper.reset();
            test_server = null;
        });

    });

    //TODO: run IPv6 tests in travis when it supports it (at the time of this comment it does not)
    if (!process.env.TRAVIS) {
        describe('with logstash server (udp6)', function () {
            var test_server, port = testingPort;

            beforeEach(function (done) {
                timekeeper.freeze(freezed_time);
                done();
            });

            it('send logs over UDP as valid json', function (done) {
                var response;
                var logger = createLogger(port, {
                    udpType : 'udp6'
                });
                var expected = {"stream": "sample", "application": "test", "serverName": "localhost", "pid": 12345, "level": "info", "message": "hello world"};

                test_server = createTestServer(port, function (data) {
                    response = JSON.parse(data);
                    expect(response).to.be.eql(expected);
                    done();
                }, 'udp6');

                logger.log('info', 'hello world', {stream: 'sample'});
            });

            describe('with the option \'trailing line-feed\' on', function () {

                before(function () {
                    commonLogStored = common.log;
                    common.log = sinon.stub().returns('{"what":"ever"}' + "\r\n\t ");
                });

                it('remove all trailing blank characters and replace them with the operating system\'s EOL character', function (done) {
                    var logger = createLogger(
                        port,
                        {
                            trailingLineFeed: true,
                            udpType : 'udp6'
                        }
                    );

                    test_server = createTestServer(port, function (data) {
                        expect(data.toString()).to.be.eql(sampleData + os.EOL);
                        done();
                    }, 'udp6');

                    logger.log('info', 'hello world', {stream: 'sample'});
                });

                it('if set in the options, remove all trailing blank characters and replace them with a custom character', function (done) {
                    var logger = createLogger(
                        port,
                        {
                            trailingLineFeed: true,
                            trailingLineFeedChar: os.EOL + "\n",
                            udpType : 'udp6'
                        }
                    );

                    test_server = createTestServer(port, function (data) {
                        expect(data.toString()).to.be.eql(sampleData + os.EOL + "\n");
                        done();
                    }, 'udp6');

                    logger.log('info', 'hello world', {stream: 'sample'});
                });

                after(function () {
                    common.log = commonLogStored;
                });

            });

            // Teardown
            afterEach(function () {
                if (test_server) {
                    test_server.close(function () {
                    });
                }
                timekeeper.reset();
                test_server = null;
            });

        });
    }

    describe('without logstash server', function () {
        it('return an error message if UDP DNS errors occur on the socket', function (done) {
            var logger = createLogger(port, {host: 'unresolvedhost'});

            logger.log('info', 'hello world', {stream: 'sample'}, function (err) {
                expect(err).to.be.an.instanceof(Error);
                done();
            });
        });
    });
});
