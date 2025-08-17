const { app } = require('@azure/functions');
const { requireAuth, requireTenantAccess } = require('../api/utils/auth');
const { getMembers, getMember, createMember, updateMember, deleteMember } = require('../api/utils/database');

// Get all members
app.http('getMembers', {
    methods: ['GET'],
    route: 'members',
    handler: async (request, context) => {
        try {
            // Extract auth and tenant info from headers
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

            const members = await getMembers(tenantId);
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: members
                }
            };
        } catch (error) {
            context.log.error('Get members error:', error);
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

// Create new member
app.http('createMember', {
    methods: ['POST'],
    route: 'members',
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

            const memberData = await request.json();
            memberData.tenantId = tenantId;
            memberData.id = 'member_' + Date.now();
            memberData.createdAt = new Date().toISOString();

            const newMember = await createMember(memberData);
            return {
                status: 201,
                jsonBody: {
                    success: true,
                    data: newMember
                }
            };
        } catch (error) {
            context.log.error('Create member error:', error);
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

// Update member
app.http('updateMember', {
    methods: ['PUT'],
    route: 'members/{id}',
    handler: async (request, context) => {
        try {
            const authHeader = request.headers.get('authorization');
            const tenantId = request.headers.get('x-tenant-id');
            const memberId = context.params.id;

            if (!authHeader || !tenantId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        error: 'Authentication required'
                    }
                };
            }

            const memberData = await request.json();
            memberData.updatedAt = new Date().toISOString();

            const updatedMember = await updateMember(memberId, memberData, tenantId);
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: updatedMember
                }
            };
        } catch (error) {
            context.log.error('Update member error:', error);
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

// Delete member
app.http('deleteMember', {
    methods: ['DELETE'],
    route: 'members/{id}',
    handler: async (request, context) => {
        try {
            const authHeader = request.headers.get('authorization');
            const tenantId = request.headers.get('x-tenant-id');
            const memberId = context.params.id;

            if (!authHeader || !tenantId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        error: 'Authentication required'
                    }
                };
            }

            await deleteMember(memberId, tenantId);
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Member deleted successfully'
                }
            };
        } catch (error) {
            context.log.error('Delete member error:', error);
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
