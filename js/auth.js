// MICHO MESSENGER - Authentication Module
class AuthManager {
    constructor(app) {
        this.app = app;
        this.verificationId = null;
        this.resendTimer = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const countrySelect = document.getElementById('country-code');
        const phonePrefix = document.getElementById('phone-prefix');
        
        countrySelect.addEventListener('change', () => {
            phonePrefix.textContent = countrySelect.value;
        });

        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendVerificationCode();
        });

        document.getElementById('btn-verify').addEventListener('click', () => {
            this.verifyCode();
        });

        document.getElementById('btn-resend').addEventListener('click', () => {
            this.resendCode();
        });

        document.getElementById('btn-back-phone').addEventListener('click', () => {
            this.showPhoneInput();
        });

        this.setupCodeInputs();
    }

    setupCodeInputs() {
        const inputs = document.querySelectorAll('.code-digit');
        
        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const val = e.target.value.replace(/\D/g, '');
                e.target.value = val;
                
                if (val) {
                    input.classList.add('filled');
                    if (index < inputs.length - 1) inputs[index + 1].focus();
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
                const paste = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
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
        const code = Array.from(document.querySelectorAll('.code-digit')).map(i => i.value).join('');
        document.getElementById('btn-verify').disabled = code.length !== 6;
    }

    getCode() {
        return Array.from(document.querySelectorAll('.code-digit')).map(i => i.value).join('');
    }

    async sendVerificationCode() {
        const countryCode = document.getElementById('country-code').value;
        const phoneNumber = document.getElementById('phone-number').value.replace(/\D/g, '');
        
        if (!phoneNumber) {
            this.app.showToast('Please enter your phone number', 'error');
            return;
        }

        const fullNumber = countryCode + phoneNumber;
        const btnSend = document.getElementById('btn-send-code');
        btnSend.disabled = true;
        btnSend.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

        try {
            if (!window.recaptchaVerifier) {
                window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                    size: 'invisible'
                });
            }

            const confirmation = await auth.signInWithPhoneNumber(fullNumber, window.recaptchaVerifier);
            window.confirmationResult = confirmation;
            
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('verification-section').classList.remove('hidden');
            document.getElementById('display-phone').textContent = fullNumber;
            
            this.app.showToast('Code sent! Check your phone', 'success');
            this.startResendTimer();
            
            setTimeout(() => document.querySelector('.code-digit').focus(), 300);
            
        } catch (error) {
            console.error('Send code error:', error);
            this.app.showToast(error.message || 'Error sending code', 'error');
        } finally {
            btnSend.disabled = false;
            btnSend.innerHTML = '<i class="fas fa-paper-plane"></i> Send Code';
        }
    }

    async verifyCode() {
        const code = this.getCode();
        if (code.length !== 6) return;

        if (!window.confirmationResult) {
            this.app.showToast('Session expired. Please request new code.', 'error');
            this.showPhoneInput();
            return;
        }

        const btnVerify = document.getElementById('btn-verify');
        btnVerify.disabled = true;
        btnVerify.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

        try {
            const result = await window.confirmationResult.confirm(code);
            // User authenticated - handled by auth state listener
        } catch (error) {
            console.error('Verify error:', error);
            const errorDiv = document.getElementById('code-error');
            errorDiv.classList.remove('hidden');
            errorDiv.querySelector('span').textContent = 'Invalid code. Please try again.';
            
            document.querySelectorAll('.code-digit').forEach(i => {
                i.value = '';
                i.classList.remove('filled');
            });
            document.querySelector('.code-digit').focus();
        } finally {
            btnVerify.disabled = false;
            btnVerify.innerHTML = '<i class="fas fa-check-circle"></i> Verify & Continue';
        }
    }

    resendCode() {
        this.showPhoneInput();
        setTimeout(() => this.sendVerificationCode(), 500);
    }

    startResendTimer() {
        let seconds = 30;
        const btnResend = document.getElementById('btn-resend');
        const timerSpan = document.getElementById('resend-timer');
        
        if (this.resendTimer) clearInterval(this.resendTimer);
        btnResend.disabled = true;
        
        this.resendTimer = setInterval(() => {
            seconds--;
            timerSpan.textContent = `(${seconds}s)`;
            if (seconds <= 0) {
                clearInterval(this.resendTimer);
                btnResend.disabled = false;
                timerSpan.textContent = '';
            }
        }, 1000);
    }

    showPhoneInput() {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('verification-section').classList.add('hidden');
        document.getElementById('code-error')?.classList.add('hidden');
        document.querySelectorAll('.code-digit').forEach(i => {
            i.value = '';
            i.classList.remove('filled');
        });
    }
}

window.AuthManager = AuthManager;