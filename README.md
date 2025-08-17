# 🏋️ GymFlow - Multi-Tenant Gym Management SaaS

A comprehensive, multi-tenant gym management SaaS platform with secure backend API integration, JWT authentication, and real-time data management.

## 🚀 Architecture

### Backend API Integration
- **Express.js API Server** with Azure Functions compatibility
- **JWT Authentication** with bcrypt password hashing
- **Multi-tenant Data Isolation** via X-Tenant-ID headers
- **Rate Limiting** and security middleware
- **Local Development** with in-memory storage
- **Production Ready** for Azure Cosmos DB deployment

### Security Features
- **Role-based Access Control** (gym-owner, super-admin)
- **Session Management** with timeout and inactivity detection
- **Security Event Logging** for audit trails
- **CORS Protection** and security headers
- **Password Strength Validation**

## Features

### 📊 Dashboard
- Real-time statistics (members, revenue, check-ins)
- Recent member registrations
- Expiring subscription alerts
- Revenue and member growth charts

### 👥 Member Management
- Add, edit, and delete members
- Search and filter functionality
- Subscription status tracking
- Emergency contact information

### 💳 Subscription Plans
- Flexible pricing plans
- Monthly/yearly subscriptions
- Plan management and customization

### 🏋️ Trainer Management
- Trainer profiles and specializations
- Contact information management

### 📈 Reports & Analytics
- Revenue tracking charts
- Member growth analytics
- Visual data representation

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/gymflow-saas.git
   cd gymflow-saas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the API server**
   ```bash
   npm run api
   ```

4. **Start the frontend server** (in a new terminal)
   ```bash
   npm start
   ```

5. **Access the application**
   - Frontend: `http://localhost:3002`
   - API: `http://localhost:3001/api`

### Demo Accounts
- **Demo User**: `demo@gymflow.com` / `demo123`
- **Super Admin**: `admin@gymflow.com` / `admin123`

### Available Tenant URLs
- Demo Gym: `http://localhost:3002/demo`
- Fitness Hub: `http://localhost:3002/fitnesshub`
- PowerHouse: `http://localhost:3002/powerhouse`

## 📁 Project Structure
```
gymflow-saas/
├── api/                    # Backend API
│   ├── auth/              # Authentication endpoints
│   ├── members/           # Member management APIs
│   ├── plans/             # Subscription plan APIs
│   ├── trainers/          # Trainer management APIs
│   ├── dashboard/         # Analytics APIs
│   └── utils/             # Database and auth utilities
├── index.html             # Main application
├── auth.html              # Authentication page
├── admin.html             # Admin panel
├── styles.css             # Main styles
├── auth-styles.css        # Authentication styles
├── script.js              # Main application logic
├── auth-script.js         # Authentication logic
├── security-monitor.js    # Security monitoring
├── api-server.js          # Express.js API server
├── server.js              # Frontend development server
├── sw.js                  # Service worker for PWA
└── package.json           # Dependencies and scripts
```

## 🚀 Usage

### Authentication Flow
1. Visit any tenant URL (e.g., `/demo`)
2. Redirected to `/auth` if not logged in
3. Login with demo credentials
4. Redirected to appropriate tenant dashboard

### Managing Members
1. Navigate to Members section
2. Click "Add Member" to create new members
3. Use search and filters to find members
4. Edit or delete members as needed

### Managing Subscriptions
1. Navigate to "Subscriptions" section
2. View existing plans or add new ones
3. Edit pricing and duration as needed

### Viewing Analytics
1. Go to "Reports" section
2. View revenue and member growth charts
3. Track business performance over time

## Mobile Responsive

The application is fully responsive and works seamlessly on:
- Desktop computers
- Tablets
- Mobile phones

## Data Persistence

Currently uses browser Local Storage for data persistence. For production use, integrate with a backend database system.

## Future Enhancements

- **Backend Integration**: Connect to a real database
- **Payment Processing**: Integrate with Stripe/PayPal
- **Member Check-in System**: QR code scanning
- **Email Notifications**: Automated reminders
- **Advanced Reporting**: More detailed analytics
- **Multi-gym Support**: Manage multiple locations

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

This project is open source and available under the MIT License.

---

**GymFlow** - Streamline your gym management with modern technology!
