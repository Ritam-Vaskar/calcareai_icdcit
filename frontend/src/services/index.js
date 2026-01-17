import api from './api';

const authService = {
  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  register: async (userData) => {
    const { data } = await api.post('/auth/register', userData);
    return data;
  },

  logout: async () => {
    const { data } = await api.post('/auth/logout');
    return data;
  },

  getMe: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },

  updatePassword: async (currentPassword, newPassword) => {
    const { data } = await api.put('/auth/password', { currentPassword, newPassword });
    return data;
  }
};

const patientService = {
  getPatients: async (params) => {
    const { data } = await api.get('/patients', { params });
    return data;
  },

  getPatient: async (id) => {
    const { data } = await api.get(`/patients/${id}`);
    return data;
  },

  createPatient: async (patientData) => {
    const { data } = await api.post('/patients', patientData);
    return data;
  },

  updatePatient: async (id, patientData) => {
    const { data } = await api.put(`/patients/${id}`, patientData);
    return data;
  },

  deletePatient: async (id) => {
    const { data } = await api.delete(`/patients/${id}`);
    return data;
  },

  getStats: async () => {
    const { data } = await api.get('/patients/stats');
    return data;
  },

  initiateFollowUpCall: async (id) => {
    const { data } = await api.post(`/patients/${id}/followup-call`);
    return data;
  }
};

const doctorService = {
  getDoctors: async (params) => {
    const { data } = await api.get('/doctors', { params });
    return data;
  },

  getDoctor: async (id) => {
    const { data } = await api.get(`/doctors/${id}`);
    return data;
  },

  createDoctor: async (doctorData) => {
    const { data } = await api.post('/doctors', doctorData);
    return data;
  },

  updateDoctor: async (id, doctorData) => {
    const { data } = await api.put(`/doctors/${id}`, doctorData);
    return data;
  },

  deleteDoctor: async (id) => {
    const { data } = await api.delete(`/doctors/${id}`);
    return data;
  },

  getAvailability: async (id) => {
    const { data } = await api.get(`/doctors/${id}/availability`);
    return data;
  },

  updateAvailability: async (id, availability) => {
    const { data } = await api.put(`/doctors/${id}/availability`, availability);
    return data;
  },

  getSlots: async (id, date) => {
    const { data } = await api.get(`/doctors/${id}/slots`, { params: { date } });
    return data;
  }
};

const appointmentService = {
  getAppointments: async (params) => {
    const { data } = await api.get('/appointments', { params });
    return data;
  },

  getAppointment: async (id) => {
    const { data } = await api.get(`/appointments/${id}`);
    return data;
  },

  createAppointment: async (appointmentData) => {
    const { data } = await api.post('/appointments', appointmentData);
    return data;
  },

  updateAppointment: async (id, appointmentData) => {
    const { data } = await api.put(`/appointments/${id}`, appointmentData);
    return data;
  },

  cancelAppointment: async (id, reason) => {
    const { data } = await api.put(`/appointments/${id}/cancel`, {
      cancelledBy: 'admin',
      cancellationReason: reason
    });
    return data;
  },

  rescheduleAppointment: async (id, newDate, newTime) => {
    const { data } = await api.post(`/appointments/${id}/reschedule`, {
      appointmentDate: newDate,
      appointmentTime: newTime
    });
    return data;
  },

  initiateCall: async (id) => {
    const { data } = await api.post(`/appointments/${id}/call`);
    return data;
  },

  getStats: async () => {
    const { data } = await api.get('/appointments/stats');
    return data;
  },

  completeAppointment: async (id, completionData) => {
    const { data } = await api.post(`/appointments/${id}/complete`, completionData);
    return data;
  }
};

const callLogService = {
  getCallLogs: async (params) => {
    const { data } = await api.get('/calls', { params });
    return data;
  },

  getCallLog: async (id) => {
    const { data } = await api.get(`/calls/${id}`);
    return data;
  },

  getAnalytics: async () => {
    const { data } = await api.get('/calls/analytics');
    return data;
  },

  getAIPerformance: async () => {
    const { data } = await api.get('/calls/ai-performance');
    return data;
  },

  exportLogs: async (params) => {
    const response = await api.get('/calls/export', {
      params,
      responseType: 'blob'
    });
    return response.data;
  }
};

const followUpService = {
  getFollowUps: async (params) => {
    const { data } = await api.get('/followups', { params });
    return data;
  },

  getFollowUp: async (id) => {
    const { data } = await api.get(`/followups/${id}`);
    return data;
  },

  createFollowUp: async (followUpData) => {
    const { data } = await api.post('/followups', followUpData);
    return data;
  },

  updateFollowUp: async (id, followUpData) => {
    const { data } = await api.put(`/followups/${id}`, followUpData);
    return data;
  },

  deleteFollowUp: async (id) => {
    const { data } = await api.delete(`/followups/${id}`);
    return data;
  },

  initiateCall: async (id) => {
    const { data } = await api.post(`/followups/${id}/call`);
    return data;
  },

  complete: async (id, completionData) => {
    const { data } = await api.put(`/followups/${id}/complete`, completionData);
    return data;
  },

  getStats: async () => {
    const { data } = await api.get('/followups/stats');
    return data;
  },

  getDue: async () => {
    const { data } = await api.get('/followups/due');
    return data;
  }
};

export {
  authService,
  patientService,
  doctorService,
  appointmentService,
  callLogService,
  followUpService
};
