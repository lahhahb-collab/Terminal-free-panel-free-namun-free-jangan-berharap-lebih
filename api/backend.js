const pty = require('node-pty');
const WebSocket = require('ws');

// Node.js WebSocket Handler for PTY Real Terminal Execution
module.exports = (req, res) => {
    if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
        const wss = new WebSocket.Server({ noServer: true });

        wss.on('connection', (ws) => {
            const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
            const ptyProcess = pty.spawn(shell, [], {
                name: 'xterm-color',
                cols: 80,
                rows: 30,
                cwd: process.env.HOME || '/tmp',
                env: process.env
            });

            ptyProcess.onData((data) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(data);
                }
            });

            ws.on('message', (msg) => {
                ptyProcess.write(msg.toString());
            });

            ws.on('close', () => {
                ptyProcess.kill();
            });
        });

        wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
            wss.emit('connection', ws, req);
        });
    } else {
        res.status(400).send('WebSocket connection required for Terminal execution.');
    }
};
