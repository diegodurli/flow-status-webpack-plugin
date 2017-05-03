var shell = require('shelljs');

function noop() {}

function FlowStatusWebpackPlugin(options) {
  this.options = options || {};
}

FlowStatusWebpackPlugin.prototype.apply = function(compiler) {
  var options = this.options;
  var flowArgs = options.flowArgs || '';
  var flow = options.binaryPath || 'flow';
  var root = options.root || '';
  var failOnError = options.failOnError || false;
  var onSuccess = options.onSuccess || noop;
  var onError = options.onError || noop;
  var firstRun = true;
  var waitingForFlow = false;

  function startFlow(cb) {
    if (options.restartFlow === false) {
      cb();
    } else {
      shell.exec(flow + ' stop ' + root, {silent: true}, function() {
        shell.exec(flow + ' start ' + flowArgs + ' ' + root, {silent: true}, cb);
      });
    }
  }

  function startFlowIfFirstRun(compiler, cb) {
    if (firstRun) {
      firstRun = false;
      startFlow(cb);
    }
    else {
      cb();
    }
  }

  function flowStatus(successCb, errorCb) {
    if (!waitingForFlow) {
      waitingForFlow = true;

      // this will start a flow server if it was not running
      shell.exec(flow + ' status --color always '+ root, {silent: true}, function(code, stdout, stderr) {
        var hasErrors = code !== 0;
        var cb = hasErrors ? errorCb : successCb;
        waitingForFlow = false;

        cb(stdout, stderr);
      });
    }
  }

  var flowError = null

  function checkItWreckIt(compiler, cb) {
    startFlowIfFirstRun(compiler, function () {
      flowStatus(function success(stdout) {
        onSuccess(stdout);

        cb();
      }, function error(stdout) {
        onError(stdout);

        flowError = new Error(stdout);
        // Here we don't pass error to callback because
        // webpack-dev-middleware would just throw it
        // and cause webpack dev server to exit with
        // an error status code. Obviously, having to restart
        // the development webpack server after every flow
        // check error would be too annoying.
        cb()
      })
    })
  }

  compiler.plugin('run', checkItWreckIt);
  compiler.plugin('watch-run', checkItWreckIt);

  // If there are flow errors, fail the build before compilation starts.
  compiler.plugin('compilation', function (compilation) {
    if (flowError) {
      if (failOnError === true) {
        compilation.errors.push(flowError);
      }
      flowError = null;
    }
  });
};

module.exports = FlowStatusWebpackPlugin;
