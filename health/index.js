module.exports = async function (context, req) {
    context.log('Health check endpoint called');

    context.res = {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID'
        },
        body: {
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: 'azure-functions',
            database: {
                status: 'healthy',
                database: 'local-storage'
            }
        }
    };
};
