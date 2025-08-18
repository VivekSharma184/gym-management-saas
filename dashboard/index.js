module.exports = async function (context, req) {
    context.log('Dashboard endpoint called');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID'
            }
        };
        return;
    }

    try {
        const tenantId = req.headers['x-tenant-id'] || 'fitnesshub';

        // Sample dashboard data
        const dashboardData = {
            overview: {
                totalMembers: 156,
                activePlans: 12,
                monthlyRevenue: 45600,
                newMembersThisMonth: 23
            },
            planDistribution: [
                { name: 'Premium', value: 65, color: '#FF6B6B' },
                { name: 'Basic', value: 45, color: '#4ECDC4' },
                { name: 'Student', value: 30, color: '#45B7D1' },
                { name: 'Senior', value: 16, color: '#96CEB4' }
            ],
            recentMembers: [
                {
                    id: 'member_recent_1',
                    name: 'Alex Johnson',
                    plan: 'Premium',
                    joinDate: '2024-01-15',
                    status: 'active'
                },
                {
                    id: 'member_recent_2',
                    name: 'Maria Garcia',
                    plan: 'Basic',
                    joinDate: '2024-01-14',
                    status: 'active'
                },
                {
                    id: 'member_recent_3',
                    name: 'David Chen',
                    plan: 'Student',
                    joinDate: '2024-01-13',
                    status: 'active'
                }
            ],
            statusBreakdown: {
                active: 142,
                inactive: 8,
                suspended: 4,
                expired: 2
            },
            monthlyTrend: [
                { month: 'Jan', members: 120, revenue: 38000 },
                { month: 'Feb', members: 135, revenue: 42500 },
                { month: 'Mar', members: 148, revenue: 44200 },
                { month: 'Apr', members: 156, revenue: 45600 }
            ],
            upcomingExpirations: [
                {
                    id: 'member_exp_1',
                    name: 'John Smith',
                    plan: 'Basic',
                    expiryDate: '2024-02-15',
                    daysLeft: 5
                },
                {
                    id: 'member_exp_2',
                    name: 'Sarah Wilson',
                    plan: 'Premium',
                    expiryDate: '2024-02-18',
                    daysLeft: 8
                }
            ]
        };

        context.res = {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: {
                success: true,
                data: dashboardData
            }
        };

    } catch (error) {
        context.log.error('Dashboard endpoint error:', error);
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
