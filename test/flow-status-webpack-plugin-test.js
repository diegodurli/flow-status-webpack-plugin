var expect = require('chai').expect;
var make = require('../src/flow-status-webpack-plugin');

var shellMock = {
    _ranCommands: [],
    _options: undefined,
    _reset: function() {
        this._ranCommands = [];
        this._options = undefined;
    },
    _code: 0,
    _stdout: '',
    _stderr: '',
    exec: function(command, arg2, arg3) {
        this._ranCommands.push(command);
        if (typeof arg3 === 'function') {
            arg3(this._code, this._stdout, this._stderr);
        } else if (typeof arg2 === 'function') {
            arg2(this._code, this._stdout, this._stderr);
        }
    }
};

var compilerMock = {
    _lifecycles: [],
    _callbacks: [],
    _cbMap: {},
    _reset: function() {
        this._lifecycles = [];
        this._callbacks = [];
        this._cbMap = {};
    },
    _run: function(lifecycle) {
        this._cbMap[lifecycle](this, function() {});
    },
    plugin: function(lifecycle, cb) {
        this._lifecycles.push(lifecycle);
        this._callbacks.push(cb);
        this._cbMap[lifecycle] = cb;
    }
};

var consoleMock = {
    _logs: [],
    _errors: [],
    _reset: function() {
        this._logs = [];
        this._errors = [];
    },
    log: function(msg) {
        this._logs.push(msg);
    },
    error: function(error) {
        this._errors.push(error);
    },
};

beforeEach(function() {
    shellMock._reset();
    compilerMock._reset();
    consoleMock._reset();
});

describe('Flow status webpack plugin', function() {
    it('should register some compiler handlers', function() {
        var Plugin = make(shellMock, consoleMock);

        (new Plugin()).apply(compilerMock);

        expect(compilerMock._lifecycles).to.have.lengthOf(3);
    });

    it('should only start Flow on the first run', function() {
        var Plugin = make(shellMock, consoleMock);
        var commandCount;

        (new Plugin()).apply(compilerMock);

        compilerMock._run('run');
        commandCount = shellMock._ranCommands.length;

        expect(commandCount).to.be.above(0);

        compilerMock._run('run');
        expect(shellMock._ranCommands).to.have.lengthOf(commandCount);
    });

    it('should log errors', function() {
        var Plugin = make(shellMock, consoleMock);
        var commandCount;

        (new Plugin()).apply(compilerMock);

        shellMock._code = 1;
        compilerMock._run('done');
        expect(consoleMock._errors).to.have.length.above(0);
    });

    it('should log on success', function() {
        var Plugin = make(shellMock, consoleMock);
        var commandCount;

        (new Plugin()).apply(compilerMock);

        shellMock._code = 0;
        compilerMock._run('done');
        expect(consoleMock._logs).to.have.length.above(0);
    });

    it('should handle custom error/success handlers', function() {
        var Plugin = make(shellMock, consoleMock);
        var commandCount;
        var ranSuccess = false;
        var ranError = false;

        (new Plugin({
            onSuccess: function() { ranSuccess = true; },
            onError: function() { ranError = true; },
        })).apply(compilerMock);

        shellMock._code = 0;
        compilerMock._run('done');
        expect(ranSuccess).to.be.true;

        shellMock._code = 1;
        compilerMock._run('done');
        expect(ranError).to.be.true;
    });
});