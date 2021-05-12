const appRoot = require('app-root-path');
const winston = require('winston');
const process = require('process');


const { combine, timestamp, label, printf } = winston.format;

const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

const options = {
    file: {
        level: 'info',
        filename: `${appRoot}/logs/file-obfuscator.log`,
        handleExceptions: true,
        json: false,
        maxsize: 5242880,
        maxFiles: 5,
        colorize: false,
        format: combine(
            label({ label: 'file-obfuscator' }),
            timestamp(),
            myFormat,
        ),
    },
    console: {
        handleExceptions: true,
        json: false,
        colorize: true,
        format: combine(
            label({ label: 'file-obfuscator' }),
            timestamp(),
            myFormat,
        ),
    },
};

const logger = new (winston.createLogger)({
    transports: [
        new winston.transports.File(options.file),
    ],
    exitOnError: false,
});

if (process.env.NODE_ENV !== 'production') {
    options.console['level'] = 'info';
} else {
    options.console['level'] = 'debug';
}

logger.add(new winston.transports.Console(options.console));

module.exports = logger;