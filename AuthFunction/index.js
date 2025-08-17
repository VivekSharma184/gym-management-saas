const { app } = require('@azure/functions');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import your existing auth utilities
const { generateToken, hashPassword } = require('../api/utils/auth');
const { getUser, createUser, getUserByEmail } = require('../api/utils/database');

// Login endpoint
app.http('login', {
    methods: ['POST'],
    route: 'auth/login',
    handler: async (request, context) => {
        try {
            const { email, password, rememberMe } = await request.json();

            if (!email || !password) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: 'Email and password are required'
                    }
                };
            }

            const user = await getUserByEmail(email);
            if (!user) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        error: 'Invalid credentials'
                    }
                };
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        error: 'Invalid credentials'
                    }
                };
            }

            const token = generateToken(user, rememberMe);
            const userSession = {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                tenantId: user.tenantId,
                lastLogin: new Date().toISOString()
            };

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Login successful',
                    data: {
                        token,
                        session: {
                            user: userSession
                        }
                    }
                }
            };
        } catch (error) {
            context.log.error('Login error:', error);
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    error: 'Internal server error'
                }
            };
        }
    }
});

// Signup endpoint
app.http('signup', {
    methods: ['POST'],
    route: 'auth/signup',
    handler: async (request, context) => {
        try {
            const { email, password, firstName, lastName, gymName } = await request.json();

            if (!email || !password || !firstName || !lastName) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: 'All fields are required'
                    }
                };
            }

            const existingUser = await getUserByEmail(email);
            if (existingUser) {
                return {
                    status: 409,
                    jsonBody: {
                        success: false,
                        error: 'User already exists'
                    }
                };
            }

            const hashedPassword = await hashPassword(password);
            const tenantId = gymName ? gymName.toLowerCase().replace(/\s+/g, '') : 'gym' + Date.now();
            
            const newUser = {
                id: 'user_' + Date.now(),
                email,
                password: hashedPassword,
                firstName,
                lastName,
                role: 'gym-owner',
                tenantId,
                createdAt: new Date().toISOString(),
                isActive: true
            };

            await createUser(newUser);

            const token = generateToken(newUser);
            const userSession = {
                id: newUser.id,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                role: newUser.role,
                tenantId: newUser.tenantId
            };

            return {
                status: 201,
                jsonBody: {
                    success: true,
                    message: 'Account created successfully',
                    data: {
                        token,
                        session: {
                            user: userSession
                        }
                    }
                }
            };
        } catch (error) {
            context.log.error('Signup error:', error);
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    error: 'Internal server error'
                }
            };
        }
    }
});
