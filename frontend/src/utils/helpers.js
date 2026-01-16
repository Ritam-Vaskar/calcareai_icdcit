import { format, parseISO } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return '';
  return format(typeof date === 'string' ? parseISO(date) : date, 'MMM dd, yyyy');
};

export const formatTime = (time) => {
  if (!time) return '';
  return time;
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return format(typeof date === 'string' ? parseISO(date) : date, 'MMM dd, yyyy hh:mm a');
};

export const getStatusColor = (status) => {
  const colors = {
    scheduled: 'badge-info',
    confirmed: 'badge-success',
    rescheduled: 'badge-warning',
    cancelled: 'badge-danger',
    completed: 'badge-success',
    'no-show': 'badge-danger',
    'no-response': 'badge-gray',
    active: 'badge-success',
    inactive: 'badge-gray',
    pending: 'badge-warning',
    failed: 'badge-danger'
  };
  return colors[status] || 'badge-gray';
};

export const formatDuration = (seconds) => {
  if (!seconds) return '0s';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
};

export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

export const downloadCSV = (data, filename) => {
  const blob = new Blob([data], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const truncate = (str, length = 50) => {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
};
