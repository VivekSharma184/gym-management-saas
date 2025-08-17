// Members API Endpoints for GymFlow SaaS
const dbManager = require('../utils/database');
const authManager = require('../utils/auth');

// Get all members for a tenant
async function getMembersHandler(req, res) {
    try {
        const tenantId = authManager.extractTenantId(req);
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Tenant ID required',
                code: 'TENANT_REQUIRED'
            });
        }

        const result = await dbManager.query('members', {}, tenantId);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch members',
                code: 'DATABASE_ERROR'
            });
        }

        // Sort by creation date (newest first)
        const sortedMembers = result.data.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        res.status(200).json({
            success: true,
            data: sortedMembers,
            count: sortedMembers.length
        });

    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Get single member by ID
async function getMemberHandler(req, res) {
    try {
        const { id } = req.params;
        const tenantId = authManager.extractTenantId(req);

        const result = await dbManager.read('members', id, tenantId);
        
        if (!result.success) {
            return res.status(404).json({
                success: false,
                error: 'Member not found',
                code: 'MEMBER_NOT_FOUND'
            });
        }

        res.status(200).json({
            success: true,
            data: result.data
        });

    } catch (error) {
        console.error('Get member error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Create new member
async function createMemberHandler(req, res) {
    try {
        const { name, email, phone, planId, joinDate, emergencyContact } = req.body;
        const tenantId = authManager.extractTenantId(req);

        // Validate required fields
        if (!name || !email || !phone) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and phone are required',
                code: 'VALIDATION_ERROR'
            });
        }

        if (!authManager.validateEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format',
                code: 'VALIDATION_ERROR'
            });
        }

        // Check if member with same email exists in this tenant
        const existingQuery = await dbManager.query('members', { email: email.toLowerCase() }, tenantId);
        
        if (existingQuery.success && existingQuery.data.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Member with this email already exists',
                code: 'MEMBER_EXISTS'
            });
        }

        // Validate plan if provided
        if (planId) {
            const planQuery = await dbManager.read('plans', planId, tenantId);
            if (!planQuery.success) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid plan ID',
                    code: 'INVALID_PLAN'
                });
            }
        }

        // Create member
        const memberId = 'member_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
        const memberData = {
            id: memberId,
            tenantId,
            name: name.trim(),
            email: email.toLowerCase(),
            phone: phone.trim(),
            planId: planId || null,
            joinDate: joinDate || new Date().toISOString().split('T')[0],
            status: 'active',
            emergencyContact: emergencyContact || null,
            notes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = await dbManager.create('members', memberData);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to create member',
                code: 'DATABASE_ERROR'
            });
        }

        authManager.logSecurityEvent('member_created', req, { 
            memberId: memberId,
            memberName: name 
        });

        res.status(201).json({
            success: true,
            message: 'Member created successfully',
            data: result.data
        });

    } catch (error) {
        console.error('Create member error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Update member
async function updateMemberHandler(req, res) {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const tenantId = authManager.extractTenantId(req);

        // Validate email if provided
        if (updateData.email && !authManager.validateEmail(updateData.email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format',
                code: 'VALIDATION_ERROR'
            });
        }

        // Check if member exists
        const existingQuery = await dbManager.read('members', id, tenantId);
        if (!existingQuery.success) {
            return res.status(404).json({
                success: false,
                error: 'Member not found',
                code: 'MEMBER_NOT_FOUND'
            });
        }

        // Check for email conflicts if email is being updated
        if (updateData.email && updateData.email.toLowerCase() !== existingQuery.data.email) {
            const emailQuery = await dbManager.query('members', { email: updateData.email.toLowerCase() }, tenantId);
            if (emailQuery.success && emailQuery.data.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: 'Member with this email already exists',
                    code: 'EMAIL_EXISTS'
                });
            }
        }

        // Validate plan if provided
        if (updateData.planId) {
            const planQuery = await dbManager.read('plans', updateData.planId, tenantId);
            if (!planQuery.success) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid plan ID',
                    code: 'INVALID_PLAN'
                });
            }
        }

        // Clean update data
        const cleanData = { ...updateData };
        if (cleanData.email) cleanData.email = cleanData.email.toLowerCase();
        if (cleanData.name) cleanData.name = cleanData.name.trim();
        if (cleanData.phone) cleanData.phone = cleanData.phone.trim();
        
        // Remove fields that shouldn't be updated
        delete cleanData.id;
        delete cleanData.tenantId;
        delete cleanData.createdAt;

        const result = await dbManager.update('members', id, cleanData, tenantId);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to update member',
                code: 'DATABASE_ERROR'
            });
        }

        authManager.logSecurityEvent('member_updated', req, { 
            memberId: id,
            changes: Object.keys(cleanData)
        });

        res.status(200).json({
            success: true,
            message: 'Member updated successfully',
            data: result.data
        });

    } catch (error) {
        console.error('Update member error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Delete member
async function deleteMemberHandler(req, res) {
    try {
        const { id } = req.params;
        const tenantId = authManager.extractTenantId(req);

        // Check if member exists
        const existingQuery = await dbManager.read('members', id, tenantId);
        if (!existingQuery.success) {
            return res.status(404).json({
                success: false,
                error: 'Member not found',
                code: 'MEMBER_NOT_FOUND'
            });
        }

        const result = await dbManager.delete('members', id, tenantId);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to delete member',
                code: 'DATABASE_ERROR'
            });
        }

        authManager.logSecurityEvent('member_deleted', req, { 
            memberId: id,
            memberName: existingQuery.data.name
        });

        res.status(200).json({
            success: true,
            message: 'Member deleted successfully',
            data: { id }
        });

    } catch (error) {
        console.error('Delete member error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Search members
async function searchMembersHandler(req, res) {
    try {
        const { query, status, planId } = req.query;
        const tenantId = authManager.extractTenantId(req);

        let filters = {};
        if (status) filters.status = status;
        if (planId) filters.planId = planId;

        const result = await dbManager.query('members', filters, tenantId);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to search members',
                code: 'DATABASE_ERROR'
            });
        }

        let members = result.data;

        // Apply text search if query provided
        if (query) {
            const searchTerm = query.toLowerCase();
            members = members.filter(member => 
                member.name.toLowerCase().includes(searchTerm) ||
                member.email.toLowerCase().includes(searchTerm) ||
                (member.phone && member.phone.includes(searchTerm))
            );
        }

        // Sort by relevance (exact matches first, then partial matches)
        if (query) {
            members.sort((a, b) => {
                const aExact = a.name.toLowerCase() === query.toLowerCase() ? 1 : 0;
                const bExact = b.name.toLowerCase() === query.toLowerCase() ? 1 : 0;
                return bExact - aExact;
            });
        }

        res.status(200).json({
            success: true,
            data: members,
            count: members.length,
            query: query || null
        });

    } catch (error) {
        console.error('Search members error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Export handlers
module.exports = {
    getMembersHandler,
    getMemberHandler,
    createMemberHandler,
    updateMemberHandler,
    deleteMemberHandler,
    searchMembersHandler
};

// Azure Functions exports
module.exports.getMembers = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await getMembersHandler(req, res);
};

module.exports.getMember = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await getMemberHandler(req, res);
};

module.exports.createMember = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await createMemberHandler(req, res);
};

module.exports.updateMember = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await updateMemberHandler(req, res);
};

module.exports.deleteMember = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await deleteMemberHandler(req, res);
};

module.exports.searchMembers = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await searchMembersHandler(req, res);
};
