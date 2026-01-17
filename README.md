# CareCall AI - Autonomous Voice Agents for Healthcare

🎯 **Hackathon-Ready Production-Grade Healthcare AI Voice Agent System**

CareCall AI is a comprehensive autonomous voice calling system built with the MERN stack and Vapi AI, designed to automate healthcare follow-ups and appointment management.

## 🌟 Features

### Core Capabilities
- ✅ **AI-Powered Voice Calls** - Natural conversations in multiple languages
- 📞 **Appointment Management** - Confirm, reschedule, and cancel appointments
- 👥 **Patient Management** - Complete patient records and history
- 👨‍⚕️ **Doctor Availability** - Slot management and scheduling
- 📊 **Analytics Dashboard** - Real-time metrics and AI performance
- 🔄 **Follow-up System** - Automated post-visit and chronic care check-ins
- 🎯 **Intent Detection** - AI understands patient responses
- 😊 **Sentiment Analysis** - Basic emotion detection in conversations
- 🔁 **Retry Logic** - Automatic retry for failed calls
- 📈 **Call Logs** - Complete transcript and outcome tracking

### Tech Stack
- **Frontend**: React.js + Vite, TailwindCSS, Recharts
- **Backend**: Node.js + Express, MongoDB + Mongoose
- **AI/Voice**: Vapi AI (STT, TTS, GPT-4)
- **Auth**: JWT with refresh tokens
- **DevOps**: Docker, Docker Compose, Nginx

## 📁 Project Structure

```
carecall-ai/
├── backend/
│   ├── config/          # Database, environment config
│   ├── controllers/     # Route handlers
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── services/        # Business logic (Vapi, Cron)
│   ├── middleware/      # Auth, validation, error handling
│   ├── webhooks/        # Vapi webhook handlers
│   ├── utils/           # Helpers, logger
│   └── index.js         # Server entry point
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API service layer
│   │   ├── context/     # React context (Auth)
│   │   ├── utils/       # Helper functions
│   │   └── App.jsx      # Main app component
│   └── index.html
├── docker-compose.yml   # Container orchestration
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB 7.0+
- Vapi AI Account ([vapi.ai](https://vapi.ai))
- Google Gemini API Key

### 1. Clone and Install

```bash
# Clone repository
git clone <your-repo-url>
cd carecall-ai

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Backend - Copy and edit .env
cd backend
copy .env.example .env

# Edit .env with your credentials:
# - MongoDB URI
# - JWT secrets
# - Vapi AI credentials
# - Google Gemini API key
```

### 3. Start Development Servers

```bash
# Terminal 1 - Backend (port 5000)
cd backend
npm run dev

# Terminal 2 - Frontend (port 5173)
cd frontend
npm run dev
```

Access the application at `http://localhost:5173`

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Create .env file with your credentials
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services will be available at:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- MongoDB: `localhost:27017`

## 🔧 Configuration

### Vapi AI Setup

1. Create account at [vapi.ai](https://vapi.ai)
2. Get your API key
3. Create a phone number
4. Create an assistant (or use dynamic assistant creation)
5. Set webhook URL: `https://your-domain.com/api/webhooks/vapi`

### Environment Variables

Key configurations in `.env`:

```env
# Required
MONGODB_URI=mongodb://localhost:27017/carecall-ai
JWT_SECRET=min-32-character-secret
VAPI_API_KEY=your_vapi_key
GOOGLE_API_KEY=your_google_gemini_key

# Optional but recommended
VAPI_PHONE_NUMBER=vapi_phone_id
VAPI_ASSISTANT_ID=vapi_assistant_id
VAPI_WEBHOOK_SECRET=webhook_signature_secret
```

## 📡 API Documentation

### Authentication
```
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
POST /api/auth/refresh
POST /api/auth/logout
```

### Patients
```
GET    /api/patients
GET    /api/patients/:id
POST   /api/patients
PUT    /api/patients/:id
DELETE /api/patients/:id
GET    /api/patients/stats
```

### Appointments
```
GET  /api/appointments
POST /api/appointments
PUT  /api/appointments/:id/cancel
POST /api/appointments/:id/reschedule
POST /api/appointments/:id/call        # Initiate AI call
GET  /api/appointments/stats
```

### Call Logs
```
GET /api/calls
GET /api/calls/analytics
GET /api/calls/ai-performance
GET /api/calls/export              # Export CSV
```

### Follow-ups
```
GET  /api/followups
POST /api/followups
POST /api/followups/:id/call       # Initiate AI call
PUT  /api/followups/:id/complete
GET  /api/followups/stats
```

### Webhooks
```
POST /api/webhooks/vapi            # Vapi callback endpoint
```

## 🎨 Features Showcase

### Dashboard
- Real-time metrics (patients, appointments, calls)
- Success rate tracking
- Call status distribution (charts)
- Sentiment analysis visualization
- Recent call timeline

### AI Voice Agent
- Multi-language support (EN, HI, BN, TA, TE, MR, GU)
- Natural conversation flow
- Intent recognition (confirm, reschedule, cancel)
- Context awareness
- Interruption handling

### Appointment System
- Conflict detection
- Doctor availability checking
- Automatic reminders (cron)
- Status tracking (scheduled, confirmed, rescheduled, cancelled, no-show)

### Advanced Features
- ✅ Sentiment detection
- ✅ Automatic retry logic (3 attempts)
- ✅ Language auto-detection (via patient profile)
- ✅ Rate limiting
- ✅ Audit logs
- ✅ Call cost tracking
- ✅ Webhook signature verification

## 🧪 Testing

### Manual Testing

```bash
# Health check
curl http://localhost:5000/health

# Login (create user first via UI)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

## 📊 Architecture

```
┌─────────────┐
│   React UI  │
└──────┬──────┘
       │ REST API
┌──────┴───────────────┐
│   Express Backend    │
│  - JWT Auth          │
│  - MongoDB           │
│  - Cron Jobs         │
└──────┬───────────────┘
       │
       ├─────► Vapi AI ─────► Phone Call
       │       (Voice Agent)
       │
       └─────► MongoDB
               (Data Store)
```

## 🔒 Security

- JWT authentication with refresh tokens
- Password hashing (bcrypt)
- Role-based access control (Admin/Staff)
- Rate limiting
- Helmet.js security headers
- Input validation (express-validator)
- Webhook signature verification
- Environment variable protection

## 🌐 Production Deployment

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
    }
}
```

### PM2 Process Manager

```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend
pm2 start index.js --name carecall-backend

# Monitor
pm2 monit

# Save configuration
pm2 save
pm2 startup
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check MongoDB is running
mongosh
```

### Port Already in Use
```bash
# Kill process on port 5000
npx kill-port 5000

# Kill process on port 5173
npx kill-port 5173
```

### Vapi Webhook Not Receiving
- Ensure webhook URL is publicly accessible (use ngrok for local testing)
- Verify webhook secret matches
- Check Vapi dashboard for webhook delivery status

## 📝 License

MIT License - Built for hackathon demonstration

## 👥 Contributors

Built by CareCall AI Team

## 🙏 Acknowledgments

- Vapi AI for voice agent infrastructure
- Google Gemini for conversational AI
- MongoDB for flexible healthcare data storage
- React and TailwindCSS for modern UI

---

**For support**: Open an issue or contact the team

**Hackathon Ready** ✅ **Production Inspired** ✅ **Fully Functional** ✅