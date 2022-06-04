const MyApp = () => {
    const init = (userId, meetingId) => {
        console.log(`hello ${userId}:${meetingId}`)
    }
    return ( {
        _init: (userId, meetingId) => {
            init(userId, meetingId)
        }
    })
}