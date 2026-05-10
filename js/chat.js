// MICHO MESSENGER - Chat Module
class ChatManager {
    constructor(app) {
        this.app = app;
        this.currentChatId = null;
        this.currentChatData = null;
        this.unsubscribeMessages = null;
        this.unsubscribeChats = null;
        this.unsubscribeTyping = null;
        this.replyingTo = null;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        
        this.init();
    }

    init() {
        this.setupUI();
        this.loadChats();
        this.setupUserPresence();
    }

    setupUI() {
        // Message input
        const msgInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('btn-send-message');
        const voiceBtn = document.getElementById('btn-voice-record');
        const emojiBtn = document.getElementById('btn-emoji-toggle');
        const attachBtn = document.getElementById('btn-attach');
        const cancelReply = document.getElementById('btn-cancel-reply');
        const backChat = document.getElementById('btn-back-chat');
        const searchInput = document.getElementById('search-input');
        const clearSearch = document.getElementById('btn-clear-search');
        const btnNewChat = document.getElementById('btn-new-chat');
        const btnCloseModal = document.getElementById('btn-close-modal');
        const btnStartChat = document.getElementById('btn-start-chat');
        const btnMenuToggle = document.getElementById('btn-menu-toggle');
        const btnChatMenuToggle = document.getElementById('btn-chat-menu-toggle');
        const btnVoiceCall = document.getElementById('btn-voice-call');
        const btnVideoCall = document.getElementById('btn-video-call');
        const btnContactInfo = document.getElementById('contact-info-btn');
        const btnClosePanel = document.getElementById('btn-close-panel');
        const btnMenuLogout = document.getElementById('menu-logout');

        // Text input handling
        msgInput?.addEventListener('input', () => {
            const hasText = msgInput.value.trim().length > 0;
            sendBtn?.classList.toggle('hidden', !hasText);
            voiceBtn?.classList.toggle('hidden', hasText);
            this.handleTyping();
        });

        // Send message
        sendBtn?.addEventListener('click', () => this.sendTextMessage());
        msgInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (msgInput.value.trim()) this.sendTextMessage();
            }
        });

        // Voice message
        voiceBtn?.addEventListener('click', () => this.toggleVoiceRecording());

        // Emoji picker toggle
        emojiBtn?.addEventListener('click', () => this.toggleEmojiPicker());

        // Attachment menu
        attachBtn?.addEventListener('click', () => this.toggleAttachmentMenu());

        // Cancel reply
        cancelReply?.addEventListener('click', () => this.cancelReply());

        // Back button (mobile)
        backChat?.addEventListener('click', () => this.closeChat());

        // Search
        searchInput?.addEventListener('input', (e) => {
            this.searchChats(e.target.value);
            clearSearch?.classList.toggle('hidden', !e.target.value);
        });
        clearSearch?.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            searchInput.focus();
        });

        // New chat modal
        btnNewChat?.addEventListener('click', () => {
            document.getElementById('new-chat-modal')?.classList.remove('hidden');
        });
        btnCloseModal?.addEventListener('click', () => {
            document.getElementById('new-chat-modal')?.classList.add('hidden');
        });
        btnStartChat?.addEventListener('click', () => this.startNewChat());

        // Menu toggles
        btnMenuToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('main-menu')?.classList.toggle('hidden');
        });
        btnChatMenuToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('chat-menu')?.classList.toggle('hidden');
        });

        // Click outside to close menus
        document.addEventListener('click', () => {
            document.getElementById('main-menu')?.classList.add('hidden');
            document.getElementById('chat-menu')?.classList.add('hidden');
            document.getElementById('attachment-menu')?.classList.add('hidden');
            document.getElementById('emoji-picker')?.classList.add('hidden');
        });

        // Call buttons
        btnVoiceCall?.addEventListener('click', () => this.initiateCall('voice'));
        btnVideoCall?.addEventListener('click', () => this.initiateCall('video'));

        // Contact info panel
        btnContactInfo?.addEventListener('click', () => this.toggleContactInfo());
        btnClosePanel?.addEventListener('click', () => {
            document.getElementById('info-panel')?.classList.add('hidden');
        });

        // Logout
        btnMenuLogout?.addEventListener('click', () => this.app.logout());

        // File input for attachments
        const fileInput = document.getElementById('file-input');
        const cameraInput = document.getElementById('camera-input');
        
        document.querySelectorAll('.attachment-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = item.dataset.type;
                if (type === 'image') fileInput?.click();
                if (type === 'camera') cameraInput?.click();
                if (type === 'document') {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '*/*';
                    input.onchange = (e) => this.handleFileUpload(e.target.files[0]);
                    input.click();
                }
                if (type === 'location') this.shareLocation();
                if (type === 'contact') this.shareContact();
                document.getElementById('attachment-menu')?.classList.add('hidden');
            });
        });

        fileInput?.addEventListener('change', (e) => {
            if (e.target.files[0]) this.handleFileUpload(e.target.files[0]);
        });
        cameraInput?.addEventListener('change', (e) => {
            if (e.target.files[0]) this.handleFileUpload(e.target.files[0]);
        });
    }

    async loadChats() {
        const chatList = document.getElementById('chat-list');
        if (!chatList) return;

        chatList.innerHTML = '<div class="empty-chats"><i class="fas fa-spinner fa-spin"></i><p>Loading chats...</p></div>';

        if (!this.app.currentUser) return;

        const query = db.collection('chats')
            .where('participants', 'array-contains', this.app.currentUser.uid)
            .orderBy('lastMessageTime', 'desc');

        this.unsubscribeChats = query.onSnapshot((snapshot) => {
            chatList.innerHTML = '';

            if (snapshot.empty) {
                chatList.innerHTML = `
                    <div class="empty-chats">
                        <i class="fas fa-comments"></i>
                        <p>No conversations yet</p>
                        <small>Start a new chat to begin</small>
                    </div>`;
                return;
            }

            snapshot.forEach((doc) => {
                this.renderChatItem({ id: doc.id, ...doc.data() });
            });
        }, (error) => {
            console.error('Chats error:', error);
            chatList.innerHTML = '<div class="empty-chats"><p>Error loading chats</p></div>';
        });
    }

    renderChatItem(chat) {
        const chatList = document.getElementById('chat-list');
        const item = document.createElement('div');
        item.className = `chat-item ${this.currentChatId === chat.id ? 'active' : ''}`;
        
        const time = chat.lastMessageTime?.toDate();
        const timeStr = time ? this.formatChatTime(time) : '';
        const unread = chat.unreadCount?.[this.app.currentUser?.uid] || 0;
        const lastMsg = chat.lastMessageType === 'voice' ? '🎤 Voice message' :
                       chat.lastMessageType === 'image' ? '📷 Image' :
                       chat.lastMessageType === 'call' ? '📞 Call' :
                       chat.lastMessage || '';

        item.innerHTML = `
            <div class="avatar avatar-sm">
                <img src="assets/images/default-avatar.png" alt="${chat.name || 'User'}">
            </div>
            <div class="chat-item-content">
                <div class="chat-item-header">
                    <span class="chat-item-name">${chat.name || 'Unknown'}</span>
                    <span class="chat-item-time">${timeStr}</span>
                </div>
                <div class="chat-item-preview">
                    <span class="chat-item-message">${lastMsg || 'No messages yet'}</span>
                    ${unread > 0 ? `<span class="chat-item-badge">${unread > 9 ? '9+' : unread}</span>` : ''}
                </div>
            </div>
        `;

        item.addEventListener('click', () => this.openChat(chat.id, chat));
        chatList.appendChild(item);
    }

    async openChat(chatId, chatData = null) {
        // Unsubscribe previous
        if (this.unsubscribeMessages) this.unsubscribeMessages();
        if (this.unsubscribeTyping) this.unsubscribeTyping();

        this.currentChatId = chatId;

        if (!chatData) {
            const doc = await db.collection('chats').doc(chatId).get();
            chatData = { id: doc.id, ...doc.data() };
        }
        this.currentChatData = chatData;

        // Show chat UI
        document.getElementById('chat-empty-state')?.classList.add('hidden');
        document.getElementById('chat-header')?.classList.remove('hidden');
        document.getElementById('message-input-area')?.classList.remove('hidden');
        document.getElementById('message-input').disabled = false;
        document.getElementById('contact-name').textContent = chatData.name || 'User';
        document.getElementById('contact-status-text').textContent = 'online';
        document.getElementById('contact-status-dot')?.classList.add('online');

        // Update active item
        document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
        const activeItem = document.querySelector(`.chat-item .chat-item-name`);
        if (activeItem && activeItem.textContent === chatData.name) {
            activeItem.closest('.chat-item')?.classList.add('active');
        }

        // Mark as read
        if (this.app.currentUser) {
            await db.collection('chats').doc(chatId).update({
                [`unreadCount.${this.app.currentUser.uid}`]: 0
            }).catch(() => {});
        }

        // Load messages
        this.loadMessages(chatId);
        this.listenTyping(chatId);

        // Mobile view
        if (window.innerWidth <= 768) {
            document.getElementById('main-chat')?.classList.add('active');
            document.getElementById('sidebar').style.display = 'none';
        }

        setTimeout(() => document.getElementById('message-input')?.focus(), 300);
    }

    loadMessages(chatId) {
        const container = document.getElementById('messages-container');
        if (!container) return;

        container.innerHTML = `
            <div class="messages-encryption-notice">
                <i class="fas fa-lock"></i>
                <span>Messages are end-to-end encrypted</span>
            </div>`;

        this.unsubscribeMessages = db.collection('chats').doc(chatId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .limit(100)
            .onSnapshot((snapshot) => {
                // Clear existing messages but keep encryption notice
                const existingMsgs = container.querySelectorAll('.message-wrapper');
                existingMsgs.forEach(m => m.remove());

                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        this.renderMessage({ id: change.doc.id, ...change.doc.data() });
                    }
                });

                this.scrollToBottom();
            });
    }

    renderMessage(msg) {
        const container = document.getElementById('messages-container');
        const isSent = msg.senderId === this.app.currentUser?.uid;
        
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${isSent ? 'sent' : 'received'}`;
        wrapper.dataset.messageId = msg.id;

        const time = msg.timestamp?.toDate();
        const timeStr = time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

        let content = '';
        
        if (msg.type === 'image') {
            content = `<img src="${msg.content}" style="max-width:250px;border-radius:8px;cursor:pointer;" 
                       onclick="window.open('${msg.content}')" loading="lazy">`;
            if (msg.text) content += `<div class="message-text">${this.escapeHtml(msg.text)}</div>`;
        } else if (msg.type === 'voice') {
            content = `
                <div style="display:flex;align-items:center;gap:8px;cursor:pointer;" 
                     onclick="new Audio('${msg.content}').play()">
                    <i class="fas fa-play" style="color:#667781;"></i>
                    <div style="flex:1;display:flex;align-items:center;gap:2px;">
                        ${Array(10).fill('<span style="width:3px;background:#667781;border-radius:2px;height:' + 
                          (6 + Math.random() * 12) + 'px;"></span>').join('')}
                    </div>
                    <span style="font-size:11px;color:#667781;">${msg.duration || 0}s</span>
                </div>`;
        } else if (msg.type === 'call') {
            content = `<i class="fas fa-${msg.callType === 'video' ? 'video' : 'phone'}" style="margin-right:6px;"></i>
                      ${msg.callType === 'video' ? 'Video' : 'Voice'} call • ${msg.callDuration || 'Ended'}`;
        } else if (msg.type === 'system') {
            wrapper.innerHTML = `<div style="text-align:center;padding:8px;color:#667781;font-size:12px;font-style:italic;">
                ${msg.text}</div>`;
            container.appendChild(wrapper);
            return;
        } else {
            content = `<div class="message-text">${this.formatText(msg.text || msg.content || '')}</div>`;
        }

        wrapper.innerHTML = `
            <div class="message-bubble">
                ${content}
                <div class="message-meta">
                    <span class="message-time">${timeStr}</span>
                    ${isSent ? `<span class="message-status">✓</span>` : ''}
                </div>
            </div>`;

        container.appendChild(wrapper);
    }

    async sendTextMessage() {
        const input = document.getElementById('message-input');
        const text = input.value.trim();
        if (!text || !this.currentChatId || !this.app.currentUser) return;

        input.value = '';
        input.dispatchEvent(new Event('input'));

        try {
            const msgData = {
                text: text,
                senderId: this.app.currentUser.uid,
                senderName: this.app.currentUser.displayName || 'User',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                type: 'text'
            };

            if (this.replyingTo) {
                msgData.replyTo = {
                    messageId: this.replyingTo.id,
                    text: this.replyingTo.text,
                    senderName: this.replyingTo.senderName
                };
                this.cancelReply();
            }

            await db.collection('chats').doc(this.currentChatId)
                .collection('messages').add(msgData);

            await db.collection('chats').doc(this.currentChatId).update({
                lastMessage: text,
                lastMessageType: 'text',
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                [`unreadCount.${this.getOtherParticipant()}`]: firebase.firestore.FieldValue.increment(1)
            });
        } catch (error) {
            console.error('Send error:', error);
            this.app.showToast('Error sending message', 'error');
            input.value = text;
        }
    }

    async handleFileUpload(file) {
        if (!file || !this.currentChatId) return;
        
        this.app.showToast('Uploading...', 'info');
        
        try {
            const storageRef = storage.ref(`chats/${this.currentChatId}/${Date.now()}_${file.name}`);
            await storageRef.put(file);
            const url = await storageRef.getDownloadURL();
            
            const isImage = file.type.startsWith('image/');
            
            await db.collection('chats').doc(this.currentChatId).collection('messages').add({
                type: isImage ? 'image' : 'document',
                content: url,
                text: isImage ? '' : file.name,
                fileName: file.name,
                fileSize: this.formatFileSize(file.size),
                senderId: this.app.currentUser.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            await db.collection('chats').doc(this.currentChatId).update({
                lastMessage: isImage ? '📷 Image' : `📎 ${file.name}`,
                lastMessageType: isImage ? 'image' : 'document',
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            this.app.showToast('File sent!', 'success');
        } catch (error) {
            console.error('Upload error:', error);
            this.app.showToast('Error uploading file', 'error');
        }
    }

    toggleVoiceRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.audioChunks.push(e.data);
            };
            
            this.mediaRecorder.onstop = async () => {
                const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
                if (blob.size > 0 && this.currentChatId) {
                    const ref = storage.ref(`voice/${this.currentChatId}/${Date.now()}.webm`);
                    await ref.put(blob);
                    const url = await ref.getDownloadURL();
                    
                    await db.collection('chats').doc(this.currentChatId).collection('messages').add({
                        type: 'voice',
                        content: url,
                        duration: Math.round((Date.now() - this.recordingStartTime) / 1000),
                        senderId: this.app.currentUser.uid,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                stream.getTracks().forEach(t => t.stop());
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            
            const voiceBtn = document.getElementById('btn-voice-record');
            voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
            voiceBtn.style.background = '#ea0038';
            this.app.showToast('Recording...', 'info');
            
        } catch (error) {
            console.error('Recording error:', error);
            this.app.showToast('Microphone access denied', 'error');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            const voiceBtn = document.getElementById('btn-voice-record');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            voiceBtn.style.background = '';
        }
    }

    initiateCall(type) {
        if (!this.currentChatId || !this.app.currentUser) return;
        
        const otherUserId = this.getOtherParticipant();
        if (!otherUserId) return;
        
        const callData = {
            type: type,
            callerId: this.app.currentUser.uid,
            receiverId: otherUserId,
            status: 'initiated',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection('calls').add(callData).then((doc) => {
            window.location.href = `call.html?id=${doc.id}&type=${type}&chat=${this.currentChatId}`;
        });
    }

    async startNewChat() {
        const phoneInput = document.getElementById('new-chat-phone');
        const phone = phoneInput.value.trim();
        if (!phone) return;

        try {
            const snapshot = await db.collection('users')
                .where('phoneNumber', '==', phone)
                .limit(1).get();

            if (snapshot.empty) {
                this.app.showToast('User not found. They need to sign up first.', 'error');
                return;
            }

            const otherUser = snapshot.docs[0];
            const chatData = {
                participants: [this.app.currentUser.uid, otherUser.id],
                name: phone,
                lastMessage: '',
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                unreadCount: { [this.app.currentUser.uid]: 0, [otherUser.id]: 0 }
            };

            const doc = await db.collection('chats').add(chatData);
            document.getElementById('new-chat-modal').classList.add('hidden');
            phoneInput.value = '';
            this.openChat(doc.id, { id: doc.id, ...chatData });

        } catch (error) {
            console.error('Start chat error:', error);
            this.app.showToast('Error creating chat', 'error');
        }
    }

    closeChat() {
        this.currentChatId = null;
        this.currentChatData = null;
        
        if (this.unsubscribeMessages) this.unsubscribeMessages();
        if (this.unsubscribeTyping) this.unsubscribeTyping();

        document.getElementById('chat-empty-state')?.classList.remove('hidden');
        document.getElementById('chat-header')?.classList.add('hidden');
        document.getElementById('message-input-area')?.classList.add('hidden');
        document.getElementById('message-input').value = '';
        document.getElementById('message-input').disabled = true;

        if (window.innerWidth <= 768) {
            document.getElementById('main-chat')?.classList.remove('active');
            document.getElementById('sidebar').style.display = 'flex';
        }
    }

    setupUserPresence() {
        if (!this.app.currentUser) return;
        const userRef = db.collection('users').doc(this.app.currentUser.uid);
        userRef.update({ online: true, lastSeen: firebase.firestore.FieldValue.serverTimestamp() }).catch(() => {});
        userRef.onDisconnect().update({ online: false, lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
    }

    handleTyping() {
        if (!this.currentChatId || !this.app.currentUser) return;
        const typingRef = db.collection('chats').doc(this.currentChatId)
            .collection('typing').doc(this.app.currentUser.uid);
        
        const input = document.getElementById('message-input');
        if (input.value.trim()) {
            typingRef.set({ isTyping: true, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            setTimeout(() => typingRef.delete(), 3000);
        } else {
            typingRef.delete();
        }
    }

    listenTyping(chatId) {
        if (this.unsubscribeTyping) this.unsubscribeTyping();
        
        this.unsubscribeTyping = db.collection('chats').doc(chatId)
            .collection('typing')
            .onSnapshot((snapshot) => {
                const typingUsers = [];
                snapshot.forEach((doc) => {
                    if (doc.id !== this.app.currentUser?.uid && doc.data().isTyping) {
                        typingUsers.push(doc.id);
                    }
                });
                
                const indicator = document.getElementById('typing-indicator');
                if (typingUsers.length > 0) {
                    indicator?.classList.remove('hidden');
                } else {
                    indicator?.classList.add('hidden');
                }
            });
    }

    toggleEmojiPicker() {
        const picker = document.getElementById('emoji-picker');
        picker?.classList.toggle('hidden');
        if (picker && !picker.classList.contains('hidden')) {
            this.loadEmojiPicker();
        }
    }

    loadEmojiPicker() {
        const grid = document.getElementById('emoji-grid');
        if (!grid || grid.children.length > 0) return;
        
        const emojis = ['😀','😂','😍','🥰','😘','😜','🤔','😎','🤗','😢','😡','👍','👎','👏','🙌','💪',
                        '❤️','💔','🔥','⭐','🎉','🎊','🙏','✅','❌','💯','🤝','💩','👻','🤖','🎵','📸'];
        
        emojis.forEach(emoji => {
            const btn = document.createElement('button');
            btn.className = 'emoji-item';
            btn.textContent = emoji;
            btn.onclick = () => {
                const input = document.getElementById('message-input');
                input.value += emoji;
                input.focus();
                input.dispatchEvent(new Event('input'));
            };
            grid.appendChild(btn);
        });
    }

    toggleAttachmentMenu() {
        document.getElementById('attachment-menu')?.classList.toggle('hidden');
        document.getElementById('emoji-picker')?.classList.add('hidden');
    }

    cancelReply() {
        this.replyingTo = null;
        document.getElementById('reply-preview')?.classList.add('hidden');
    }

    toggleContactInfo() {
        document.getElementById('info-panel')?.classList.toggle('hidden');
    }

    shareLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const loc = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
                await this.sendLocationMessage(loc);
            }, () => {
                this.app.showToast('Location access denied', 'error');
            });
        }
    }

    async sendLocationMessage(locationUrl) {
        if (!this.currentChatId) return;
        await db.collection('chats').doc(this.currentChatId).collection('messages').add({
            type: 'location',
            content: locationUrl,
            senderId: this.app.currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    shareContact() {
        const phone = prompt('Enter contact phone number:');
        if (phone && this.currentChatId) {
            db.collection('chats').doc(this.currentChatId).collection('messages').add({
                type: 'contact',
                content: phone,
                senderId: this.app.currentUser.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }

    searchChats(query) {
        document.querySelectorAll('.chat-item').forEach(item => {
            const name = item.querySelector('.chat-item-name')?.textContent.toLowerCase() || '';
            const msg = item.querySelector('.chat-item-message')?.textContent.toLowerCase() || '';
            item.style.display = (name.includes(query.toLowerCase()) || msg.includes(query.toLowerCase())) ? 'flex' : 'none';
        });
    }

    getOtherParticipant() {
        if (!this.currentChatData || !this.app.currentUser) return null;
        return this.currentChatData.participants?.find(uid => uid !== this.app.currentUser.uid);
    }

    formatText(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:#027eb5;">$1</a>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatChatTime(date) {
        const now = new Date();
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
        }
        return date.toLocaleDateString();
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    scrollToBottom() {
        const container = document.getElementById('messages-container');
        if (container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
        }
    }

    cleanup() {
        if (this.unsubscribeMessages) this.unsubscribeMessages();
        if (this.unsubscribeChats) this.unsubscribeChats();
        if (this.unsubscribeTyping) this.unsubscribeTyping();
        if (this.mediaRecorder && this.isRecording) this.stopRecording();
    }
}

window.ChatManager = ChatManager;