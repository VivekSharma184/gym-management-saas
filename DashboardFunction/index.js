const { app } = require('@azure/functions');
const { getDashboardData, getAnalyticsData } = require('../api/utils/database');

// Dashboard data endpoint
app.http('getDashboard', {
    methods: ['GET'],
    route: 'dashboard',
    handler: async (request, context) => {
        try {
            const authHeader = request.headers.get('authorization');
            const tenantId = request.headers.get('x-tenant-id');

            if (!authHeader || !tenantId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        error: 'Authentication required'
                    }
                };
            }

            const dashboardData = await getDashboardData(tenantId);
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: dashboardData
                }
            };
        } catch (error) {
            context.log.error('Dashboard error:', error);
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

// Analytics data endpoint
app.http('getAnalytics', {
    methods: ['GET'],
    route: 'analytics',
    handler: async (request, context) => {
        try {
            const authHeader = request.headers.get('authorization');
            const tenantId = request.headers.get('x-tenant-id');

            if (!authHeader || !tenantId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        error: 'Authentication required'
                    }
                };
            }

            const analyticsData = await getAnalyticsData(tenantId);
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: analyticsData
                }
            };
        } catch (error) {
            context.log.error('Analytics error:', error);
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
