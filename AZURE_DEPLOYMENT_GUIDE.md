# 🚀 Azure Functions Deployment Guide - GymFlow API

## 📋 **Step-by-Step UI Deployment**

### **Step 1: Prepare Your Code**
✅ Your code is now ready for Azure Functions deployment with:
- `host.json` - Azure Functions configuration
- `index.js` - Main function entry point
- `function.json` - Function binding configuration
- `package.json` - Dependencies and scripts
- All API endpoints structured for Azure Functions

### **Step 2: Create Azure Function App via Portal**

1. **Go to Azure Portal**: https://portal.azure.com
2. **Create a Resource** → Search for "Function App"
3. **Fill in the details**:
   - **Subscription**: Your Azure subscription
   - **Resource Group**: Create new or use existing
   - **Function App Name**: `gymflow-api` (must be globally unique)
   - **Runtime Stack**: Node.js
   - **Version**: 18 LTS (recommended)
   - **Region**: Choose closest to your users
   - **Operating System**: Windows or Linux
   - **Plan Type**: Consumption (Pay per use) or Premium

4. **Click "Review + Create"** → **Create**

### **Step 3: Configure Application Settings**

After creation, go to your Function App:

1. **Configuration** → **Application Settings**
2. **Add these environment variables**:

```
NODE_ENV = production
JWT_SECRET = your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY = 24h
COSMOS_DB_ENDPOINT = https://your-cosmosdb.documents.azure.com:443/
COSMOS_DB_KEY = your-cosmos-db-primary-key
ALLOWED_ORIGINS = https://flexifitvault.netlify.app,http://localhost:3002
```

### **Step 4: Deploy Your Code**

**Option A: ZIP Deploy (Easiest)**
1. **Create a ZIP file** of your entire project folder
2. **Go to Function App** → **Deployment Center**
3. **Choose "ZIP Deploy"**
4. **Upload your ZIP file**
5. **Deploy**

**Option B: GitHub Integration**
1. **Go to Function App** → **Deployment Center**
2. **Choose "GitHub"**
3. **Authorize and select your repository**
4. **Choose branch**: `master`
5. **Save** - Auto-deployment will start

**Option C: VS Code Extension**
1. **Install Azure Functions extension** in VS Code
2. **Sign in to Azure**
3. **Right-click your project** → **Deploy to Function App**
4. **Select your Function App**

### **Step 5: Set up CORS**

1. **Go to Function App** → **CORS**
2. **Add allowed origins**:
   - `https://gymflow-saas.netlify.app`
   - `https://your-custom-domain.com`
   - `http://localhost:3002` (for development)
3. **Save**

### **Step 6: Test Your Deployment**

Your API will be available at:
```
https://gymflow-api.azurewebsites.net/api/health
```

Test endpoints:
- **Health Check**: `GET /api/health`
- **Login**: `POST /api/auth/login`
- **Members**: `GET /api/members` (requires auth)
- **Dashboard**: `GET /api/dashboard` (requires auth)

## 🔧 **Configure Cosmos DB (Optional)**

For production database:

1. **Create Cosmos DB Account**:
   - **API**: Core (SQL)
   - **Location**: Same as Function App
   - **Capacity Mode**: Provisioned or Serverless

2. **Create Database**: `gymflow`
3. **Create Collections**:
   - `users`
   - `members`
   - `plans`
   - `trainers`
   - `tenants`

4. **Get Connection Details**:
   - **Endpoint**: From Cosmos DB → Keys
   - **Primary Key**: From Cosmos DB → Keys

5. **Update Function App Settings** with Cosmos DB details

## 🌐 **Update Frontend Configuration**

Update your frontend to use the Azure Functions API:

```javascript
// In script.js and auth-script.js
const API_BASE_URL = 'https://gymflow-api.azurewebsites.net/api';
```

## ✅ **Verification Checklist**

- [ ] Function App created and running
- [ ] Environment variables configured
- [ ] Code deployed successfully
- [ ] CORS configured for your domains
- [ ] Health endpoint responding
- [ ] Authentication endpoints working
- [ ] Protected endpoints require auth
- [ ] Frontend updated to use Azure API
- [ ] Cosmos DB configured (if using)

## 🚨 **Important Notes**

1. **Replace JWT_SECRET**: Use a strong, unique secret key
2. **Secure Cosmos DB**: Use proper access keys and firewall rules
3. **Monitor Costs**: Azure Functions charges per execution
4. **Enable Application Insights**: For monitoring and debugging
5. **Set up Custom Domain**: For production use

## 📞 **API Endpoints After Deployment**

```
Base URL: https://gymflow-api.azurewebsites.net/api

Authentication:
POST /auth/login
POST /auth/signup

Members Management:
GET    /members
POST   /members
PUT    /members/{id}
DELETE /members/{id}

Plans Management:
GET    /plans
POST   /plans
PUT    /plans/{id}
DELETE /plans/{id}

Trainers Management:
GET    /trainers
POST   /trainers
PUT    /trainers/{id}
DELETE /trainers/{id}

Dashboard & Analytics:
GET /dashboard
GET /analytics
GET /reports
```

## 🎉 **You're Ready to Deploy!**

Your GymFlow backend API is now prepared for Azure Functions deployment through the UI. Follow the steps above to get your production API running in the cloud!
