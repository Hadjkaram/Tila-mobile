import { apiClient } from "./apiClient";
export type AdminEvaluationIndicatorStats = any;
export type SearchProfessionalsParams = any;
const normalizeSearchQuery = (q: string) => q;
import { addMinutes, parseISO } from "date-fns";

export interface ProfessionalPrice {
  id?: number;
  durationMin: number;
  amount: number;
  currency: string;
  type: string;
  locationType?: 'video' | 'in_person' | 'both';
}

export interface ProfessionalResponse {
  id: number;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  price: number; // Prix pour slotDuration par défaut
  currency?: string; // Devise du prix par défaut
  prices?: ProfessionalPrice[]; // Tableau des tarifs disponibles
  languages: string[];
  avatar?: string;
  videoConsultation: boolean;
  inPersonConsultation: boolean;
  description?: string;
  experience?: string;
  minDuration: number; // Durée minimale de consultation
  maxDuration: number; // Durée maximale de consultation
  locationTypes: Array<'video' | 'in_person' | 'both'>;
}

export interface Timeslot {
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  duration: number; // minutes
  available: boolean;
  price?: number; // Prix pour cette durée
  locationType: 'video' | 'in_person' | 'both';
}

export interface ProfessionalAvailabilityResponse {
  date: string; // YYYY-MM-DD
  timeslots: Timeslot[];
  locationType: 'video' | 'in_person' | 'both';
  professionalId: number;
  nextAvailableDates: string[]; // Dates disponibles suivantes
}

export interface PatientInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  reason?: string;
  password?: string; // Seulement pour création de compte
}

export interface CreateAppointmentRequest {
  doctorId: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  duration: number;
  patient?: PatientInfo; // Optional when authenticated
  locationType: 'video' | 'in_person' | 'both',
  createAccount?: boolean; // Optional
}

export interface ProfessionalAvailabilityRangeItem {
  date: string;
  timeslots: Timeslot[];
}

export interface ListPatientsParams {
  search?: string;
  page?: number;
  limit?: number;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  pendingOnly?: boolean;
  /** Filtre KPI : haute | critique */
  priority?: "haute" | "critique";
  /** Filtre domaines cliniques (clé indicateur). */
  indicatorKeys?: string[];
}

export interface ProfessionalCreatePatientPayload {
  firstName: string;
  lastName: string;
  birthdate?: string;
  phoneNumber?: string;
  email?: string;
  gender?: string;
  referenceCode?: string;
}

export interface ProfessionalCreatePatientResponse {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  birthdate?: string | null;
  internalPatientCode?: string | null;
  externalPatientCode?: string | null;
  temporaryPassword?: string;
}

export interface ProfessionalPatientItem {
  id: number | string;
  name: string;
  age?: number;
  lastVisit?: string | null;
  nextVisit?: string | null;
  status?: 'active' | 'inactive' | 'urgent';
  stressLevel?: 'Faible' | 'Modéré' | 'Élevé' | 'Très élevé' | string;
  lastAssessmentAt?: string | null;
  indicators?: Array<{
    key: string;
    label: string;
    level?: string | null;
    semanticLevel?: 'good' | 'warning' | 'alert' | string | null;
    interpretation?: string | null;
    value?: number | null;
    denominator?: number | null;
  }>;
  priority?: 'critique' | 'haute' | null;
}

export interface ProfessionalAppointmentItem {
  id: number | string;
  patient: { id: number | string; name: string; email?: string; phone?: string };
  start: string; // ISO
  end: string;   // ISO
  duration: number;
  locationType: 'video' | 'in_person';
  status: 'confirmed' | 'pending' | 'cancelled' | 'missed' | string;
  notes?: string | null;
  meetLink?: string | null;
  meetingId?: string | null;
  meetingProvider?: string | null; // 'daily', 'google', etc.
  meetingToken?: string | null; // Token pour Daily.co
  careEpisodeId?: number | null;
  problemCode?: string | null;
}

export function isPastAppointment(apt: { start?: string; end?: string; duration?: number }): boolean {
  const now = Date.now();
  if (apt.end) {
    try {
      const endDate = parseISO(apt.end);
      return endDate.getTime() < now;
    } catch {
      return false;
    }
  }
  if (apt.start && typeof apt.duration === "number") {
    try {
      const endDate = addMinutes(parseISO(apt.start), apt.duration);
      return endDate.getTime() < now;
    } catch {
      return false;
    }
  }
  return false;
}

export interface AssessmentItem {
  id: number;
  type: string;
  questionnaireKey: string;
  date: string;
  completed: boolean;
  scores?: any[];
  score: number;
}

export interface AssessmentPatientItem {
  id: number;
  name: string;
  email: string;
  phoneNumber?: string;
}

export interface AssessmentGroupItem {
  patient: AssessmentPatientItem;
  assessments: AssessmentItem[];
}

export interface ListAssessmentsParams {
  page?: number;
  limit?: number;
  patientId?: number;
}

export interface AssessmentsResponse {
  items: AssessmentGroupItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ProfessionalDashboardStats {
  assessmentsThisMonth: number;
  assessmentsThisMonthChange?: number; // Pourcentage de changement
  patientsFollowed: number;
  patientsFollowedChange?: number;
  appointmentsThisWeek: number;
  appointmentsThisWeekChange?: number;
  // Champs étendus pour les statistiques détaillées
  totalAssessments?: number;
  totalAssessmentsChange?: number;
  satisfactionRate?: number;
  satisfactionRateChange?: number;
  consultationsThisMonth?: number;
  consultationsThisMonthChange?: number;
  /** Cas en attente (toActor OU toCentre, non reçus). */
  pvvihPendingCount?: number;
  /** Alias dashboard : même périmètre que pvvihPendingCount (acteur ou centre). */
  pendingReferralsToMeCount?: number;
  /** Suivis PVVIH en cours (CareEpisodes actifs avec ce pro comme acteur en charge). */
  pvvihFollowUpsCount?: number;
}

export interface StressByProfessionItem {
  profession: string;
  score: number; // Score moyen de stress (0-10)
  count: number; // Nombre d'évaluations
  trend?: string; // Variation par rapport à la période précédente
}

export interface StressByProfessionResponse {
  items: StressByProfessionItem[];
  total: number;
}

export interface StressByAgeItem {
  range: string; // Ex: "18-25 ans"
  score: number; // Score moyen de stress (0-10)
  percentage: number; // Pourcentage de la population
  count?: number; // Nombre d'évaluations
}

export interface StressByAgeResponse {
  items: StressByAgeItem[];
  total: number;
}

export interface MonthlyTrendItem {
  month: string; // Ex: "Jan", "Fév", etc.
  value: number; // Nombre d'évaluations
  date?: string; // Date ISO pour tri
}

export interface MonthlyTrendResponse {
  items: MonthlyTrendItem[];
  total: number;
}

export interface StatsPeriodParams {
  startDate: string; // Format: YYYY-MM-DD
  endDate: string; // Format: YYYY-MM-DD
}

class ProfessionalService {
  async listProfessionals(
    page: number = 1,
    limit: number = 20,
    filters: Omit<SearchProfessionalsParams, "page" | "limit"> = {},
  ): Promise<{ items: ProfessionalResponse[]; total: number; page: number; limit: number }> {
    return apiClient.get("/api/professionals", { page, limit, status: "approved", ...filters });
  }

  async getProfessionalAvailability(
    professionalId: number, 
    date: string
  ): Promise<ProfessionalAvailabilityResponse> {
    return apiClient.get(
      `/api/professionals/${professionalId}/availability`,
      {
        date
      }
    );
  }

  async getProfessionalAvailabilityRange(
    professionalId: number,
    from: string,
    to: string
  ): Promise<ProfessionalAvailabilityRangeItem[]> {
    return apiClient.get(
      `/api/professionals/${professionalId}/availability/range`,
      {
        from,
        to,
      }
    );
  }

  async listPatients(params: ListPatientsParams = {}): Promise<{
    items: ProfessionalPatientItem[];
    total: number;
    page: number;
    limit: number;
    pendingReferralsCount?: number;
  }> {
    const search = new URLSearchParams();
    if (params.search) search.set("search", params.search);
    if (params.page != null) search.set("page", String(params.page));
    if (params.limit != null) search.set("limit", String(params.limit));
    if (params.dateFrom) search.set("dateFrom", params.dateFrom);
    if (params.dateTo) search.set("dateTo", params.dateTo);
    if (params.pendingOnly) search.set("pendingOnly", "1");
    if (params.priority) search.set("priority", params.priority);
    for (const key of params.indicatorKeys ?? []) {
      if (key) search.append("indicatorKey[]", key);
    }
    const q = search.toString();
    return apiClient.get(`/api/professionals/me/patients${q ? `?${q}` : ""}`);
  }

  async getPatientsIndicatorStats(params: {
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<{
    patientsReceived: number;
    prioriteHaute: number;
    casCritiques: number;
    indicatorStats: AdminEvaluationIndicatorStats;
  }> {
    return apiClient.get('/api/professionals/me/patients/indicator-stats', params as any);
  }

  /**
   * Recherche globale de patients (tous les patients du système), comme pour les agents.
   * Utilisé pour le dépistage : taper au moins 2 caractères pour rechercher.
   */
  async searchPatients(q: string, limit = 20): Promise<ProfessionalPatientItem[]> {
    const normalized = normalizeSearchQuery(q);
    if (!normalized) return [];
    const res = await apiClient.get<{ items: Array<{ id: number; name: string; firstName?: string; lastName?: string }> }>(
      '/api/professionals/me/patients/search',
      { q: normalized, limit: String(limit) }
    );
    const items = res?.items ?? [];
    return items.map((p) => ({ id: p.id, name: p.name ?? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() }));
  }

  async createPatient(payload: ProfessionalCreatePatientPayload): Promise<ProfessionalCreatePatientResponse> {
    return apiClient.post<ProfessionalCreatePatientResponse>('/api/professionals/me/patients', payload);
  }

  async listAppointmentsByDate(params: { date: string; page?: number; limit?: number; status?: string }): Promise<{ items: ProfessionalAppointmentItem[]; total: number; page: number; limit: number }> {
    return apiClient.get('/api/professionals/me/appointments', params as any);
  }

  async listAppointmentsRange(params: { from: string; to: string; page?: number; limit?: number; status?: string }): Promise<{ items: ProfessionalAppointmentItem[]; total: number; page: number; limit: number }> {
    return apiClient.get('/api/professionals/me/appointments', params as any);
  }

  async upcomingAppointments(limit: number = 10): Promise<{ items: ProfessionalAppointmentItem[]; total: number }> {
    return apiClient.get('/api/professionals/me/appointments/upcoming', { limit });
  }

  async getUpcomingAppointments(limit: number = 20): Promise<{ items: ProfessionalAppointmentItem[]; total: number }> {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    return apiClient.get(`/api/appointments/upcoming?${params.toString()}`);
  }

  async bookAppointment(payload: CreateAppointmentRequest): Promise<any> {
    return apiClient.post('/api/appointments/book', payload);
  }

  /** Créer un rendez-vous depuis l’agenda pro (sélection patient + créneau). */
  async createAppointmentFromCalendar(payload: {
    patientId: number | string;
    date: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    title?: string;
    reason?: string;
    locationType?: 'video' | 'in_person';
    /** Rattacher à un suivi existant (optionnel — 1er RDV peut rester sans épisode). */
    careEpisodeId?: number;
    problemCode?: string;
  }): Promise<{ message: string; item: ProfessionalAppointmentItem }> {
    return apiClient.post('/api/professionals/me/appointments', payload);
  }

  /** Générer un lien de téléconsultation pour un rendez-vous. */
  async generateAppointmentMeeting(appointmentId: number | string): Promise<{ message: string; item: ProfessionalAppointmentItem }> {
    return apiClient.post(`/api/professionals/me/appointments/${appointmentId}/generate-meeting`, {});
  }

  async listAssessments(params: ListAssessmentsParams = {}): Promise<AssessmentsResponse> {
    return apiClient.get('/api/professionals/me/assessments', params as any);
  }

  async getDashboardStats(params?: StatsPeriodParams): Promise<ProfessionalDashboardStats> {
    const queryParams = params 
      ? `?startDate=${params.startDate}&endDate=${params.endDate}`
      : '';
    return apiClient.get(`/api/professionals/me/stats/dashboard${queryParams}`);
  }

  async getStressByProfession(params?: StatsPeriodParams): Promise<StressByProfessionResponse> {
    const queryParams = params 
      ? `?startDate=${params.startDate}&endDate=${params.endDate}`
      : '';
    return apiClient.get(`/api/professionals/me/stats/stress-by-profession${queryParams}`);
  }

  async getStressByAge(params?: StatsPeriodParams): Promise<StressByAgeResponse> {
    const queryParams = params 
      ? `?startDate=${params.startDate}&endDate=${params.endDate}`
      : '';
    return apiClient.get(`/api/professionals/me/stats/stress-by-age${queryParams}`);
  }

  async getMonthlyTrend(params?: StatsPeriodParams): Promise<MonthlyTrendResponse> {
    const queryParams = params 
      ? `?startDate=${params.startDate}&endDate=${params.endDate}`
      : '';
    return apiClient.get(`/api/professionals/me/stats/monthly-trend${queryParams}`);
  }

  // Questionnaire management (read-only)
  async listQuestionnaires(): Promise<{
    items: Array<{
      id: string;
      code: string;
      name: string;
      shortName: string;
      description: string;
      instructions: string;
      category: string;
      estimatedDuration: number;
      poles: Array<{ id: number; code: string; name: string }>;
    }>;
    total: number;
  }> {
    return apiClient.get('/api/professionals/me/questionnaires');
  }

  async getQuestionnaire(id: number | string): Promise<{
    id: string;
    code: string;
    name: string;
    shortName: string;
    description: string;
    instructions: string;
    category: string;
    estimatedDuration: number;
    questions: Array<{
      id: string | number;
      text: string;
      options: Array<{ label: string; value: number }>;
      isReversed: boolean;
    }>;
    scoringRule: {
      method: string;
      maxScore: number;
      multiplier?: number;
      reversedItems?: (string | number)[];
      subscales?: Array<{ name: string; itemIds?: number[]; questions?: string[]; description?: string }>;
      scoringMethods?: Array<{
        id?: string;
        name?: string;
        description?: string;
        range?: string;
        calculation?: string;
        questions?: string[];
      }>;
    };
    scoreRanges: Array<{
      min: number;
      max: number;
      level: string;
      label: string;
      description: string;
      recommendation: string;
    }>;
  }> {
    return apiClient.get(`/api/professionals/me/questionnaires/${id}`);
  }

  // Patient details (read-only)
  async getPatientById(patientId: number | string): Promise<{
    id: number | string;
    userId?: number | string;
    firstName: string;
    lastName: string;
    name: string;
    email?: string;
    phoneNumber?: string;
    internalPatientCode?: string | null;
    externalPatientCode?: string | null;
    age?: number;
    birthdate?: string;
    gender?: string;
    status: 'active' | 'inactive';
    lastVisit?: string | null;
    nextVisit?: string | null;
    stressLevel?: string;
    organisation?: { id: number | string; name: string } | null;
    profession?: { id: number | string; name: string } | null;
    residenceLocation?: { id: number | string; name: string } | null;
    createdAt?: string;
    lastLogin?: string;
  }> {
    return apiClient.get(`/api/professionals/me/patients/${patientId}`);
  }

  async getPatientActivity(patientId: number | string, limit = 50): Promise<any[]> {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    return apiClient.get<any[]>(`/api/professionals/me/patients/${patientId}/activities?${params.toString()}`);
  }

  async getPatientAssessments(patientId: number | string, page = 1, limit = 20): Promise<{ items: any[]; page: number; limit: number; total: number }> {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    return apiClient.get(`/api/professionals/me/patients/${patientId}/assessments?${params.toString()}`);
  }

  async getPatientAppointments(patientId: number | string, page = 1, limit = 20): Promise<{ items: any[]; page: number; limit: number; total: number }> {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    return apiClient.get(`/api/professionals/me/patients/${patientId}/appointments?${params.toString()}`);
  }

  /** Cas PVVIH en attente (referrals non reçus vers le pro ou son centre). */
  async getPendingReferrals(params?: { page?: number; limit?: number }): Promise<{
    items: PendingReferralItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    return apiClient.get('/api/professionals/me/referrals/pending', params as any);
  }

  /** Suivis PVVIH en cours (CareEpisodes actifs dont le pro est l'acteur en charge). */
  async getActiveCareEpisodes(params?: { page?: number; limit?: number }): Promise<{
    items: ActiveFollowUpItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    return apiClient.get('/api/professionals/me/care-episodes/active', params as any);
  }

  /** Accepter une orientation (referral → RECEIVED) — ouvre / rattache le dossier clinique. */
  async receiveReferral(referralId: number): Promise<{
    id: number;
    status: string;
    receivedAt: string;
    careEpisodeId?: number | null;
    patientPersonId?: number | null;
    patientName?: string | null;
    protocolRuns?: Array<{
      id: number;
      protocolCode: string;
      protocolTitle: string;
      status: string;
      currentStep?: string | null;
    }>;
    resumeHint?: string;
  }> {
    return apiClient.patch(`/api/professionals/me/referrals/${referralId}/receive`, {});
  }

  /** Contre-référencement : renvoyer le patient vers l'agent ayant référé (CareEpisode current_actor = null). */
  async counterRefer(careEpisodeId: number, payload: { motif: string }): Promise<{ id: number; careEpisodeId: number; message: string }> {
    return apiClient.post(`/api/professionals/me/care-episodes/${careEpisodeId}/counter-refer`, payload);
  }

  /** Suivi longitudinal (ASC / AS / spécialiste). */
  async getSuiviLongitudinal(params?: { page?: number; limit?: number; q?: string }): Promise<{
    items: import('./agent').AgentSuiviLongitudinalItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const search = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (params?.q?.trim()) search.set('q', params.q.trim());
    return apiClient.get(`/api/professionals/me/suivi-longitudinal?${search}`);
  }

  async getSuiviLongitudinalDetail(careEpisodeId: number): Promise<import('./agent').AgentSuiviLongitudinalDetail> {
    return apiClient.get(`/api/professionals/me/suivi-longitudinal/${careEpisodeId}`);
  }

  async createSuiviCheckIn(
    careEpisodeId: number,
    payload: {
      milestone?: string;
      phq9Total?: number;
      notes?: string;
      submissionId?: number;
    },
  ): Promise<{ id: number; at: string; alert: boolean; summary: string }> {
    return apiClient.post(`/api/professionals/me/suivi-longitudinal/${careEpisodeId}/check-ins`, payload);
  }

  async createSuiviReferral(
    careEpisodeId: number,
    payload: {
      motif: string;
      centreId?: number;
      toCentreId?: number;
      professionalId?: number;
      niveauPriorite?: string;
      notes?: string;
      toLevel?: string;
    },
  ): Promise<{ id: number; careEpisodeId: number; motif: string; statut: string }> {
    return apiClient.post(`/api/professionals/me/suivi-longitudinal/${careEpisodeId}/referrals`, payload);
  }

  /** Épisodes de soins ouverts pour un patient (avant création consultation). */
  async getOpenCareEpisodes(patientId: number | string): Promise<{ items: OpenCareEpisodeItem[]; total: number }> {
    return apiClient.get(`/api/professionals/me/patients/${patientId}/care-episodes/open`);
  }

  /** Détail d'un parcours (consultations, orientations, évaluations avec résultats et interprétations). */
  async getCareEpisodeDetail(patientId: number | string, episodeId: number): Promise<CareEpisodeDetail> {
    return apiClient.get(`/api/professionals/me/patients/${patientId}/care-episodes/${episodeId}`);
  }

  /** Timeline patient (évaluations, orientations, consultations). */
  async getPatientTimeline(patientId: number | string, params?: { page?: number; limit?: number }): Promise<{
    items: PatientTimelineEvent[];
    total: number;
    page: number;
    limit: number;
  }> {
    return apiClient.get(`/api/professionals/me/patients/${patientId}/timeline`, params as any);
  }

  /** Détail évaluation pour “Voir plus” (réponses + interprétations). */
  async getPatientAssessmentDetail(patientId: number | string, submissionId: number): Promise<AssessmentDetailResponse> {
    return apiClient.get(`/api/professionals/me/patients/${patientId}/assessments/${submissionId}/detail`);
  }

  /** Détail consultation pour “Voir la consultation” (contenu complet). */
  async getPatientConsultationDetail(
    patientId: number | string,
    encounterId: number
  ): Promise<PatientConsultationDetail> {
    return apiClient.get(`/api/professionals/me/patients/${patientId}/consultations/${encounterId}/detail`);
  }

  /** Clôturer un CareEpisode (optionnellement fin de suivi / guérison). */
  async closeCareEpisode(
    careEpisodeId: number,
    options?: {
      closeReason?: 'RESOLUTION' | 'ADMINISTRATIVE' | 'OTHER';
      abandonInProgressRuns?: boolean;
    }
  ): Promise<{
    id: number;
    status: string;
    closedAt: string | null;
    reason?: string;
    abandonedRunIds?: number[];
    preview?: CareEpisodeClosePreview;
  }> {
    return apiClient.patch(`/api/professionals/me/care-episodes/${careEpisodeId}/close`, options ?? {});
  }

  /** Aperçu avant clôture (protocoles en cours). */
  async getCareEpisodeClosePreview(careEpisodeId: number): Promise<CareEpisodeClosePreview> {
    return apiClient.get(`/api/professionals/me/care-episodes/${careEpisodeId}/close-preview`);
  }

  /** Créer une consultation (Encounter) pour le patient. */
  async createConsultation(patientId: number | string, payload: CreateConsultationPayload): Promise<CreateConsultationResponse> {
    return apiClient.post(`/api/professionals/me/patients/${patientId}/consultations`, payload);
  }

  /** Créer une orientation (Referral) depuis une consultation. */
  async createReferralFromEncounter(encounterId: number, payload: { motif: string; notes?: string; toCentreId?: number; toActorId?: number; fromLevel?: string; toLevel?: string }): Promise<{ id: number; motif: string; status: string }> {
    return apiClient.post(`/api/professionals/me/encounters/${encounterId}/referrals`, payload);
  }

  /** Liste des consultations (Encounters TYPE_CONSULTATION) du professionnel. */
  async listConsultations(params?: { page?: number; limit?: number }): Promise<{
    items: ConsultationListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    return apiClient.get('/api/professionals/me/consultations', params as any);
  }

  async listPrescriptions(params?: { page?: number; limit?: number }): Promise<{
    items: ProfessionalPrescriptionItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    return apiClient.get('/api/professionals/me/prescriptions', params as any);
  }

  async createPrescription(payload: CreatePrescriptionPayload): Promise<ProfessionalPrescriptionItem> {
    return apiClient.post('/api/professionals/me/prescriptions', payload);
  }

}

export interface ProfessionalPrescriptionItem {
  id: number;
  status: string;
  notes?: string | null;
  issuedAt?: string | null;
  createdAt?: string | null;
  patientId?: number | null;
  patientName: string;
  doctorName: string;
  doctorMatricule?: string | null;
  doctorSignatureDataUrl?: string | null;
  careEpisodeId?: number | null;
  protocolRunId?: number | null;
  protocolCode?: string | null;
  protocolTitle?: string | null;
  encounterId?: number | null;
  lines: Array<{
    id?: number;
    medication: string;
    posologie: string;
    position?: number;
  }>;
}

export interface CreatePrescriptionPayload {
  patientId: number;
  lines: Array<{ medication: string; posologie: string }>;
  notes?: string;
  careEpisodeId?: number | null;
  protocolRunId?: number | null;
  signatureDataUrl?: string | null;
}

export interface OpenCareEpisodeItem {
  id: number;
  openedAt: string;
  problemType?: string | null;
  problemCode?: string | null;
  clinicalProblemId?: number | null;
  currentState?: string | null;
  currentActorId?: number | null;
  inProgressProtocolCount?: number;
  completedProtocolCount?: number;
  readyForResolution?: boolean;
}

export interface CareEpisodeClosePreview {
  careEpisodeId: number;
  status: string;
  inProgressCount: number;
  completedCount: number;
  abandonedCount: number;
  totalRuns: number;
  readyForResolution: boolean;
  inProgressRuns: Array<{ id: number; protocolCode: string; status: string }>;
}

export interface CareEpisodeDetail {
  id: number;
  openedAt: string;
  closedAt?: string | null;
  status: string;
  problemType?: string | null;
  problemCode?: string | null;
  clinicalProblemId?: number | null;
  currentState?: string | null;
  currentCareLevel?: string | null;
  encounters: Array<{
    id: number;
    type: string;
    status: string;
    reason?: string | null;
    consultationMode?: string | null;
    durationMinutes?: number | null;
    diagnosis?: string | null;
    clinicalNotes?: string | null;
    summary?: string | null;
    recommendations?: string | null;
    createdAt: string;
    actorName?: string | null;
  }>;
  protocolRuns?: Array<{
    id: number;
    status: string;
    currentStep?: string | null;
    parentRunId?: number | null;
    handoffFromTrigger?: string | null;
    protocolCode: string;
    protocolTitle: string;
    startedAt: string;
    completedAt?: string | null;
  }>;
  referrals: Array<{
    id: number;
    type: string;
    status: string;
    motif: string;
    notes?: string | null;
    toCentreId?: number | null;
    toCentreName?: string | null;
    toActorName?: string | null;
    createdAt: string;
    receivedAt?: string | null;
    acceptedAt?: string | null;
    fromLevel?: string | null;
    toLevel?: string | null;
  }>;
  submissions: Array<{
    id: number;
    questionnaireTitle?: string | null;
    questionnaireKey?: string | null;
    encounterId: number;
    completed?: boolean | null;
    createdAt: string;
    scores: Array<{
      scale?: string | null;
      value?: number | null;
      normalized?: number | null;
      interpretation?: string | null;
      semanticLevel?: string | null;
      denominator?: number | null;
    }>;
  }>;
}

export interface PrescriptionLineInput {
  medication: string;
  posologie: string;
}

export interface PrescriptionInput {
  notes?: string;
  lines: PrescriptionLineInput[];
}

export interface CreateConsultationPayload {
  date?: string;
  type?: string;
  duree?: string;
  motif: string;
  notesCliniques?: string;
  synthese?: string;
  recommandations?: string;
  prochainRdv?: string;
  prochainRdvTime?: string;
  status?: 'draft' | 'finalized';
  /** CONTINUE = réutiliser ACTIVE du problème ; NEW_EPISODE = nouvel épisode (rechute). */
  episodeIntent?: 'CONTINUE' | 'NEW_EPISODE';
  /** Code problème métier (ex. depression). Défaut backend : undifferentiated. */
  problemCode?: string;
  /** @deprecated Préférer episodeIntent + problemCode */
  useExistingEpisodeId?: number;
  submissionIds?: number[];
  prescription?: PrescriptionInput;
  /** Montant facturé pour la consultation (figé sur l'Encounter, sert au reçu). */
  price?: number | string;
  currency?: string;
}

export interface CreateConsultationResponse {
  encounter: { id: number; type: string; status: string; reason?: string; price?: string | null; currency?: string | null; createdAt: string };
  careEpisode: { id: number; status: string; openedAt: string };
  /** True si le créneau du prochain RDV était déjà occupé (RDV non créé, à reprogrammer). */
  prochainRdvOccupied?: boolean;
  /** ID de l'ordonnance créée (null si pas d'ordonnance). */
  prescriptionId?: number | null;
}

export interface ConsultationListItem {
  id: number;
  patientId: number | string | null;
  patientName: string | null;
  reason: string | null;
  status: string;
  consultationMode: string | null;
  durationMinutes: number | null;
  price?: string | null;
  currency?: string | null;
  createdAt: string;
}

/** Réponse GET .../consultations/{id}/detail (champs texte souvent en HTML). */
export interface PatientConsultationDetail {
  id: number;
  type: string;
  status: string;
  actorName: string | null;
  createdAt: string | null;
  consultationMode: string | null;
  durationMinutes: number | null;
  reason: string | null;
  diagnosis: string | null;
  clinicalNotes: string | null;
  summary: string | null;
  recommendations: string | null;
  price?: string | null;
  currency?: string | null;
  /** Présent lorsque l'acte est un point de suivi longitudinal. */
  followUp?: {
    milestone: string | null;
    phq9Total: number | null;
    phq9Max: number;
    submissionId: number | null;
    notes: string | null;
    alert: boolean;
  } | null;
  nextAppointment: {
    id: number;
    date: string | null;
    startTime: string | null;
    locationType: string | null;
    status: string | null;
  } | null;
  evaluations: ConsultationLinkedEvaluation[];
}

export interface ConsultationLinkedEvaluation {
  id: number;
  questionnaireKey: string | null;
  questionnaireTitle: string | null;
  createdAt: string | null;
  completed: boolean | null;
}

export interface PatientTimelineEvent {
  type: "evaluation" | "referral" | "consultation" | "protocol" | string;
  date: string;
  time?: string;
  action: string;
  acteur: string;
  details: string;
  submissionId?: number;
  referralId?: number;
  encounterId?: number;
  careEpisodeId?: number;
  protocolEventId?: number;
  protocolRunId?: number;
  protocolCode?: string;
  protocolEventType?: string;
  status?: string;
  prisEnCharge?: boolean;
}

export interface AssessmentDetailResponse {
  id: number;
  type?: string | null;
  questionnaireKey?: string | null;
  date?: string | null;
  completed?: boolean | null;
  overallScore?: number | null;
  overallDenominator?: number | null;
  scores: Array<{
    scale?: string | null;
    value?: number | null;
    normalized?: number | null;
    interpretation?: string | null;
    semanticLevel?: string | null;
    denominator?: number | null;
  }>;
  answers: Array<{
    questionId: string;
    questionText?: string | null;
    answer?: string | null;
    answerValue?: any;
  }>;
}

export interface PendingReferralItem {
  id: number;
  referralId: number;
  careEpisodeId?: number | null;
  personId?: number | null;
  internalPatientCode?: string | null;
  patientName: string | null;
  submissionId?: number | null;
  motif: string;
  niveauPriorite?: string | null;
  statut: string;
  dateReference: string;
  toCentreName?: string | null;
  toActorName?: string | null;
}

export interface ActiveFollowUpItem {
  id: number;
  careEpisodeId: number;
  patientId?: number | null;
  personId?: number | null;
  internalPatientCode?: string | null;
  patientName: string | null;
  openedAt: string;
  problemType?: string | null;
  inProgressProtocolRuns?: Array<{
    id: number;
    protocolCode: string;
    protocolTitle: string;
    currentStep?: string | null;
  }>;
}

export const professionalService = new ProfessionalService();