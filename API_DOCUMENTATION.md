# CareCall AI - API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Auth Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "staff" // or "admin"
}

Response: 201
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "John Doe", "email": "...", "role": "staff" },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@carecall.ai",
  "password": "admin123"
}

Response: 200
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "Admin User", "email": "admin@carecall.ai", "role": "admin" }
  }
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}

Response: 200
{
  "success": true,
  "data": {
    "token": "new_jwt_token",
    "refreshToken": "new_refresh_token"
  }
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Patients

### Get All Patients
```http
GET /patients?page=1&limit=10&search=john&status=active
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "patients": [...],
    "pagination": {
      "total": 45,
      "page": 1,
      "pages": 5,
      "limit": 10
    }
  }
}
```

### Get Patient by ID
```http
GET /patients/:id
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "patient": {
      "_id": "...",
      "name": "John Doe",
      "phone": "+919876543210",
      "email": "john@example.com",
      "dateOfBirth": "1990-01-15",
      "gender": "Male",
      "language": "English",
      "status": "active",
      "medicalHistory": [...],
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

### Create Patient
```http
POST /patients
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Smith",
  "phone": "+919876543210",
  "email": "jane@example.com",
  "dateOfBirth": "1985-05-20",
  "gender": "Female",
  "language": "English",
  "address": "123 Main St, City",
  "emergencyContact": {
    "name": "John Smith",
    "relationship": "Spouse",
    "phone": "+919876543211"
  },
  "medicalHistory": [
    {
      "condition": "Diabetes Type 2",
      "diagnosedDate": "2020-03-15",
      "currentStatus": "Active",
      "medications": ["Metformin 500mg"]
    }
  ]
}

Response: 201
{
  "success": true,
  "data": {
    "patient": { ... }
  }
}
```

### Update Patient
```http
PUT /patients/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Smith Updated",
  "phone": "+919876543210",
  "status": "active"
}

Response: 200
{
  "success": true,
  "data": {
    "patient": { ... }
  }
}
```

### Delete Patient
```http
DELETE /patients/:id
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "message": "Patient deleted successfully"
}
```

### Get Patient Stats
```http
GET /patients/stats
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "totalPatients": 120,
    "activePatients": 95,
    "inactivePatients": 25,
    "recentPatients": [...]
  }
}
```

---

## Doctors

### Get All Doctors
```http
GET /doctors?page=1&limit=10&search=smith&specialization=Cardiologist
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "doctors": [...],
    "pagination": { ... }
  }
}
```

### Create Doctor
```http
POST /doctors
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Dr. Sarah Johnson",
  "email": "sarah.j@hospital.com",
  "phone": "+919876543220",
  "specialization": "Cardiologist",
  "licenseNumber": "MED12345",
  "experience": 15,
  "consultationFee": 800,
  "availability": [
    {
      "dayOfWeek": "Monday",
      "startTime": "09:00",
      "endTime": "17:00"
    },
    {
      "dayOfWeek": "Wednesday",
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ]
}

Response: 201
{
  "success": true,
  "data": {
    "doctor": { ... }
  }
}
```

### Get Doctor Availability
```http
GET /doctors/:id/availability?date=2024-01-15
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "available": true,
    "slots": ["09:00", "09:30", "10:00", "10:30", ...]
  }
}
```

---

## Appointments

### Get All Appointments
```http
GET /appointments?page=1&limit=10&status=scheduled&patient=<patient_id>&doctor=<doctor_id>
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "appointments": [
      {
        "_id": "...",
        "patient": { "_id": "...", "name": "John Doe", "phone": "..." },
        "doctor": { "_id": "...", "name": "Dr. Smith", "specialization": "..." },
        "appointmentDate": "2024-01-20T00:00:00.000Z",
        "appointmentTime": "10:00",
        "type": "Consultation",
        "status": "scheduled",
        "reason": "Regular checkup",
        "notes": "...",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "pagination": { ... }
  }
}
```

### Create Appointment
```http
POST /appointments
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient": "<patient_id>",
  "doctor": "<doctor_id>",
  "appointmentDate": "2024-01-25",
  "appointmentTime": "14:00",
  "type": "Consultation",
  "reason": "Follow-up checkup",
  "notes": "Patient requested afternoon slot"
}

Response: 201
{
  "success": true,
  "data": {
    "appointment": { ... }
  }
}
```

### Initiate Appointment Call
```http
POST /appointments/:id/call
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "message": "Call initiated successfully",
  "data": {
    "callId": "vapi_call_id",
    "appointment": { ... }
  }
}
```

### Cancel Appointment
```http
PUT /appointments/:id/cancel
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "message": "Appointment cancelled successfully",
  "data": {
    "appointment": { ... }
  }
}
```

### Reschedule Appointment
```http
POST /appointments/:id/reschedule
Authorization: Bearer <token>
Content-Type: application/json

{
  "appointmentDate": "2024-01-30",
  "appointmentTime": "15:00"
}

Response: 200
{
  "success": true,
  "message": "Appointment rescheduled successfully",
  "data": {
    "appointment": { ... }
  }
}
```

### Get Appointment Stats
```http
GET /appointments/stats
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "totalAppointments": 250,
    "scheduledAppointments": 45,
    "confirmedAppointments": 30,
    "cancelledAppointments": 15,
    "completedAppointments": 160,
    "todayAppointments": 8,
    "upcomingAppointments": [...]
  }
}
```

---

## Call Logs

### Get All Call Logs
```http
GET /calls?page=1&limit=10&status=completed&callType=appointment-confirmation
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "callLogs": [
      {
        "_id": "...",
        "callId": "vapi_call_123",
        "patient": { ... },
        "phoneNumber": "+919876543210",
        "callType": "appointment-confirmation",
        "status": "completed",
        "duration": 120,
        "cost": 0.10,
        "transcript": "Full conversation transcript...",
        "recording": "https://recordings.vapi.ai/...",
        "aiMetadata": {
          "intent": "confirm",
          "sentiment": "positive",
          "keyPhrases": ["yes", "confirm", "thank you"],
          "confidence": 0.95
        },
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "pagination": { ... }
  }
}
```

### Get Call Analytics
```http
GET /calls/analytics?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "totalCalls": 500,
    "successfulCalls": 425,
    "failedCalls": 75,
    "successRate": 85,
    "averageDuration": 98,
    "totalCost": 41.67,
    "callsByType": {
      "appointment-confirmation": 200,
      "appointment-reminder": 150,
      "follow-up": 100,
      "rescheduling": 50
    },
    "callsByStatus": {
      "completed": 425,
      "failed": 40,
      "no-answer": 25,
      "busy": 10
    },
    "sentimentDistribution": {
      "positive": 350,
      "neutral": 50,
      "negative": 25
    }
  }
}
```

### Get AI Performance Metrics
```http
GET /calls/ai-performance
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "totalAICalls": 425,
    "averageConfidence": 0.89,
    "intentAccuracy": 0.92,
    "sentimentAccuracy": 0.87,
    "intentDistribution": {
      "confirm": 250,
      "reschedule": 80,
      "cancel": 40,
      "query": 35,
      "emergency": 5,
      "unknown": 15
    }
  }
}
```

### Export Call Logs (CSV)
```http
GET /calls/export?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>

Response: 200
Content-Type: text/csv
Content-Disposition: attachment; filename=call-logs-2024-01-31.csv

(CSV file download)
```

---

## Follow-ups

### Get All Follow-ups
```http
GET /followups?page=1&limit=10&status=pending&patient=<patient_id>
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "followUps": [
      {
        "_id": "...",
        "patient": { ... },
        "type": "Post-Visit",
        "priority": "High",
        "scheduledDate": "2024-01-22T00:00:00.000Z",
        "status": "pending",
        "reason": "Post-surgery checkup",
        "notes": "Check wound healing progress",
        "isRecurring": true,
        "recurringInterval": 7,
        "nextFollowUpDate": "2024-01-29T00:00:00.000Z",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "pagination": { ... }
  }
}
```

### Create Follow-up
```http
POST /followups
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient": "<patient_id>",
  "type": "Medication Reminder",
  "priority": "Medium",
  "scheduledDate": "2024-01-25",
  "reason": "Remind to take diabetes medication",
  "notes": "Patient needs daily reminder",
  "isRecurring": true,
  "recurringInterval": 1
}

Response: 201
{
  "success": true,
  "data": {
    "followUp": { ... }
  }
}
```

### Initiate Follow-up Call
```http
POST /followups/:id/call
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "message": "Follow-up call initiated successfully",
  "data": {
    "callId": "vapi_call_id",
    "followUp": { ... }
  }
}
```

### Mark Follow-up Complete
```http
PUT /followups/:id/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "outcome": "Patient responding well to treatment",
  "notes": "All vitals normal"
}

Response: 200
{
  "success": true,
  "message": "Follow-up marked as completed",
  "data": {
    "followUp": { ... }
  }
}
```

### Get Follow-up Stats
```http
GET /followups/stats
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "totalFollowUps": 180,
    "pendingFollowUps": 45,
    "completedFollowUps": 120,
    "cancelledFollowUps": 15,
    "dueToday": 8,
    "overdue": 3,
    "upcomingFollowUps": [...]
  }
}
```

### Get Due Follow-ups
```http
GET /followups/due
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "dueFollowUps": [...]
  }
}
```

---

## Webhooks

### Vapi Webhook Endpoint
```http
POST /webhooks/vapi
Content-Type: application/json
x-vapi-signature: <signature>

{
  "type": "call.ended",
  "callId": "vapi_call_123",
  "status": "completed",
  "duration": 120,
  "transcript": "Full conversation...",
  "recording": "https://...",
  "metadata": {
    "appointmentId": "...",
    "followUpId": "..."
  }
}

Response: 200
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

**Webhook Event Types:**
- `call.started` - Call initiated
- `call.ended` - Call completed
- `call.failed` - Call failed

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400
  }
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., appointment slot already booked)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Rate Limiting

- **Window**: 15 minutes
- **Max Requests**: 100 per window
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "total": 250,
    "page": 1,
    "pages": 25,
    "limit": 10
  }
}
```

---

## Search & Filtering

**Common Query Parameters:**
- `search` - Text search across relevant fields
- `status` - Filter by status
- `startDate` & `endDate` - Date range filter
- `patient` - Filter by patient ID
- `doctor` - Filter by doctor ID

Example:
```
GET /appointments?search=john&status=scheduled&startDate=2024-01-01&endDate=2024-01-31
```

---

## Demo Credentials

**Admin Account:**
- Email: `admin@carecall.ai`
- Password: `admin123`
- Role: `admin`

**Staff Account:**
- Email: `staff@carecall.ai`
- Password: `staff123`
- Role: `staff`
