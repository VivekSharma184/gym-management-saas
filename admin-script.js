// Super Admin Panel JavaScript
class AdminPanel {
    constructor() {
        // Check authentication first
        this.currentUser = this.checkAuthentication();
        if (!this.currentUser) return;
        
        this.gyms = JSON.parse(localStorage.getItem('adminGyms')) || this.getDefaultGyms();
        this.subscriptionPlans = this.getSubscriptionPlans();
        this.currentSection = 'dashboard';
        this.charts = {};
        
        this.init();
    }

    // Check if user is authenticated and has admin role
    checkAuthentication() {
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
            
            // Check if user has admin role
            if (sessionData.role !== 'admin') {
                window.location.href = '/auth';
                return null;
            }
            
            return sessionData;
        } catch (error) {
            console.error('Invalid session data');
            window.location.href = '/auth';
            return null;
        }
    }

    init() {
        this.setupNavigation();
        this.setupModals();
        this.setupEventListeners();
        this.setupLogout();
        this.setupAdminSecurity();
        this.displayUserInfo();
        this.loadDashboard();
        this.renderGymsTable();
        this.renderSubscriptionPlans();
        this.initializeCharts();
    }

    // Setup logout functionality
    setupLogout() {
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.confirmLogout();
            });
        }
    }

    // Confirm logout with security measures
    confirmLogout() {
        if (confirm('Are you sure you want to logout? This will end your admin session.')) {
            this.performSecureLogout();
        }
    }

    // Perform secure logout
    performSecureLogout() {
        // Clear all session data
        localStorage.removeItem('gymflowSession');
        sessionStorage.removeItem('gymflowSession');
        
        // Clear sensitive admin data
        localStorage.removeItem('adminGyms');
        
        // Clear any cached data
        this.gyms = [];
        
        // Log security event
        console.log('Admin logout performed at:', new Date().toISOString());
        
        // Show logout notification
        this.showNotification('Admin session ended securely', 'info');
        
        // Redirect after delay
        setTimeout(() => {
            window.location.href = '/auth';
        }, 1000);
    }

    // Enhanced session validation for admin
    validateAdminSession() {
        const session = localStorage.getItem('gymflowSession') || sessionStorage.getItem('gymflowSession');
        
        if (!session) {
            this.performSecureLogout();
            return false;
        }

        try {
            const sessionData = JSON.parse(session);
            
            // Check session expiry
            if (sessionData.expiresAt <= Date.now()) {
                alert('Your admin session has expired. Please login again.');
                this.performSecureLogout();
                return false;
            }

            // Verify admin role
            if (sessionData.role !== 'admin') {
                alert('Access denied. Admin privileges required.');
                window.location.href = '/auth';
                return false;
            }

            return true;
        } catch (error) {
            console.error('Admin session validation failed');
            this.performSecureLogout();
            return false;
        }
    }

    // Setup admin security monitoring
    setupAdminSecurity() {
        // Validate session every 5 minutes
        setInterval(() => {
            this.validateAdminSession();
        }, 5 * 60 * 1000);

        // Monitor tab visibility for security
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.validateAdminSession();
            }
        });

        // Prevent unauthorized access attempts
        this.setupSecurityHeaders();
    }

    // Setup security headers for admin panel
    setupSecurityHeaders() {
        // Disable right-click in production
        if (window.location.hostname !== 'localhost') {
            document.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                console.warn('Right-click disabled for security');
            });
        }

        // Disable text selection on sensitive elements
        const sensitiveElements = document.querySelectorAll('.admin-table, .metric-card, .user-info');
        sensitiveElements.forEach(element => {
            element.style.userSelect = 'none';
            element.style.webkitUserSelect = 'none';
        });

        // Add security event listeners
        this.setupSecurityEventListeners();
    }

    // Setup security event listeners for admin
    setupSecurityEventListeners() {
        // Detect suspicious activity
        let rapidClickCount = 0;
        let rapidClickTimer;

        document.addEventListener('click', () => {
            rapidClickCount++;
            
            clearTimeout(rapidClickTimer);
            rapidClickTimer = setTimeout(() => {
                rapidClickCount = 0;
            }, 1000);

            // If too many rapid clicks, log security event
            if (rapidClickCount > 20) {
                console.warn('Suspicious rapid clicking detected');
                this.logSecurityEvent('rapid_clicking', { count: rapidClickCount });
            }
        });

        // Monitor for developer tools
        let devtools = {open: false, orientation: null};
        const threshold = 160;

        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools.open) {
                    devtools.open = true;
                    console.warn('Developer tools opened - security event logged');
                    this.logSecurityEvent('devtools_opened');
                }
            } else {
                devtools.open = false;
            }
        }, 500);
    }

    // Log security events
    logSecurityEvent(eventType, data = {}) {
        const securityLog = {
            timestamp: new Date().toISOString(),
            event: eventType,
            user: this.currentUser?.email || 'unknown',
            userAgent: navigator.userAgent,
            url: window.location.href,
            data: data
        };

        // In production, send to security monitoring service
        console.log('Security Event:', securityLog);
        
        // Store locally for now
        const logs = JSON.parse(localStorage.getItem('securityLogs') || '[]');
        logs.push(securityLog);
        
        // Keep only last 100 logs
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('securityLogs', JSON.stringify(logs));
    }

    // Display user information
    displayUserInfo() {
        const userInfo = document.querySelector('.user-info span');
        if (userInfo && this.currentUser) {
            userInfo.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        }
    }

    // Default gym data for demo
    getDefaultGyms() {
        return [
            {
                id: 'gym1',
                name: 'PowerGym Fitness',
                owner: 'John Doe',
                email: 'john@powergym.com',
                plan: 'pro',
                status: 'active',
                members: 245,
                revenue: 5999,
                createdAt: '2024-01-15',
                lastActive: '2024-08-17'
            },
            {
                id: 'gym2',
                name: 'FitZone Studio',
                owner: 'Jane Smith',
                email: 'jane@fitzone.com',
                plan: 'basic',
                status: 'trial',
                members: 89,
                revenue: 0,
                createdAt: '2024-08-01',
                lastActive: '2024-08-17'
            },
            {
                id: 'demo',
                name: 'Demo Gym',
                owner: 'Demo User',
                email: 'demo@gymflow.com',
                plan: 'free',
                status: 'active',
                members: 25,
                revenue: 0,
                createdAt: '2024-07-20',
                lastActive: '2024-08-17'
            }
        ];
    }

    // Subscription plans configuration
    getSubscriptionPlans() {
        return {
            free: {
                name: 'Free Trial',
                price: 0,
                duration: '30 days',
                features: ['Up to 50 members', '2 trainers', '1GB storage', 'Basic support'],
                limits: { members: 50, trainers: 2, storage: '1GB' },
                color: '#6c757d'
            },
            basic: {
                name: 'Basic',
                price: 2999,
                duration: 'per month',
                features: ['Up to 200 members', '5 trainers', '5GB storage', 'Email support', 'Basic analytics'],
                limits: { members: 200, trainers: 5, storage: '5GB' },
                color: '#28a745'
            },
            pro: {
                name: 'Pro',
                price: 5999,
                duration: 'per month',
                features: ['Up to 500 members', '15 trainers', '20GB storage', 'Priority support', 'Advanced analytics', 'Custom branding'],
                limits: { members: 500, trainers: 15, storage: '20GB' },
                color: '#667eea',
                featured: true
            },
            enterprise: {
                name: 'Enterprise',
                price: 12999,
                duration: 'per month',
                features: ['Unlimited members', 'Unlimited trainers', '100GB storage', '24/7 support', 'Custom integrations', 'White-label solution'],
                limits: { members: 'unlimited', trainers: 'unlimited', storage: '100GB' },
                color: '#dc3545'
            }
        };
    }

    // Navigation setup
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('.content-section');
        const pageTitle = document.getElementById('page-title');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.dataset.section;
                
                // Update active nav link
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // Show corresponding section
                sections.forEach(section => section.classList.remove('active'));
                document.getElementById(`${sectionId}-section`).classList.add('active');
                
                // Update page title
                pageTitle.textContent = link.textContent.trim();
                this.currentSection = sectionId;
                
                // Load section-specific data
                this.loadSectionData(sectionId);
            });
        });

        // Mobile menu toggle
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const sidebar = document.querySelector('.admin-sidebar');
        
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }
    }

    // Modal setup
    setupModals() {
        const modal = document.getElementById('gym-modal');
        const closeBtn = modal.querySelector('.close-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        
        closeBtn.addEventListener('click', () => this.closeModal());
        cancelBtn.addEventListener('click', () => this.closeModal());
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
    }

    // Event listeners setup
    setupEventListeners() {
        // Add gym button
        document.getElementById('add-gym-btn').addEventListener('click', () => {
            this.openGymModal();
        });

        // Gym form submission
        document.getElementById('gym-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveGym();
        });

        // Filters
        document.getElementById('status-filter').addEventListener('change', () => this.filterGyms());
        document.getElementById('plan-filter').addEventListener('change', () => this.filterGyms());
        document.getElementById('search-gyms').addEventListener('input', () => this.filterGyms());
    }

    // Load dashboard data
    loadDashboard() {
        const totalGyms = this.gyms.length;
        const activeSubscriptions = this.gyms.filter(gym => gym.status === 'active').length;
        const monthlyRevenue = this.gyms.reduce((total, gym) => {
            if (gym.status === 'active' && gym.plan !== 'free') {
                return total + this.subscriptionPlans[gym.plan].price;
            }
            return total;
        }, 0);

        // Update metrics
        document.getElementById('total-gyms').textContent = totalGyms;
        document.getElementById('active-subscriptions').textContent = activeSubscriptions;
        document.getElementById('monthly-revenue').textContent = `₹${monthlyRevenue.toLocaleString()}`;

        // Load recent activity
        this.loadRecentActivity();
    }

    // Load recent activity
    loadRecentActivity() {
        const activities = [
            {
                icon: 'fas fa-user-plus',
                type: 'success',
                message: 'New gym "FitZone Studio" registered',
                time: '2 hours ago'
            },
            {
                icon: 'fas fa-credit-card',
                type: 'success',
                message: 'PowerGym Fitness payment received ₹5,999',
                time: '4 hours ago'
            },
            {
                icon: 'fas fa-exclamation-triangle',
                type: 'warning',
                message: 'Demo Gym trial expires in 5 days',
                time: '1 day ago'
            },
            {
                icon: 'fas fa-chart-line',
                type: 'info',
                message: 'Monthly revenue increased by 12%',
                time: '2 days ago'
            }
        ];

        const activityList = document.getElementById('activity-list');
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <p>${activity.message}</p>
                    <small>${activity.time}</small>
                </div>
            </div>
        `).join('');
    }

    // Render gyms table
    renderGymsTable() {
        const tbody = document.getElementById('gyms-table-body');
        const filteredGyms = this.getFilteredGyms();
        
        tbody.innerHTML = filteredGyms.map(gym => `
            <tr>
                <td>
                    <strong>${gym.name}</strong>
                    <br><small>ID: ${gym.id}</small>
                </td>
                <td>
                    ${gym.owner}
                    <br><small>${gym.email}</small>
                </td>
                <td>
                    <span class="plan-badge plan-${gym.plan}">
                        ${this.subscriptionPlans[gym.plan].name}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-${gym.status}">
                        ${gym.status}
                    </span>
                </td>
                <td>${gym.members}</td>
                <td>₹${gym.revenue.toLocaleString()}/mo</td>
                <td>${new Date(gym.createdAt).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="adminPanel.editGym('${gym.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="adminPanel.toggleGymStatus('${gym.id}')">
                        <i class="fas fa-power-off"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteGym('${gym.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Filter gyms based on search and filters
    getFilteredGyms() {
        const statusFilter = document.getElementById('status-filter').value;
        const planFilter = document.getElementById('plan-filter').value;
        const searchTerm = document.getElementById('search-gyms').value.toLowerCase();

        return this.gyms.filter(gym => {
            const matchesStatus = !statusFilter || gym.status === statusFilter;
            const matchesPlan = !planFilter || gym.plan === planFilter;
            const matchesSearch = !searchTerm || 
                gym.name.toLowerCase().includes(searchTerm) ||
                gym.owner.toLowerCase().includes(searchTerm) ||
                gym.email.toLowerCase().includes(searchTerm);
            
            return matchesStatus && matchesPlan && matchesSearch;
        });
    }

    // Filter gyms
    filterGyms() {
        this.renderGymsTable();
    }

    // Render subscription plans
    renderSubscriptionPlans() {
        const plansGrid = document.getElementById('plans-grid');
        
        plansGrid.innerHTML = Object.entries(this.subscriptionPlans).map(([key, plan]) => `
            <div class="plan-card ${plan.featured ? 'featured' : ''}">
                <div class="plan-name">${plan.name}</div>
                <div class="plan-price">
                    ₹${plan.price.toLocaleString()}
                    <small>/${plan.duration}</small>
                </div>
                <ul class="plan-features">
                    ${plan.features.map(feature => `
                        <li><i class="fas fa-check"></i> ${feature}</li>
                    `).join('')}
                </ul>
                <div class="plan-stats">
                    <small>${this.gyms.filter(gym => gym.plan === key).length} gyms using this plan</small>
                </div>
            </div>
        `).join('');
    }

    // Initialize charts
    initializeCharts() {
        this.initRevenueChart();
        this.initGrowthChart();
    }

    // Initialize revenue chart
    initRevenueChart() {
        const ctx = document.getElementById('revenue-chart');
        if (!ctx) return;

        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                datasets: [{
                    label: 'Revenue (₹)',
                    data: [15000, 18000, 22000, 25000, 28000, 32000, 35000, 38000],
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
                                return '₹' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    // Initialize growth chart
    initGrowthChart() {
        const ctx = document.getElementById('growth-chart');
        if (!ctx) return;

        this.charts.growth = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                datasets: [{
                    label: 'New Gyms',
                    data: [2, 3, 4, 3, 5, 6, 4, 7],
                    backgroundColor: '#4facfe'
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
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // Load section-specific data
    loadSectionData(sectionId) {
        switch(sectionId) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'gyms':
                this.renderGymsTable();
                break;
            case 'subscriptions':
                this.renderSubscriptionPlans();
                break;
            case 'analytics':
                // Initialize analytics charts if needed
                break;
        }
    }

    // Open gym modal
    openGymModal(gymId = null) {
        const modal = document.getElementById('gym-modal');
        const modalTitle = document.getElementById('modal-title');
        const form = document.getElementById('gym-form');
        
        if (gymId) {
            const gym = this.gyms.find(g => g.id === gymId);
            modalTitle.textContent = 'Edit Gym';
            this.populateGymForm(gym);
            form.dataset.gymId = gymId;
        } else {
            modalTitle.textContent = 'Add New Gym';
            form.reset();
            delete form.dataset.gymId;
        }
        
        modal.style.display = 'block';
    }

    // Close modal
    closeModal() {
        document.getElementById('gym-modal').style.display = 'none';
    }

    // Populate gym form
    populateGymForm(gym) {
        document.getElementById('gym-name').value = gym.name;
        document.getElementById('owner-name').value = gym.owner;
        document.getElementById('owner-email').value = gym.email;
        document.getElementById('gym-plan').value = gym.plan;
        document.getElementById('gym-status').value = gym.status;
    }

    // Save gym
    saveGym() {
        const form = document.getElementById('gym-form');
        const formData = new FormData(form);
        const gymId = form.dataset.gymId;
        
        const gymData = {
            id: gymId || 'gym' + Date.now(),
            name: document.getElementById('gym-name').value,
            owner: document.getElementById('owner-name').value,
            email: document.getElementById('owner-email').value,
            plan: document.getElementById('gym-plan').value,
            status: document.getElementById('gym-status').value,
            members: gymId ? this.gyms.find(g => g.id === gymId).members : 0,
            revenue: gymId ? this.gyms.find(g => g.id === gymId).revenue : 0,
            createdAt: gymId ? this.gyms.find(g => g.id === gymId).createdAt : new Date().toISOString().split('T')[0],
            lastActive: new Date().toISOString().split('T')[0]
        };

        if (gymId) {
            // Update existing gym
            const index = this.gyms.findIndex(g => g.id === gymId);
            this.gyms[index] = gymData;
        } else {
            // Add new gym
            this.gyms.push(gymData);
        }

        this.saveToStorage();
        this.renderGymsTable();
        this.loadDashboard();
        this.closeModal();
        
        this.showNotification(gymId ? 'Gym updated successfully!' : 'Gym added successfully!', 'success');
    }

    // Edit gym
    editGym(gymId) {
        this.openGymModal(gymId);
    }

    // Toggle gym status
    toggleGymStatus(gymId) {
        const gym = this.gyms.find(g => g.id === gymId);
        if (gym) {
            gym.status = gym.status === 'active' ? 'suspended' : 'active';
            this.saveToStorage();
            this.renderGymsTable();
            this.loadDashboard();
            this.showNotification(`Gym ${gym.status === 'active' ? 'activated' : 'suspended'}!`, 'info');
        }
    }

    // Delete gym
    deleteGym(gymId) {
        if (confirm('Are you sure you want to delete this gym? This action cannot be undone.')) {
            this.gyms = this.gyms.filter(g => g.id !== gymId);
            this.saveToStorage();
            this.renderGymsTable();
            this.loadDashboard();
            this.showNotification('Gym deleted successfully!', 'success');
        }
    }

    // Save to localStorage
    saveToStorage() {
        localStorage.setItem('adminGyms', JSON.stringify(this.gyms));
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}"></i>
            ${message}
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove notification
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});

// Add notification styles
const notificationStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 3000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification-success {
        background-color: #28a745;
    }
    
    .notification-error {
        background-color: #dc3545;
    }
    
    .notification-info {
        background-color: #17a2b8;
    }
    
    .notification i {
        margin-right: 8px;
    }
    
    .btn-sm {
        padding: 5px 10px;
        font-size: 0.8rem;
        margin: 0 2px;
    }
    
    .plan-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.7rem;
        font-weight: 500;
        text-transform: uppercase;
    }
    
    .plan-free {
        background-color: #6c757d;
        color: white;
    }
    
    .plan-basic {
        background-color: #28a745;
        color: white;
    }
    
    .plan-pro {
        background-color: #667eea;
        color: white;
    }
    
    .plan-enterprise {
        background-color: #dc3545;
        color: white;
    }
`;

// Inject notification styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);
