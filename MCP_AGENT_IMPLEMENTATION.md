# MCP Agent Implementation - AI-Powered Appointment Scheduling

## Overview

This implementation adds an intelligent MCP (Manager Control Protocol) Agent that automatically processes patient conversations, analyzes urgency, finds suitable doctors, and schedules appointments.

## Architecture Flow

```
Patient → AI Call → Conversation Analysis → MCP Agent → Doctor Assignment → Appointment Scheduled
```

### 1. Patient Conversation (AI Call)
- AI calls patient
- Conversation is transcribed
- Stored in database with metadata

### 2. Conversation Analysis
The AI analyzes the conversation and extracts:
- **Symptoms**: List of reported symptoms
- **Chief Complaint**: Main reason for seeking care
- **Pain Level**: 0-10 scale
- **Urgency Level**: emergency | urgent | routine | follow-up
- **Suggested Specialization**: Which doctor specialty is needed
- **Sentiment**: Patient's emotional state
- **Key Insights**: Important contextual information

### 3. MCP Agent Processing
The MCP Agent (`backend/services/mcpAgent.js`) performs:

#### Step 1: Find Available Doctor
- Matches doctor by specialization
- Considers doctor experience for urgent/emergency cases
- Checks doctor availability schedule
- Falls back to general practitioners if needed

#### Step 2: Determine Appointment Timing
Based on urgency level:
- **Emergency**: Within 1-2 hours (ASAP)
- **Urgent**: Within 24 hours
- **Routine**: Within 3-5 days
- **Follow-up**: Within 7-10 days

#### Step 3: Create Appointment
- Schedules appointment with optimal timing
- Sets appropriate appointment type
- Includes all analysis data in notes
- Links conversation to appointment

#### Step 4: Update Patient Record
- Assigns doctor to patient (if not already assigned)
- Updates last visit date
- Maintains continuity of care

## Database Models

### New Models Added

#### 1. Conversation Model
Stores AI conversation data and analysis results:
```javascript
{
  patient: ObjectId,
  transcript: String,
  analysis: {
    symptoms: [String],
    urgencyLevel: String,
    suggestedSpecialization: String,
    painLevel: Number,
    // ... more fields
  },
  processed: Boolean,
  scheduledAppointment: ObjectId
}
```

#### 2. Updated User Model
Now supports 3 roles:
- **admin**: Full system access, monitors all conversations and appointments
- **doctor**: Sees assigned patients with complete medical history
- **patient**: Views personal appointments and health records

#### 3. Extended Patient Model
Now includes:
- **prescriptions**: Array of past prescriptions with medications
- **medicalRecords**: Complete consultation history with vitals, diagnosis, treatment

## API Endpoints

### Dashboard Endpoints
```
GET /api/dashboard
```
Returns role-specific dashboard data:
- **Admin**: System overview, all conversations, urgency breakdown
- **Doctor**: Assigned patients, today's schedule, medical histories
- **Patient**: Personal appointments, prescriptions, medical records

### Conversation Endpoints
```
GET    /api/conversations              # Get all conversations
GET    /api/conversations/:id          # Get specific conversation
POST   /api/conversations              # Create new conversation
POST   /api/conversations/:id/process  # Process with MCP agent
POST   /api/conversations/process-all  # Process all pending (admin)
GET    /api/conversations/stats        # Get statistics (admin)
```

## Mock Data & Testing

### Seed Database with Conversations

Run the seeder to populate the database with realistic mock data:

```bash
cd backend
npm run seed:conversations
```

This creates:
- **4 Patients** with medical histories
- **4 Doctors** with different specializations
- **4 AI Conversations** with varying urgency levels:
  1. **Emergency**: Chest pain (Cardiology)
  2. **Urgent**: Severe back pain (Orthopedics)
  3. **Routine**: Asthma follow-up (General Medicine)
  4. **Follow-up**: Recurring headaches (General Medicine)

The MCP Agent automatically processes each conversation and schedules appointments.

### Sample Conversation: Emergency Case

**Patient**: John Smith (38, Male, has Hypertension & Diabetes)

**Conversation Summary**:
- Severe chest pain radiating to left arm
- Shortness of breath, sweating, nausea
- Pain level: 9/10
- High-risk patient with comorbidities

**MCP Agent Action**:
- Urgency: EMERGENCY
- Assigned: Dr. Sarah Johnson (Cardiologist, 15 years exp)
- Appointment: Within 1 hour
- Type: Emergency consultation (60 minutes)
- Status: Confirmed (immediate)

## Role-Specific Dashboards

### Admin Dashboard
```javascript
{
  overview: {
    totalPatients,
    totalDoctors,
    todaysAppointments,
    pendingConversations,
    urgentAppointments
  },
  recentConversations: [...],
  upcomingAppointments: [...],
  analytics: {
    urgencyBreakdown,
    specializationDemand,
    processingStats
  }
}
```

### Doctor Dashboard
```javascript
{
  doctor: { name, specialization, experience, rating },
  overview: {
    totalPatients,
    todaysAppointments,
    upcomingAppointments
  },
  todaysSchedule: [...],
  assignedPatients: [...],  // with full medical history
  recentPatients: [...],    // with prescriptions & records
  pendingAppointments: [...]
}
```

### Patient Dashboard
```javascript
{
  patient: { name, age, bloodGroup, assignedDoctor },
  overview: {
    totalAppointments,
    completedAppointments,
    lastVisit
  },
  nextAppointment: {...},
  upcomingAppointments: [...],
  pastAppointments: [...],
  medicalHistory: {...},
  prescriptions: [...],
  medicalRecords: [...],
  recentConversations: [...]
}
```

## Testing the Flow

### 1. Seed the Database
```bash
npm run seed:conversations
```

### 2. Login Credentials
```
Admin:   admin@carecall.ai / admin123
Doctor:  sarah.johnson@hospital.com / doctor123
Patient: john.smith@email.com / patient123
```

### 3. Test Scenarios

#### Scenario 1: Admin Views Conversations
1. Login as admin
2. Navigate to dashboard
3. View `recentConversations` with urgency levels
4. Check `pendingConversations` count
5. View `specializationDemand` analytics

#### Scenario 2: Doctor Views Assigned Patients
1. Login as doctor (Dr. Sarah Johnson - Cardiology)
2. View today's schedule
3. See John Smith (emergency patient)
4. Review patient's complete medical history:
   - Past conditions (Hypertension, Diabetes)
   - Current medications
   - Past prescriptions
   - Medical records with vitals

#### Scenario 3: Patient Views Health Records
1. Login as patient (John Smith)
2. View next appointment (with Dr. Sarah Johnson)
3. Review medical history
4. Check past prescriptions
5. View recent AI conversation transcript

#### Scenario 4: Process New Conversation
```bash
# Via API
POST /api/conversations
{
  "patient": "patient_id",
  "transcript": "...",
  "analysis": {
    "urgencyLevel": "urgent",
    "suggestedSpecialization": "Orthopedics",
    "symptoms": ["back pain", "leg numbness"]
  }
}

# Then process
POST /api/conversations/{id}/process
```

## MCP Agent Logic

### Urgency-Based Scheduling

```javascript
switch (urgencyLevel) {
  case 'emergency':
    // Schedule within 1-2 hours
    // Priority: Most experienced doctor
    // Duration: 60 minutes
    // Status: Auto-confirmed
    break;
    
  case 'urgent':
    // Schedule within 24 hours
    // Priority: Experienced doctor
    // Duration: 30 minutes
    // Status: Scheduled (pending confirmation)
    break;
    
  case 'routine':
    // Schedule within 3-5 days
    // Duration: 30 minutes
    break;
    
  case 'follow-up':
    // Schedule within 7-10 days
    // Prefer same doctor if available
    break;
}
```

### Doctor Matching Algorithm

1. **Primary Match**: Exact specialization match
2. **Fallback**: General practitioners or family medicine
3. **Prioritization**:
   - Emergency/Urgent: Most experienced doctors first
   - Routine: Round-robin or availability-based
4. **Availability Check**: Verify doctor schedule
5. **Continuity**: Prefer assigned doctor for follow-ups

## Benefits

### For Patients
- ✅ Automatic appointment scheduling
- ✅ Urgency-appropriate timing
- ✅ Right specialist assigned
- ✅ Complete health record access
- ✅ No manual booking needed

### For Doctors
- ✅ See complete patient context before appointment
- ✅ Access past records and prescriptions
- ✅ Organized schedule with urgency indicators
- ✅ Focus on care, not admin work

### For Admins
- ✅ Real-time conversation monitoring
- ✅ Analytics on urgency patterns
- ✅ Specialization demand insights
- ✅ Automated workflow management
- ✅ Reduced manual scheduling

## Next Steps

1. **Frontend Integration**: Update React components for role-specific dashboards
2. **Real VAPI Integration**: Connect to actual VAPI voice AI service
3. **Notification System**: SMS/Email alerts for scheduled appointments
4. **Advanced Analytics**: ML-based urgency prediction
5. **Multi-language Support**: Extend to regional languages
6. **Telemedicine**: Add video consultation links

## Files Modified/Created

### Backend
- ✅ `models/User.js` - Updated roles
- ✅ `models/Conversation.js` - New model
- ✅ `models/Patient.js` - Added prescriptions & records
- ✅ `services/mcpAgent.js` - MCP agent logic
- ✅ `controllers/conversationController.js` - Conversation endpoints
- ✅ `controllers/dashboardController.js` - Role-specific dashboards
- ✅ `routes/conversationRoutes.js` - Conversation routes
- ✅ `routes/dashboardRoutes.js` - Dashboard routes
- ✅ `utils/seedWithConversations.js` - Test data seeder
- ✅ `index.js` - Added new routes

### To Be Updated (Frontend)
- [ ] `Dashboard.jsx` - Split into 3 role-specific components
- [ ] `AdminDashboard.jsx` - New component
- [ ] `DoctorDashboard.jsx` - New component
- [ ] `PatientDashboard.jsx` - New component
- [ ] `Conversations.jsx` - New page for admin

---

**Status**: Backend implementation complete ✅
**Next**: Frontend dashboard updates & testing
