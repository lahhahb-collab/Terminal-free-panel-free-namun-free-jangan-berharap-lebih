const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const pty = require('node-pty');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Layani file statis (index.html)
app.use(express.static(path.join(__dirname, 'public')));

// Create HTTP Server
const server = http.createServer(app);

// Create WebSocket Server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    // Tentukan shell berdasarkan OS (Linux/Unix -> bash/sh, Windows -> powershell/cmd)
    const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');

    // Spawn Real Pseudo-Terminal Session
    const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME || process.cwd(),
        env: process.env
    });

    // Kirim output terminal ke client browser via WebSocket
    ptyProcess.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    });

    // Terima input keyboard dari browser lalu kirim ke terminal
    ws.on('message', (message) => {
        const msg = message.toString();
        // Cek jika ada sinyal resize window
        if (msg.startsWith('RESIZE:')) {
            const [, cols, rows] = msg.split(':');
            ptyProcess.resize(parseInt(cols), parseInt(rows));
        } else {
            ptyProcess.write(msg);
        }
    });

    // Hapus proses terminal saat koneksi terputus
    ws.on('close', () => {
        ptyProcess.kill();
    });
});

server.listen(PORT, () => {
    console.log(`Server terminal berjalan di port ${PORT}`);
});
