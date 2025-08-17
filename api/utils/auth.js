// Authentication Utilities for GymFlow SaaS
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class AuthManager {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'gymflow-dev-secret-key-change-in-production';
        this.jwtExpiry = process.env.JWT_EXPIRY || '24h';
        this.saltRounds = 12;
    }

    // Hash password
    async hashPassword(password) {
        try {
            const salt = await bcrypt.genSalt(this.saltRounds);
            const hash = await bcrypt.hash(password, salt);
            return { success: true, hash };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Verify password
    async verifyPassword(password, hash) {
        try {
            const isValid = await bcrypt.compare(password, hash);
            return { success: true, isValid };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Generate JWT token
    generateToken(payload) {
        try {
            const token = jwt.sign(payload, this.jwtSecret, {
                expiresIn: this.jwtExpiry,
                issuer: 'gymflow-saas',
                audience: 'gymflow-users'
            });
            return { success: true, token };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Verify JWT token
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret, {
                issuer: 'gymflow-saas',
                audience: 'gymflow-users'
            });
            return { success: true, payload: decoded };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Generate refresh token
    generateRefreshToken() {
        return crypto.randomBytes(64).toString('hex');
    }

    // Generate password reset token
    generateResetToken() {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        return { token, expires };
    }

    // Validate password strength
    validatePasswordStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasNonalphas = /\W/.test(password);

        const score = [
            password.length >= minLength,
            hasUpperCase,
            hasLowerCase,
            hasNumbers,
            hasNonalphas
        ].filter(Boolean).length;

        let strength = 'weak';
        if (score >= 4) strength = 'strong';
        else if (score >= 3) strength = 'medium';

        return {
            isValid: score >= 3,
            strength,
            score,
            requirements: {
                minLength: password.length >= minLength,
                hasUpperCase,
                hasLowerCase,
                hasNumbers,
                hasSpecialChar: hasNonalphas
            }
        };
    }

    // Extract tenant from request
    extractTenantId(req) {
        // Try multiple sources for tenant ID
        return req.headers['x-tenant-id'] || 
               req.query.tenantId || 
               req.body.tenantId ||
               req.params.tenantId ||
               null;
    }

    // Middleware to verify authentication
    requireAuth = (req, res, next) => {
        const token = this.extractToken(req);
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        try {
            const decoded = this.verifyToken(token);
            req.user = decoded;
            req.userId = decoded.id;
            req.userRole = decoded.role;
            next();
        } catch (error) {
            this.logSecurityEvent('invalid_token', req, { token: token.substring(0, 10) + '...' });
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            });
        }
    }

    // Middleware to verify role
    requireRole(roles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            const userRole = req.user.role;
            const allowedRoles = Array.isArray(roles) ? roles : [roles];

            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions',
                    code: 'AUTH_FORBIDDEN',
                    required: allowedRoles,
                    current: userRole
                });
            }

            next();
        };
    }

    // Middleware to verify tenant access
    requireTenantAccess = (req, res, next) => {
        const tenantId = this.extractTenantId(req);
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Tenant ID required',
                code: 'TENANT_REQUIRED'
            });
        }

        // Super admins can access any tenant
        if (req.user.role === 'super_admin') {
            req.tenantId = tenantId;
            return next();
        }

        // Gym owners can only access their own tenant
        if (req.user.role === 'gym_owner' && req.user.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to this tenant',
                code: 'TENANT_FORBIDDEN'
            });
        }

        req.tenantId = tenantId;
        next();
    }

    // Extract token from request
    extractToken(req) {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        // Also check query parameter and cookies
        return req.query.token || req.cookies?.token || null;
    }

    // Rate limiting helper
    createRateLimiter(windowMs = 15 * 60 * 1000, max = 100) {
        const requests = new Map();
        
        return (req, res, next) => {
            const key = req.ip || req.connection.remoteAddress;
            const now = Date.now();
            
            if (!requests.has(key)) {
                requests.set(key, []);
            }
            
            const userRequests = requests.get(key);
            
            // Remove old requests outside the window
            while (userRequests.length > 0 && userRequests[0] < now - windowMs) {
                userRequests.shift();
            }
            
            if (userRequests.length >= max) {
                return res.status(429).json({
                    success: false,
                    error: 'Too many requests',
                    code: 'RATE_LIMITED',
                    retryAfter: Math.ceil((userRequests[0] + windowMs - now) / 1000)
                });
            }
            
            userRequests.push(now);
            next();
        };
    }

    // Security headers middleware
    securityHeaders = (req, res, next) => {
        // CORS headers
        res.header('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Tenant-ID');
        res.header('Access-Control-Allow-Credentials', 'true');

        // Security headers
        res.header('X-Content-Type-Options', 'nosniff');
        res.header('X-Frame-Options', 'DENY');
        res.header('X-XSS-Protection', '1; mode=block');
        res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // CSP header
        res.header('Content-Security-Policy', 
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
            "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
            "font-src 'self' https://cdnjs.cloudflare.com; " +
            "img-src 'self' data: https:; " +
            "connect-src 'self' https:;"
        );

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        next();
    }

    // Log security events
    logSecurityEvent(event, req, additional = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            user: req.user?.id || 'anonymous',
            tenant: req.tenantId || 'unknown',
            url: req.originalUrl || req.url,
            method: req.method,
            ...additional
        };

        console.log('🔒 Security Event:', JSON.stringify(logEntry, null, 2));
        
        // In production, send to security monitoring service
        // await securityService.log(logEntry);
        
        return logEntry;
    }

    // Validate email format
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Generate secure session ID
    generateSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Create user session data
    createSession(user, tenantId = null) {
        const sessionId = this.generateSessionId();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        return {
            sessionId,
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            tenantId: tenantId || user.tenantId,
            gymName: user.gymName,
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
            lastActivity: new Date().toISOString()
        };
    }
}

// Singleton instance
const authManager = new AuthManager();

module.exports = authManager;
