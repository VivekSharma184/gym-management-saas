// Dashboard API Endpoints for GymFlow SaaS
const dbManager = require('../utils/database');
const authManager = require('../utils/auth');

// Get dashboard overview data
async function getDashboardHandler(req, res) {
    try {
        const tenantId = authManager.extractTenantId(req);
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Tenant ID required',
                code: 'TENANT_REQUIRED'
            });
        }

        // Fetch all data in parallel
        const [membersResult, plansResult, trainersResult] = await Promise.all([
            dbManager.query('members', {}, tenantId),
            dbManager.query('plans', {}, tenantId),
            dbManager.query('trainers', {}, tenantId)
        ]);

        if (!membersResult.success || !plansResult.success || !trainersResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch dashboard data',
                code: 'DATABASE_ERROR'
            });
        }

        const members = membersResult.data;
        const plans = plansResult.data;
        const trainers = trainersResult.data;

        // Calculate key metrics
        const totalMembers = members.length;
        const activeMembers = members.filter(member => member.status === 'active').length;
        const totalPlans = plans.length;
        const activePlans = plans.filter(plan => plan.isActive).length;
        const totalTrainers = trainers.length;
        const activeTrainers = trainers.filter(trainer => trainer.isActive).length;

        // Calculate revenue
        const monthlyRevenue = members.reduce((total, member) => {
            if (member.planId && member.status === 'active') {
                const plan = plans.find(p => p.id === member.planId);
                if (plan && plan.duration === 'monthly') {
                    return total + plan.price;
                }
            }
            return total;
        }, 0);

        // Member growth (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const newMembersLast30Days = members.filter(member => 
            new Date(member.createdAt) > thirtyDaysAgo
        ).length;

        // Plan distribution
        const planDistribution = plans.map(plan => {
            const memberCount = members.filter(member => member.planId === plan.id).length;
            return {
                id: plan.id,
                name: plan.name,
                memberCount,
                revenue: memberCount * plan.price,
                percentage: totalMembers > 0 ? Math.round((memberCount / totalMembers) * 100) : 0
            };
        });

        // Recent activities (last 10 members)
        const recentMembers = members
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10)
            .map(member => ({
                id: member.id,
                name: member.name,
                email: member.email,
                joinDate: member.joinDate,
                status: member.status,
                planName: plans.find(p => p.id === member.planId)?.name || 'No Plan'
            }));

        // Member status breakdown
        const statusBreakdown = {
            active: members.filter(m => m.status === 'active').length,
            inactive: members.filter(m => m.status === 'inactive').length,
            suspended: members.filter(m => m.status === 'suspended').length,
            expired: members.filter(m => m.status === 'expired').length
        };

        // Monthly trends (last 6 months)
        const monthlyTrends = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const monthMembers = members.filter(member => {
                const joinDate = new Date(member.createdAt);
                return joinDate >= monthStart && joinDate <= monthEnd;
            });

            monthlyTrends.push({
                month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
                newMembers: monthMembers.length,
                revenue: monthMembers.reduce((total, member) => {
                    const plan = plans.find(p => p.id === member.planId);
                    return total + (plan ? plan.price : 0);
                }, 0)
            });
        }

        // Top performing plans
        const topPlans = planDistribution
            .sort((a, b) => b.memberCount - a.memberCount)
            .slice(0, 5);

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalMembers,
                    activeMembers,
                    totalPlans,
                    activePlans,
                    totalTrainers,
                    activeTrainers,
                    monthlyRevenue,
                    newMembersLast30Days
                },
                planDistribution,
                recentMembers,
                statusBreakdown,
                monthlyTrends,
                topPlans
            }
        });

    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Get analytics data
async function getAnalyticsHandler(req, res) {
    try {
        const tenantId = authManager.extractTenantId(req);
        const { period = '30d' } = req.query;

        // Calculate date range based on period
        let startDate = new Date();
        switch (period) {
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(startDate.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(startDate.getDate() - 30);
        }

        // Fetch data
        const [membersResult, plansResult] = await Promise.all([
            dbManager.query('members', {}, tenantId),
            dbManager.query('plans', {}, tenantId)
        ]);

        if (!membersResult.success || !plansResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch analytics data',
                code: 'DATABASE_ERROR'
            });
        }

        const members = membersResult.data;
        const plans = plansResult.data;

        // Filter members by date range
        const filteredMembers = members.filter(member => 
            new Date(member.createdAt) >= startDate
        );

        // Daily member registrations
        const dailyRegistrations = {};
        filteredMembers.forEach(member => {
            const date = new Date(member.createdAt).toISOString().split('T')[0];
            dailyRegistrations[date] = (dailyRegistrations[date] || 0) + 1;
        });

        // Revenue by plan
        const revenueByPlan = plans.map(plan => {
            const planMembers = members.filter(member => 
                member.planId === plan.id && member.status === 'active'
            );
            return {
                planName: plan.name,
                revenue: planMembers.length * plan.price,
                memberCount: planMembers.length
            };
        });

        // Member retention (active vs total)
        const retentionRate = members.length > 0 ? 
            (members.filter(m => m.status === 'active').length / members.length) * 100 : 0;

        // Average revenue per member
        const totalRevenue = revenueByPlan.reduce((sum, plan) => sum + plan.revenue, 0);
        const arpu = members.length > 0 ? totalRevenue / members.length : 0;

        res.status(200).json({
            success: true,
            data: {
                period,
                dateRange: {
                    start: startDate.toISOString(),
                    end: new Date().toISOString()
                },
                metrics: {
                    newMembers: filteredMembers.length,
                    totalRevenue,
                    retentionRate: Math.round(retentionRate * 100) / 100,
                    arpu: Math.round(arpu * 100) / 100
                },
                dailyRegistrations,
                revenueByPlan,
                trends: {
                    memberGrowth: filteredMembers.length,
                    revenueGrowth: totalRevenue
                }
            }
        });

    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Get reports data
async function getReportsHandler(req, res) {
    try {
        const tenantId = authManager.extractTenantId(req);
        const { type = 'summary', format = 'json' } = req.query;

        // Fetch all data
        const [membersResult, plansResult, trainersResult] = await Promise.all([
            dbManager.query('members', {}, tenantId),
            dbManager.query('plans', {}, tenantId),
            dbManager.query('trainers', {}, tenantId)
        ]);

        if (!membersResult.success || !plansResult.success || !trainersResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch report data',
                code: 'DATABASE_ERROR'
            });
        }

        const members = membersResult.data;
        const plans = plansResult.data;
        const trainers = trainersResult.data;

        let reportData = {};

        switch (type) {
            case 'members':
                reportData = {
                    title: 'Members Report',
                    generatedAt: new Date().toISOString(),
                    summary: {
                        totalMembers: members.length,
                        activeMembers: members.filter(m => m.status === 'active').length,
                        inactiveMembers: members.filter(m => m.status === 'inactive').length
                    },
                    details: members.map(member => ({
                        name: member.name,
                        email: member.email,
                        phone: member.phone,
                        status: member.status,
                        joinDate: member.joinDate,
                        planName: plans.find(p => p.id === member.planId)?.name || 'No Plan'
                    }))
                };
                break;

            case 'revenue':
                const revenueData = plans.map(plan => {
                    const planMembers = members.filter(m => m.planId === plan.id && m.status === 'active');
                    return {
                        planName: plan.name,
                        price: plan.price,
                        memberCount: planMembers.length,
                        totalRevenue: planMembers.length * plan.price
                    };
                });

                reportData = {
                    title: 'Revenue Report',
                    generatedAt: new Date().toISOString(),
                    summary: {
                        totalRevenue: revenueData.reduce((sum, plan) => sum + plan.totalRevenue, 0),
                        totalPlans: plans.length,
                        averageRevenuePerPlan: revenueData.length > 0 ? 
                            revenueData.reduce((sum, plan) => sum + plan.totalRevenue, 0) / revenueData.length : 0
                    },
                    details: revenueData
                };
                break;

            case 'trainers':
                reportData = {
                    title: 'Trainers Report',
                    generatedAt: new Date().toISOString(),
                    summary: {
                        totalTrainers: trainers.length,
                        activeTrainers: trainers.filter(t => t.isActive).length,
                        averageRating: trainers.length > 0 ? 
                            trainers.reduce((sum, t) => sum + t.rating, 0) / trainers.length : 0
                    },
                    details: trainers.map(trainer => ({
                        name: trainer.name,
                        email: trainer.email,
                        specialization: trainer.specialization,
                        experience: trainer.experience,
                        hourlyRate: trainer.hourlyRate,
                        rating: trainer.rating,
                        totalSessions: trainer.totalSessions,
                        isActive: trainer.isActive
                    }))
                };
                break;

            default: // summary
                reportData = {
                    title: 'Summary Report',
                    generatedAt: new Date().toISOString(),
                    overview: {
                        totalMembers: members.length,
                        activeMembers: members.filter(m => m.status === 'active').length,
                        totalPlans: plans.length,
                        totalTrainers: trainers.length,
                        totalRevenue: plans.reduce((total, plan) => {
                            const planMembers = members.filter(m => m.planId === plan.id && m.status === 'active');
                            return total + (planMembers.length * plan.price);
                        }, 0)
                    },
                    breakdown: {
                        membersByStatus: {
                            active: members.filter(m => m.status === 'active').length,
                            inactive: members.filter(m => m.status === 'inactive').length,
                            suspended: members.filter(m => m.status === 'suspended').length,
                            expired: members.filter(m => m.status === 'expired').length
                        },
                        planPopularity: plans.map(plan => ({
                            name: plan.name,
                            memberCount: members.filter(m => m.planId === plan.id).length
                        }))
                    }
                };
        }

        // Log report generation
        authManager.logSecurityEvent('report_generated', req, { 
            reportType: type,
            format: format
        });

        res.status(200).json({
            success: true,
            data: reportData
        });

    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Export handlers
module.exports = {
    getDashboardHandler,
    getAnalyticsHandler,
    getReportsHandler
};

// Azure Functions exports
module.exports.getDashboard = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await getDashboardHandler(req, res);
};

module.exports.getAnalytics = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await getAnalyticsHandler(req, res);
};

module.exports.getReports = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await getReportsHandler(req, res);
};
