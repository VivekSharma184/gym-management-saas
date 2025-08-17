// Plans API Endpoints for GymFlow SaaS
const dbManager = require('../utils/database');
const authManager = require('../utils/auth');

// Get all plans for a tenant
async function getPlansHandler(req, res) {
    try {
        const tenantId = authManager.extractTenantId(req);
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Tenant ID required',
                code: 'TENANT_REQUIRED'
            });
        }

        const result = await dbManager.query('plans', {}, tenantId);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch plans',
                code: 'DATABASE_ERROR'
            });
        }

        // Sort by price (ascending)
        const sortedPlans = result.data.sort((a, b) => a.price - b.price);

        res.status(200).json({
            success: true,
            data: sortedPlans,
            count: sortedPlans.length
        });

    } catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Get single plan by ID
async function getPlanHandler(req, res) {
    try {
        const { id } = req.params;
        const tenantId = authManager.extractTenantId(req);

        const result = await dbManager.read('plans', id, tenantId);
        
        if (!result.success) {
            return res.status(404).json({
                success: false,
                error: 'Plan not found',
                code: 'PLAN_NOT_FOUND'
            });
        }

        res.status(200).json({
            success: true,
            data: result.data
        });

    } catch (error) {
        console.error('Get plan error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Create new plan
async function createPlanHandler(req, res) {
    try {
        const { name, price, duration, features, description } = req.body;
        const tenantId = authManager.extractTenantId(req);

        // Validate required fields
        if (!name || price === undefined || !duration) {
            return res.status(400).json({
                success: false,
                error: 'Name, price, and duration are required',
                code: 'VALIDATION_ERROR'
            });
        }

        // Validate price
        if (typeof price !== 'number' || price < 0) {
            return res.status(400).json({
                success: false,
                error: 'Price must be a positive number',
                code: 'VALIDATION_ERROR'
            });
        }

        // Validate duration
        const validDurations = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
        if (!validDurations.includes(duration)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid duration. Must be one of: ' + validDurations.join(', '),
                code: 'VALIDATION_ERROR'
            });
        }

        // Check if plan with same name exists in this tenant
        const existingQuery = await dbManager.query('plans', { name: name.trim() }, tenantId);
        
        if (existingQuery.success && existingQuery.data.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Plan with this name already exists',
                code: 'PLAN_EXISTS'
            });
        }

        // Create plan
        const planId = 'plan_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
        const planData = {
            id: planId,
            tenantId,
            name: name.trim(),
            price: parseFloat(price),
            duration,
            features: Array.isArray(features) ? features : [],
            description: description || '',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = await dbManager.create('plans', planData);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to create plan',
                code: 'DATABASE_ERROR'
            });
        }

        authManager.logSecurityEvent('plan_created', req, { 
            planId: planId,
            planName: name,
            price: price
        });

        res.status(201).json({
            success: true,
            message: 'Plan created successfully',
            data: result.data
        });

    } catch (error) {
        console.error('Create plan error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Update plan
async function updatePlanHandler(req, res) {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const tenantId = authManager.extractTenantId(req);

        // Check if plan exists
        const existingQuery = await dbManager.read('plans', id, tenantId);
        if (!existingQuery.success) {
            return res.status(404).json({
                success: false,
                error: 'Plan not found',
                code: 'PLAN_NOT_FOUND'
            });
        }

        // Validate price if provided
        if (updateData.price !== undefined) {
            if (typeof updateData.price !== 'number' || updateData.price < 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Price must be a positive number',
                    code: 'VALIDATION_ERROR'
                });
            }
        }

        // Validate duration if provided
        if (updateData.duration) {
            const validDurations = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
            if (!validDurations.includes(updateData.duration)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid duration. Must be one of: ' + validDurations.join(', '),
                    code: 'VALIDATION_ERROR'
                });
            }
        }

        // Check for name conflicts if name is being updated
        if (updateData.name && updateData.name.trim() !== existingQuery.data.name) {
            const nameQuery = await dbManager.query('plans', { name: updateData.name.trim() }, tenantId);
            if (nameQuery.success && nameQuery.data.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: 'Plan with this name already exists',
                    code: 'NAME_EXISTS'
                });
            }
        }

        // Clean update data
        const cleanData = { ...updateData };
        if (cleanData.name) cleanData.name = cleanData.name.trim();
        if (cleanData.price !== undefined) cleanData.price = parseFloat(cleanData.price);
        
        // Remove fields that shouldn't be updated
        delete cleanData.id;
        delete cleanData.tenantId;
        delete cleanData.createdAt;

        const result = await dbManager.update('plans', id, cleanData, tenantId);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to update plan',
                code: 'DATABASE_ERROR'
            });
        }

        authManager.logSecurityEvent('plan_updated', req, { 
            planId: id,
            changes: Object.keys(cleanData)
        });

        res.status(200).json({
            success: true,
            message: 'Plan updated successfully',
            data: result.data
        });

    } catch (error) {
        console.error('Update plan error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Delete plan
async function deletePlanHandler(req, res) {
    try {
        const { id } = req.params;
        const tenantId = authManager.extractTenantId(req);

        // Check if plan exists
        const existingQuery = await dbManager.read('plans', id, tenantId);
        if (!existingQuery.success) {
            return res.status(404).json({
                success: false,
                error: 'Plan not found',
                code: 'PLAN_NOT_FOUND'
            });
        }

        // Check if plan is being used by any members
        const membersQuery = await dbManager.query('members', { planId: id }, tenantId);
        if (membersQuery.success && membersQuery.data.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Cannot delete plan that is assigned to members',
                code: 'PLAN_IN_USE',
                membersCount: membersQuery.data.length
            });
        }

        const result = await dbManager.delete('plans', id, tenantId);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to delete plan',
                code: 'DATABASE_ERROR'
            });
        }

        authManager.logSecurityEvent('plan_deleted', req, { 
            planId: id,
            planName: existingQuery.data.name
        });

        res.status(200).json({
            success: true,
            message: 'Plan deleted successfully',
            data: { id }
        });

    } catch (error) {
        console.error('Delete plan error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Get plan statistics
async function getPlanStatsHandler(req, res) {
    try {
        const tenantId = authManager.extractTenantId(req);

        // Get all plans
        const plansQuery = await dbManager.query('plans', {}, tenantId);
        if (!plansQuery.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch plans',
                code: 'DATABASE_ERROR'
            });
        }

        // Get all members
        const membersQuery = await dbManager.query('members', {}, tenantId);
        if (!membersQuery.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch members',
                code: 'DATABASE_ERROR'
            });
        }

        const plans = plansQuery.data;
        const members = membersQuery.data;

        // Calculate statistics for each plan
        const planStats = plans.map(plan => {
            const planMembers = members.filter(member => member.planId === plan.id);
            const totalRevenue = planMembers.length * plan.price;

            return {
                id: plan.id,
                name: plan.name,
                price: plan.price,
                duration: plan.duration,
                memberCount: planMembers.length,
                totalRevenue: totalRevenue,
                isActive: plan.isActive
            };
        });

        // Overall statistics
        const totalPlans = plans.length;
        const activePlans = plans.filter(plan => plan.isActive).length;
        const totalMembers = members.length;
        const totalRevenue = planStats.reduce((sum, plan) => sum + plan.totalRevenue, 0);
        const averagePrice = plans.length > 0 ? plans.reduce((sum, plan) => sum + plan.price, 0) / plans.length : 0;

        res.status(200).json({
            success: true,
            data: {
                plans: planStats,
                summary: {
                    totalPlans,
                    activePlans,
                    totalMembers,
                    totalRevenue,
                    averagePrice: Math.round(averagePrice * 100) / 100
                }
            }
        });

    } catch (error) {
        console.error('Get plan stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Export handlers
module.exports = {
    getPlansHandler,
    getPlanHandler,
    createPlanHandler,
    updatePlanHandler,
    deletePlanHandler,
    getPlanStatsHandler
};

// Azure Functions exports
module.exports.getPlans = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await getPlansHandler(req, res);
};

module.exports.getPlan = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await getPlanHandler(req, res);
};

module.exports.createPlan = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await createPlanHandler(req, res);
};

module.exports.updatePlan = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await updatePlanHandler(req, res);
};

module.exports.deletePlan = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await deletePlanHandler(req, res);
};

module.exports.getPlanStats = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await getPlanStatsHandler(req, res);
};
