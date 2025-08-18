module.exports = async function (context, req) {
    context.log('Members endpoint called:', req.method, req.url);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID'
            }
        };
        return;
    }

    // Sample members data
    const sampleMembers = [
        {
            id: 'member_1',
            tenantId: 'fitnesshub',
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            planId: 'plan_premium',
            status: 'active',
            joinDate: '2024-01-15',
            emergencyContact: 'Jane Doe - +1234567891'
        },
        {
            id: 'member_2',
            tenantId: 'fitnesshub',
            name: 'Sarah Smith',
            email: 'sarah@example.com',
            phone: '+1234567892',
            planId: 'plan_basic',
            status: 'active',
            joinDate: '2024-02-01',
            emergencyContact: 'Mike Smith - +1234567893'
        },
        {
            id: 'member_3',
            tenantId: 'fitnesshub',
            name: 'Mike Johnson',
            email: 'mike@example.com',
            phone: '+1234567894',
            planId: 'plan_premium',
            status: 'active',
            joinDate: '2024-01-20',
            emergencyContact: 'Lisa Johnson - +1234567895'
        }
    ];

    try {
        const tenantId = req.headers['x-tenant-id'] || 'fitnesshub';
        const memberId = context.bindingData.id;

        switch (req.method) {
            case 'GET':
                if (memberId) {
                    // Get specific member
                    const member = sampleMembers.find(m => m.id === memberId && m.tenantId === tenantId);
                    if (!member) {
                        context.res = {
                            status: 404,
                            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                            body: { success: false, error: 'Member not found' }
                        };
                        return;
                    }
                    context.res = {
                        status: 200,
                        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                        body: { success: true, data: member }
                    };
                } else {
                    // Get all members for tenant
                    const members = sampleMembers.filter(m => m.tenantId === tenantId);
                    context.res = {
                        status: 200,
                        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                        body: { success: true, data: members }
                    };
                }
                break;

            case 'POST':
                // Create new member
                const newMember = {
                    id: 'member_' + Date.now(),
                    tenantId: tenantId,
                    ...req.body,
                    createdAt: new Date().toISOString()
                };
                
                context.res = {
                    status: 201,
                    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                    body: { success: true, data: newMember }
                };
                break;

            case 'PUT':
                // Update member
                if (!memberId) {
                    context.res = {
                        status: 400,
                        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                        body: { success: false, error: 'Member ID required' }
                    };
                    return;
                }

                const updatedMember = {
                    id: memberId,
                    tenantId: tenantId,
                    ...req.body,
                    updatedAt: new Date().toISOString()
                };

                context.res = {
                    status: 200,
                    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                    body: { success: true, data: updatedMember }
                };
                break;

            case 'DELETE':
                // Delete member
                if (!memberId) {
                    context.res = {
                        status: 400,
                        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                        body: { success: false, error: 'Member ID required' }
                    };
                    return;
                }

                context.res = {
                    status: 200,
                    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                    body: { success: true, message: 'Member deleted successfully' }
                };
                break;

            default:
                context.res = {
                    status: 405,
                    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                    body: { success: false, error: 'Method not allowed' }
                };
        }

    } catch (error) {
        context.log.error('Members endpoint error:', error);
        context.res = {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: { success: false, error: 'Internal server error' }
        };
    }
};
