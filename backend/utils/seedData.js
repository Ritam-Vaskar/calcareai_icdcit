require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const FollowUp = require('../models/FollowUp');
const CallLog = require('../models/CallLog');

// Connect to database
connectDB();

// Seed data
const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Patient.deleteMany({});
    await Doctor.deleteMany({});
    await Appointment.deleteMany({});
    await FollowUp.deleteMany({});
    await CallLog.deleteMany({});

    console.log('✅ Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@carecall.ai',
      password: 'admin123',
      role: 'admin',
      phone: '+1234567890'
    });

    // Create staff user
    const staffUser = await User.create({
      name: 'Staff User',
      email: 'staff@carecall.ai',
      password: 'staff123',
      role: 'staff',
      phone: '+1234567891'
    });

    console.log('✅ Created users');

    // Create doctors
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
          saturday: { isAvailable: false, slots: [] },
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
        rating: 4.9,
        status: 'active',
        availability: {
          monday: { isAvailable: true, slots: [{ startTime: '08:00', endTime: '16:00' }] },
          tuesday: { isAvailable: true, slots: [{ startTime: '08:00', endTime: '16:00' }] },
          wednesday: { isAvailable: true, slots: [{ startTime: '08:00', endTime: '16:00' }] },
          thursday: { isAvailable: true, slots: [{ startTime: '08:00', endTime: '16:00' }] },
          friday: { isAvailable: true, slots: [{ startTime: '08:00', endTime: '16:00' }] },
          saturday: { isAvailable: true, slots: [{ startTime: '09:00', endTime: '13:00' }] },
          sunday: { isAvailable: false, slots: [] }
        }
      }
    ]);

    console.log('✅ Created doctors');

    // Create patients
    const patients = await Patient.create([
      {
        name: 'John Smith',
        phone: '+1234567895',
        email: 'john.smith@email.com',
        age: 45,
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
          conditions: ['Hypertension'],
          allergies: ['Penicillin'],
          medications: ['Lisinopril'],
          bloodGroup: 'O+'
        },
        assignedDoctor: doctors[0]._id,
        status: 'active'
      },
      {
        name: 'Maria Garcia',
        phone: '+1234567896',
        email: 'maria.garcia@email.com',
        age: 62,
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
          conditions: ['Diabetes Type 2'],
          allergies: [],
          medications: ['Metformin'],
          bloodGroup: 'A+'
        },
        assignedDoctor: doctors[2]._id,
        status: 'active'
      },
      {
        name: 'Raj Patel',
        phone: '+1234567897',
        email: 'raj.patel@email.com',
        age: 38,
        gender: 'male',
        language: 'hindi',
        address: {
          street: '789 Park Blvd',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001',
          country: 'India'
        },
        medicalHistory: {
          conditions: [],
          allergies: [],
          medications: [],
          bloodGroup: 'B+'
        },
        assignedDoctor: doctors[1]._id,
        status: 'active'
      },
      {
        name: 'Emily Johnson',
        phone: '+1234567898',
        email: 'emily.johnson@email.com',
        age: 29,
        gender: 'female',
        language: 'english',
        address: {
          street: '321 Elm St',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
          country: 'USA'
        },
        medicalHistory: {
          conditions: [],
          allergies: ['Latex'],
          medications: [],
          bloodGroup: 'AB+'
        },
        assignedDoctor: doctors[2]._id,
        status: 'active'
      }
    ]);

    console.log('✅ Created patients');

    // Create appointments
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const appointments = await Appointment.create([
      {
        patient: patients[0]._id,
        doctor: doctors[0]._id,
        appointmentDate: tomorrow,
        appointmentTime: '10:00',
        duration: 30,
        type: 'consultation',
        status: 'scheduled',
        reason: 'Blood pressure checkup',
        symptoms: ['High BP', 'Headache']
      },
      {
        patient: patients[1]._id,
        doctor: doctors[2]._id,
        appointmentDate: tomorrow,
        appointmentTime: '11:00',
        duration: 30,
        type: 'follow-up',
        status: 'confirmed',
        reason: 'Diabetes follow-up',
        confirmationMethod: 'ai-call'
      },
      {
        patient: patients[2]._id,
        doctor: doctors[1]._id,
        appointmentDate: nextWeek,
        appointmentTime: '14:00',
        duration: 45,
        type: 'consultation',
        status: 'scheduled',
        reason: 'Knee pain consultation'
      },
      {
        patient: patients[3]._id,
        doctor: doctors[2]._id,
        appointmentDate: nextWeek,
        appointmentTime: '09:00',
        duration: 30,
        type: 'routine-checkup',
        status: 'scheduled',
        reason: 'Annual checkup'
      }
    ]);

    console.log('✅ Created appointments');

    // Create follow-ups
    const followUps = await FollowUp.create([
      {
        patient: patients[1]._id,
        doctor: doctors[2]._id,
        appointment: appointments[1]._id,
        type: 'chronic-care',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'scheduled',
        priority: 'high',
        purpose: 'Monitor blood sugar levels',
        questions: [
          { question: 'How are you feeling today?', answerType: 'text' },
          { question: 'Have you been taking your medications regularly?', answerType: 'yes-no' },
          { question: 'What is your current blood sugar reading?', answerType: 'text' }
        ]
      },
      {
        patient: patients[0]._id,
        doctor: doctors[0]._id,
        type: 'post-visit',
        scheduledDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
        status: 'scheduled',
        priority: 'medium',
        purpose: 'Post-consultation check-in',
        questions: [
          { question: 'How are you feeling after the consultation?', answerType: 'text' },
          { question: 'Are you experiencing any side effects from medication?', answerType: 'yes-no' }
        ]
      }
    ]);

    console.log('✅ Created follow-ups');

    // Create sample call logs
    const callLogs = await CallLog.create([
      {
        callId: 'call_demo_001',
        patient: patients[1]._id,
        appointment: appointments[1]._id,
        callType: 'appointment-confirmation',
        status: 'completed',
        duration: 120,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 24 * 60 * 60 * 1000 + 120000),
        transcript: 'Hello! This is CareCall AI. May I speak with Maria Garcia? ... Yes, I can confirm your appointment tomorrow at 11:00 AM with Dr. Priya Sharma.',
        intent: {
          detected: 'confirm',
          confidence: 0.95
        },
        sentiment: 'positive',
        sentimentScore: 0.8,
        outcome: 'appointment-confirmed',
        language: 'english',
        cost: 0.10
      },
      {
        callId: 'call_demo_002',
        patient: patients[0]._id,
        appointment: appointments[0]._id,
        callType: 'appointment-reminder',
        status: 'completed',
        duration: 90,
        startTime: new Date(Date.now() - 12 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 12 * 60 * 60 * 1000 + 90000),
        transcript: 'Good morning! This is a reminder for your appointment tomorrow at 10:00 AM with Dr. Sarah Johnson.',
        intent: {
          detected: 'confirm',
          confidence: 0.88
        },
        sentiment: 'neutral',
        sentimentScore: 0.1,
        outcome: 'appointment-confirmed',
        language: 'english',
        cost: 0.08
      }
    ]);

    console.log('✅ Created call logs');

    // Update appointment with call logs
    appointments[1].aiCallLog = callLogs[0]._id;
    await appointments[1].save();

    appointments[0].aiCallLog = callLogs[1]._id;
    await appointments[0].save();

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   Doctors: ${await Doctor.countDocuments()}`);
    console.log(`   Patients: ${await Patient.countDocuments()}`);
    console.log(`   Appointments: ${await Appointment.countDocuments()}`);
    console.log(`   Follow-ups: ${await FollowUp.countDocuments()}`);
    console.log(`   Call Logs: ${await CallLog.countDocuments()}`);
    console.log('\n🔑 Login Credentials:');
    console.log('   Admin: admin@carecall.ai / admin123');
    console.log('   Staff: staff@carecall.ai / staff123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seed
seedData();
