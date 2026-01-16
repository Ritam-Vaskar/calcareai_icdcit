# CareCall AI - Quick Start Guide

Welcome to CareCall AI! This guide will help you get the system up and running in minutes.

## 🚀 Option 1: Docker Quick Start (Recommended)

**Prerequisites:**
- Docker Desktop installed
- Docker Compose installed

**Steps:**

1. **Clone the repository**
   ```bash
   cd c:\Users\KIIT0001\Downloads\icdcit\carecall-ai
   ```

2. **Create environment file**
   ```bash
   copy .env.example .env
   ```

3. **Edit `.env` with your credentials**
   - Add your Vapi API key
   - Add your OpenAI API key
   - Update JWT secrets (use a random 32+ character string)

4. **Start all services**
   ```bash
   docker-compose up -d
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - MongoDB: localhost:27017

6. **Login with demo credentials**
   - Admin: `admin@carecall.ai` / `admin123`
   - Staff: `staff@carecall.ai` / `staff123`

---

## 🔧 Option 2: Local Development Setup

**Prerequisites:**
- Node.js 18+
- MongoDB 7.0+ (running locally or cloud)

### Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in new terminal)
cd frontend
npm install
```

### Step 2: Configure Environment

```bash
# Backend
cd backend
copy .env.example .env
```

Edit `backend/.env`:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/carecall-ai
JWT_SECRET=your-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
VAPI_API_KEY=your_vapi_api_key
OPENAI_API_KEY=your_openai_api_key
FRONTEND_URL=http://localhost:5173
```

### Step 3: Seed Demo Data

```bash
cd backend
npm run seed
```

This creates:
- 2 admin/staff users
- 3 doctors
- 4 patients
- 4 appointments
- 2 follow-ups
- 2 sample call logs

### Step 4: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend runs on http://localhost:5000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs on http://localhost:5173

### Step 5: Login

Open http://localhost:5173 and login with:
- Email: `admin@carecall.ai`
- Password: `admin123`

---

## 🔑 Getting Vapi AI Credentials

1. **Create Vapi Account**
   - Visit https://vapi.ai
   - Sign up for free account

2. **Get API Key**
   - Go to Dashboard → Settings → API Keys
   - Create new API key
   - Copy and add to `.env` as `VAPI_API_KEY`

3. **Get Phone Number (Optional)**
   - Go to Phone Numbers → Buy Number
   - Copy Phone Number ID
   - Add to `.env` as `VAPI_PHONE_NUMBER`

4. **Create Assistant (Optional)**
   - Go to Assistants → Create Assistant
   - Configure voice settings
   - Copy Assistant ID
   - Add to `.env` as `VAPI_ASSISTANT_ID`

5. **Set Webhook URL**
   - Go to Settings → Webhooks
   - Add: `https://your-domain.com/api/webhooks/vapi`
   - For local testing, use ngrok:
     ```bash
     ngrok http 5000
     ```
   - Use ngrok URL: `https://xxx.ngrok.io/api/webhooks/vapi`

---

## 📱 Testing Voice Calls

### Test Appointment Confirmation Call

1. **Create a Patient**
   - Go to Patients → Add Patient
   - Use your real phone number
   - Set language preference

2. **Create an Appointment**
   - Go to Appointments → New Appointment
   - Select the patient you created
   - Select any doctor
   - Choose future date/time

3. **Initiate Call**
   - Click the phone icon next to the appointment
   - Wait for call to your phone
   - Answer and interact with the AI

4. **Check Call Log**
   - Go to Call Logs
   - View transcript and AI analysis

---

## 🧪 Testing with Demo Data

The seeded data includes:

**Patients:**
- Rajesh Kumar (+919876543210)
- Priya Sharma (+919876543211)
- Amit Patel (+919876543212)
- Sneha Reddy (+919876543213)

**Doctors:**
- Dr. Arjun Mehta (Cardiologist)
- Dr. Kavya Iyer (Pediatrician)
- Dr. Rohan Desai (General Physician)

**Pre-scheduled Appointments:**
- 4 appointments for next few days
- Various types: Consultation, Follow-up, Routine Checkup

---

## 🔄 Automated Features

The system automatically:

1. **Hourly Follow-up Checks** - Finds due follow-ups and initiates calls
2. **Daily Appointment Reminders** - Calls patients at 9 AM for next-day appointments
3. **Failed Call Retries** - Retries failed calls every 2 hours (max 3 attempts)

To test:
- Create a follow-up for today
- Wait for the next hourly cron run
- Or manually trigger: `node backend/services/cronService.js`

---

## 📊 Dashboard Features

After logging in, you'll see:

✅ **Stats Cards**
- Total Patients, Appointments, Calls
- Success rates and pending tasks

✅ **Charts**
- Call status distribution (Pie chart)
- Call types breakdown (Bar chart)
- Sentiment analysis (Pie chart)
- Recent activity timeline

✅ **AI Performance**
- Average call duration
- Success rate
- Total cost tracking

---

## 🛠️ Common Issues

### MongoDB Connection Error
```
Solution: Ensure MongoDB is running
- Windows: Start MongoDB service
- Docker: docker-compose up mongodb
```

### Port Already in Use
```
Solution: Kill process on port
npx kill-port 5000
npx kill-port 5173
```

### Vapi Call Not Working
```
Checklist:
✓ VAPI_API_KEY is correct
✓ Phone number format: +919876543210 (with country code)
✓ Webhook URL is publicly accessible (use ngrok for local)
✓ Check backend logs for errors
```

### Frontend Not Loading Data
```
Solution: Check browser console
- Ensure backend is running on port 5000
- Check API proxy in vite.config.js
- Clear localStorage and re-login
```

---

## 📝 Next Steps

1. **Customize Voice**
   - Edit `backend/services/vapiService.js`
   - Change voice ID in `getVoiceForLanguage()`
   - Add more languages

2. **Add More Doctors**
   - Go to Doctors page
   - Add availability schedules

3. **Create Real Patients**
   - Replace demo data with real patient info
   - Use actual phone numbers for testing

4. **Set Up Production**
   - Deploy to cloud (AWS, Azure, DigitalOcean)
   - Use managed MongoDB (MongoDB Atlas)
   - Set up SSL certificate
   - Configure production environment variables

---

## 🎯 Demo Workflow

**Complete End-to-End Test:**

1. Login as admin
2. Create a patient with your phone number
3. Create a doctor with today's availability
4. Schedule an appointment for today
5. Click "Call" button on appointment
6. Answer the phone and confirm appointment
7. Check Dashboard for updated stats
8. View Call Logs for transcript
9. See appointment status change to "confirmed"

**Expected Result:** 
- Call received on your phone
- AI agent asks to confirm appointment
- You respond "yes" or "confirm"
- System updates appointment status
- Call log shows positive sentiment and "confirm" intent

---

## 📚 Documentation

- **API Docs**: See `API_DOCUMENTATION.md`
- **Architecture**: See `README.md`
- **Vapi Docs**: https://docs.vapi.ai

---

## 💡 Tips

- Use Chrome DevTools for debugging frontend
- Check `backend/logs/` for server logs
- Use Postman to test API endpoints directly
- Monitor MongoDB with MongoDB Compass

---

## 🆘 Support

If you encounter issues:
1. Check the logs: `backend/logs/app.log`
2. Review error messages in terminal
3. Ensure all environment variables are set
4. Verify MongoDB connection
5. Check Vapi dashboard for call status

---

**Happy Building! 🚀**

Your CareCall AI system is now ready for healthcare automation!
