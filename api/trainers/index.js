// Trainers API Endpoints for GymFlow SaaS
const dbManager = require('../utils/database');
const authManager = require('../utils/auth');

// Get all trainers for a tenant
async function getTrainersHandler(req, res) {
    try {
        const tenantId = authManager.extractTenantId(req);
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Tenant ID required',
                code: 'TENANT_REQUIRED'
            });
        }

        const result = await dbManager.query('trainers', {}, tenantId);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch trainers',
                code: 'DATABASE_ERROR'
            });
        }

        // Sort by creation date (newest first)
        const sortedTrainers = result.data.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        res.status(200).json({
            success: true,
            data: sortedTrainers,
            count: sortedTrainers.length
        });

    } catch (error) {
        console.error('Get trainers error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Get single trainer by ID
async function getTrainerHandler(req, res) {
    try {
        const { id } = req.params;
        const tenantId = authManager.extractTenantId(req);

        const result = await dbManager.read('trainers', id, tenantId);
        
        if (!result.success) {
            return res.status(404).json({
                success: false,
                error: 'Trainer not found',
                code: 'TRAINER_NOT_FOUND'
            });
        }

        res.status(200).json({
            success: true,
            data: result.data
        });

    } catch (error) {
        console.error('Get trainer error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Create new trainer
async function createTrainerHandler(req, res) {
    try {
        const { name, email, phone, specialization, experience, hourlyRate, bio } = req.body;
        const tenantId = authManager.extractTenantId(req);

        // Validate required fields
        if (!name || !email || !phone || !specialization) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, phone, and specialization are required',
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

        // Validate hourly rate if provided
        if (hourlyRate !== undefined && (typeof hourlyRate !== 'number' || hourlyRate < 0)) {
            return res.status(400).json({
                success: false,
                error: 'Hourly rate must be a positive number',
                code: 'VALIDATION_ERROR'
            });
        }

        // Check if trainer with same email exists in this tenant
        const existingQuery = await dbManager.query('trainers', { email: email.toLowerCase() }, tenantId);
        
        if (existingQuery.success && existingQuery.data.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Trainer with this email already exists',
                code: 'TRAINER_EXISTS'
            });
        }

        // Create trainer
        const trainerId = 'trainer_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
        const trainerData = {
            id: trainerId,
            tenantId,
            name: name.trim(),
            email: email.toLowerCase(),
            phone: phone.trim(),
            specialization: specialization.trim(),
            experience: experience || '',
            hourlyRate: hourlyRate || 0,
            bio: bio || '',
            isActive: true,
            rating: 0,
            totalSessions: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = await dbManager.create('trainers', trainerData);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to create trainer',
                code: 'DATABASE_ERROR'
            });
        }

        authManager.logSecurityEvent('trainer_created', req, { 
            trainerId: trainerId,
            trainerName: name 
        });

        res.status(201).json({
            success: true,
            message: 'Trainer created successfully',
            data: result.data
        });

    } catch (error) {
        console.error('Create trainer error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Update trainer
async function updateTrainerHandler(req, res) {
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

        // Validate hourly rate if provided
        if (updateData.hourlyRate !== undefined && (typeof updateData.hourlyRate !== 'number' || updateData.hourlyRate < 0)) {
            return res.status(400).json({
                success: false,
                error: 'Hourly rate must be a positive number',
                code: 'VALIDATION_ERROR'
            });
        }

        // Check if trainer exists
        const existingQuery = await dbManager.read('trainers', id, tenantId);
        if (!existingQuery.success) {
            return res.status(404).json({
                success: false,
                error: 'Trainer not found',
                code: 'TRAINER_NOT_FOUND'
            });
        }

        // Check for email conflicts if email is being updated
        if (updateData.email && updateData.email.toLowerCase() !== existingQuery.data.email) {
            const emailQuery = await dbManager.query('trainers', { email: updateData.email.toLowerCase() }, tenantId);
            if (emailQuery.success && emailQuery.data.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: 'Trainer with this email already exists',
                    code: 'EMAIL_EXISTS'
                });
            }
        }

        // Clean update data
        const cleanData = { ...updateData };
        if (cleanData.email) cleanData.email = cleanData.email.toLowerCase();
        if (cleanData.name) cleanData.name = cleanData.name.trim();
        if (cleanData.phone) cleanData.phone = cleanData.phone.trim();
        if (cleanData.specialization) cleanData.specialization = cleanData.specialization.trim();
        if (cleanData.hourlyRate !== undefined) cleanData.hourlyRate = parseFloat(cleanData.hourlyRate);
        
        // Remove fields that shouldn't be updated
        delete cleanData.id;
        delete cleanData.tenantId;
        delete cleanData.createdAt;
        delete cleanData.totalSessions; // This should be updated through session management

        const result = await dbManager.update('trainers', id, cleanData, tenantId);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to update trainer',
                code: 'DATABASE_ERROR'
            });
        }

        authManager.logSecurityEvent('trainer_updated', req, { 
            trainerId: id,
            changes: Object.keys(cleanData)
        });

        res.status(200).json({
            success: true,
            message: 'Trainer updated successfully',
            data: result.data
        });

    } catch (error) {
        console.error('Update trainer error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Delete trainer
async function deleteTrainerHandler(req, res) {
    try {
        const { id } = req.params;
        const tenantId = authManager.extractTenantId(req);

        // Check if trainer exists
        const existingQuery = await dbManager.read('trainers', id, tenantId);
        if (!existingQuery.success) {
            return res.status(404).json({
                success: false,
                error: 'Trainer not found',
                code: 'TRAINER_NOT_FOUND'
            });
        }

        const result = await dbManager.delete('trainers', id, tenantId);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to delete trainer',
                code: 'DATABASE_ERROR'
            });
        }

        authManager.logSecurityEvent('trainer_deleted', req, { 
            trainerId: id,
            trainerName: existingQuery.data.name
        });

        res.status(200).json({
            success: true,
            message: 'Trainer deleted successfully',
            data: { id }
        });

    } catch (error) {
        console.error('Delete trainer error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Search trainers
async function searchTrainersHandler(req, res) {
    try {
        const { query, specialization, isActive } = req.query;
        const tenantId = authManager.extractTenantId(req);

        let filters = {};
        if (specialization) filters.specialization = specialization;
        if (isActive !== undefined) filters.isActive = isActive === 'true';

        const result = await dbManager.query('trainers', filters, tenantId);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to search trainers',
                code: 'DATABASE_ERROR'
            });
        }

        let trainers = result.data;

        // Apply text search if query provided
        if (query) {
            const searchTerm = query.toLowerCase();
            trainers = trainers.filter(trainer => 
                trainer.name.toLowerCase().includes(searchTerm) ||
                trainer.email.toLowerCase().includes(searchTerm) ||
                trainer.specialization.toLowerCase().includes(searchTerm) ||
                (trainer.phone && trainer.phone.includes(searchTerm))
            );
        }

        // Sort by rating (highest first), then by name
        trainers.sort((a, b) => {
            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }
            return a.name.localeCompare(b.name);
        });

        res.status(200).json({
            success: true,
            data: trainers,
            count: trainers.length,
            query: query || null
        });

    } catch (error) {
        console.error('Search trainers error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Get trainer statistics
async function getTrainerStatsHandler(req, res) {
    try {
        const tenantId = authManager.extractTenantId(req);

        const result = await dbManager.query('trainers', {}, tenantId);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch trainers',
                code: 'DATABASE_ERROR'
            });
        }

        const trainers = result.data;

        // Calculate statistics
        const totalTrainers = trainers.length;
        const activeTrainers = trainers.filter(trainer => trainer.isActive).length;
        const averageRating = trainers.length > 0 ? 
            trainers.reduce((sum, trainer) => sum + trainer.rating, 0) / trainers.length : 0;
        const totalSessions = trainers.reduce((sum, trainer) => sum + trainer.totalSessions, 0);
        const averageHourlyRate = trainers.length > 0 ? 
            trainers.reduce((sum, trainer) => sum + trainer.hourlyRate, 0) / trainers.length : 0;

        // Specialization breakdown
        const specializationCounts = {};
        trainers.forEach(trainer => {
            const spec = trainer.specialization || 'General';
            specializationCounts[spec] = (specializationCounts[spec] || 0) + 1;
        });

        // Top trainers by rating
        const topTrainers = trainers
            .filter(trainer => trainer.isActive)
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 5)
            .map(trainer => ({
                id: trainer.id,
                name: trainer.name,
                specialization: trainer.specialization,
                rating: trainer.rating,
                totalSessions: trainer.totalSessions
            }));

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalTrainers,
                    activeTrainers,
                    averageRating: Math.round(averageRating * 100) / 100,
                    totalSessions,
                    averageHourlyRate: Math.round(averageHourlyRate * 100) / 100
                },
                specializationBreakdown: specializationCounts,
                topTrainers
            }
        });

    } catch (error) {
        console.error('Get trainer stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
}

// Export handlers
module.exports = {
    getTrainersHandler,
    getTrainerHandler,
    createTrainerHandler,
    updateTrainerHandler,
    deleteTrainerHandler,
    searchTrainersHandler,
    getTrainerStatsHandler
};

// Azure Functions exports
module.exports.getTrainers = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await getTrainersHandler(req, res);
};

module.exports.getTrainer = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await getTrainerHandler(req, res);
};

module.exports.createTrainer = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await createTrainerHandler(req, res);
};

module.exports.updateTrainer = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await updateTrainerHandler(req, res);
};

module.exports.deleteTrainer = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await deleteTrainerHandler(req, res);
};

module.exports.searchTrainers = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await searchTrainersHandler(req, res);
};

module.exports.getTrainerStats = async function (context, req) {
    const res = {
        status: (code) => ({ json: (data) => { context.res = { status: code, body: data }; } }),
        json: (data) => { context.res = { body: data }; }
    };
    await getTrainerStatsHandler(req, res);
};
