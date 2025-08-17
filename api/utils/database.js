// Database Configuration for GymFlow SaaS
// Supports both local development and Azure Cosmos DB

const { CosmosClient } = require('@azure/cosmos');

class DatabaseManager {
    constructor() {
        this.isProduction = process.env.NODE_ENV === 'production';
        this.localData = new Map(); // For local development
        
        if (this.isProduction) {
            this.initCosmosDB();
        } else {
            this.initLocalStorage();
        }
    }

    // Initialize Cosmos DB for production
    initCosmosDB() {
        const endpoint = process.env.COSMOS_DB_ENDPOINT || 'https://gymflow.documents.azure.com:443/';
        const key = process.env.COSMOS_DB_KEY;
        
        this.client = new CosmosClient({ endpoint, key });
        this.database = this.client.database('GymFlowDB');
        
        // Container references
        this.containers = {
            tenants: this.database.container('Tenants'),
            users: this.database.container('Users'),
            members: this.database.container('Members'),
            plans: this.database.container('Plans'),
            trainers: this.database.container('Trainers'),
            sessions: this.database.container('Sessions'),
            analytics: this.database.container('Analytics')
        };
    }

    // Initialize local storage for development
    initLocalStorage() {
        console.log('🔧 Using local storage for development');
        
        // Initialize with sample data
        this.localData.set('tenants', new Map());
        this.localData.set('users', new Map());
        this.localData.set('members', new Map());
        this.localData.set('plans', new Map());
        this.localData.set('trainers', new Map());
        this.localData.set('sessions', new Map());
        this.localData.set('analytics', new Map());
        
        this.seedSampleData();
    }

    // Seed sample data for development
    seedSampleData() {
        // Sample tenants
        const sampleTenants = [
            {
                id: 'fitnesshub',
                name: 'Fitness Hub',
                owner: 'demo@gymflow.com',
                plan: 'premium',
                createdAt: new Date().toISOString(),
                isActive: true
            },
            {
                id: 'powerhouse',
                name: 'PowerHouse Gym',
                owner: 'owner@powerhouse.com',
                plan: 'basic',
                createdAt: new Date().toISOString(),
                isActive: true
            }
        ];

        // Sample users with properly hashed passwords
        const bcrypt = require('bcrypt');
        const sampleUsers = [
            {
                id: 'user_demo',
                email: 'demo@gymflow.com',
                password: bcrypt.hashSync('demo123', 10), // Password: demo123
                firstName: 'Demo',
                lastName: 'User',
                role: 'gym_owner',
                tenantId: 'fitnesshub',
                createdAt: new Date().toISOString(),
                isActive: true
            },
            {
                id: 'user_admin',
                email: 'admin@gymflow.com',
                password: bcrypt.hashSync('admin123', 10), // Password: admin123
                firstName: 'Super',
                lastName: 'Admin',
                role: 'super_admin',
                tenantId: null,
                createdAt: new Date().toISOString(),
                isActive: true
            }
        ];

        // Sample members for fitnesshub
        const sampleMembers = [
            {
                id: 'member_1',
                tenantId: 'fitnesshub',
                name: 'John Doe',
                email: 'john@example.com',
                phone: '+1234567890',
                planId: 'plan_premium',
                joinDate: '2024-01-15',
                status: 'active',
                createdAt: new Date().toISOString()
            },
            {
                id: 'member_2',
                tenantId: 'fitnesshub',
                name: 'Jane Smith',
                email: 'jane@example.com',
                phone: '+1234567891',
                planId: 'plan_basic',
                joinDate: '2024-02-01',
                status: 'active',
                createdAt: new Date().toISOString()
            }
        ];

        // Sample plans for fitnesshub
        const samplePlans = [
            {
                id: 'plan_basic',
                tenantId: 'fitnesshub',
                name: 'Basic Plan',
                price: 29.99,
                duration: 'monthly',
                features: ['Gym Access', 'Basic Equipment'],
                isActive: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 'plan_premium',
                tenantId: 'fitnesshub',
                name: 'Premium Plan',
                price: 49.99,
                duration: 'monthly',
                features: ['Gym Access', 'All Equipment', 'Personal Training', 'Nutrition Consultation'],
                isActive: true,
                createdAt: new Date().toISOString()
            }
        ];

        // Sample trainers for fitnesshub
        const sampleTrainers = [
            {
                id: 'trainer_1',
                tenantId: 'fitnesshub',
                name: 'Mike Johnson',
                email: 'mike@fitnesshub.com',
                phone: '+1234567892',
                specialization: 'Weight Training',
                experience: '5 years',
                hourlyRate: 50,
                isActive: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 'trainer_2',
                tenantId: 'fitnesshub',
                name: 'Sarah Wilson',
                email: 'sarah@fitnesshub.com',
                phone: '+1234567893',
                specialization: 'Yoga & Pilates',
                experience: '3 years',
                hourlyRate: 40,
                isActive: true,
                createdAt: new Date().toISOString()
            }
        ];

        // Store sample data
        sampleTenants.forEach(tenant => {
            this.localData.get('tenants').set(tenant.id, tenant);
        });

        sampleUsers.forEach(user => {
            this.localData.get('users').set(user.id, user);
        });

        sampleMembers.forEach(member => {
            this.localData.get('members').set(member.id, member);
        });

        samplePlans.forEach(plan => {
            this.localData.get('plans').set(plan.id, plan);
        });

        sampleTrainers.forEach(trainer => {
            this.localData.get('trainers').set(trainer.id, trainer);
        });

        console.log('✅ Sample data seeded successfully');
    }

    // Generic CRUD operations
    async create(collection, data) {
        if (this.isProduction) {
            return await this.createCosmos(collection, data);
        } else {
            return this.createLocal(collection, data);
        }
    }

    async read(collection, id, tenantId = null) {
        if (this.isProduction) {
            return await this.readCosmos(collection, id, tenantId);
        } else {
            return this.readLocal(collection, id, tenantId);
        }
    }

    async update(collection, id, data, tenantId = null) {
        if (this.isProduction) {
            return await this.updateCosmos(collection, id, data, tenantId);
        } else {
            return this.updateLocal(collection, id, data, tenantId);
        }
    }

    async delete(collection, id, tenantId = null) {
        if (this.isProduction) {
            return await this.deleteCosmos(collection, id, tenantId);
        } else {
            return this.deleteLocal(collection, id, tenantId);
        }
    }

    async query(collection, filters = {}, tenantId = null) {
        if (this.isProduction) {
            return await this.queryCosmos(collection, filters, tenantId);
        } else {
            return this.queryLocal(collection, filters, tenantId);
        }
    }

    // Local storage operations
    createLocal(collection, data) {
        const id = data.id || this.generateId();
        const item = {
            ...data,
            id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.localData.get(collection).set(id, item);
        return { success: true, data: item };
    }

    readLocal(collection, id, tenantId = null) {
        const item = this.localData.get(collection).get(id);
        
        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        // Check tenant isolation
        if (tenantId && item.tenantId && item.tenantId !== tenantId) {
            return { success: false, error: 'Access denied' };
        }

        return { success: true, data: item };
    }

    updateLocal(collection, id, data, tenantId = null) {
        const existing = this.localData.get(collection).get(id);
        
        if (!existing) {
            return { success: false, error: 'Item not found' };
        }

        // Check tenant isolation
        if (tenantId && existing.tenantId && existing.tenantId !== tenantId) {
            return { success: false, error: 'Access denied' };
        }

        const updated = {
            ...existing,
            ...data,
            id, // Preserve ID
            updatedAt: new Date().toISOString()
        };

        this.localData.get(collection).set(id, updated);
        return { success: true, data: updated };
    }

    deleteLocal(collection, id, tenantId = null) {
        const existing = this.localData.get(collection).get(id);
        
        if (!existing) {
            return { success: false, error: 'Item not found' };
        }

        // Check tenant isolation
        if (tenantId && existing.tenantId && existing.tenantId !== tenantId) {
            return { success: false, error: 'Access denied' };
        }

        this.localData.get(collection).delete(id);
        return { success: true, data: { id } };
    }

    queryLocal(collection, filters = {}, tenantId = null) {
        const items = Array.from(this.localData.get(collection).values());
        
        let filtered = items.filter(item => {
            // Apply tenant isolation
            if (tenantId && item.tenantId && item.tenantId !== tenantId) {
                return false;
            }

            // Apply other filters
            for (const [key, value] of Object.entries(filters)) {
                if (item[key] !== value) {
                    return false;
                }
            }

            return true;
        });

        return { success: true, data: filtered };
    }

    // Cosmos DB operations (for production)
    async createCosmos(collection, data) {
        try {
            const container = this.containers[collection];
            const { resource } = await container.items.create(data);
            return { success: true, data: resource };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async readCosmos(collection, id, tenantId = null) {
        try {
            const container = this.containers[collection];
            const { resource } = await container.item(id, tenantId).read();
            
            if (!resource) {
                return { success: false, error: 'Item not found' };
            }

            return { success: true, data: resource };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateCosmos(collection, id, data, tenantId = null) {
        try {
            const container = this.containers[collection];
            const { resource } = await container.item(id, tenantId).replace({
                ...data,
                id,
                updatedAt: new Date().toISOString()
            });
            
            return { success: true, data: resource };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async deleteCosmos(collection, id, tenantId = null) {
        try {
            const container = this.containers[collection];
            await container.item(id, tenantId).delete();
            return { success: true, data: { id } };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async queryCosmos(collection, filters = {}, tenantId = null) {
        try {
            const container = this.containers[collection];
            
            let query = 'SELECT * FROM c';
            const parameters = [];
            
            if (tenantId) {
                query += ' WHERE c.tenantId = @tenantId';
                parameters.push({ name: '@tenantId', value: tenantId });
            }

            // Add additional filters
            Object.entries(filters).forEach(([key, value], index) => {
                const paramName = `@param${index}`;
                if (parameters.length === 0) {
                    query += ` WHERE c.${key} = ${paramName}`;
                } else {
                    query += ` AND c.${key} = ${paramName}`;
                }
                parameters.push({ name: paramName, value });
            });

            const { resources } = await container.items.query({
                query,
                parameters
            }).fetchAll();

            return { success: true, data: resources };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Utility functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Health check
    async healthCheck() {
        if (this.isProduction) {
            try {
                await this.database.read();
                return { status: 'healthy', database: 'cosmos' };
            } catch (error) {
                return { status: 'unhealthy', database: 'cosmos', error: error.message };
            }
        } else {
            return { 
                status: 'healthy', 
                database: 'local',
                collections: {
                    tenants: this.localData.get('tenants').size,
                    users: this.localData.get('users').size,
                    members: this.localData.get('members').size,
                    plans: this.localData.get('plans').size,
                    trainers: this.localData.get('trainers').size
                }
            };
        }
    }
}

// Singleton instance
const dbManager = new DatabaseManager();

module.exports = dbManager;
