const bcrypt = require('bcryptjs');

module.exports = async function (context, req) {
    context.log('Login endpoint called');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID'
            }
        };
        return;
    }

    if (req.method !== 'POST') {
        context.res = {
            status: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: {
                success: false,
                error: 'Method not allowed'
            }
        };
        return;
    }

    try {
        const { email, password, rememberMe } = req.body;

        if (!email || !password) {
            context.res = {
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: {
                    success: false,
                    error: 'Email and password are required'
                }
            };
            return;
        }

        // Sample users for authentication
        const users = [
            {
                id: 'user_demo',
                email: 'demo@gymflow.com',
                password: bcrypt.hashSync('demo123', 10),
                firstName: 'Demo',
                lastName: 'User',
                role: 'gym-owner',
                tenantId: 'fitnesshub'
            },
            {
                id: 'user_admin',
                email: 'admin@gymflow.com',
                password: bcrypt.hashSync('admin123', 10),
                firstName: 'Super',
                lastName: 'Admin',
                role: 'super-admin',
                tenantId: null
            }
        ];

        const user = users.find(u => u.email === email);
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
            context.res = {
                status: 401,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: {
                    success: false,
                    error: 'Invalid credentials'
                }
            };
            return;
        }

        // Generate token (simple approach for demo)
        const token = 'azure-jwt-' + Buffer.from(JSON.stringify({
            id: user.id,
            email: user.email,
            exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        })).toString('base64');

        const userSession = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            tenantId: user.tenantId,
            lastLogin: new Date().toISOString()
        };

        context.res = {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: {
                success: true,
                message: 'Login successful',
                data: {
                    token: token,
                    session: {
                        user: userSession
                    }
                }
            }
        };

    } catch (error) {
        context.log.error('Login error:', error);
        context.res = {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: {
                success: false,
                error: 'Internal server error'
            }
        };
    }
};
