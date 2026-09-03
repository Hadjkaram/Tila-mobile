import { apiClient } from "./apiClient";

export interface PatientProfile {
  id?: number | string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  birthdate?: string;
  roles?: string[];
  isVerified?: boolean;
  isActive?: boolean;
  profession?: string;
  [key: string]: any;
}

export interface AppointmentItem {
  id: number | string;
  professional?: string;
  specialty?: string;
  date?: string; // ISO date
  time?: string; // HH:mm
  type?: "video" | "in-person" | string;
  status?: "confirmed" | "pending" | "completed" | "cancelled" | string;
  duration?: number; // Durée en minutes
  meetLink?: string | null;
  meetPassword?: string | null;
  meetingProvider?: string | null; // 'daily', 'google', etc.
  meetingToken?: string | null; // Token pour Daily.co
  meetingId?: string | null; // ID de la réunion (utilisé pour l'endpoint /meeting)
  createdAt?: string; // ISO date
}

export interface AssessmentScore {
  scale: string;
  value: number;
  normalized: number | null;
  interpretation: string;
}

export interface AssessmentAnswerItem {
  questionId: string;
  questionText?: string | null;
  answer: string;
  answerValue?: number;
}

export interface AssessmentItem {
  id: number | string;
  type?: string;
  date?: string; // ISO date
  score?: number; // percentage (0-100) if available
  level?: string;
  interpretation?: string;
  submissionId?: number;
  questionnaireKey?: string;
  scores?: AssessmentScore[];
  answers?: AssessmentAnswerItem[];
  notes?: string | null;
}

export interface TeleconsultationItem {
  id: number | string;
  professional?: string;
  specialty?: string;
  date?: string; // ISO date
  time?: string; // HH:mm
  duration?: string; // e.g., "45 min"
}

export interface PrescriptionLineItem {
  id?: number;
  medication: string;
  posologie: string;
  position?: number;
}

export interface PrescriptionItem {
  id: number;
  status: string;
  notes?: string | null;
  issuedAt?: string | null;
  createdAt?: string | null;
  patientName: string;
  doctorName: string;
  doctorMatricule?: string | null;
  doctorSignatureDataUrl?: string | null;
  lines: PrescriptionLineItem[];
}

export interface PatientConsultationItem {
  id: number;
  kind: string;
  date?: string | null;
  professionalName: string;
  specialty?: string | null;
  mode?: string | null;
  durationMinutes?: number | null;
  motif?: string | null;
  summary?: string | null;
  status?: string | null;
}

export interface PatientFollowUpItem {
  id: number;
  openedAt?: string | null;
  statusLabel: string;
  message: string;
}

export interface PatientConsultationsView {
  consultations: PatientConsultationItem[];
  consultationsTotal: number;
  activeFollowUps: PatientFollowUpItem[];
  upcomingAppointments: Array<{
    id: number;
    date?: string | null;
    time?: string | null;
    status?: string | null;
    professionalName?: string | null;
  }>;
  shortcuts?: {
    ordonnancesTotal?: number;
    evaluationsTotal?: number;
  };
}

/** @deprecated Prefer PatientConsultationsView */
export type PatientDossier = PatientConsultationsView;

class PatientService {
  async me(): Promise<PatientProfile> {
    return apiClient.get<PatientProfile>("/api/patients/me");
  }

  async pastAppointments(page: number = 1, limit: number = 20): Promise<{ items: AppointmentItem[]; total: number; page: number; limit: number }> {
    const params: Record<string, string | number | boolean | undefined> = { page, limit };
    return apiClient.get<{ items: AppointmentItem[]; total: number; page: number; limit: number }>("/api/patients/me/appointments", params);
  }

  async upcomingAppointments(): Promise<AppointmentItem[]> {
    const res = await apiClient.get<any>("/api/patients/me/appointments/upcoming");
    return Array.isArray(res) ? res : (res?.items || []);
  }

  async recentAssessments(): Promise<AssessmentItem[]> {
    const res = await apiClient.get<any>("/api/patients/me/assessments");
    return Array.isArray(res) ? res : (res?.items || []);
  }

  async nextTeleconsultation(): Promise<TeleconsultationItem | null> {
    return apiClient.get<TeleconsultationItem | null>("/api/patient/teleconsultations/next");
  }

  async updateProfile(data: Partial<PatientProfile>): Promise<PatientProfile> {
    return apiClient.put<PatientProfile>("/api/patients/me", data);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return apiClient.put("/api/patients/me/password", {
      currentPassword,
      newPassword,
    });
  }

  async prescriptions(page = 1, limit = 20): Promise<{ items: PrescriptionItem[]; total: number; page: number; limit: number }> {
    return apiClient.get<{ items: PrescriptionItem[]; total: number; page: number; limit: number }>(
      "/api/patients/me/prescriptions",
      { page, limit }
    );
  }

  async prescription(id: number | string): Promise<PrescriptionItem> {
    return apiClient.get<PrescriptionItem>(`/api/patients/me/prescriptions/${id}`);
  }

  async consultations(): Promise<PatientConsultationsView> {
    return apiClient.get<PatientConsultationsView>("/api/patients/me/consultations");
  }

  /** @deprecated Prefer consultations() */
  async dossier(): Promise<PatientConsultationsView> {
    return this.consultations();
  }
}

export const patientService = new PatientService();
