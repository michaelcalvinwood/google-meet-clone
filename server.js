const express = require('express');
const path = require('path');
const app = express();

const server = app.listen(3000, () => {
    console.log('listening on port 3000');
});
const io = require('socket.io')(server);

const rootFolder = path.join(__dirname, "");
app.use(express.static(rootFolder));

const pretty = str => JSON.stringify(str, null, 4);

let userConnections = [];

io.on('connection', socket => {
    socket.on('userConnect', userInfo => {
        const { userId, meetingId } = userInfo;
        let otherUsers = userConnections.filter(uc => uc.meetingId === meetingId);
        userConnections.push({
            connectionId: socket.id,
            userId: userId,
            meetingId: meetingId
        })

        otherUsers.forEach(c => {
            socket
                .to(c.connectionId)
                .emit('newUser', {
                    userId: userId,
                    connectionId: socket.id
                })
        })
    })
})