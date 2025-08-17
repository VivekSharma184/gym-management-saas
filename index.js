// Azure Functions entry point for GymFlow API
const express = require('express');
const cors = require('cors');

// Import your existing API routes
const authRoutes = require('./api/auth/login');
const signupRoutes = require('./api/auth/signup');
const membersRoutes = require('./api/members/index');
const plansRoutes = require('./api/plans/index');
const trainersRoutes = require('./api/trainers/index');
const dashboardRoutes = require('./api/dashboard/index');

// Import utilities
const { securityHeaders, requireAuth, requireTenantAccess } = require('./api/utils/auth');
const { seedSampleData } = require('./api/utils/database');

// Create Express app
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration for Azure Functions
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'https://flexifitvault.netlify.app',
            'https://gymflow-btfvaaeqb2dac2bw.centralindia-01.azurewebsites.net',
            'http://localhost:3002',
            'http://localhost:3000'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(null, true); // Allow all origins for now
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID']
}));

// Security headers
app.use(securityHeaders);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'azure-functions',
        database: {
            status: 'healthy',
            database: 'cosmos-db'
        }
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', signupRoutes);
app.use('/api/members', requireAuth, requireTenantAccess, membersRoutes);
app.use('/api/plans', requireAuth, requireTenantAccess, plansRoutes);
app.use('/api/trainers', requireAuth, requireTenantAccess, trainersRoutes);
app.use('/api/dashboard', requireAuth, requireTenantAccess, dashboardRoutes);
app.use('/api/analytics', requireAuth, requireTenantAccess, dashboardRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('API Error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Azure Functions handler
module.exports = async function (context, req) {
    context.log('GymFlow API request:', req.method, req.url);
    
    // Initialize sample data if needed
    try {
        await seedSampleData();
    } catch (error) {
        context.log('Sample data seeding error:', error);
    }
    
    return new Promise((resolve, reject) => {
        // Create mock response object
        const res = {
            status: (code) => {
                context.res = context.res || {};
                context.res.status = code;
                return res;
            },
            json: (body) => {
                context.res = context.res || {};
                context.res.body = body;
                context.res.headers = {
                    'Content-Type': 'application/json',
                    ...context.res.headers
                };
                resolve(context.res);
            },
            send: (body) => {
                context.res = context.res || {};
                context.res.body = body;
                resolve(context.res);
            },
            setHeader: (name, value) => {
                context.res = context.res || {};
                context.res.headers = context.res.headers || {};
                context.res.headers[name] = value;
            }
        };
        
        // Handle the request with Express
        app(req, res);
    });
};
