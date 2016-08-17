require('colors');

/**
 * Factory for creating a flow-status-webpack-plugin
 */
function makePlugin(shell, console) {
    function FlowStatusWebpackPlugin(options) {
        this.options = options || {};
    }

    function defaultOnSuccess() {
        console.log('\n-----------------------------'.green);
        console.log('Everything is fine with Flow!');
        console.log('-----------------------------\n'.green);
    }

    function defaultOnError() {
        console.log('\n----------------'.red);
        console.log('Flow has errors!');
        console.log('----------------\n'.red);
    }

    FlowStatusWebpackPlugin.prototype.apply = function(compiler) {
        var options = this.options,
            flowArgs = options.flowArgs || '',
            flow = options.binaryPath || 'flow',
            onSuccess = options.onSuccess || defaultOnSuccess,
            onError = options.onError || defaultOnError,
            firstRun = true,
            waitingForFlow = false;

        function startFlow(cb) {
            if (options.restartFlow === false) {
                cb();
            } else {
                shell.exec(flow + ' stop', function() {
                    shell.exec(flow + ' start ' + flowArgs, cb);
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

        // restart flow if interfacesPath was provided regardless
        // of whether webpack is in normal or watch mode
        compiler.plugin('run', startFlowIfFirstRun);
        compiler.plugin('watch-run', startFlowIfFirstRun);

        function flowStatus() {
            if (!waitingForFlow) {
                waitingForFlow = true;

                // this will start a flow server if it was not running
                shell.exec(flow + ' status --color always', {silent: true}, function(code, stdout, stderr) {
                    var hasErrors = code !== 0;

                    if (hasErrors) {
                        onError(stderr, code);
                    } else if (options.quietSuccess !== true) {
                        onSuccess(stdout);
                    }
                    if (options.quietSuccess !== true || hasErrors) {
                        console.log(stdout);
                    }
                    console.error(stderr);

                    waitingForFlow = false;
                });
            }
        }

        // When Webpack compilation is done, we should run Flow Status.
        compiler.plugin('done', flowStatus);
    };

    return FlowStatusWebpackPlugin;
}

module.exports = makePlugin;
