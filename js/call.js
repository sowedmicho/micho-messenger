// MICHO MESSENGER - Call Module
class CallManager {
    constructor() {
        this.callId = null;
        this.callType = null;
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.isMuted = false;
        this.isSpeakerOn = true;
        this.callStartTime = null;
        this.durationInterval = null;
        this.unsubscribeCall = null;
        
        this.init();
    }

    init() {
        this.getUrlParams();
        this.setupUI();
        this.listenForCallUpdates();
        this.initializeCall();
    }

    getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        this.callId = params.get('id');
        this.callType = params.get('type') || 'voice';
        this.chatId = params.get('chat');
    }

    setupUI() {
        document.getElementById('btn-end')?.addEventListener('click', () => this.endCall());
        document.getElementById('btn-mute')?.addEventListener('click', () => this.toggleMute());
        document.getElementById('btn-speaker')?.addEventListener('click', () => this.toggleSpeaker());
        
        // Update UI based on call type
        if (this.callType === 'video') {
            document.getElementById('video-container')?.classList.add('active');
        }
    }

    async initializeCall() {
        if (!this.callId) {
            this.showError('No call ID provided');
            return;
        }

        try {
            // Get local media
            const constraints = {
                audio: true,
                video: this.callType === 'video'
            };
            
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            if (this.callType === 'video') {
                const localVideo = document.getElementById('local-video');
                if (localVideo) localVideo.srcObject = this.localStream;
            }

            // Update call status in Firestore
            await db.collection('calls').doc(this.callId).update({
                status: 'ongoing',
                startTime: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Start duration timer
            this.startDurationTimer();
            
            document.getElementById('call-status').textContent = 'Connected';
            document.getElementById('call-contact-name').textContent = 'Contact';
            
        } catch (error) {
            console.error('Call initialization error:', error);
            this.showError('Could not access camera/microphone');
        }
    }

    listenForCallUpdates() {
        if (!this.callId) return;

        this.unsubscribeCall = db.collection('calls').doc(this.callId)
            .onSnapshot((doc) => {
                if (!doc.exists) return;
                const call = doc.data();
                
                if (call.status === 'ended' || call.status === 'rejected') {
                    this.handleCallEnded();
                }
            });
    }

    startDurationTimer() {
        this.callStartTime = Date.now();
        this.durationInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
            const mins = Math.floor(elapsed / 60);
            const secs = elapsed % 60;
            document.getElementById('call-duration').textContent = 
                `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }, 1000);
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = this.isMuted;
                this.isMuted = !this.isMuted;
                
                const btn = document.getElementById('btn-mute');
                if (this.isMuted) {
                    btn.classList.add('active');
                    btn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                } else {
                    btn.classList.remove('active');
                    btn.innerHTML = '<i class="fas fa-microphone"></i>';
                }
            }
        }
    }

    toggleSpeaker() {
        this.isSpeakerOn = !this.isSpeakerOn;
        const btn = document.getElementById('btn-speaker');
        if (this.isSpeakerOn) {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-volume-up"></i>';
        } else {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-volume-down"></i>';
        }
    }

    async endCall() {
        try {
            // Update call status
            if (this.callId) {
                await db.collection('calls').doc(this.callId).update({
                    status: 'ended',
                    endTime: firebase.firestore.FieldValue.serverTimestamp(),
                    duration: Math.floor((Date.now() - (this.callStartTime || Date.now())) / 1000)
                });
            }

            // Send call end message to chat
            if (this.chatId) {
                await db.collection('chats').doc(this.chatId).collection('messages').add({
                    type: 'call',
                    callType: this.callType,
                    callDuration: this.getDurationString(),
                    senderId: auth.currentUser?.uid,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                await db.collection('chats').doc(this.chatId).update({
                    lastMessage: `${this.callType === 'video' ? 'Video' : 'Voice'} call • ${this.getDurationString()}`,
                    lastMessageType: 'call',
                    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            this.cleanup();
            window.location.href = '/';
            
        } catch (error) {
            console.error('End call error:', error);
            this.cleanup();
            window.location.href = '/';
        }
    }

    handleCallEnded() {
        this.cleanup();
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    }

    getDurationString() {
        if (!this.callStartTime) return '0:00';
        const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    }

    showError(message) {
        document.getElementById('call-status').textContent = message;
        document.getElementById('call-status').style.color = '#ea0038';
    }

    cleanup() {
        if (this.durationInterval) clearInterval(this.durationInterval);
        if (this.unsubscribeCall) this.unsubscribeCall();
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
        }
    }
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', () => {
    window.callManager = new CallManager();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.callManager) {
        window.callManager.endCall();
    }
});