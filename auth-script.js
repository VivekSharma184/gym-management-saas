// Authentication System JavaScript
class AuthSystem {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('authUsers')) || this.getDefaultUsers();
        this.currentUser = null;
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
        
        this.init();
    }

    init() {
        this.setupFormSwitching();
        this.setupFormValidation();
        this.setupPasswordToggle();
        this.setupDemoAccounts();
        this.checkExistingSession();
    }

    // Default users for demo
    getDefaultUsers() {
        return [
            {
                id: 'admin001',
                email: 'admin@gymflow.com',
                password: 'admin123', // In production, this would be hashed
                firstName: 'Super',
                lastName: 'Admin',
                role: 'admin',
                gymId: null,
                gymName: null,
                phone: '+91-9876543210',
                createdAt: '2024-01-01',
                lastLogin: null,
                isActive: true,
                permissions: ['all']
            },
            {
                id: 'gym001',
                email: 'john@powergym.com',
                password: 'gym123', // In production, this would be hashed
                firstName: 'John',
                lastName: 'Doe',
                role: 'gym-owner',
                gymId: 'gym1',
                gymName: 'PowerGym Fitness',
                phone: '+91-9876543211',
                createdAt: '2024-01-15',
                lastLogin: null,
                isActive: true,
                permissions: ['gym-management']
            },
            {
                id: 'gym002',
                email: 'jane@fitzone.com',
                password: 'gym123',
                firstName: 'Jane',
                lastName: 'Smith',
                role: 'gym-owner',
                gymId: 'gym2',
                gymName: 'FitZone Studio',
                phone: '+91-9876543212',
                createdAt: '2024-08-01',
                lastLogin: null,
                isActive: true,
                permissions: ['gym-management']
            },
            {
                id: 'demo001',
                email: 'demo@gymflow.com',
                password: 'demo123',
                firstName: 'Demo',
                lastName: 'User',
                role: 'gym-owner',
                gymId: 'demo',
                gymName: 'Demo Gym',
                phone: '+91-9876543213',
                createdAt: '2024-07-20',
                lastLogin: null,
                isActive: true,
                permissions: ['gym-management']
            }
        ];
    }

    // Form switching setup
    setupFormSwitching() {
        const showSignup = document.getElementById('show-signup');
        const showLogin = document.getElementById('show-login');
        const backToLogin = document.getElementById('back-to-login');
        const forgotPassword = document.querySelector('.forgot-password');

        showSignup?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('signup');
        });

        showLogin?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('login');
        });

        backToLogin?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('login');
        });

        forgotPassword?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('forgot');
        });
    }

    // Switch between forms
    switchForm(formType) {
        const forms = document.querySelectorAll('.auth-form');
        forms.forEach(form => form.classList.remove('active'));
        
        const targetForm = document.getElementById(`${formType}-form`);
        if (targetForm) {
            targetForm.classList.add('active');
        }
    }

    // Form validation setup
    setupFormValidation() {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const forgotForm = document.getElementById('forgot-form');

        loginForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        signupForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        forgotForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });

        // Real-time password strength checking
        const signupPassword = document.getElementById('signup-password');
        signupPassword?.addEventListener('input', (e) => {
            this.checkPasswordStrength(e.target.value);
        });

        // Confirm password validation
        const confirmPassword = document.getElementById('confirm-password');
        confirmPassword?.addEventListener('input', (e) => {
            this.validatePasswordMatch();
        });
    }

    // Password toggle setup
    setupPasswordToggle() {
        const toggleButtons = document.querySelectorAll('.toggle-password');
        
        toggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.dataset.target;
                const targetInput = document.getElementById(targetId);
                const icon = button.querySelector('i');
                
                if (targetInput.type === 'password') {
                    targetInput.type = 'text';
                    icon.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    targetInput.type = 'password';
                    icon.classList.replace('fa-eye-slash', 'fa-eye');
                }
            });
        });
    }

    // Demo accounts setup
    setupDemoAccounts() {
        const demoButtons = document.querySelectorAll('.demo-btn');
        
        demoButtons.forEach(button => {
            button.addEventListener('click', () => {
                const role = button.dataset.role;
                this.loginDemo(role);
            });
        });
    }

    // Handle login
    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me').checked;

        if (!this.validateEmail(email)) {
            this.showError('login-email', 'Please enter a valid email address');
            return;
        }

        if (!password) {
            this.showError('login-password', 'Password is required');
            return;
        }

        this.showLoading(true);

        try {
            // Simulate API call delay
            await this.delay(1500);

            const user = this.users.find(u => u.email === email && u.password === password);
            
            if (!user) {
                this.showLoading(false);
                this.showError('login-email', 'Invalid email or password');
                this.shakeForm();
                return;
            }

            if (!user.isActive) {
                this.showLoading(false);
                this.showError('login-email', 'Your account has been suspended');
                return;
            }

            // Update last login
            user.lastLogin = new Date().toISOString();
            this.saveUsers();

            // Create session
            this.createSession(user, rememberMe);
            
            this.showLoading(false);
            this.showSuccess('Welcome back!', () => {
                this.redirectUser(user);
            });

        } catch (error) {
            this.showLoading(false);
            this.showError('login-email', 'Login failed. Please try again.');
        }
    }

    // Handle signup
    async handleSignup() {
        const firstName = document.getElementById('signup-firstname').value;
        const lastName = document.getElementById('signup-lastname').value;
        const email = document.getElementById('signup-email').value;
        const gymName = document.getElementById('gym-name').value;
        const phone = document.getElementById('phone-number').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const agreeTerms = document.getElementById('agree-terms').checked;

        // Validation
        if (!firstName || !lastName) {
            this.showError('signup-firstname', 'First and last name are required');
            return;
        }

        if (!this.validateEmail(email)) {
            this.showError('signup-email', 'Please enter a valid email address');
            return;
        }

        if (this.users.find(u => u.email === email)) {
            this.showError('signup-email', 'An account with this email already exists');
            return;
        }

        if (!gymName) {
            this.showError('gym-name', 'Gym name is required');
            return;
        }

        if (!this.validatePhone(phone)) {
            this.showError('phone-number', 'Please enter a valid phone number');
            return;
        }

        if (!this.validatePassword(password)) {
            this.showError('signup-password', 'Password must be at least 8 characters with uppercase, lowercase, and number');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('confirm-password', 'Passwords do not match');
            return;
        }

        if (!agreeTerms) {
            this.showError('agree-terms', 'You must agree to the terms of service');
            return;
        }

        this.showLoading(true);

        try {
            // Simulate API call delay
            await this.delay(2000);

            // Create new user
            const newUser = {
                id: 'gym' + Date.now(),
                email,
                password, // In production, this would be hashed
                firstName,
                lastName,
                role: 'gym-owner',
                gymId: 'gym' + Date.now(),
                gymName,
                phone,
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true,
                permissions: ['gym-management']
            };

            this.users.push(newUser);
            this.saveUsers();

            // Create session
            this.createSession(newUser, false);
            
            this.showLoading(false);
            this.showSuccess(`Welcome to GymFlow, ${firstName}! Your account has been created successfully.`, () => {
                this.redirectUser(newUser);
            });

        } catch (error) {
            this.showLoading(false);
            this.showError('signup-email', 'Registration failed. Please try again.');
        }
    }

    // Handle forgot password
    async handleForgotPassword() {
        const email = document.getElementById('forgot-email').value;

        if (!this.validateEmail(email)) {
            this.showError('forgot-email', 'Please enter a valid email address');
            return;
        }

        const user = this.users.find(u => u.email === email);
        if (!user) {
            this.showError('forgot-email', 'No account found with this email address');
            return;
        }

        this.showLoading(true);

        try {
            // Simulate API call delay
            await this.delay(1500);

            this.showLoading(false);
            this.showSuccess('Password reset instructions have been sent to your email.', () => {
                this.switchForm('login');
            });

        } catch (error) {
            this.showLoading(false);
            this.showError('forgot-email', 'Failed to send reset email. Please try again.');
        }
    }

    // Demo login
    async loginDemo(role) {
        this.showLoading(true);

        try {
            await this.delay(1000);

            let user;
            if (role === 'admin') {
                user = this.users.find(u => u.role === 'admin');
            } else {
                user = this.users.find(u => u.role === 'gym-owner' && u.gymId === 'demo');
            }

            if (user) {
                user.lastLogin = new Date().toISOString();
                this.saveUsers();
                this.createSession(user, false);
                
                this.showLoading(false);
                this.showSuccess(`Welcome to ${role === 'admin' ? 'Super Admin' : 'Gym Owner'} Demo!`, () => {
                    this.redirectUser(user);
                });
            }

        } catch (error) {
            this.showLoading(false);
            this.showError('login-email', 'Demo login failed. Please try again.');
        }
    }

    // Create user session
    createSession(user, rememberMe) {
        const session = {
            userId: user.id,
            email: user.email,
            role: user.role,
            gymId: user.gymId,
            gymName: user.gymName,
            firstName: user.firstName,
            lastName: user.lastName,
            permissions: user.permissions,
            loginTime: Date.now(),
            expiresAt: Date.now() + this.sessionTimeout
        };

        const storageType = rememberMe ? localStorage : sessionStorage;
        storageType.setItem('gymflowSession', JSON.stringify(session));
        
        this.currentUser = session;
    }

    // Check existing session
    checkExistingSession() {
        const session = localStorage.getItem('gymflowSession') || sessionStorage.getItem('gymflowSession');
        
        if (session) {
            try {
                const sessionData = JSON.parse(session);
                
                if (sessionData.expiresAt > Date.now()) {
                    this.currentUser = sessionData;
                    this.redirectUser(sessionData);
                    return;
                }
            } catch (error) {
                console.error('Invalid session data');
            }
        }
        
        // Clear invalid session
        localStorage.removeItem('gymflowSession');
        sessionStorage.removeItem('gymflowSession');
    }

    // Redirect user based on role
    redirectUser(user) {
        if (user.role === 'admin') {
            window.location.href = '/admin';
        } else {
            window.location.href = `/${user.gymId}`;
        }
    }

    // Validation functions
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }

    validatePassword(password) {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    }

    validatePasswordMatch() {
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const confirmInput = document.getElementById('confirm-password');
        
        if (confirmPassword && password !== confirmPassword) {
            this.showError('confirm-password', 'Passwords do not match');
            return false;
        } else if (confirmPassword && password === confirmPassword) {
            this.clearError('confirm-password');
            return true;
        }
    }

    // Password strength checker
    checkPasswordStrength(password) {
        const strengthBar = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');
        
        let strength = 0;
        let text = 'Very weak';
        
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[@$!%*?&]/.test(password)) strength++;
        
        strengthBar.className = 'strength-fill';
        
        switch (strength) {
            case 0:
            case 1:
                strengthBar.classList.add('weak');
                text = 'Very weak';
                break;
            case 2:
                strengthBar.classList.add('weak');
                text = 'Weak';
                break;
            case 3:
                strengthBar.classList.add('fair');
                text = 'Fair';
                break;
            case 4:
                strengthBar.classList.add('good');
                text = 'Good';
                break;
            case 5:
                strengthBar.classList.add('strong');
                text = 'Strong';
                break;
        }
        
        strengthText.textContent = text;
    }

    // UI Helper functions
    showError(inputId, message) {
        const input = document.getElementById(inputId);
        const inputGroup = input?.closest('.input-group');
        
        if (inputGroup) {
            inputGroup.classList.add('error');
            inputGroup.classList.remove('success');
            
            let errorMsg = inputGroup.parentNode.querySelector('.error-message');
            if (!errorMsg) {
                errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                inputGroup.parentNode.appendChild(errorMsg);
            }
            
            errorMsg.textContent = message;
            errorMsg.classList.add('show');
        }
    }

    clearError(inputId) {
        const input = document.getElementById(inputId);
        const inputGroup = input?.closest('.input-group');
        
        if (inputGroup) {
            inputGroup.classList.remove('error');
            inputGroup.classList.add('success');
            
            const errorMsg = inputGroup.parentNode.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.classList.remove('show');
            }
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    }

    showSuccess(message, callback) {
        const modal = document.getElementById('success-modal');
        const messageEl = document.getElementById('success-message');
        const continueBtn = document.getElementById('continue-btn');
        
        messageEl.textContent = message;
        modal.classList.add('show');
        
        continueBtn.onclick = () => {
            modal.classList.remove('show');
            if (callback) callback();
        };
    }

    shakeForm() {
        const activeForm = document.querySelector('.auth-form.active');
        activeForm.classList.add('shake');
        setTimeout(() => {
            activeForm.classList.remove('shake');
        }, 500);
    }

    saveUsers() {
        localStorage.setItem('authUsers', JSON.stringify(this.users));
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Logout function (to be called from other pages)
    static logout() {
        localStorage.removeItem('gymflowSession');
        sessionStorage.removeItem('gymflowSession');
        window.location.href = '/auth';
    }

    // Get current session (to be called from other pages)
    static getCurrentSession() {
        const session = localStorage.getItem('gymflowSession') || sessionStorage.getItem('gymflowSession');
        
        if (session) {
            try {
                const sessionData = JSON.parse(session);
                
                if (sessionData.expiresAt > Date.now()) {
                    return sessionData;
                }
            } catch (error) {
                console.error('Invalid session data');
            }
        }
        
        return null;
    }

    // Check if user is authenticated (to be called from other pages)
    static requireAuth(requiredRole = null) {
        const session = AuthSystem.getCurrentSession();
        
        if (!session) {
            window.location.href = '/auth';
            return false;
        }
        
        if (requiredRole && session.role !== requiredRole) {
            window.location.href = '/auth';
            return false;
        }
        
        return session;
    }
}

// Initialize authentication system
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthSystem;
}
