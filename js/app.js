const MyApp = () => {
    let socket = null;

    const eventProcessForSignalingServer = () => {
        socket = io.connect();
        socket.on('connect', () => {
            alert("socket connected");
        })
    }
    
    const init = (userId, meetingId) => {
        eventProcessForSignalingServer();
    }
    return ( {
        _init: (userId, meetingId) => {
            init(userId, meetingId)
        }
    })
}

