# 🔐 Authentication System - Complete Guide

## ✅ Authentication Status: **FULLY FUNCTIONAL**

The authentication system has been tested and verified to be working correctly.

---

## 🏗️ System Architecture

### Components:

1. **Backend** (`backend/controllers/authController.js`)
   - User registration
   - Login with JWT tokens
   - Token refresh mechanism
   - Logout functionality
   - Password management

2. **Middleware** (`backend/middleware/auth.js`)
   - JWT token verification
   - Role-based authorization
   - Protected route handling

3. **Frontend** (`frontend/src/context/AuthContext.jsx`)
   - React Context for auth state
   - Login/logout functions
   - Automatic token refresh
   - Protected route guards

4. **User Model** (`backend/models/User.js`)
   - Password hashing (bcrypt)
   - Email validation
   - Role management (admin/staff)

---

## 🔑 JWT Configuration

### Environment Variables (`.env`):

```env
JWT_SECRET=<128-character-random-string>
JWT_REFRESH_SECRET=<128-character-different-random-string>
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d
```

### Token Types:

1. **Access Token** (`JWT_SECRET`)
   - Expires in 24 hours
   - Used for API authentication
   - Sent in `Authorization: Bearer <token>` header

2. **Refresh Token** (`JWT_REFRESH_SECRET`)
   - Expires in 7 days
   - Used to get new access tokens
   - Stored in database and localStorage

---

## 📡 API Endpoints

### 1. Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "staff",
  "phone": "+919876543210"
}

Response 201:
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 2. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

Response 200:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 3. Get Current User (Protected)
```http
GET /api/auth/me
Authorization: Bearer <access_token>

Response 200:
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "staff",
      "isActive": true
    }
  }
}
```

### 4. Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Response 200:
{
  "success": true,
  "data": {
    "token": "new_access_token",
    "refreshToken": "new_refresh_token"
  }
}
```

### 5. Logout (Protected)
```http
POST /api/auth/logout
Authorization: Bearer <access_token>

Response 200:
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 6. Update Password (Protected)
```http
PUT /api/auth/password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}

Response 200:
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

## 🔒 Security Features

### 1. Password Security
- ✅ Passwords hashed with bcrypt (10 salt rounds)
- ✅ Minimum 6 characters required
- ✅ Passwords never returned in API responses
- ✅ Password comparison using secure bcrypt.compare()

### 2. Token Security
- ✅ JWT tokens signed with secure secrets
- ✅ Access tokens expire in 24 hours
- ✅ Refresh tokens expire in 7 days
- ✅ Refresh tokens stored in database (can be revoked)
- ✅ Token rotation on refresh

### 3. API Security
- ✅ Protected routes require valid JWT
- ✅ Role-based authorization (admin/staff)
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ CORS enabled for frontend origin only
- ✅ Helmet.js security headers

### 4. User Account Security
- ✅ Email validation (regex)
- ✅ Unique email constraint
- ✅ Account activation status
- ✅ Last login tracking
- ✅ Audit logging for auth events

---

## 🧪 Testing Authentication

### Method 1: Using the Web UI

1. **Start the application**:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. **Open browser**: `http://localhost:5173`

3. **Register a new user**:
   - Click "Register" or navigate to registration page
   - Fill in the form
   - Submit

4. **Login**:
   - Use your email and password
   - You'll be redirected to the dashboard

5. **Test protected routes**:
   - Navigate to Patients, Doctors, Appointments
   - All should work with your token

6. **Logout**:
   - Click logout button
   - You'll be redirected to login page

### Method 2: Using cURL (Command Line)

```bash
# 1. Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123456",
    "role": "staff"
  }'

# 2. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'

# Copy the token from response, then:

# 3. Get current user
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 4. Logout
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Method 3: Using the Test Script

```bash
cd backend
node test-auth.js
```

This will automatically test:
- ✅ Registration
- ✅ Login
- ✅ Protected routes
- ✅ Token refresh
- ✅ Logout
- ✅ Access control

---

## 🎯 Frontend Integration

### Using AuthContext in Components

```javascript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  // Check if user is logged in
  if (!isAuthenticated) {
    return <div>Please login</div>;
  }
  
  // Access user data
  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>Role: {user.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Protected Routes

```javascript
import PrivateRoute from './components/PrivateRoute';

<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/dashboard" element={
    <PrivateRoute>
      <Dashboard />
    </PrivateRoute>
  } />
</Routes>
```

### Making Authenticated API Calls

The API service automatically adds the token to requests:

```javascript
import { patientService } from '../services';

// Token is automatically added from localStorage
const patients = await patientService.getPatients();
```

---

## 🐛 Troubleshooting

### Issue: "Token is invalid or expired"

**Causes:**
- Token has expired (>24 hours old)
- JWT_SECRET changed after token was issued
- Token was manually edited

**Solution:**
- Login again to get a new token
- Use refresh token to get new access token
- Clear localStorage and login again

### Issue: "User not found"

**Causes:**
- User was deleted from database
- Wrong user ID in token

**Solution:**
- Register a new user
- Check database for user existence

### Issue: "Invalid credentials"

**Causes:**
- Wrong email or password
- User account is deactivated

**Solution:**
- Check email and password
- Verify account is active in database

### Issue: "Not authorized to access this route"

**Causes:**
- No token provided
- Token not in correct format
- Token expired

**Solution:**
- Ensure token is sent in header: `Authorization: Bearer <token>`
- Login again to get fresh token

---

## 📋 User Roles

### Admin
- Full access to all features
- Can manage users
- Can view all data
- Can modify system settings

### Staff
- Can manage patients
- Can manage appointments
- Can view call logs
- Cannot manage other users

---

## 🔄 Token Refresh Flow

```
1. User logs in → Receives access token + refresh token
2. Access token expires after 24h
3. Frontend detects 401 error
4. Frontend sends refresh token to /api/auth/refresh
5. Backend validates refresh token
6. Backend issues new access token + new refresh token
7. Frontend stores new tokens
8. Frontend retries original request with new token
```

This is handled automatically by the Axios interceptor in `frontend/src/services/api.js`.

---

## ✅ Verification Checklist

- [x] JWT secrets are properly configured
- [x] Password hashing works
- [x] Registration creates users
- [x] Login returns valid tokens
- [x] Protected routes verify tokens
- [x] Token refresh works
- [x] Logout clears tokens
- [x] Role-based authorization works
- [x] Frontend auth context works
- [x] Automatic token refresh works

---

## 🎉 Status: Authentication is Fully Functional!

All authentication features have been implemented and tested. The system is ready for use!
