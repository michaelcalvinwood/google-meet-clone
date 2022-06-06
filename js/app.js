const q = val => document.querySelector(val);
const createElement = (parent, tag, c = false, text = false, attributes = false) => {
    let el = {};
    try {
        el = document.createElement(tag);
    } catch (e) {
        return false;
    }

    if (parent) parent.appendChild(el);
    
    // optional parameters
    if (c) el.className = c; 
    if (text) el.innerText = text;
    if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
            el.setAttribute (key, value);
        };
    }

    return el
}
const pretty = str => JSON.stringify(str, null, 4);

var AppProcess = (function () {

    let peersConnectionIds = [];
    let peersConnection = [];
    let remoteVideoStream = [];
    let remoteAudioStream = [];
    let rtpAudioSenders = [];
    let rtpVideoSenders = [];

    let videoStates = {
        None: 0,
        Camera: 1,
        ScreenShare: 2
    }

    let videoState = videoStates.None;

    let serverProcess;
    let myConnectionId;
    let localVideoDiv;
    let audio;
    let audioIsMute = true;

    let videoCamTrack;

    const connectionStatus = connection => {
        if(connection && 
            (connection.connectionState == 'new' ||
            connection.connectionState == 'connecting' ||
            connection.connectionState == 'connected')) return true
            
        return false;
    }

    const updateMediaSenders = async (track, rtpSenders) => {
        for (let connectionId in peersConnectionIds) {
            if(connectionStatus(peersConnection[connectionId])) {
                if (rtpSenders[connectionId] && rtpSenders[connectionId].track) {
                    rtpSenders[connectionId].replaceTrack(track);
                } else {
                    rtpSenders[connectionId] = peersConnection[connectionId].addTrack(track);
                }
            }
        }
    }

    async function videoProcess (newVideoState) {
        console.log(`videoProcess (${newVideoState})`);
       
        videoState = newVideoState;
        try {
            let videoStream = null;
            
            if (newVideoState === videoStates.Camera) {
                
                videoStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: 1920,
                        height: 1080
                    },
                    audio: false
                })
            }

            if (newVideoState === videoStates.ScreenShare) {
                console.log(`newVideoState is ScreenShare`);
                videoStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        width: 1920,
                        height: 1080
                    },
                    audio: false
                })
            }

            if (videoStream && videoStream.getVideoTracks().length > 0) {
                videoCamTrack = videoStream.getVideoTracks()[0];
                if (videoCamTrack) {
                    localVideoDiv.srcObject = new MediaStream([videoCamTrack]);
                    updateMediaSenders(videoCamTrack, rtpVideoSenders);
                }
            }
        } catch (e) {
            
            return console.error(e);
        }


    }
    
    const eventProcess = () => {

        // event handler for when user clicks on the mic icon

        const micIcon = q('#micMuteUnmute')
        .addEventListener('click', async () => {
            if (!audio) await loadAudio();
            
            if (!audio) return alert('Audio permission not granted.');

            if (audioIsMute) {
                audio.enabled = true;
                micIcon.innerHTML = ' <span class="material-icons" style="width: 100%;">mic</span>';
                updateMediaSenders(audio, rtpAudioSenders);
            } else {
                audio.enabled = false;
                micIcon.innerHTML = '<span class="material-icons" style="width: 100%;">mic_off</span>';
                removeMediaSenders(rtpAudioSenders);
            }
            audioIsMute = !audioIsMute;
        });

        // event handler for when the user clicks on the video icon

        const vidIcon = q('#videoCamOnOff')
        .addEventListener('click', async () => {
            console.log('vidIcon click', videoState);
           
           if (videoState === videoStates.None) {
               await videoProcess(videoStates.Camera);
           }
           else {
               alert(`awaiting VideoProcess None`);
               await videoProcess(videoStates.None);
           }
        });

        // event handler for clicking screen share button

        const screenShareButton = q('#ScreenShareOnOf')
        .addEventListener('click', async () => {
            videoState === videoStates.ScreenShare ? 
              await videoProcess(videoStates.None) :
              await videoProcess(videoStates.ScreenShare);
        })
    }

    const _init = async (SDP_function, myId) => {
        serverProcess = SDP_function;
        myConnectionId = myId;
        eventProcess();
        localVideoDiv = q("#localVideoPlayer");
        
        
    }

    const iceConfiguration = {
        // Google STUN servers
        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302",
            },
            {
                urls: "stun:stun1.l.google.com:19302",
            },
        ]
    }

    const setConnection = async connectionId => {
        console.log(`setConnection`);
        const connection = new RTCPeerConnection(iceConfiguration);

        connection.onnegotiationneeded = async event => {
            await setOffer(connectionId);
        }
        connection.onicecandidate = event => {
           
        
            if(event.candidate) {
                serverProcess(JSON.stringify({icecandidate: event.candidate}), connectionId)
            }
        }
        connection.ontrack = function(e) {
            console.log(`setConnection ontrack: ${e.track.kind} for ${connectionId}`)
            if(!remoteVideoStream[connectionId]) {
                remoteVideoStream[connectionId] = new MediaStream();
            }

            if(!remoteAudioStream[connectionId]) {
                remoteAudioStream[connectionId] = new MediaStream();
            }

            switch(e.track.kind) {
                case 'video':
                    remoteVideoStream[connectionId]
                    .getVideoTracks()
                    .forEach(t => remoteVideoStream[connectionId].removeTrack(t));
                    remoteVideoStream[connectionId].addTrack(e.track);

                    let remoteVideoPlayer = q(`#v_${connectionId}`);
                    remoteVideoPlayer.srcObject = null;
                    remoteVideoPlayer.srcObject = remoteVideoStream[connectionId];
                    remoteVideoPlayer.load();

                    break;
                case 'audio': 
                    remoteAudioStream[connectionId]
                    .getAudioTracks()
                    .forEach(t => remoteAudioStream[connectionId].removeTrack(t));
                    remoteAudioStream[connectionId].addTrack(e.track);

                    let remoteAudioPlayer = q(`#a_${connectionId}`);
                    remoteAudioPlayer.srcObject = null;
                    remoteAudioPlayer.srcObject = remoteAudioStream[connectionId];
                    remoteAudioPlayer.load();

                    break;
                
            }
        }

        peersConnectionIds[connectionId] = connectionId;
        peersConnection[connectionId] = connection;

        console.log(`videoState: ${videoState} videoCamTrack`, videoCamTrack);
        if ((videoState === videoStates.Camera || videoState === videoStates.ScreenShare) && videoCamTrack)
            updateMediaSenders(videoCamTrack, rtpVideoSenders);

        return connection;
    }

    async function setOffer(connectionId) {
        let connection = peersConnection[connectionId];
        let offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        serverProcess(JSON.stringify({offer: connection.localDescription}), connectionId);
    }

    const  SDPProcess = async (message, fromConnectionId) => {
        message = JSON.parse(message);
        console.log('SDPProcess', message, fromConnectionId);

        if (message.answer) {    
            await peersConnection[fromConnectionId].setRemoteDescription(new RTCSessionDescription(message.answer));
            return;
        } 
        
        if (message.offer) {
            if (!peersConnection[fromConnectionId]) {
                await setConnection(fromConnectionId);
            }

            await peersConnection[fromConnectionId].setRemoteDescription(new RTCSessionDescription(message.offer));
            let answer = await peersConnection[fromConnectionId].createAnswer();
            await peersConnection[fromConnectionId].setLocalDescription(answer);
            serverProcess(JSON.stringify({answer: answer}), fromConnectionId);

            return;
        }

        if (message.icecandidate) {            
            if (!peersConnection[fromConnectionId]) {
                console.log(`SDPProcess awaiting setConnection`);
                await setConnection(fromConnectionId);
                console.log(`SDPProcess connection set`)
            }
            try {
                console.log(`SDPProcess awaiting adding ice candidate`);
                await peersConnection[fromConnectionId].addIceCandidate(message.icecandidate);
                console.log(`SDPProcess added ice candidate`);
            } catch (e) {
                console.log(e);
            }
        }
    }

    return {
        setNewConnection: async function (connectionId) {
            console.log('in setNewConnection')
             await setConnection(connectionId);
        },
        init: async function (SDP_function, myConnectionId) {
            await _init(SDP_function, myConnectionId);
        },
        processClientFunc: async function (data, fromConnectionId) {
            await SDPProcess(data, fromConnectionId);
        },
    };
})();

const MyApp = () => {
    let socket = null;
    let userId = '';
    let meetingId = '';

    const eventProcessForSignalingServer = () => {
        socket = io.connect();
        const SDP_function = function(message, toConnectionId) {
            socket.emit("SDPProcess", {
                message,
                toConnectionId
            })
        }
        socket.on('connect', () => {
            if(socket.connected) {
                AppProcess.init(SDP_function, socket.id)
                if (userId && meetingId) {
                    socket.emit('userConnect', {
                        userId,
                        meetingId
                    })
                }
            }
        });

        
        // triggered each time a new user joins
        socket.on('newUser', userInfo => {
            const { userId, connectionId } = userInfo;
            addUser(userId, connectionId);
            console.log('calling setNewConnection')
            AppProcess.setNewConnection(connectionId)
        });

        // receive information about all other users
        socket.on('otherUsers', otherUsers => {
            if(otherUsers && otherUsers.length) {
                for (let i = 0; i < otherUsers.length; ++i) {
                    addUser(otherUsers[i].userId, otherUsers[i].connectionId);
                    AppProcess.setNewConnection(otherUsers[i].connectionId)
                }
            }
        });

        socket.on('SDPProcess', async data => {
            const { message, fromConnectionId } = data;

            await AppProcess.processClientFunc(message, fromConnectionId);
        })
    }
    
    const init = () => {
        eventProcessForSignalingServer();
        q('#me h2').innerText=(`${userId} (Me)`);
        document.title = userId;
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
    console.log(`addUser (${userId}, ${connectionId})`);

    const parent = q('#divUsers');
    
    // Create other template with title and action container inside
    const otherTemplate = createElement(parent, 'div', "userbox display-center flex-column other", '', {id: connectionId})
    
    const title = createElement(otherTemplate, 'h2', "display-center", userId);
    title.style.fontSize="14px";
    
    const actionContainer = createElement(otherTemplate, 'div', 'display-center');
    actionContainer.style.position = 'relative';

    // add handImage, video, and audio to the action container

    const handImage = createElement(actionContainer, 'img', false, false, {src: "/public/Assets/images/handRaise.png"});
    handImage.style.position = 'absolute';
    handImage.style.height = "30px";
    handImage.style.top = "8%";
    handImage.style.left = "3%";
    
    const video = createElement(actionContainer, 'video', false, '', {
        id: `v_${connectionId}`,
        autoplay: true,
        muted: true
    })
    
    const audio = createElement(actionContainer, 'audio', false, '', {
        id: `a_${connectionId}`,
        autoplay: true,
        controls: true
    });
    audio.style.display = 'none';
}

