require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Conversation = require('../models/Conversation');
const CallLog = require('../models/CallLog');
const mcpAgent = require('../services/mcpAgent');

// Connect to database
connectDB();

const seedWithConversations = async () => {
  try {
    console.log('🌱 Starting database seeding with conversations...');

    // Clear existing data
    await User.deleteMany({});
    await Patient.deleteMany({});
    await Doctor.deleteMany({});
    await Appointment.deleteMany({});
    await Conversation.deleteMany({});
    await CallLog.deleteMany({});

    console.log('✅ Cleared existing data');

    // ========== CREATE USERS ==========
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@carecall.ai',
      password: 'admin123',
      role: 'admin',
      phone: '+1234567890'
    });

    console.log('✅ Created admin user');

    // ========== CREATE DOCTORS ==========
    const doctors = await Doctor.create([
      {
        name: 'Dr. Sarah Johnson',
        specialization: 'Cardiology',
        qualification: 'MD, FACC',
        experience: 15,
        phone: '+1234567892',
        email: 'sarah.johnson@hospital.com',
        licenseNumber: 'LIC001',
        department: 'Cardiology',
        consultationFee: 200,
        rating: 4.8,
        status: 'active',
        availability: {
          monday: { isAvailable: true, slots: [{ startTime: '09:00', endTime: '17:00' }] },
          tuesday: { isAvailable: true, slots: [{ startTime: '09:00', endTime: '17:00' }] },
          wednesday: { isAvailable: true, slots: [{ startTime: '09:00', endTime: '17:00' }] },
          thursday: { isAvailable: true, slots: [{ startTime: '09:00', endTime: '17:00' }] },
          friday: { isAvailable: true, slots: [{ startTime: '09:00', endTime: '17:00' }] },
          saturday: { isAvailable: false, slots: [] },
          sunday: { isAvailable: false, slots: [] }
        }
      },
      {
        name: 'Dr. Michael Chen',
        specialization: 'Orthopedics',
        qualification: 'MD, MS Ortho',
        experience: 12,
        phone: '+1234567893',
        email: 'michael.chen@hospital.com',
        licenseNumber: 'LIC002',
        department: 'Orthopedics',
        consultationFee: 180,
        rating: 4.7,
        status: 'active',
        availability: {
          monday: { isAvailable: true, slots: [{ startTime: '10:00', endTime: '18:00' }] },
          tuesday: { isAvailable: true, slots: [{ startTime: '10:00', endTime: '18:00' }] },
          wednesday: { isAvailable: true, slots: [{ startTime: '10:00', endTime: '18:00' }] },
          thursday: { isAvailable: true, slots: [{ startTime: '10:00', endTime: '18:00' }] },
          friday: { isAvailable: true, slots: [{ startTime: '10:00', endTime: '14:00' }] },
          saturday: { isAvailable: true, slots: [{ startTime: '09:00', endTime: '13:00' }] },
          sunday: { isAvailable: false, slots: [] }
        }
      },
      {
        name: 'Dr. Priya Sharma',
        specialization: 'General Medicine',
        qualification: 'MBBS, MD',
        experience: 8,
        phone: '+1234567894',
        email: 'priya.sharma@hospital.com',
        licenseNumber: 'LIC003',
        department: 'General Medicine',
        consultationFee: 150,
        rating: 4.6,
        status: 'active',
        availability: {
          monday: { isAvailable: true, slots: [{ startTime: '08:00', endTime: '16:00' }] },
          tuesday: { isAvailable: true, slots: [{ startTime: '08:00', endTime: '16:00' }] },
          wednesday: { isAvailable: true, slots: [{ startTime: '08:00', endTime: '16:00' }] },
          thursday: { isAvailable: true, slots: [{ startTime: '08:00', endTime: '16:00' }] },
          friday: { isAvailable: true, slots: [{ startTime: '08:00', endTime: '16:00' }] },
          saturday: { isAvailable: true, slots: [{ startTime: '08:00', endTime: '12:00' }] },
          sunday: { isAvailable: false, slots: [] }
        }
      },
      {
        name: 'Dr. Rajesh Kumar',
        specialization: 'Neurology',
        qualification: 'MD, DM Neurology',
        experience: 18,
        phone: '+1234567895',
        email: 'rajesh.kumar@hospital.com',
        licenseNumber: 'LIC004',
        department: 'Neurology',
        consultationFee: 250,
        rating: 4.9,
        status: 'active',
        availability: {
          monday: { isAvailable: true, slots: [{ startTime: '09:00', endTime: '15:00' }] },
          tuesday: { isAvailable: true, slots: [{ startTime: '09:00', endTime: '15:00' }] },
          wednesday: { isAvailable: true, slots: [{ startTime: '09:00', endTime: '15:00' }] },
          thursday: { isAvailable: true, slots: [{ startTime: '09:00', endTime: '15:00' }] },
          friday: { isAvailable: true, slots: [{ startTime: '09:00', endTime: '15:00' }] },
          saturday: { isAvailable: false, slots: [] },
          sunday: { isAvailable: false, slots: [] }
        }
      }
    ]);

    console.log('✅ Created doctors');

    // Create user accounts for doctors
    for (const doctor of doctors) {
      await User.create({
        name: doctor.name,
        email: doctor.email,
        password: 'doctor123',
        role: 'doctor',
        phone: doctor.phone,
        relatedId: doctor._id,
        relatedModel: 'Doctor'
      });
    }

    console.log('✅ Created doctor user accounts');

    // ========== CREATE PATIENTS WITH MEDICAL HISTORY ==========
    const patients = await Patient.create([
      {
        name: 'John Smith',
        phone: '+1234567896',
        email: 'john.smith@email.com',
        dateOfBirth: new Date('1985-05-15'),
        age: 38,
        gender: 'male',
        language: 'english',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        medicalHistory: {
          conditions: ['Hypertension', 'Type 2 Diabetes'],
          allergies: ['Penicillin'],
          medications: ['Metformin 500mg', 'Lisinopril 10mg'],
          bloodGroup: 'O+'
        },
        prescriptions: [
          {
            date: new Date('2025-12-15'),
            doctor: doctors[0]._id,
            medications: [
              {
                name: 'Metformin',
                dosage: '500mg',
                frequency: 'Twice daily',
                duration: '3 months',
                instructions: 'Take after meals'
              }
            ],
            diagnosis: 'Type 2 Diabetes - Controlled',
            notes: 'Monitor blood sugar levels regularly'
          }
        ],
        medicalRecords: [
          {
            date: new Date('2025-12-15'),
            doctor: doctors[0]._id,
            type: 'consultation',
            diagnosis: 'Hypertension - Stage 1',
            symptoms: ['High blood pressure', 'Occasional headaches'],
            vitals: {
              bloodPressure: '140/90',
              heartRate: 78,
              temperature: 98.6,
              weight: 185,
              height: 5.9
            },
            treatment: 'Prescribed Lisinopril, advised lifestyle modifications',
            notes: 'Follow up in 3 months'
          }
        ],
        status: 'active',
        lastVisit: new Date('2025-12-15')
      },
      {
        name: 'Emily Rodriguez',
        phone: '+1234567897',
        email: 'emily.rodriguez@email.com',
        dateOfBirth: new Date('1992-08-22'),
        age: 31,
        gender: 'female',
        language: 'english',
        address: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          country: 'USA'
        },
        medicalHistory: {
          conditions: ['Asthma'],
          allergies: ['Dust', 'Pollen'],
          medications: ['Albuterol Inhaler'],
          bloodGroup: 'A+'
        },
        prescriptions: [],
        medicalRecords: [],
        status: 'active'
      },
      {
        name: 'Michael Brown',
        phone: '+1234567898',
        email: 'michael.brown@email.com',
        dateOfBirth: new Date('1978-03-10'),
        age: 45,
        gender: 'male',
        language: 'english',
        address: {
          street: '789 Pine Rd',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
          country: 'USA'
        },
        medicalHistory: {
          conditions: ['Lower Back Pain'],
          allergies: [],
          medications: ['Ibuprofen 400mg'],
          bloodGroup: 'B+'
        },
        prescriptions: [],
        medicalRecords: [],
        status: 'active'
      },
      {
        name: 'Sarah Wilson',
        phone: '+1234567899',
        email: 'sarah.wilson@email.com',
        dateOfBirth: new Date('1995-11-05'),
        age: 28,
        gender: 'female',
        language: 'english',
        address: {
          street: '321 Elm St',
          city: 'Houston',
          state: 'TX',
          zipCode: '77001',
          country: 'USA'
        },
        medicalHistory: {
          conditions: [],
          allergies: [],
          medications: [],
          bloodGroup: 'AB+'
        },
        prescriptions: [],
        medicalRecords: [],
        status: 'active'
      }
    ]);

    console.log('✅ Created patients');

    // Create user accounts for patients
    for (const patient of patients) {
      await User.create({
        name: patient.name,
        email: patient.email,
        password: 'patient123',
        role: 'patient',
        phone: patient.phone,
        relatedId: patient._id,
        relatedModel: 'Patient'
      });
    }

    console.log('✅ Created patient user accounts');

    // ========== CREATE MOCK CONVERSATIONS ==========
    const conversations = await Conversation.create([
      {
        // EMERGENCY CASE - Chest Pain
        patient: patients[0]._id,
        transcript: `AI: Hello, this is CareCall AI calling from City Hospital. Am I speaking with John Smith?

Patient: Yes, this is John.

AI: Hi John, I'm calling to check on your health. How are you feeling today?

Patient: Actually, I'm not feeling well at all. I've been having severe chest pain for the last hour. It feels like pressure and tightness in my chest.

AI: I understand this must be concerning. Can you describe the pain? Is it sharp or dull? Does it radiate to your arm or jaw?

Patient: It's a crushing pain, and yes, it's radiating down my left arm. I'm also feeling short of breath and a bit dizzy.

AI: John, this sounds serious. Are you experiencing any sweating or nausea along with the chest pain?

Patient: Yes, I'm sweating quite a bit and feel nauseous. Should I be worried?

AI: Given your symptoms - chest pain radiating to your arm, shortness of breath, sweating, and nausea - this could be a cardiac emergency. I'm going to schedule you with a cardiologist immediately. Do you have someone with you right now?

Patient: Yes, my wife is here with me.

AI: Good. I'm scheduling an emergency appointment for you. Someone from the hospital will call you within minutes. If symptoms worsen, please call 911 immediately. Can you confirm your address is 123 Main St, New York?

Patient: Yes, that's correct. Thank you.

AI: You're welcome, John. Help is on the way. Take care and stay calm.`,
        duration: 180,
        analysis: {
          symptoms: ['Severe chest pain', 'Left arm radiation', 'Shortness of breath', 'Sweating', 'Nausea', 'Dizziness'],
          chiefComplaint: 'Severe chest pain with cardiac symptoms',
          painLevel: 9,
          urgencyLevel: 'emergency',
          suggestedSpecialization: 'Cardiology',
          additionalNotes: 'URGENT: Possible myocardial infarction. Immediate cardiology consultation required. Patient has history of hypertension and diabetes.',
          sentiment: 'distressed',
          keyInsights: [
            'Classic cardiac emergency symptoms',
            'High-risk patient with comorbidities',
            'Requires immediate medical attention',
            'Family member present for support'
          ]
        },
        processed: false,
        processingStatus: 'pending',
        conversationDate: new Date(),
        source: 'ai-call',
        language: 'english'
      },
      {
        // URGENT CASE - Severe Joint Pain
        patient: patients[2]._id,
        transcript: `AI: Hello, this is CareCall AI from City Hospital. May I speak with Michael Brown?

Patient: Speaking.

AI: Hi Michael, I'm calling to check on your health. How have you been feeling?

Patient: Well, my lower back pain has gotten much worse over the last two days. I can barely walk now.

AI: I'm sorry to hear that. Can you tell me more about the pain? What does it feel like?

Patient: It's a sharp, shooting pain that goes down my right leg. When I try to stand up or walk, it's excruciating. I'd rate it about 7 or 8 out of 10.

AI: Has anything specific triggered this worsening? Any recent injury or heavy lifting?

Patient: I was moving some furniture this weekend. The pain started then but has gotten progressively worse.

AI: I see. Are you experiencing any numbness, tingling, or weakness in your leg?

Patient: Yes, actually. My right foot feels a bit numb and tingly. It's worrying me.

AI: Michael, those symptoms along with radiating pain suggest this needs urgent attention. It could be related to your spine or nerves. I'll schedule you with an orthopedic specialist as soon as possible.

Patient: That would be great. I really need help with this.

AI: Absolutely. I'll get you an appointment within the next 24 hours. In the meantime, try to rest and avoid any heavy lifting or strenuous activity. Is that okay?

Patient: Yes, thank you so much.

AI: You're welcome. Someone will call you soon with your appointment details. Take care, Michael.`,
        duration: 150,
        analysis: {
          symptoms: ['Severe lower back pain', 'Radiating leg pain', 'Numbness', 'Tingling in foot', 'Difficulty walking'],
          chiefComplaint: 'Acute lower back pain with radiculopathy',
          painLevel: 8,
          urgencyLevel: 'urgent',
          suggestedSpecialization: 'Orthopedics',
          additionalNotes: 'Possible disc herniation or nerve compression. Neurological symptoms present (numbness, tingling). Needs urgent orthopedic evaluation within 24 hours.',
          sentiment: 'negative',
          keyInsights: [
            'Acute worsening of chronic condition',
            'Neurological symptoms concerning',
            'Recent injury/trigger identified',
            'Patient motivated for treatment'
          ]
        },
        processed: false,
        processingStatus: 'pending',
        conversationDate: new Date(),
        source: 'ai-call',
        language: 'english'
      },
      {
        // ROUTINE CASE - Asthma Follow-up
        patient: patients[1]._id,
        transcript: `AI: Hello, this is CareCall AI from City Hospital. Am I speaking with Emily Rodriguez?

Patient: Yes, hi!

AI: Hi Emily, I'm calling for a routine check-in. How have you been feeling lately?

Patient: Overall, I'm doing okay. My asthma has been a bit more troublesome than usual though.

AI: I see. Can you tell me more about that? What symptoms have you been experiencing?

Patient: I've been using my inhaler more frequently - maybe 3 or 4 times a day instead of just once or twice. I get a bit short of breath when I exercise or go outside.

AI: Have you noticed any triggers? Changes in weather, exposure to allergens, or anything else?

Patient: Well, it's been spring, so there's more pollen in the air. That usually affects me. And I've been exercising more lately, trying to stay fit.

AI: That makes sense. Have you had any wheezing, chest tightness, or nighttime symptoms?

Patient: Some mild wheezing occasionally, but nothing severe. I haven't had any asthma attacks or anything like that.

AI: Good to hear. It sounds like your asthma control could be better. I think it would be helpful for you to see a general medicine doctor for a routine check-up. They can review your medication and possibly adjust it or add a preventer.

Patient: That sounds like a good idea. I'd like to get it under control before it gets worse.

AI: Perfect. I'll schedule you for an appointment in the next few days. Is that convenient for you?

Patient: Yes, that works great. Thank you!

AI: You're welcome, Emily. We'll be in touch soon with the appointment details. Take care!`,
        duration: 120,
        analysis: {
          symptoms: ['Increased inhaler use', 'Shortness of breath with exertion', 'Mild wheezing', 'Seasonal allergies'],
          chiefComplaint: 'Suboptimal asthma control',
          painLevel: 2,
          urgencyLevel: 'routine',
          suggestedSpecialization: 'General Medicine',
          additionalNotes: 'Asthma not well-controlled. Likely needs medication adjustment or addition of preventer therapy. No acute distress. Routine consultation appropriate.',
          sentiment: 'positive',
          keyInsights: [
            'Patient proactive about health',
            'Seasonal trigger identified',
            'Stable but needs optimization',
            'Good medication compliance'
          ]
        },
        processed: false,
        processingStatus: 'pending',
        conversationDate: new Date(),
        source: 'ai-call',
        language: 'english'
      },
      {
        // FOLLOW-UP CASE - Headaches
        patient: patients[3]._id,
        transcript: `AI: Hello, this is CareCall AI from City Hospital. May I speak with Sarah Wilson?

Patient: Yes, this is Sarah.

AI: Hi Sarah, I'm calling to check on your health. How are you doing today?

Patient: I'm okay, but I've been getting these recurring headaches over the past few weeks.

AI: I'm sorry to hear that. Can you describe these headaches for me? How often do they occur?

Patient: Maybe 2 or 3 times a week. They usually start in the afternoon and can last for several hours.

AI: What does the pain feel like? Is it throbbing, dull, sharp, or pressure-like?

Patient: It's mostly a dull, constant pain on both sides of my head, like a tight band around it.

AI: On a scale of 1 to 10, how would you rate the pain intensity?

Patient: Usually around 4 or 5. It's annoying but not unbearable.

AI: Have you noticed any other symptoms with the headaches? Like nausea, sensitivity to light, visual disturbances?

Patient: No, nothing like that. Just the headache. Sometimes my neck feels a bit stiff.

AI: Are there any triggers you've noticed? Stress, lack of sleep, screen time, or certain foods?

Patient: Now that you mention it, I have been working long hours on my computer lately. And I've been stressed with a big project at work.

AI: That could definitely be a factor. It sounds like tension-type headaches, possibly related to stress and prolonged screen time. I'd recommend a follow-up consultation with a doctor to discuss this and explore treatment options.

Patient: Yes, I'd like that. I want to make sure it's nothing serious.

AI: Absolutely. I'll schedule you for an appointment in about a week. Does that work for you?

Patient: Perfect, thank you so much!

AI: You're welcome, Sarah. We'll send you the appointment details soon. Try to take breaks from screen time and practice some stress management in the meantime. Take care!`,
        duration: 140,
        analysis: {
          symptoms: ['Recurring headaches', 'Bilateral head pain', 'Neck stiffness', 'Stress-related'],
          chiefComplaint: 'Recurring tension-type headaches',
          painLevel: 4,
          urgencyLevel: 'follow-up',
          suggestedSpecialization: 'General Medicine',
          additionalNotes: 'Likely tension-type headaches. No red flag symptoms. Stress and prolonged computer use identified as triggers. Follow-up consultation recommended for lifestyle advice and possible treatment.',
          sentiment: 'neutral',
          keyInsights: [
            'Occupational trigger identified',
            'No alarming neurological symptoms',
            'Patient seeking preventive care',
            'Good insight into triggers'
          ]
        },
        processed: false,
        processingStatus: 'pending',
        conversationDate: new Date(),
        source: 'ai-call',
        language: 'english'
      }
    ]);

    console.log('✅ Created mock conversations');

    // ========== PROCESS CONVERSATIONS USING MCP AGENT ==========
    console.log('\n🤖 Starting MCP Agent processing...\n');
    
    for (let i = 0; i < conversations.length; i++) {
      console.log(`\n--- Processing Conversation ${i + 1}/${conversations.length} ---`);
      console.log(`Patient: ${conversations[i].patient}`);
      console.log(`Urgency: ${conversations[i].analysis.urgencyLevel}`);
      console.log(`Specialization: ${conversations[i].analysis.suggestedSpecialization}`);
      
      try {
        const result = await mcpAgent.processConversation(conversations[i]._id);
        console.log(`✅ Successfully processed - Assigned to Dr. ${result.doctor.name}`);
        console.log(`   Appointment scheduled for: ${result.appointment.appointmentDate.toLocaleDateString()} at ${result.appointment.appointmentTime}`);
      } catch (error) {
        console.log(`❌ Failed to process: ${error.message}`);
      }
    }

    console.log('\n✅ MCP Agent processing completed');

    // ========== SUMMARY ==========
    console.log('\n📊 Seeding Summary:');
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   Doctors: ${await Doctor.countDocuments()}`);
    console.log(`   Patients: ${await Patient.countDocuments()}`);
    console.log(`   Conversations: ${await Conversation.countDocuments()}`);
    console.log(`   Appointments: ${await Appointment.countDocuments()}`);
    
    const processedConversations = await Conversation.countDocuments({ processed: true });
    console.log(`   Processed Conversations: ${processedConversations}/${conversations.length}`);

    console.log('\n🎉 Database seeding completed successfully!\n');
    console.log('📝 Login credentials:');
    console.log('   Admin: admin@carecall.ai / admin123');
    console.log('   Doctor: (any doctor email) / doctor123');
    console.log('   Patient: (any patient email) / patient123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seeder
seedWithConversations();
