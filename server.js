const express = require('express');
const path = require('path');
const app = express();

const server = app.listen(3000, () => {
    console.log('listening on port 3000');
});
const io = require('socket.io')(server);

const rootFolder = path.join(__dirname, "");
app.use(express.static(rootFolder));


io.on('connection', socket => {
    console.log(`${socket.id} has connected`);
})