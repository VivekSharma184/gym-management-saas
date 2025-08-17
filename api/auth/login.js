// Login API Endpoint for GymFlow SaaS
const dbManager = require('../utils/database');
const authManager = require('../utils/auth');

async function loginHandler(req, res) {
    try {
        const { email, password, rememberMe = false } = req.body;

        // Validate input
        if (!email || !password) {
            authManager.logSecurityEvent('login_failed', req, { reason: 'missing_credentials' });
            return res.status(400).json({
                success: false,
                error: 'Email and password are required',
                code: 'VALIDATION_ERROR'
            });
        }

        if (!authManager.validateEmail(email)) {
            authManager.logSecurityEvent('login_failed', req, { reason: 'invalid_email', email });
            return res.status(400).json({
                success: false,
                error: 'Invalid email format',
                code: 'VALIDATION_ERROR'
            });
        }

        // Find user by email
        const userQuery = await dbManager.query('users', { email: email.toLowerCase() });
        
        if (!userQuery.success || userQuery.data.length === 0) {
            authManager.logSecurityEvent('login_failed', req, { reason: 'user_not_found', email });
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password',
                code: 'AUTH_FAILED'
            });
        }

        const user = userQuery.data[0];

        // Check if user is active
        if (!user.isActive) {
            authManager.logSecurityEvent('login_failed', req, { reason: 'user_inactive', userId: user.id });
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        // Verify password
        const passwordCheck = await authManager.verifyPassword(password, user.password);
        
        if (!passwordCheck.success || !passwordCheck.isValid) {
            authManager.logSecurityEvent('login_failed', req, { reason: 'invalid_password', userId: user.id });
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password',
                code: 'AUTH_FAILED'
            });
        }

        // Get tenant information for gym owners
        let tenantInfo = null;
        if (user.role === 'gym_owner' && user.tenantId) {
            const tenantQuery = await dbManager.read('tenants', user.tenantId);
            if (tenantQuery.success) {
                tenantInfo = tenantQuery.data;
            }
        }

        // Generate JWT token
        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            firstName: user.firstName,
            lastName: user.lastName
        };

        const tokenResult = authManager.generateToken(tokenPayload);
        
        if (!tokenResult.success) {
            authManager.logSecurityEvent('login_failed', req, { reason: 'token_generation_failed', userId: user.id });
            return res.status(500).json({
                success: false,
                error: 'Failed to generate authentication token',
                code: 'TOKEN_ERROR'
            });
        }

        // Create session data
        const sessionData = authManager.createSession(user, user.tenantId);
        sessionData.rememberMe = rememberMe;
        sessionData.gymName = tenantInfo?.name || 'Demo Gym';

        // Update last login
        await dbManager.update('users', user.id, {
            lastLogin: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        });

        // Log successful login
        authManager.logSecurityEvent('login_success', req, { 
            userId: user.id, 
            role: user.role,
            tenantId: user.tenantId 
        });

        // Return success response
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token: tokenResult.token,
                session: sessionData,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    tenantId: user.tenantId,
                    gymName: tenantInfo?.name || 'Demo Gym'
                },
                tenant: tenantInfo
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        authManager.logSecurityEvent('login_error', req, { error: error.message });
        
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Azure Functions export
module.exports = async function (context, req) {
    // Set up response object for Azure Functions
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };

    await loginHandler(req, res);
};

// Express.js export for local development
module.exports.handler = loginHandler;
