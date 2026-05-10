// MICHO MESSENGER - Main Application
class MichoApp {
    constructor() {
        this.currentUser = null;
        this.currentChat = null;
        this.emojiPicker = null;
        
        // DOM Elements
        this.loadingScreen = document.getElementById('loading-screen');
        this.loginScreen = document.getElementById('login-screen');
        this.chatScreen = document.getElementById('chat-screen');
        this.toastContainer = document.getElementById('toast-container');
        
        this.init();
    }

    init() {
        this.setupAuth();
        this.setupEventListeners();
        this.setupResponsive();
        this.checkAuthState();
        this.hideLoadingAfterDelay();
    }

    hideLoadingAfterDelay() {
        setTimeout(() => {
            this.loadingScreen.classList.add('hidden');
        }, 2000);
    }

    checkAuthState() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.showChatScreen();
                this.initializeChat();
                this.setupUserPresence(user);
            } else {
                this.currentUser = null;
                this.showLoginScreen();
            }
        });
    }

    setupAuth() {
        // Phone number input handling
        const phoneInput = document.getElementById('phone-number');
        const countrySelect = document.getElementById('country-code');
        const phonePrefix = document.getElementById('phone-prefix');
        
        // Update prefix when country changes
        countrySelect.addEventListener('change', () => {
            phonePrefix.textContent = countrySelect.value;
            phoneInput.value = '';
            phoneInput.focus();
        });

        // Send verification code
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendVerificationCode();
        });

        // Back button
        document.getElementById('btn-back-phone').addEventListener('click', () => {
            this.showPhoneInput();
        });

        // Verify code
        document.getElementById('btn-verify').addEventListener('click', () => {
            this.verifyCode();
        });

        // Resend code
        document.getElementById('btn-resend').addEventListener('click', () => {
            this.resendCode();
        });

        // Code input handling
        this.setupCodeInputs();

        // Logout
        document.getElementById('menu-logout')?.addEventListener('click', () => {
            this.logout();
        });
    }

    setupCodeInputs() {
        const inputs = document.querySelectorAll('.code-digit');
        
        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const val = e.target.value;
                if (val && /^\d$/.test(val)) {
                    input.classList.add('filled');
                    if (index < inputs.length - 1) {
                        inputs[index + 1].focus();
                    }
                } else {
                    input.classList.remove('filled');
                }
                this.checkCodeComplete();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && index > 0) {
                    inputs[index - 1].focus();
                }
            });

            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                paste.split('').forEach((char, i) => {
                    if (inputs[i]) {
                        inputs[i].value = char;
                        inputs[i].classList.add('filled');
                    }
                });
                if (paste.length === 6) this.checkCodeComplete();
            });
        });
    }

    checkCodeComplete() {
        const inputs = document.querySelectorAll('.code-digit');
        const code = Array.from(inputs).map(i => i.value).join('');
        const btnVerify = document.getElementById('btn-verify');
        
        if (code.length === 6) {
            btnVerify.disabled = false;
            // Auto-verify
            setTimeout(() => {
                if (code.length === 6) this.verifyCode();
            }, 500);
        } else {
            btnVerify.disabled = true;
        }
    }

    getVerificationCode() {
        return Array.from(document.querySelectorAll('.code-digit')).map(i => i.value).join('');
    }

    async sendVerificationCode() {
        const countryCode = document.getElementById('country-code').value;
        const phoneNumber = document.getElementById('phone-number').value.replace(/\D/g, '');
        
        if (!phoneNumber) {
            this.showToast('Please enter your phone number', 'error');
            return;
        }

        const fullNumber = countryCode + phoneNumber;
        const btnSend = document.getElementById('btn-send-code');
        btnSend.disabled = true;
        btnSend.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Sending...</span>';

        try {
            // Initialize recaptcha if not exists
            if (!window.recaptchaVerifier) {
                window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                    size: 'invisible',
                    callback: () => console.log('reCAPTCHA solved')
                });
            }

            const confirmation = await auth.signInWithPhoneNumber(fullNumber, window.recaptchaVerifier);
            window.confirmationResult = confirmation;
            
            // Show verification section
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('verification-section').classList.remove('hidden');
            document.getElementById('display-phone').textContent = fullNumber;
            
            this.showToast('Verification code sent!', 'success');
            this.startResendTimer();
            
            // Focus first input
            document.querySelector('.code-digit').focus();
            
        } catch (error) {
            console.error('Error sending code:', error);
            const msg = error.code === 'auth/invalid-phone-number' 
                ? 'Invalid phone number. Please check and try again.'
                : error.message || 'Error sending code. Please try again.';
            this.showToast(msg, 'error');
        } finally {
            btnSend.disabled = false;
            btnSend.innerHTML = '<i class="fas fa-paper-plane"></i><span>Send Code</span>';
        }
    }

    async verifyCode() {
        const code = this.getVerificationCode();
        if (code.length !== 6) {
            this.showToast('Please enter the 6-digit code', 'error');
            return;
        }

        if (!window.confirmationResult) {
            this.showToast('Please request a new code', 'error');
            return;
        }

        const btnVerify = document.getElementById('btn-verify');
        btnVerify.disabled = true;
        btnVerify.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Verifying...</span>';

        try {
            const result = await window.confirmationResult.confirm(code);
            const user = result.user;
            
            // Save user to Firestore
            await db.collection('users').doc(user.uid).set({
                phoneNumber: user.phoneNumber,
                uid: user.uid,
                displayName: 'MICHO User',
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                online: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            this.showToast('Welcome to MICHO MESSENGER! 🎉', 'success');
            
        } catch (error) {
            console.error('Error verifying code:', error);
            document.getElementById('code-error').classList.remove('hidden');
            document.getElementById('code-error').querySelector('span').textContent = 
                'Invalid code. Please try again.';
            
            // Clear inputs
            document.querySelectorAll('.code-digit').forEach(i => {
                i.value = '';
                i.classList.remove('filled');
            });
            document.querySelector('.code-digit').focus();
            
        } finally {
            btnVerify.disabled = false;
            btnVerify.innerHTML = '<i class="fas fa-check-circle"></i><span>Verify & Continue</span>';
        }
    }

    async resendCode() {
        this.showPhoneInput();
        setTimeout(() => this.sendVerificationCode(), 300);
    }

    startResendTimer() {
        let seconds = 30;
        const btnResend = document.getElementById('btn-resend');
        const timerSpan = document.getElementById('resend-timer');
        
        btnResend.disabled = true;
        
        const interval = setInterval(() => {
            seconds--;
            timerSpan.textContent = `(${seconds}s)`;
            
            if (seconds <= 0) {
                clearInterval(interval);
                btnResend.disabled = false;
                timerSpan.textContent = '';
            }
        }, 1000);
    }

    showPhoneInput() {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('verification-section').classList.add('hidden');
        document.getElementById('code-error').classList.add('hidden');
        document.querySelectorAll('.code-digit').forEach(i => {
            i.value = '';
            i.classList.remove('filled');
        });
    }

    setupUserPresence(user) {
        const userRef = db.collection('users').doc(user.uid);
        
        userRef.update({
            online: true,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {
            userRef.set({
                online: true,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        });

        userRef.onDisconnect().update({
            online: false,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    async logout() {
        try {
            if (this.currentUser) {
                await db.collection('users').doc(this.currentUser.uid).update({
                    online: false,
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            await auth.signOut();
            this.currentChat = null;
            this.showToast('Logged out successfully', 'info');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    showLoginScreen() {
        this.loginScreen.classList.add('active');
        this.chatScreen.classList.remove('active');
    }

    showChatScreen() {
        this.loginScreen.classList.remove('active');
        this.chatScreen.classList.add('active');
        
        // Update sidebar user info
        if (this.currentUser) {
            document.getElementById('sidebar-name').textContent = 'MICHO User';
            document.getElementById('sidebar-phone').textContent = this.currentUser.phoneNumber || '';
            document.getElementById('sidebar-status').classList.add('online');
        }
    }

    initializeChat() {
        // Initialize chat manager
        if (!window.chatManager) {
            window.chatManager = new ChatManager(this);
        } else {
            window.chatManager.init(this);
        }
    }

    setupEventListeners() {
        // New chat button
        document.getElementById('btn-new-chat')?.addEventListener('click', () => {
            document.getElementById('new-chat-modal').classList.remove('hidden');
        });

        document.getElementById('btn-close-modal')?.addEventListener('click', () => {
            document.getElementById('new-chat-modal').classList.add('hidden');
        });

        document.getElementById('btn-start-chat')?.addEventListener('click', () => {
            this.startNewChat();
        });

        // Close on overlay click
        document.getElementById('new-chat-modal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                e.currentTarget.classList.add('hidden');
            }
        });

        // Menu toggle
        document.getElementById('btn-menu-toggle')?.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('main-menu').classList.toggle('hidden');
        });

        // Close menus on outside click
        document.addEventListener('click', () => {
            document.getElementById('main-menu')?.classList.add('hidden');
            document.getElementById('chat-menu')?.classList.add('hidden');
        });

        // Voice/Video call buttons
        document.getElementById('btn-voice-call')?.addEventListener('click', () => {
            this.startCall('voice');
        });

        document.getElementById('btn-video-call')?.addEventListener('click', () => {
            this.startCall('video');
        });

        // Back button (mobile)
        document.getElementById('btn-back-chat')?.addEventListener('click', () => {
            if (window.chatManager) window.chatManager.closeChat();
        });

        // Search
        const searchInput = document.getElementById('search-input');
        searchInput?.addEventListener('input', (e) => {
            this.searchChats(e.target.value);
            document.getElementById('btn-clear-search').classList.toggle('hidden', !e.target.value);
        });

        document.getElementById('btn-clear-search')?.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            searchInput.focus();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                document.getElementById('btn-new-chat')?.click();
            }
            if (e.key === 'Escape') {
                document.getElementById('new-chat-modal')?.classList.add('hidden');
            }
        });
    }

    async startNewChat() {
        const phoneInput = document.getElementById('new-chat-phone');
        const phone = phoneInput.value.trim();
        
        if (!phone) {
            this.showToast('Please enter a phone number', 'error');
            return;
        }

        try {
            const snapshot = await db.collection('users')
                .where('phoneNumber', '==', phone)
                .limit(1)
                .get();

            if (snapshot.empty) {
                this.showToast('User not found. They need to sign up first.', 'error');
                return;
            }

            const otherUser = snapshot.docs[0];
            const chatData = {
                participants: [this.currentUser.uid, otherUser.id],
                name: phone,
                lastMessage: '',
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                unreadCount: { [this.currentUser.uid]: 0, [otherUser.id]: 0 }
            };

            const doc = await db.collection('chats').add(chatData);
            
            document.getElementById('new-chat-modal').classList.add('hidden');
            phoneInput.value = '';
            
            if (window.chatManager) {
                window.chatManager.openChat(doc.id, { id: doc.id, ...chatData });
            }

        } catch (error) {
            console.error('Error starting chat:', error);
            this.showToast('Error creating chat', 'error');
        }
    }

    startCall(type) {
        if (!this.currentChat) return;
        
        // Create call document in Firestore
        const callData = {
            type: type,
            callerId: this.currentUser.uid,
            receiverId: window.chatManager?.currentChatData?.participants?.find(
                uid => uid !== this.currentUser.uid
            ),
            status: 'initiated',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection('calls').add(callData).then((doc) => {
            // Open call interface
            this.openCallInterface(doc.id, type);
        }).catch(error => {
            console.error('Error starting call:', error);
            this.showToast('Error starting call', 'error');
        });
    }

    openCallInterface(callId, type) {
        // Store call ID for reference
        this.currentCallId = callId;
        
        // Redirect to call page or show call UI
        if (type === 'voice') {
            window.location.href = `call.html?id=${callId}&type=voice`;
        } else {
            window.location.href = `call.html?id=${callId}&type=video`;
        }
    }

    searchChats(query) {
        if (window.chatManager) {
            window.chatManager.searchChats(query);
        }
    }

    setupResponsive() {
        const handleResize = () => {
            const width = window.innerWidth;
            const mainChat = document.getElementById('main-chat');
            const sidebar = document.getElementById('sidebar');
            
            if (width <= 768) {
                if (mainChat?.classList.contains('active')) {
                    sidebar.style.display = 'none';
                } else {
                    sidebar.style.display = 'flex';
                }
            } else {
                sidebar.style.display = 'flex';
                mainChat?.classList.add('active');
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();
    }

    showToast(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-removing');
            setTimeout(() => toast.remove(), 300);
        }, duration);

        toast.addEventListener('click', () => {
            toast.classList.add('toast-removing');
            setTimeout(() => toast.remove(), 300);
        });
    }
}

// Chat Manager Class
class ChatManager {
    constructor(app) {
        this.app = app;
        this.currentChat = null;
        this.currentChatData = null;
        this.unsubscribeMessages = null;
        this.unsubscribeChats = null;
        
        this.init(app);
    }

    init(app) {
        this.app = app;
        this.loadChats();
        this.setupMessageInput();
    }

    async loadChats() {
        const chatList = document.getElementById('chat-list');
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
                        <small>Start a new chat to begin messaging</small>
                    </div>`;
                return;
            }

            snapshot.forEach((doc) => {
                const chat = { id: doc.id, ...doc.data() };
                this.renderChatItem(chat);
            });
        });
    }

    renderChatItem(chat) {
        const chatList = document.getElementById('chat-list');
        const item = document.createElement('div');
        item.className = `chat-item ${this.currentChat === chat.id ? 'active' : ''}`;
        
        const time = chat.lastMessageTime?.toDate();
        const timeStr = time ? this.formatTime(time) : '';
        const unread = chat.unreadCount?.[this.app.currentUser.uid] || 0;

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
                    <span class="chat-item-message">${chat.lastMessage || 'No messages'}</span>
                    ${unread > 0 ? `<span class="chat-item-badge">${unread}</span>` : ''}
                </div>
            </div>
        `;

        item.addEventListener('click', () => this.openChat(chat.id, chat));
        chatList.appendChild(item);
    }

    async openChat(chatId, chatData = null) {
        if (this.unsubscribeMessages) {
            this.unsubscribeMessages();
        }

        this.currentChat = chatId;

        if (!chatData) {
            const doc = await db.collection('chats').doc(chatId).get();
            chatData = { id: doc.id, ...doc.data() };
        }

        this.currentChatData = chatData;

        // Update UI
        document.getElementById('chat-empty-state').classList.add('hidden');
        document.getElementById('chat-header').classList.remove('hidden');
        document.getElementById('message-input-area').classList.remove('hidden');
        document.getElementById('contact-name').textContent = chatData.name || 'Unknown';
        document.getElementById('message-input').disabled = false;

        // Update active chat item
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
            if (item.querySelector('.chat-item-name')?.textContent === chatData.name) {
                item.classList.add('active');
            }
        });

        // Mark as read
        await db.collection('chats').doc(chatId).update({
            [`unreadCount.${this.app.currentUser.uid}`]: 0
        });

        // Load messages
        this.loadMessages(chatId);

        // Mobile: show chat
        if (window.innerWidth <= 768) {
            document.getElementById('main-chat').classList.add('active');
            document.getElementById('sidebar').style.display = 'none';
        }

        document.getElementById('message-input').focus();
    }

    loadMessages(chatId) {
        const container = document.getElementById('messages-container');
        container.innerHTML = '';

        this.unsubscribeMessages = db.collection('chats').doc(chatId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot((snapshot) => {
                container.innerHTML = `
                    <div class="messages-encryption-notice">
                        <i class="fas fa-lock"></i>
                        <span>Messages are end-to-end encrypted</span>
                    </div>`;
                
                snapshot.forEach((doc) => {
                    const msg = { id: doc.id, ...doc.data() };
                    this.renderMessage(msg);
                });

                container.scrollTop = container.scrollHeight;
            });
    }

    renderMessage(msg) {
        const container = document.getElementById('messages-container');
        const isSent = msg.senderId === this.app.currentUser.uid;
        
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${isSent ? 'sent' : 'received'}`;

        const time = msg.timestamp?.toDate();
        const timeStr = time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

        let content = msg.text || msg.content || '';
        
        if (msg.type === 'image') {
            content = `<img src="${msg.content}" style="max-width:250px;border-radius:4px;" onclick="window.open('${msg.content}')">`;
        } else if (msg.type === 'voice') {
            content = `<i class="fas fa-microphone"></i> Voice message (${msg.duration || 0}s)`;
        } else if (msg.type === 'call') {
            content = `<i class="fas fa-${msg.callType === 'video' ? 'video' : 'phone'}"></i> ${msg.callType === 'video' ? 'Video' : 'Voice'} call`;
        }

        wrapper.innerHTML = `
            <div class="message-bubble">
                <div class="message-text">${content}</div>
                <div class="message-meta">
                    <span class="message-time">${timeStr}</span>
                    ${isSent ? '<span class="message-status">✓</span>' : ''}
                </div>
            </div>
        `;

        container.appendChild(wrapper);
    }

    setupMessageInput() {
        const input = document.getElementById('message-input');
        const sendBtn = document.getElementById('btn-send-message');
        const voiceBtn = document.getElementById('btn-voice-record');

        input.addEventListener('input', () => {
            const hasText = input.value.trim().length > 0;
            sendBtn.classList.toggle('hidden', !hasText);
            voiceBtn.classList.toggle('hidden', hasText);
        });

        sendBtn.addEventListener('click', () => this.sendMessage());
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const text = input.value.trim();

        if (!text || !this.currentChat) return;

        try {
            await db.collection('chats').doc(this.currentChat)
                .collection('messages').add({
                    text: text,
                    senderId: this.app.currentUser.uid,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    type: 'text'
                });

            await db.collection('chats').doc(this.currentChat).update({
                lastMessage: text,
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp()
            });

            input.value = '';
            input.dispatchEvent(new Event('input'));
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.app.showToast('Error sending message', 'error');
        }
    }

    closeChat() {
        this.currentChat = null;
        this.currentChatData = null;
        
        if (this.unsubscribeMessages) {
            this.unsubscribeMessages();
        }

        document.getElementById('chat-empty-state').classList.remove('hidden');
        document.getElementById('chat-header').classList.add('hidden');
        document.getElementById('message-input-area').classList.add('hidden');
        document.getElementById('message-input').value = '';
        document.getElementById('message-input').disabled = true;

        if (window.innerWidth <= 768) {
            document.getElementById('main-chat').classList.remove('active');
            document.getElementById('sidebar').style.display = 'flex';
        }
    }

    searchChats(query) {
        document.querySelectorAll('.chat-item').forEach(item => {
            const name = item.querySelector('.chat-item-name')?.textContent.toLowerCase() || '';
            const msg = item.querySelector('.chat-item-message')?.textContent.toLowerCase() || '';
            const match = name.includes(query.toLowerCase()) || msg.includes(query.toLowerCase());
            item.style.display = match ? 'flex' : 'none';
        });
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 86400000 && date.getDate() === now.getDate()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 172800000) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.michoApp = new MichoApp();
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('Service Worker registered'))
            .catch((err) => console.log('SW registration failed:', err));
    });
}