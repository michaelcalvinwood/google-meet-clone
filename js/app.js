const MyApp = () => {
    let socket = null;
    let userId = '';
    let meetingId = '';

    const eventProcessForSignalingServer = () => {
        socket = io.connect();
        socket.on('connect', () => {
            if(socket.connected) {
                if (userId && meetingId) {
                    socket.emit('userConnect', {
                        userId,
                        meetingId
                    })
                }
            }
        })

        socket.on('newUser', userInfo => {
            const { userId, connectionId } = userInfo;
            addUser(userId, connectionId);
        });
    }
    
    const init = () => {
        eventProcessForSignalingServer();
    }
    return ( {
        _init: (uid, mid) => {
            userId = uid;
            meetingId = mid;
            init()
        }
    })
}

function addUser(userId, connectionId) {
    alert(`New user: ${userId}: ${connectionId}`);
}
