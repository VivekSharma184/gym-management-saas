// Signup API Endpoint for GymFlow SaaS
const dbManager = require('../utils/database');
const authManager = require('../utils/auth');

async function signupHandler(req, res) {
    try {
        const { 
            email, 
            password, 
            firstName, 
            lastName, 
            gymName, 
            phone,
            planType = 'basic'
        } = req.body;

        // Validate input
        if (!email || !password || !firstName || !lastName || !gymName) {
            return res.status(400).json({
                success: false,
                error: 'All required fields must be provided',
                code: 'VALIDATION_ERROR',
                required: ['email', 'password', 'firstName', 'lastName', 'gymName']
            });
        }

        if (!authManager.validateEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format',
                code: 'VALIDATION_ERROR'
            });
        }

        // Validate password strength
        const passwordValidation = authManager.validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Password does not meet security requirements',
                code: 'WEAK_PASSWORD',
                requirements: passwordValidation.requirements
            });
        }

        // Check if user already exists
        const existingUserQuery = await dbManager.query('users', { email: email.toLowerCase() });
        
        if (existingUserQuery.success && existingUserQuery.data.length > 0) {
            authManager.logSecurityEvent('signup_failed', req, { reason: 'email_exists', email });
            return res.status(409).json({
                success: false,
                error: 'An account with this email already exists',
                code: 'EMAIL_EXISTS'
            });
        }

        // Generate tenant ID from gym name
        const tenantId = gymName.toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 20) + '_' + Date.now().toString(36);

        // Check if tenant ID is unique
        const existingTenantQuery = await dbManager.read('tenants', tenantId);
        if (existingTenantQuery.success) {
            return res.status(409).json({
                success: false,
                error: 'Gym name is not available, please choose another',
                code: 'TENANT_EXISTS'
            });
        }

        // Hash password
        const passwordHash = await authManager.hashPassword(password);
        if (!passwordHash.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to process password',
                code: 'PASSWORD_ERROR'
            });
        }

        // Create tenant
        const tenantData = {
            id: tenantId,
            name: gymName,
            owner: email.toLowerCase(),
            plan: planType,
            createdAt: new Date().toISOString(),
            isActive: true,
            settings: {
                timezone: 'UTC',
                currency: 'USD',
                features: planType === 'premium' ? 
                    ['members', 'plans', 'trainers', 'analytics', 'reports'] :
                    ['members', 'plans']
            }
        };

        const tenantResult = await dbManager.create('tenants', tenantData);
        if (!tenantResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to create gym account',
                code: 'TENANT_ERROR'
            });
        }

        // Create user
        const userId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
        const userData = {
            id: userId,
            email: email.toLowerCase(),
            password: passwordHash.hash,
            firstName,
            lastName,
            phone: phone || null,
            role: 'gym_owner',
            tenantId: tenantId,
            gymName: gymName,
            createdAt: new Date().toISOString(),
            isActive: true,
            emailVerified: false, // In production, implement email verification
            lastLogin: null,
            lastActivity: new Date().toISOString()
        };

        const userResult = await dbManager.create('users', userData);
        if (!userResult.success) {
            // Rollback tenant creation
            await dbManager.delete('tenants', tenantId);
            
            return res.status(500).json({
                success: false,
                error: 'Failed to create user account',
                code: 'USER_ERROR'
            });
        }

        // Generate JWT token
        const tokenPayload = {
            id: userId,
            email: email.toLowerCase(),
            role: 'gym_owner',
            tenantId: tenantId,
            firstName,
            lastName
        };

        const tokenResult = authManager.generateToken(tokenPayload);
        if (!tokenResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to generate authentication token',
                code: 'TOKEN_ERROR'
            });
        }

        // Create session data
        const sessionData = authManager.createSession(userResult.data, tenantId);
        sessionData.gymName = gymName;

        // Log successful signup
        authManager.logSecurityEvent('signup_success', req, { 
            userId: userId, 
            tenantId: tenantId,
            gymName: gymName
        });

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: {
                token: tokenResult.token,
                session: sessionData,
                user: {
                    id: userId,
                    email: email.toLowerCase(),
                    firstName,
                    lastName,
                    role: 'gym_owner',
                    tenantId: tenantId,
                    gymName: gymName
                },
                tenant: tenantResult.data
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        authManager.logSecurityEvent('signup_error', req, { error: error.message });
        
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Azure Functions export
module.exports = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };

    await signupHandler(req, res);
};

// Express.js export for local development
module.exports.handler = signupHandler;
