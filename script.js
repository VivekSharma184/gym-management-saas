// Gym Management App JavaScript

// Tenant Configuration
class TenantConfig {
    constructor() {
        this.tenantId = this.getTenantFromURL();
        this.apiBase = 'https://gymflow.azurewebsites.net/api'; // Your Azure Function URL
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
    
    async apiCall(endpoint, options = {}) {
        if (!this.isOnline) {
            throw new Error('Offline - using local storage');
        }
        
        const response = await fetch(`${this.apiBase}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': this.tenantId,
                ...options.headers
            }
        });
        
        if (!response.ok) {
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
    
    async loadTenantData() {
        try {
            // Try to load from Azure Functions API
            this.members = await this.tenant.apiCall('/members') || [];
            this.plans = await this.tenant.apiCall('/plans') || this.getDefaultPlans();
            this.trainers = await this.tenant.apiCall('/trainers') || this.getDefaultTrainers();
            
            console.log(`Loaded data for tenant: ${this.tenant.tenantId}`);
        } catch (error) {
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
            .then(registration => console.log('SW registered'))
            .catch(registrationError => console.log('SW registration failed'));
    });
}
