const express = require('express');
const http = require('http');
const path = require('path');
const multer = require('multer');
const moment = require('moment');
const obfuscate = require('bash-obfuscate');
const mime = require('mime');
const fs = require('fs');

const winston = require('./lib/winston');

const app = express();

app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
    destination(_req, _file, cb) {
        cb(null, 'uploads/');
    },
    filename(_req, file, cb) {
        cb(null, `${file.originalname.substring(0, file.originalname.length - 3)}_${moment().format('YY-MM-DD_HH:mm:ss')}.sh`);
    },
});

const upload = multer({ storage });

const pathJoin = (filePath) => path.join(__dirname, filePath);
app.post('/upload', upload.single('filesfld'), (req, res) => {
    const { filename, path } = req.file;
    const file = fs.readFileSync(path, 'utf8');
    const obfuscated = obfuscate(file, 1024, true);
    const rnFilename = filename.slice(0, filename.length - 3) + '_obfuscated' + filename.slice(filename.length - 3);
    fs.writeFileSync(pathJoin('../uploads/' + rnFilename), obfuscated);
    res.status(200).json({ url: `/download/${rnFilename}` });
});

app.get('/download/:filename', (req, res) => {
    const { filename } = req.params;
    const path = pathJoin(`../uploads/${filename}`);
    try {
        const stat = fs.existsSync(path);
        if (stat) {
            const mimeType = mime.getType('text/x-sh');

            res.setHeader('Content-disposition', `attachment; filename=${encodeURI(filename)}`);
            res.setHeader('Content-type', mimeType);

            const stream = fs.createReadStream(path, { encoding: 'utf8' });
            stream.pipe(res)
                .on('error', err => { throw err })
                .on('finish', () => { fs.unlink(path, err => { if (err) throw err }) });
        } else {
            res.status(404).send('Not Found');
        }
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});
winston.info('creating server ... ');

const port = process.env.PORT || 3000;

const server = http.createServer(app);

server.setTimeout(10 * 60 * 1000);

server.listen(Number(port), '0.0.0.0', () => {
    winston.info(`file-obfuscator is listening on port ${port}.`);
});

server.on('error', err => {
    winston.error(err);
    throw err;
});

server.on('uncaughtException', err => {
    winston.error(`[UncaughtException] ${err}`);
    winston.error(err.stack);
});

process.on('SIGINT', () => {
    winston.info('file-obfuscator closing server ... ');
    server.close(err => {
        winston.info('file-obfuscator is closed.', err);
        process.exit(err ? 1 : 0);
    });
});

module.exports = app;
