var make = require('./src/flow-status-webpack-plugin'),
    shell = require('shelljs');

module.exports = make(shell, console);