// Security Monitoring Component for GymFlow SaaS
class SecurityMonitor {
    constructor() {
        this.securityEvents = JSON.parse(localStorage.getItem('securityLogs') || '[]');
        this.activeUsers = new Map();
        this.suspiciousActivity = [];
        
        this.init();
    }

    init() {
        this.startMonitoring();
        this.setupSecurityAlerts();
        this.trackUserSessions();
    }

    // Start comprehensive security monitoring
    startMonitoring() {
        // Monitor failed login attempts
        this.monitorFailedLogins();
        
        // Monitor session anomalies
        this.monitorSessionAnomalies();
        
        // Monitor data access patterns
        this.monitorDataAccess();
        
        // Monitor system resources
        this.monitorSystemResources();
    }

    // Monitor failed login attempts
    monitorFailedLogins() {
        const failedAttempts = JSON.parse(localStorage.getItem('failedLoginAttempts') || '{}');
        
        // Check for brute force attempts
        Object.entries(failedAttempts).forEach(([email, attempts]) => {
            if (attempts.length > 5) {
                this.logSecurityEvent('potential_brute_force', {
                    email: email,
                    attempts: attempts.length,
                    lastAttempt: attempts[attempts.length - 1]
                });
            }
        });
    }

    // Monitor session anomalies
    monitorSessionAnomalies() {
        const currentSessions = this.getAllActiveSessions();
        
        currentSessions.forEach(session => {
            // Check for multiple sessions from same user
            const userSessions = currentSessions.filter(s => s.userId === session.userId);
            if (userSessions.length > 3) {
                this.logSecurityEvent('multiple_sessions', {
                    userId: session.userId,
                    sessionCount: userSessions.length
                });
            }

            // Check for unusual session duration
            const sessionDuration = Date.now() - session.loginTime;
            if (sessionDuration > 24 * 60 * 60 * 1000) { // More than 24 hours
                this.logSecurityEvent('long_session', {
                    userId: session.userId,
                    duration: sessionDuration
                });
            }
        });
    }

    // Monitor data access patterns
    monitorDataAccess() {
        const accessLog = JSON.parse(localStorage.getItem('dataAccessLog') || '[]');
        const recentAccess = accessLog.filter(log => 
            Date.now() - new Date(log.timestamp).getTime() < 60 * 60 * 1000 // Last hour
        );

        // Check for unusual data access volume
        const accessByUser = {};
        recentAccess.forEach(log => {
            accessByUser[log.userId] = (accessByUser[log.userId] || 0) + 1;
        });

        Object.entries(accessByUser).forEach(([userId, count]) => {
            if (count > 100) { // More than 100 data access in an hour
                this.logSecurityEvent('excessive_data_access', {
                    userId: userId,
                    accessCount: count,
                    timeframe: '1 hour'
                });
            }
        });
    }

    // Monitor system resources
    monitorSystemResources() {
        // Monitor memory usage
        if (performance.memory) {
            const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize;
            if (memoryUsage > 0.9) {
                this.logSecurityEvent('high_memory_usage', {
                    usage: memoryUsage,
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize
                });
            }
        }

        // Monitor local storage usage
        const storageUsage = this.calculateStorageUsage();
        if (storageUsage > 5 * 1024 * 1024) { // More than 5MB
            this.logSecurityEvent('high_storage_usage', {
                usage: storageUsage,
                usageFormatted: this.formatBytes(storageUsage)
            });
        }
    }

    // Setup security alerts
    setupSecurityAlerts() {
        // Real-time security event monitoring
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = (key, value) => {
            if (key === 'securityLogs') {
                this.checkForCriticalEvents(JSON.parse(value));
            }
            originalSetItem.call(localStorage, key, value);
        };
    }

    // Check for critical security events
    checkForCriticalEvents(logs) {
        const recentLogs = logs.filter(log => 
            Date.now() - new Date(log.timestamp).getTime() < 5 * 60 * 1000 // Last 5 minutes
        );

        const criticalEvents = recentLogs.filter(log => 
            ['potential_brute_force', 'unauthorized_access', 'data_breach_attempt'].includes(log.event)
        );

        if (criticalEvents.length > 0) {
            this.triggerSecurityAlert(criticalEvents);
        }
    }

    // Trigger security alert
    triggerSecurityAlert(events) {
        // In production, this would send alerts to security team
        console.error('SECURITY ALERT:', events);
        
        // Show user notification for critical events
        this.showSecurityNotification(
            `Security Alert: ${events.length} critical event(s) detected`,
            'error'
        );

        // Log to external security service (placeholder)
        this.sendToSecurityService(events);
    }

    // Track user sessions
    trackUserSessions() {
        const session = localStorage.getItem('gymflowSession') || sessionStorage.getItem('gymflowSession');
        
        if (session) {
            try {
                const sessionData = JSON.parse(session);
                this.activeUsers.set(sessionData.userId, {
                    ...sessionData,
                    lastActivity: Date.now(),
                    ipAddress: this.getClientIP(),
                    userAgent: navigator.userAgent
                });
            } catch (error) {
                console.error('Failed to track user session:', error);
            }
        }
    }

    // Get all active sessions
    getAllActiveSessions() {
        const sessions = [];
        
        // Check localStorage sessions
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('Session')) {
                try {
                    const session = JSON.parse(localStorage.getItem(key));
                    if (session.expiresAt > Date.now()) {
                        sessions.push(session);
                    }
                } catch (error) {
                    // Invalid session data
                }
            }
        }

        return sessions;
    }

    // Calculate storage usage
    calculateStorageUsage() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return total;
    }

    // Format bytes to human readable
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Get client IP (placeholder - would need server-side implementation)
    getClientIP() {
        // This is a placeholder - real IP detection requires server-side implementation
        return 'localhost';
    }

    // Log security event
    logSecurityEvent(eventType, data = {}) {
        const securityLog = {
            id: this.generateEventId(),
            timestamp: new Date().toISOString(),
            event: eventType,
            severity: this.getEventSeverity(eventType),
            user: this.getCurrentUser(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            data: data
        };

        // Store the event
        this.securityEvents.push(securityLog);
        
        // Keep only last 1000 events
        if (this.securityEvents.length > 1000) {
            this.securityEvents.splice(0, this.securityEvents.length - 1000);
        }
        
        localStorage.setItem('securityLogs', JSON.stringify(this.securityEvents));

        // Send to monitoring service in production
        this.sendToSecurityService([securityLog]);
    }

    // Generate unique event ID
    generateEventId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Get event severity level
    getEventSeverity(eventType) {
        const severityMap = {
            'login_success': 'info',
            'login_failed': 'warning',
            'logout': 'info',
            'potential_brute_force': 'critical',
            'unauthorized_access': 'critical',
            'session_expired': 'warning',
            'multiple_sessions': 'warning',
            'long_session': 'info',
            'excessive_data_access': 'warning',
            'high_memory_usage': 'warning',
            'high_storage_usage': 'info',
            'devtools_opened': 'info',
            'rapid_clicking': 'warning'
        };

        return severityMap[eventType] || 'info';
    }

    // Get current user info
    getCurrentUser() {
        const session = localStorage.getItem('gymflowSession') || sessionStorage.getItem('gymflowSession');
        
        if (session) {
            try {
                const sessionData = JSON.parse(session);
                return {
                    id: sessionData.userId,
                    email: sessionData.email,
                    role: sessionData.role,
                    gymId: sessionData.gymId
                };
            } catch (error) {
                return { id: 'unknown', email: 'unknown', role: 'unknown' };
            }
        }

        return { id: 'anonymous', email: 'anonymous', role: 'anonymous' };
    }

    // Send to security service (placeholder)
    sendToSecurityService(events) {
        // In production, this would send to external security monitoring service
        console.log('Security events sent to monitoring service:', events);
        
        // Placeholder for external API call
        // fetch('/api/security/events', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(events)
        // });
    }

    // Show security notification
    showSecurityNotification(message, type = 'warning') {
        const notification = document.createElement('div');
        notification.className = `security-alert ${type}`;
        notification.innerHTML = `
            <i class="fas fa-shield-alt"></i>
            <span>${message}</span>
            <button class="close-alert">&times;</button>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
            color: ${type === 'warning' ? '#000' : '#fff'};
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 3000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;

        const closeBtn = notification.querySelector('.close-alert');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(notification);
        });

        document.body.appendChild(notification);

        // Auto-remove after 10 seconds for security alerts
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 10000);
    }

    // Get security dashboard data
    getSecurityDashboardData() {
        const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
        const recentEvents = this.securityEvents.filter(event => 
            new Date(event.timestamp).getTime() > last24Hours
        );

        return {
            totalEvents: this.securityEvents.length,
            recentEvents: recentEvents.length,
            criticalEvents: recentEvents.filter(e => e.severity === 'critical').length,
            warningEvents: recentEvents.filter(e => e.severity === 'warning').length,
            activeSessions: this.getAllActiveSessions().length,
            eventsByType: this.groupEventsByType(recentEvents),
            eventsByHour: this.groupEventsByHour(recentEvents)
        };
    }

    // Group events by type
    groupEventsByType(events) {
        const grouped = {};
        events.forEach(event => {
            grouped[event.event] = (grouped[event.event] || 0) + 1;
        });
        return grouped;
    }

    // Group events by hour
    groupEventsByHour(events) {
        const grouped = {};
        events.forEach(event => {
            const hour = new Date(event.timestamp).getHours();
            grouped[hour] = (grouped[hour] || 0) + 1;
        });
        return grouped;
    }

    // Clean up old security logs
    cleanup() {
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        this.securityEvents = this.securityEvents.filter(event => 
            new Date(event.timestamp).getTime() > oneWeekAgo
        );
        localStorage.setItem('securityLogs', JSON.stringify(this.securityEvents));
    }
}

// Auto-initialize security monitoring
document.addEventListener('DOMContentLoaded', () => {
    window.securityMonitor = new SecurityMonitor();
    
    // Run cleanup weekly
    setInterval(() => {
        window.securityMonitor.cleanup();
    }, 7 * 24 * 60 * 60 * 1000);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityMonitor;
}
