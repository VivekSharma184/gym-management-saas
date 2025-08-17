// API Server for GymFlow SaaS - Local Development & Production Ready
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import API handlers
const authManager = require('./api/utils/auth');
const dbManager = require('./api/utils/database');

// Import endpoint handlers
const { handler: loginHandler } = require('./api/auth/login');
const { handler: signupHandler } = require('./api/auth/signup');
const { 
    getMembersHandler, 
    getMemberHandler, 
    createMemberHandler, 
    updateMemberHandler, 
    deleteMemberHandler, 
    searchMembersHandler 
} = require('./api/members/index');
const { 
    getPlansHandler, 
    getPlanHandler, 
    createPlanHandler, 
    updatePlanHandler, 
    deletePlanHandler, 
    getPlanStatsHandler 
} = require('./api/plans/index');
const { 
    getTrainersHandler, 
    getTrainerHandler, 
    createTrainerHandler, 
    updateTrainerHandler, 
    deleteTrainerHandler, 
    searchTrainersHandler, 
    getTrainerStatsHandler 
} = require('./api/trainers/index');
const { 
    getDashboardHandler, 
    getAnalyticsHandler, 
    getReportsHandler 
} = require('./api/dashboard/index');

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(authManager.securityHeaders);

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID']
}));

// Rate limiting - more lenient for development
const rateLimiter = authManager.createRateLimiter(1 * 60 * 1000, 50); // 50 requests per 1 minute for development
app.use('/api', rateLimiter);

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const dbHealth = await dbManager.healthCheck();
        
        res.status(200).json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            database: dbHealth
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message
        });
    }
});

// Authentication endpoints (public)
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/signup', signupHandler);

// Password reset endpoint (public)
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email || !authManager.validateEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Valid email is required',
                code: 'VALIDATION_ERROR'
            });
        }

        // In production, implement actual password reset logic
        // For now, return success for demo purposes
        authManager.logSecurityEvent('password_reset_requested', req, { email });
        
        res.status(200).json({
            success: true,
            message: 'Password reset instructions sent to your email',
            data: { email }
        });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
});

// Token verification endpoint
app.post('/api/auth/verify', authManager.requireAuth, (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Token is valid',
        user: req.user
    });
});

// Protected routes - require authentication
app.use('/api', authManager.requireAuth);

// Members endpoints
app.get('/api/members', authManager.requireTenantAccess, getMembersHandler);
app.get('/api/members/search', authManager.requireTenantAccess, searchMembersHandler);
app.get('/api/members/:id', authManager.requireTenantAccess, getMemberHandler);
app.post('/api/members', authManager.requireTenantAccess, createMemberHandler);
app.put('/api/members/:id', authManager.requireTenantAccess, updateMemberHandler);
app.delete('/api/members/:id', authManager.requireTenantAccess, deleteMemberHandler);

// Plans endpoints
app.get('/api/plans', authManager.requireTenantAccess, getPlansHandler);
app.get('/api/plans/stats', authManager.requireTenantAccess, getPlanStatsHandler);
app.get('/api/plans/:id', authManager.requireTenantAccess, getPlanHandler);
app.post('/api/plans', authManager.requireTenantAccess, createPlanHandler);
app.put('/api/plans/:id', authManager.requireTenantAccess, updatePlanHandler);
app.delete('/api/plans/:id', authManager.requireTenantAccess, deletePlanHandler);

// Trainers endpoints
app.get('/api/trainers', authManager.requireTenantAccess, getTrainersHandler);
app.get('/api/trainers/search', authManager.requireTenantAccess, searchTrainersHandler);
app.get('/api/trainers/stats', authManager.requireTenantAccess, getTrainerStatsHandler);
app.get('/api/trainers/:id', authManager.requireTenantAccess, getTrainerHandler);
app.post('/api/trainers', authManager.requireTenantAccess, createTrainerHandler);
app.put('/api/trainers/:id', authManager.requireTenantAccess, updateTrainerHandler);
app.delete('/api/trainers/:id', authManager.requireTenantAccess, deleteTrainerHandler);

// Dashboard endpoints
app.get('/api/dashboard', authManager.requireTenantAccess, getDashboardHandler);
app.get('/api/analytics', authManager.requireTenantAccess, getAnalyticsHandler);
app.get('/api/reports', authManager.requireTenantAccess, getReportsHandler);

// Admin endpoints (super admin only)
app.get('/api/admin/tenants', authManager.requireRole('super_admin'), async (req, res) => {
    try {
        const result = await dbManager.query('tenants', {});
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch tenants',
                code: 'DATABASE_ERROR'
            });
        }

        res.status(200).json({
            success: true,
            data: result.data,
            count: result.data.length
        });
    } catch (error) {
        console.error('Get tenants error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
});

app.get('/api/admin/users', authManager.requireRole('super_admin'), async (req, res) => {
    try {
        const result = await dbManager.query('users', {});
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch users',
                code: 'DATABASE_ERROR'
            });
        }

        // Remove sensitive data
        const sanitizedUsers = result.data.map(user => ({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            tenantId: user.tenantId,
            isActive: user.isActive,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
        }));

        res.status(200).json({
            success: true,
            data: sanitizedUsers,
            count: sanitizedUsers.length
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
});

// Admin analytics endpoint
app.get('/api/admin/analytics', authManager.requireRole('super_admin'), async (req, res) => {
    try {
        const [tenantsResult, usersResult, membersResult] = await Promise.all([
            dbManager.query('tenants', {}),
            dbManager.query('users', {}),
            dbManager.query('members', {})
        ]);

        if (!tenantsResult.success || !usersResult.success || !membersResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch analytics data',
                code: 'DATABASE_ERROR'
            });
        }

        const tenants = tenantsResult.data;
        const users = usersResult.data;
        const members = membersResult.data;

        // Calculate platform-wide metrics
        const totalTenants = tenants.length;
        const activeTenants = tenants.filter(t => t.isActive).length;
        const totalUsers = users.length;
        const totalMembers = members.length;

        // Tenant breakdown by plan
        const tenantsByPlan = {
            basic: tenants.filter(t => t.plan === 'basic').length,
            premium: tenants.filter(t => t.plan === 'premium').length,
            enterprise: tenants.filter(t => t.plan === 'enterprise').length
        };

        // Growth metrics (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const newTenantsLast30Days = tenants.filter(t => 
            new Date(t.createdAt) > thirtyDaysAgo
        ).length;

        const newUsersLast30Days = users.filter(u => 
            new Date(u.createdAt) > thirtyDaysAgo
        ).length;

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalTenants,
                    activeTenants,
                    totalUsers,
                    totalMembers,
                    newTenantsLast30Days,
                    newUsersLast30Days
                },
                tenantsByPlan,
                topTenants: tenants
                    .map(tenant => ({
                        id: tenant.id,
                        name: tenant.name,
                        plan: tenant.plan,
                        memberCount: members.filter(m => m.tenantId === tenant.id).length,
                        createdAt: tenant.createdAt
                    }))
                    .sort((a, b) => b.memberCount - a.memberCount)
                    .slice(0, 10)
            }
        });
    } catch (error) {
        console.error('Get admin analytics error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('API Error:', error);
    
    authManager.logSecurityEvent('api_error', req, { 
        error: error.message,
        stack: error.stack 
    });

    res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        code: 'NOT_FOUND',
        path: req.originalUrl
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 GymFlow API Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Log startup
    console.log('🔧 API Endpoints Available:');
    console.log('   Authentication: /api/auth/*');
    console.log('   Members: /api/members/*');
    console.log('   Plans: /api/plans/*');
    console.log('   Trainers: /api/trainers/*');
    console.log('   Dashboard: /api/dashboard');
    console.log('   Analytics: /api/analytics');
    console.log('   Reports: /api/reports');
    console.log('   Admin: /api/admin/*');
});

module.exports = app;
