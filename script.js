// Gym Management App JavaScript

// Authentication check for gym owners
function checkGymAuthentication() {
    const session = localStorage.getItem('gymflowSession') || sessionStorage.getItem('gymflowSession');
    
    if (!session) {
        window.location.href = '/auth';
        return null;
    }
    
    try {
        const sessionData = JSON.parse(session);
        
        // Check if session is expired
        if (sessionData.expiresAt <= Date.now()) {
            localStorage.removeItem('gymflowSession');
            sessionStorage.removeItem('gymflowSession');
            window.location.href = '/auth';
            return null;
        }
        
        // Check if user has gym-owner role
        if (sessionData.role !== 'gym-owner') {
            window.location.href = '/auth';
            return null;
        }
        
        // Check if user's gym matches current tenant
        const currentTenant = window.location.pathname.match(/^\/([^\/]+)/)?.[1] || 'demo';
        if (sessionData.gymId !== currentTenant) {
            window.location.href = `/${sessionData.gymId}`;
            return null;
        }
        
        return sessionData;
    } catch (error) {
        console.error('Invalid session data');
        window.location.href = '/auth';
        return null;
    }
}

// Tenant Configuration
class TenantConfig {
    constructor() {
        this.tenantId = this.getTenantFromURL();
        this.apiBaseUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3001/api' 
            : 'https://gymflow-btfvaaeqb2dac2bw.centralindia-01.azurewebsites.net/api';
        this.currentUser = this.getCurrentUser();
        
        // Only redirect to auth if we're not already on auth page and no user session
        if (!this.currentUser && !window.location.pathname.includes('/auth')) {
            console.log('No user session found, redirecting to auth page');
            window.location.href = '/auth';
            return;
        }
        
        this.isOnline = navigator.onLine;
        
        // Update online status
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('App is online - syncing data...');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('App is offline - using local storage...');
        });
    }
    
    getTenantFromURL() {
        // Extract tenant from URL path: /gym1, /gym2, etc.
        const path = window.location.pathname;
        const tenantMatch = path.match(/^\/([^\/]+)/);
        return tenantMatch ? tenantMatch[1] : 'demo';
    }

    getCurrentUser() {
        // Get current user from session storage
        const session = localStorage.getItem('gymflowSession') || sessionStorage.getItem('gymflowSession');
        
        if (!session) {
            console.log('No session found in storage');
            return null;
        }

        try {
            const sessionData = JSON.parse(session);
            
            // Check if session is expired
            if (sessionData.expiresAt && sessionData.expiresAt <= Date.now()) {
                console.log('Session expired, clearing storage');
                localStorage.removeItem('gymflowSession');
                sessionStorage.removeItem('gymflowSession');
                return null;
            }
            
            console.log('Valid session found for user:', sessionData.user?.email);
            return sessionData.user || null;
        } catch (error) {
            console.error('Failed to parse session data:', error);
            localStorage.removeItem('gymflowSession');
            sessionStorage.removeItem('gymflowSession');
            return null;
        }
    }

    extractTenantId(req) {
        // For frontend compatibility with backend API structure
        return this.tenantId;
    }
    
    async apiCall(endpoint, options = {}) {
        if (!this.isOnline) {
            throw new Error('Offline - using local storage');
        }
        
        // Get auth token
        const session = localStorage.getItem('gymflowSession') || sessionStorage.getItem('gymflowSession');
        let authToken = null;
        
        if (session) {
            try {
                const sessionData = JSON.parse(session);
                authToken = sessionData.token;
            } catch (error) {
                console.error('Failed to parse session:', error);
            }
        }
        
        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId,
                ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
                ...options.headers
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('gymflowSession');
                sessionStorage.removeItem('gymflowSession');
                window.location.href = '/auth';
                return;
            }
            throw new Error(`API call failed: ${response.statusText}`);
        }
        
        return response.json();
    }
}

class GymApp {
    constructor() {
        this.tenant = new TenantConfig();
        this.members = [];
        this.plans = [];
        this.trainers = [];
        
        this.init();
    }

    async init() {
        // Show loading indicator
        this.showLoading(true);
        
        try {
            // Load data from cloud or fallback to local
            await this.loadTenantData();
        } catch (error) {
            console.error('Failed to load cloud data, using local storage:', error);
            this.loadFromLocalStorage();
        }
        
        this.setupNavigation();
        this.setupModals();
        this.setupForms();
        this.setupSearch();
        this.setupSecurity();
        this.loadDashboard();
        this.loadMembers();
        this.loadPlans();
        this.loadTrainers();
        this.setupCharts();
        
        // Hide loading indicator
        this.showLoading(false);
        
        // Show tenant info
        this.showTenantInfo();
    }

    // Security Setup
    setupSecurity() {
        this.displayUserInfo();
        this.setupLogout();
        this.startSessionTimer();
        this.setupInactivityDetection();
        this.setupSecurityHeaders();
    }

    // Display user information in header
    displayUserInfo() {
        if (this.tenant.currentUser) {
            const userName = document.getElementById('userName');
            const gymName = document.getElementById('gymName');
            
            if (userName) {
                userName.textContent = `${this.tenant.currentUser.firstName} ${this.tenant.currentUser.lastName}`;
            }
            if (gymName) {
                gymName.textContent = this.tenant.currentUser.gymName || 'Demo Gym';
            }
        }
    }

    // Setup logout functionality
    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.confirmLogout();
            });
        }
    }

    // Confirm logout with user
    confirmLogout() {
        if (confirm('Are you sure you want to logout? Any unsaved changes will be lost.')) {
            this.performLogout();
        }
    }

    // Perform logout
    performLogout() {
        // Clear session data
        localStorage.removeItem('gymflowSession');
        sessionStorage.removeItem('gymflowSession');
        
        // Clear any sensitive data from memory
        this.members = [];
        this.plans = [];
        this.trainers = [];
        
        // Show logout message
        this.showNotification('Logged out successfully', 'info');
        
        // Redirect to auth page after short delay
        setTimeout(() => {
            window.location.href = '/auth';
        }, 1000);
    }

    // Start session timer
    startSessionTimer() {
        this.updateSessionTimer();
        
        // Update timer every minute
        this.sessionTimerInterval = setInterval(() => {
            this.updateSessionTimer();
        }, 60000);
    }

    // Update session timer display
    updateSessionTimer() {
        const session = localStorage.getItem('gymflowSession') || sessionStorage.getItem('gymflowSession');
        
        if (!session) {
            this.performLogout();
            return;
        }

        try {
            const sessionData = JSON.parse(session);
            const now = Date.now();
            const timeLeft = sessionData.expiresAt - now;
            
            if (timeLeft <= 0) {
                this.handleSessionExpiry();
                return;
            }

            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            const timeRemaining = document.getElementById('timeRemaining');
            const sessionTimer = document.getElementById('sessionTimer');
            
            if (timeRemaining) {
                timeRemaining.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            
            // Change color based on time remaining
            if (sessionTimer) {
                sessionTimer.classList.remove('warning', 'danger');
                
                if (timeLeft < 5 * 60 * 1000) { // Less than 5 minutes
                    sessionTimer.classList.add('danger');
                } else if (timeLeft < 30 * 60 * 1000) { // Less than 30 minutes
                    sessionTimer.classList.add('warning');
                }
            }

        } catch (error) {
            console.error('Invalid session data');
            this.performLogout();
        }
    }

    // Handle session expiry
    handleSessionExpiry() {
        clearInterval(this.sessionTimerInterval);
        alert('Your session has expired. Please login again.');
        this.performLogout();
    }

    // Setup inactivity detection
    setupInactivityDetection() {
        let inactivityTimer;
        const inactivityTimeout = 30 * 60 * 1000; // 30 minutes
        
        const resetInactivityTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                if (confirm('You have been inactive for 30 minutes. Do you want to extend your session?')) {
                    this.extendSession();
                } else {
                    this.performLogout();
                }
            }, inactivityTimeout);
        };

        // Track user activity
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, resetInactivityTimer, true);
        });

        // Start the timer
        resetInactivityTimer();
    }

    // Extend user session
    extendSession() {
        const session = localStorage.getItem('gymflowSession') || sessionStorage.getItem('gymflowSession');
        
        if (session) {
            try {
                const sessionData = JSON.parse(session);
                sessionData.expiresAt = Date.now() + (24 * 60 * 60 * 1000); // Extend by 24 hours
                
                const storageType = localStorage.getItem('gymflowSession') ? localStorage : sessionStorage;
                storageType.setItem('gymflowSession', JSON.stringify(sessionData));
                
                this.showNotification('Session extended successfully', 'success');
            } catch (error) {
                console.error('Failed to extend session');
                this.performLogout();
            }
        }
    }

    // Setup security headers and policies
    setupSecurityHeaders() {
        // Prevent right-click context menu in production
        if (window.location.hostname !== 'localhost') {
            document.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
        }

        // Prevent text selection of sensitive elements
        const sensitiveElements = document.querySelectorAll('.user-info, .action-btn');
        sensitiveElements.forEach(element => {
            element.style.userSelect = 'none';
            element.style.webkitUserSelect = 'none';
        });

        // Add security event listeners
        this.setupSecurityEventListeners();
    }

    // Setup security event listeners
    setupSecurityEventListeners() {
        // Detect tab visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('Tab hidden - pausing sensitive operations');
            } else {
                console.log('Tab visible - resuming operations');
                this.validateSession();
            }
        });

        // Detect browser back/forward navigation
        window.addEventListener('popstate', () => {
            this.validateSession();
        });

        // Detect page unload
        window.addEventListener('beforeunload', (e) => {
            // Save any pending changes
            this.saveAllData();
        });
    }

    // Validate current session
    validateSession() {
        const session = localStorage.getItem('gymflowSession') || sessionStorage.getItem('gymflowSession');
        
        if (!session) {
            this.performLogout();
            return false;
        }

        try {
            const sessionData = JSON.parse(session);
            
            if (sessionData.expiresAt <= Date.now()) {
                this.handleSessionExpiry();
                return false;
            }

            // Verify user still has access to this gym
            if (sessionData.gymId !== this.tenant.tenantId) {
                alert('Access denied. You do not have permission to access this gym.');
                window.location.href = `/${sessionData.gymId}`;
                return false;
            }

            return true;
        } catch (error) {
            console.error('Session validation failed');
            this.performLogout();
            return false;
        }
    }

    // Save all data before logout/unload
    saveAllData() {
        try {
            this.saveMembers();
            this.savePlans();
            this.saveTrainers();
        } catch (error) {
            console.error('Failed to save data:', error);
        }
    }

    // Show notification to user
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `security-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 2000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove notification
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 4000);
    }
    
    async loadTenantData() {
        try {
            // Try to load from Azure Functions API
            const membersResponse = await this.tenant.apiCall('/members');
            const plansResponse = await this.tenant.apiCall('/plans');
            const trainersResponse = await this.tenant.apiCall('/trainers');
            
            // Handle API response format - extract data arrays
            this.members = Array.isArray(membersResponse) ? membersResponse : 
                          (membersResponse?.data ? membersResponse.data : []);
            this.plans = Array.isArray(plansResponse) ? plansResponse : 
                        (plansResponse?.data ? plansResponse.data : this.getDefaultPlans());
            this.trainers = Array.isArray(trainersResponse) ? trainersResponse : 
                           (trainersResponse?.data ? trainersResponse.data : this.getDefaultTrainers());
            
            console.log(`Loaded data for tenant: ${this.tenant.tenantId}`);
            console.log('Members:', this.members);
            console.log('Plans:', this.plans);
            console.log('Trainers:', this.trainers);
        } catch (error) {
            console.error('API load failed:', error);
            // Fallback to local storage with tenant-specific keys
            this.loadFromLocalStorage();
            throw error;
        }
    }
    
    loadFromLocalStorage() {
        const tenantKey = this.tenant.tenantId;
        this.members = JSON.parse(localStorage.getItem(`gymMembers_${tenantKey}`)) || [];
        this.plans = JSON.parse(localStorage.getItem(`gymPlans_${tenantKey}`)) || this.getDefaultPlans();
        this.trainers = JSON.parse(localStorage.getItem(`gymTrainers_${tenantKey}`)) || this.getDefaultTrainers();
        
        // Save default data if not exists
        if (!localStorage.getItem(`gymPlans_${tenantKey}`)) {
            this.savePlans();
        }
        if (!localStorage.getItem(`gymTrainers_${tenantKey}`)) {
            this.saveTrainers();
        }
    }
    
    showLoading(show) {
        const existingLoader = document.getElementById('app-loader');
        if (show && !existingLoader) {
            const loader = document.createElement('div');
            loader.id = 'app-loader';
            loader.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                           background: rgba(255,255,255,0.9); display: flex; 
                           align-items: center; justify-content: center; z-index: 9999;">
                    <div style="text-align: center;">
                        <div style="border: 4px solid #f3f3f3; border-top: 4px solid #667eea; 
                                   border-radius: 50%; width: 40px; height: 40px; 
                                   animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
                        <p>Loading ${this.tenant.tenantId} gym data...</p>
                    </div>
                </div>
                <style>
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            `;
            document.body.appendChild(loader);
        } else if (!show && existingLoader) {
            existingLoader.remove();
        }
    }
    
    showTenantInfo() {
        // Add tenant indicator to the header
        const mobileHeader = document.querySelector('.mobile-brand span');
        const desktopHeader = document.querySelector('.nav-brand span');
        
        if (mobileHeader) mobileHeader.textContent = `GymFlow - ${this.tenant.tenantId.toUpperCase()}`;
        if (desktopHeader) desktopHeader.textContent = `GymFlow - ${this.tenant.tenantId.toUpperCase()}`;
    }

    // Navigation
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('.content-section');
        const navToggle = document.getElementById('navToggle');
        const navbar = document.querySelector('.navbar');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = link.getAttribute('data-section');
                
                // Update active nav link
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // Show target section
                sections.forEach(section => {
                    section.classList.remove('active');
                    if (section.id === targetSection) {
                        section.classList.add('active');
                        section.classList.add('fade-in');
                    }
                });

                // Close mobile menu
                navbar.classList.remove('active');
            });
        });

        // Mobile navigation toggle
        navToggle.addEventListener('click', () => {
            navbar.classList.toggle('active');
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navbar.contains(e.target) && !navToggle.contains(e.target)) {
                navbar.classList.remove('active');
            }
        });
    }

    // Modal Management
    setupModals() {
        const modals = document.querySelectorAll('.modal');
        const closeButtons = document.querySelectorAll('.close');

        // Close modal handlers
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal').style.display = 'none';
            });
        });

        // Close modal when clicking outside
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Add Member Modal
        document.getElementById('addMemberBtn').addEventListener('click', () => {
            this.openMemberModal();
        });

        document.getElementById('cancelMemberForm').addEventListener('click', () => {
            document.getElementById('memberModal').style.display = 'none';
        });

        // Add Plan Modal
        document.getElementById('addPlanBtn').addEventListener('click', () => {
            document.getElementById('planModal').style.display = 'block';
        });

        document.getElementById('cancelPlanForm').addEventListener('click', () => {
            document.getElementById('planModal').style.display = 'none';
        });
    }

    // Form Management
    setupForms() {
        // Member Form
        document.getElementById('memberForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMember();
        });

        // Plan Form
        document.getElementById('planForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePlan();
        });
    }

    // Search Functionality
    setupSearch() {
        const searchInput = document.getElementById('memberSearch');
        const filterSelect = document.getElementById('memberFilter');

        searchInput.addEventListener('input', () => {
            this.filterMembers();
        });

        filterSelect.addEventListener('change', () => {
            this.filterMembers();
        });
    }

    // Default Data
    getDefaultPlans() {
        return [
            {
                id: 1,
                name: 'Basic Plan',
                price: 1999,
                duration: 1,
                description: 'Access to gym equipment and basic facilities'
            },
            {
                id: 2,
                name: 'Premium Plan',
                price: 2999,
                duration: 1,
                description: 'Full gym access plus group classes'
            },
            {
                id: 3,
                name: 'VIP Plan',
                price: 4999,
                duration: 1,
                description: 'All premium features plus personal training sessions'
            }
        ];
    }

    getDefaultTrainers() {
        return [
            {
                id: 1,
                name: 'Rajesh Kumar',
                specialty: 'Strength Training',
                email: 'rajesh@gymflow.com',
                phone: '+91 98765 43210'
            },
            {
                id: 2,
                name: 'Priya Sharma',
                specialty: 'Yoga & Pilates',
                email: 'priya@gymflow.com',
                phone: '+91 87654 32109'
            },
            {
                id: 3,
                name: 'Amit Singh',
                specialty: 'Cardio & HIIT',
                email: 'amit@gymflow.com',
                phone: '+91 76543 21098'
            }
        ];
    }

    // Dashboard
    loadDashboard() {
        const totalMembers = this.members.length;
        const activeMembers = this.members.filter(m => m.status === 'active').length;
        const monthlyRevenue = this.calculateMonthlyRevenue();
        const todayCheckins = Math.floor(Math.random() * 50) + 10; // Simulated

        document.getElementById('totalMembers').textContent = totalMembers;
        document.getElementById('activeMembers').textContent = activeMembers;
        document.getElementById('monthlyRevenue').textContent = `₹${monthlyRevenue.toFixed(2)}`;
        document.getElementById('todayCheckins').textContent = todayCheckins;

        this.loadRecentMembers();
        this.loadExpiringSubscriptions();
    }

    calculateMonthlyRevenue() {
        return this.members
            .filter(member => member.status === 'active')
            .reduce((total, member) => {
                let plan;
                if (member.planId === 'custom' && member.customPlan) {
                    plan = member.customPlan;
                } else {
                    plan = this.plans.find(p => p.id == member.planId);
                }
                return total + (plan ? plan.price : 0);
            }, 0);
    }

    loadRecentMembers() {
        const recentMembers = this.members
            .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
            .slice(0, 5);

        const container = document.getElementById('recentMembers');
        container.innerHTML = recentMembers.map(member => `
            <div class="recent-item">
                <div class="recent-item-info">
                    <h4>${member.name}</h4>
                    <p>Joined ${this.formatDate(member.startDate)}</p>
                </div>
                <span class="status-badge status-${member.status}">${member.status}</span>
            </div>
        `).join('');
    }

    loadExpiringSubscriptions() {
        const expiringSoon = this.members
            .filter(member => {
                const expiryDate = new Date(member.expiryDate);
                const today = new Date();
                const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
            })
            .slice(0, 5);

        const container = document.getElementById('expiringSubscriptions');
        container.innerHTML = expiringSoon.map(member => `
            <div class="recent-item">
                <div class="recent-item-info">
                    <h4>${member.name}</h4>
                    <p>Expires ${this.formatDate(member.expiryDate)}</p>
                </div>
                <span class="status-badge status-expired">Expiring</span>
            </div>
        `).join('');
    }

    // Members Management
    openMemberModal(member = null) {
        const modal = document.getElementById('memberModal');
        const form = document.getElementById('memberForm');
        const title = document.getElementById('memberModalTitle');

        // Populate plan options
        const planSelect = document.getElementById('memberPlan');
        planSelect.innerHTML = '<option value="">Select Plan</option>' +
            this.plans.map(plan => `<option value="${plan.id}">${plan.name} - ₹${plan.price}</option>`).join('') +
            '<option value="custom">Custom Plan - Set your own price</option>';

        // Handle custom plan selection
        planSelect.addEventListener('change', (e) => {
            const customFields = document.querySelectorAll('.custom-plan-fields');
            if (e.target.value === 'custom') {
                customFields.forEach(field => {
                    field.style.display = 'block';
                    const input = field.querySelector('input');
                    if (input && input.hasAttribute('required')) {
                        input.setAttribute('required', 'required');
                    }
                });
            } else {
                customFields.forEach(field => {
                    field.style.display = 'none';
                    const input = field.querySelector('input');
                    if (input) {
                        input.removeAttribute('required');
                        input.value = '';
                    }
                });
            }
        });

        if (member) {
            title.textContent = 'Edit Member';
            document.getElementById('memberName').value = member.name;
            document.getElementById('memberEmail').value = member.email;
            document.getElementById('memberPhone').value = member.phone;
            document.getElementById('memberPlan').value = member.planId;
            document.getElementById('memberStartDate').value = member.startDate;
            document.getElementById('memberExpiryDate').value = member.expiryDate || '';
            document.getElementById('memberEmergencyContact').value = member.emergencyContact || '';
            form.dataset.memberId = member.id;

            // Show custom plan fields if it's a custom plan
            if (member.planId === 'custom' && member.customPlan) {
                const customFields = document.querySelectorAll('.custom-plan-fields');
                customFields.forEach(field => field.style.display = 'block');
                document.getElementById('customPlanName').value = member.customPlan.name;
                document.getElementById('customPlanPrice').value = member.customPlan.price;
                document.getElementById('customPlanDuration').value = member.customPlan.duration;
            }
        } else {
            title.textContent = 'Add New Member';
            form.reset();
            delete form.dataset.memberId;
            document.getElementById('memberStartDate').value = new Date().toISOString().split('T')[0];
        }

        modal.style.display = 'block';
    }

    saveMember() {
        const form = document.getElementById('memberForm');
        const formData = new FormData(form);
        
        const memberData = {
            name: document.getElementById('memberName').value,
            email: document.getElementById('memberEmail').value,
            phone: document.getElementById('memberPhone').value,
            planId: document.getElementById('memberPlan').value,
            startDate: document.getElementById('memberStartDate').value,
            expiryDate: document.getElementById('memberExpiryDate').value,
            emergencyContact: document.getElementById('memberEmergencyContact').value,
            status: 'active'
        };

        let plan;
        let planDuration;

        if (memberData.planId === 'custom') {
            // Handle custom plan
            const customName = document.getElementById('customPlanName').value || 'Custom Plan';
            const customPrice = parseFloat(document.getElementById('customPlanPrice').value);
            const customDuration = parseInt(document.getElementById('customPlanDuration').value);

            if (!customPrice || !customDuration) {
                alert('Please fill in all custom plan details');
                return;
            }

            // Create custom plan object for this member
            plan = {
                id: 'custom',
                name: customName,
                price: customPrice,
                duration: customDuration
            };
            
            // Store custom plan details with member
            memberData.customPlan = plan;
            planDuration = customDuration;
        } else {
            // Handle predefined plans
            plan = this.plans.find(p => p.id == memberData.planId);
            if (plan) {
                planDuration = plan.duration;
            }
        }

        // Set expiry date - use manual input if provided, otherwise auto-calculate
        if (!memberData.expiryDate && plan && planDuration) {
            const startDate = new Date(memberData.startDate);
            const expiryDate = new Date(startDate);
            expiryDate.setMonth(expiryDate.getMonth() + planDuration);
            memberData.expiryDate = expiryDate.toISOString().split('T')[0];
        }

        if (form.dataset.memberId) {
            // Edit existing member
            const index = this.members.findIndex(m => m.id == form.dataset.memberId);
            memberData.id = parseInt(form.dataset.memberId);
            this.members[index] = memberData;
        } else {
            // Add new member
            memberData.id = Date.now();
            this.members.push(memberData);
        }

        this.saveMembers();
        this.loadMembers();
        this.loadDashboard();
        document.getElementById('memberModal').style.display = 'none';
    }

    loadMembers() {
        this.renderMembersTable(this.members);
    }

    renderMembersTable(members) {
        const tbody = document.getElementById('membersTableBody');
        tbody.innerHTML = members.map(member => {
            let plan;
            if (member.planId === 'custom' && member.customPlan) {
                plan = member.customPlan;
            } else {
                plan = this.plans.find(p => p.id == member.planId);
            }
            
            const isExpired = new Date(member.expiryDate) < new Date();
            const status = isExpired ? 'expired' : member.status;
            
            return `
                <tr>
                    <td>${member.name}</td>
                    <td>${member.email}</td>
                    <td>${member.phone}</td>
                    <td>${plan ? plan.name : 'N/A'}</td>
                    <td><span class="status-badge status-${status}">${status}</span></td>
                    <td>${this.formatDate(member.expiryDate)}</td>
                    <td>
                        <button class="btn btn-secondary" onclick="app.openMemberModal(${JSON.stringify(member).replace(/"/g, '&quot;')})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="app.deleteMember(${member.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    filterMembers() {
        const searchTerm = document.getElementById('memberSearch').value.toLowerCase();
        const statusFilter = document.getElementById('memberFilter').value;

        let filteredMembers = this.members.filter(member => {
            const matchesSearch = member.name.toLowerCase().includes(searchTerm) ||
                                member.email.toLowerCase().includes(searchTerm) ||
                                member.phone.includes(searchTerm);

            const memberStatus = new Date(member.expiryDate) < new Date() ? 'expired' : member.status;
            const matchesFilter = statusFilter === 'all' || memberStatus === statusFilter;

            return matchesSearch && matchesFilter;
        });

        this.renderMembersTable(filteredMembers);
    }

    deleteMember(id) {
        if (confirm('Are you sure you want to delete this member?')) {
            this.members = this.members.filter(m => m.id !== id);
            this.saveMembers();
            this.loadMembers();
            this.loadDashboard();
        }
    }

    // Plans Management
    loadPlans() {
        const container = document.getElementById('plansGrid');
        container.innerHTML = this.plans.map(plan => `
            <div class="plan-card">
                <div class="plan-header">
                    <div class="plan-name">${plan.name}</div>
                    <div class="plan-price">₹${plan.price}</div>
                    <div class="plan-duration">per ${plan.duration} month${plan.duration > 1 ? 's' : ''}</div>
                </div>
                <div class="plan-description">${plan.description}</div>
                <div class="plan-actions">
                    <button class="btn btn-secondary" onclick="app.editPlan(${plan.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger" onclick="app.deletePlan(${plan.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    savePlan() {
        const planData = {
            name: document.getElementById('planName').value,
            price: parseFloat(document.getElementById('planPrice').value),
            duration: parseInt(document.getElementById('planDuration').value),
            description: document.getElementById('planDescription').value
        };

        planData.id = Date.now();
        this.plans.push(planData);

        this.savePlans();
        this.loadPlans();
        document.getElementById('planModal').style.display = 'none';
        document.getElementById('planForm').reset();
    }

    deletePlan(id) {
        if (confirm('Are you sure you want to delete this plan?')) {
            this.plans = this.plans.filter(p => p.id !== id);
            this.savePlans();
            this.loadPlans();
        }
    }

    // Trainers Management
    loadTrainers() {
        const container = document.getElementById('trainersGrid');
        container.innerHTML = this.trainers.map(trainer => `
            <div class="trainer-card">
                <div class="trainer-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="trainer-name">${trainer.name}</div>
                <div class="trainer-specialty">${trainer.specialty}</div>
                <div class="trainer-contact">
                    <div>${trainer.email}</div>
                    <div>${trainer.phone}</div>
                </div>
                <div class="plan-actions">
                    <button class="btn btn-secondary">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Charts
    setupCharts() {
        this.setupRevenueChart();
        this.setupMemberChart();
    }

    setupRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        // Generate sample revenue data
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const revenueData = months.map(() => Math.floor(Math.random() * 200000) + 100000);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Monthly Revenue',
                    data: revenueData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    setupMemberChart() {
        const ctx = document.getElementById('memberChart');
        if (!ctx) return;

        // Generate sample member growth data
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const memberData = [45, 52, 48, 61, 55, 67];

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'New Members',
                    data: memberData,
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: '#667eea',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Utility Functions
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Data Persistence
    async saveMembers() {
        const tenantKey = this.tenant.tenantId;
        
        // Save to cloud if online
        if (this.tenant.isOnline) {
            try {
                await this.tenant.apiCall('/members', {
                    method: 'POST',
                    body: JSON.stringify({ members: this.members })
                });
                console.log('Members synced to cloud');
            } catch (error) {
                console.error('Failed to sync members to cloud:', error);
            }
        }
        
        // Always save locally as backup
        localStorage.setItem(`gymMembers_${tenantKey}`, JSON.stringify(this.members));
    }

    async savePlans() {
        const tenantKey = this.tenant.tenantId;
        
        // Save to cloud if online
        if (this.tenant.isOnline) {
            try {
                await this.tenant.apiCall('/plans', {
                    method: 'POST',
                    body: JSON.stringify({ plans: this.plans })
                });
                console.log('Plans synced to cloud');
            } catch (error) {
                console.error('Failed to sync plans to cloud:', error);
            }
        }
        
        // Always save locally as backup
        localStorage.setItem(`gymPlans_${tenantKey}`, JSON.stringify(this.plans));
    }

    async saveTrainers() {
        const tenantKey = this.tenant.tenantId;
        
        // Save to cloud if online
        if (this.tenant.isOnline) {
            try {
                await this.tenant.apiCall('/trainers', {
                    method: 'POST',
                    body: JSON.stringify({ trainers: this.trainers })
                });
                console.log('Trainers synced to cloud');
            } catch (error) {
                console.error('Failed to sync trainers to cloud:', error);
            }
        }
        
        // Always save locally as backup
        localStorage.setItem(`gymTrainers_${tenantKey}`, JSON.stringify(this.trainers));
    }
}

// Initialize the app
const app = new GymApp();

// Service Worker for PWA functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ Service Worker registered successfully');
            })
            .catch(registrationError => {
                console.log('⚠️ Service Worker registration failed:', registrationError.message);
            });
    });
}
