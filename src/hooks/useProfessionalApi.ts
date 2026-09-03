import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

// --- Profil & Context ---

export const useGetContext = () => {
  return useQuery({
    queryKey: ['proContext'],
    queryFn: async () => {
      const data = await apiClient.get('/api/me/context');
      return data;
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileData: any) => {
      const data = await apiClient.patch('/api/me/profile', profileData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proContext'] });
    },
  });
};

// --- Dashboard (Stats) ---

export const useGetDashboardStats = () => {
  return useQuery({
    queryKey: ['proDashboardStats'],
    queryFn: async () => {
      const data = await apiClient.get('/api/professionals/me/stats/dashboard');
      return data;
    },
  });
};

export const useGetMonthlyTrend = () => {
  return useQuery({
    queryKey: ['proMonthlyTrend'],
    queryFn: async () => {
      const data = await apiClient.get('/api/professionals/me/stats/monthly-trend');
      return data;
    },
  });
};

// --- Forum ---

export const useGetForumCategories = () => {
  return useQuery({
    queryKey: ['forumCategories'],
    queryFn: async () => {
      const data = await apiClient.get('/api/forum/categories');
      return data;
    },
  });
};

export const useGetForumGroups = () => {
  return useQuery({
    queryKey: ['forumGroups'],
    queryFn: async () => {
      const data = await apiClient.get('/api/forum/org-groups');
      return data;
    },
  });
};

export const useGetForumDiscussions = (groupId: string) => {
  return useQuery({
    queryKey: ['forumDiscussions', groupId],
    queryFn: async () => {
      const data = await apiClient.get(`/api/forum/org-groups/${groupId}/discussions`);
      return data;
    },
    enabled: !!groupId,
  });
};

// --- Patients ---

export const useGetMyPatients = () => {
  return useQuery({
    queryKey: ['proPatients'],
    queryFn: async () => {
      const data = await apiClient.get('/api/professionals/me/patients');
      return data;
    },
  });
};

export const useSearchPatients = (query: string) => {
  return useQuery({
    queryKey: ['proPatientSearch', query],
    queryFn: async () => {
      if (!query) return [];
      const data = await apiClient.get(`/api/professionals/me/patients/search?q=${encodeURIComponent(query)}`);
      return data;
    },
    enabled: query.length > 0,
  });
};

// --- Agenda & Consultations ---

export const useGetAppointments = () => {
  return useQuery({
    queryKey: ['proAppointments'],
    queryFn: async () => {
      const data = await apiClient.get('/api/professionals/me/appointments');
      return data;
    },
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (appointmentData: any) => {
      const data = await apiClient.post('/api/professionals/me/appointments', appointmentData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proAppointments'] });
    },
  });
};

// --- Téléconsultation (Visio) ---

export const useGetUpcomingTeleconsultations = () => {
  return useQuery({
    queryKey: ['proUpcomingTeleconsultations'],
    queryFn: async () => {
      // Typically we'd filter or the backend provides a filtered list for upcoming appointments
      const data = await apiClient.get('/api/professionals/me/appointments');
      return data;
    },
  });
};

export const useGenerateDailyRoom = () => {
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const data = await apiClient.post(`/api/professionals/me/appointments/${appointmentId}/generate-meeting`);
      return data;
    },
  });
};

export const useStartSession = () => {
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const data = await apiClient.post('/api/appointments/session-started', { appointmentId });
      return data;
    },
  });
};

export const useGetMeetingDetails = (appointmentId: string) => {
  return useQuery({
    queryKey: ['meetingDetails', appointmentId],
    queryFn: async () => {
      const data = await apiClient.get(`/api/appointments/${appointmentId}/meeting`);
      return data;
    },
    enabled: !!appointmentId,
  });
};

// --- Orientation & Référencement ---

export const useGetCenters = () => {
  return useQuery({
    queryKey: ['healthCenters'],
    queryFn: async () => {
      const data = await apiClient.get('/api/ong/centres');
      return data;
    },
  });
};

export const useGetAgents = () => {
  return useQuery({
    queryKey: ['healthAgents'],
    queryFn: async () => {
      // Endpoint to be confirmed for agents, using /api/professionals/agents for now
      const data = await apiClient.get('/api/professionals/agents');
      return data;
    },
  });
};

