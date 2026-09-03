import { apiClient } from "./apiClient";
const normalizeSearchQuery = (q: string) => q;
export interface ScaleLabel {
  value: number;
  label: string;
}

export interface Scale {
  type: string;
  labels: ScaleLabel[];
}

export interface QuestionItem {
  id: string;
  number?: number;
  text: string;
  required?: boolean;
  dimension?: string;
  reverse_scoring?: boolean;
  scale?: string;
  scale_labels?: Array<{ value: number; label: string }>;
  scale_type?: string;
  scoring?: Record<string, number>;
  section_title?: string;
  domain?: string;
  subcategory?: string;
  conditional?: boolean;
  condition?: string;
}

export interface Section {
  id: string;
  title: string;
  items: QuestionItem[];
}

export interface QuestionnaireDetail {
  id: string;
  name: string;
  description: string;
  instructions?: string;
  type?: string;
  scale?: Scale;
  scales?: Record<string, { labels?: Array<{ value: number; label: string }> }>;
  sections?: Section[];
}

export type Questionnaire = QuestionnaireDetail;

export interface AgentQuestionnaireItem {
  id?: string;
  key: string;
  code?: string;
  name: string;
  shortName?: string;
  title?: string;
  description?: string;
  category?: string;
  estimatedDuration?: number;
}

export interface SubmissionScore {
  scale: string;
  label?: string;
  value: number;
  normalized?: number | null;
  interpretation: string;
  severityLabel?: string | null;
  denominator?: number;
  semanticLevel?: string;
  domain?: string;
  domainName?: string;
  type?: string;
  questionId?: string;
}

export interface SubmissionResponse {
  success: boolean;
  message?: string;
  submissionId: number;
  patientId: number;
  scores: SubmissionScore[];
  overallScore?: number;
  overallDenominator?: number;
  evaluationToken?: string;
  indicators?: Array<{
    key: string;
    label: string;
    level?: string | null;
    semanticLevel?: string | null;
    interpretation?: string | null;
  }>;
}

export interface AgentPatient {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phoneNumber: string | null;
  birthdate: string | null;
  /** Internal patient code (system-generated). */
  internalPatientCode?: string | null;
  /** External patient code (e.g. file number). */
  externalPatientCode?: string | null;
}

export interface AgentCentre {
  id: number;
  name: string;
  description?: string | null;
  careLevel?: "ESPC" | "HG" | "CHR" | "CHU" | null;
}

export interface AgentPatientCreatePayload {
  firstName: string;
  lastName: string;
  birthdate?: string;
  phoneNumber?: string;
  email?: string;
  gender?: string;
  referenceCode?: string;
}

/** Réponse quand l'email existe déjà (compte patient) : proposer de continuer avec ce patient. */
export interface AgentCreatePatientEmailExistsResponse {
  emailAlreadyExists: true;
  existingPatient: AgentPatient;
}

export type AgentCreatePatientResponse =
  | (AgentPatient & { temporaryPassword?: string })
  | AgentCreatePatientEmailExistsResponse;

export interface AgentSubmissionItem {
  id: number;
  patientId: number | null;
  patientName: string | null;
  questionnaireKey: string | null;
  questionnaireTitle: string | null;
  centre: string | null;
  createdAt: string;
  completed: boolean | null;
}

export interface AgentReferralItem {
  id: number;
  submissionId: number | null;
  /** Person id (pour fiche patient / protocoles). */
  personId?: number | null;
  internalPatientCode: string | null;
  patientName: string | null;
  centre: string | null;
  dateDepistage: string;
  dateReference: string;
  motif: string;
  niveauPriorite: string;
  statut: string;
  specialiste: string | null;
  professionalId: number | null;
  referredToCentreId?: number | null;
  referredToCentreName?: string | null;
  notes: string | null;
}

/** Orientation adressée au centre de l'agent (à prendre en charge, ou déjà prise en charge — flow 2). */
export interface AgentPendingReferralItem {
  id: number;
  referralId: number;
  personId: number | null;
  patientName: string | null;
  submissionId: number | null;
  /** Dossier de soins ouvert à l'acceptation (permet d'ouvrir directement le dossier). */
  careEpisodeId?: number | null;
  motif: string;
  niveauPriorite: string;
  statut: string;
  dateReference: string;
  receivedAt?: string | null;
  acceptedByName?: string | null;
  referredToCentreName: string | null;
}

/** Indicateur d'évaluation (aligné liste patients spécialiste). */
export interface AgentPatientIndicator {
  key: string;
  label: string;
  level?: string | null;
  semanticLevel?: "good" | "warning" | "alert" | string | null;
  interpretation?: string | null;
  value?: number | null;
  denominator?: number | null;
}

/** Patient reçu (liste paginée) : date reçue, référence/orientation éventuelle. */
export interface AgentReceivedPatientItem {
  id: number;
  firstName: string;
  lastName: string;
  receivedAt: string;
  submissionId: number;
  referral: {
    type: "centre" | "professional";
    motif: string;
    referredToName: string | null;
    niveauPriorite?: string | null;
    /** Cas orienté vers mon centre (agent de santé) : afficher « Accepter l'orientation ». */
    pendingForMyCentre?: boolean;
    referralId?: number;
    personId?: number;
    dateReference?: string;
  } | null;
  indicators?: AgentPatientIndicator[];
}

export interface AgentPoolAppointment {
  id: number;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  duration: number | null;
  locationType: "video" | "in_person" | null;
  status: string | null;
  patient: { id: number; firstName: string | null; lastName: string | null } | null;
  doctor: { id: number; firstName: string | null; lastName: string | null } | null;
  meetingLink: string | null;
  externalMeetingLink: string | null;
  meetingId: string | null;
  meetingProvider: string | null;
  reason: string | null;
}

export interface AgentReceivedPatientsStats {
  total: number;
  orientes: number;
  referes: number;
  /** Nombre de patients dont la dernière soumission n'a pas d'orientation/référence (aligné avec la liste). */
  nonOrientes?: number;
}

export const agentService = {
  async getPatient(id: number): Promise<AgentPatient> {
    return apiClient.get(`/api/agent/patients/${id}`);
  },

  async searchPatients(q: string, limit = 20): Promise<AgentPatient[]> {
    const normalized = normalizeSearchQuery(q);
    if (!normalized) return [];
    const params = new URLSearchParams({ q: normalized, limit: String(limit) });
    const res = await apiClient.get<{ items: AgentPatient[] }>(`/api/agent/patients?${params}`);
    return res.items ?? [];
  },

  async createPatient(payload: AgentPatientCreatePayload): Promise<AgentCreatePatientResponse> {
    return apiClient.post<AgentCreatePatientResponse>("/api/agent/patients", payload);
  },

  async getCentres(q?: string, limit = 50): Promise<AgentCentre[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (q?.trim()) params.set("q", q.trim());
    const res = await apiClient.get<{ items: AgentCentre[] }>(`/api/agent/centres?${params}`);
    return res.items ?? [];
  },

  /** Liste des questionnaires disponibles pour l'agent. */
  async getQuestionnaires(): Promise<AgentQuestionnaireItem[]> {
    return apiClient.get<AgentQuestionnaireItem[]>("/api/agent/questionnaires");
  },

  /** Résout la clé canonique du questionnaire reconnue par Symfony */
  canonicalKey(key: string): string {
    const k = (key || '').toLowerCase().trim();
    if (k === 'berger' || k === 'berger-vih' || k === 'berger_scale' || k === 'berger-hiv-stigma') return 'berger-hiv-stigma';
    if (k === 'ods' || k === 'bmh-mwt' || k === 'bmh_mwt') return 'bmh_mwt';
    if (k === 'sdq' || k === 'sdq-terrain') return 'sdq';
    if (k === 'pcl5' || k === 'pcl-5' || k === 'pcl5-terrain' || k === 'pcl-5-terrain') return 'pcl-5-terrain';
    return key;
  },

  /** Récupère un questionnaire par clé (route agent avec fallback universel /api/questionnaires/{key}). */
  async getQuestionnaireByKey(key: string): Promise<Questionnaire> {
    const effectiveKey = this.canonicalKey(key);
    try {
      const res = await apiClient.get<Questionnaire>(`/api/agent/questionnaires/${encodeURIComponent(effectiveKey)}`);
      if (res && (res.sections?.length || (res as any).bloc2_questions?.all_questions?.length || (res as any).questions?.length)) {
        return res;
      }
    } catch {}
    return apiClient.get<Questionnaire>(`/api/questionnaires/${encodeURIComponent(effectiveKey)}`);
  },

  /** Soumet les réponses d'un dépistage. */
  async submitEvaluation(
    questionnaireKey: string,
    payload: {
      patientId: number;
      answers: Record<string, number | string>;
      centre?: string;
      centreId?: number;
      referralId?: number;
      userInfo?: Record<string, any>;
    }
  ): Promise<SubmissionResponse> {
    const effectiveKey = this.canonicalKey(questionnaireKey);
    const body: Record<string, unknown> = {
      questionnaireKey: effectiveKey,
      answers: payload.answers,
      userInfo: payload.userInfo || {},
      patientId: payload.patientId,
    };
    if (payload.centreId != null) {
      body.centreId = payload.centreId;
    } else if (payload.centre != null && payload.centre !== "") {
      body.centre = payload.centre;
    }
    if (payload.referralId != null) {
      body.referralId = payload.referralId;
    }
    return apiClient.post<SubmissionResponse>("/api/questionnaires/submission", body);
  },

  async getSubmissions(params?: { page?: number; limit?: number; dateFrom?: string; dateTo?: string }): Promise<{
    items: AgentSubmissionItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const search = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
    if (params?.dateTo) search.set("dateTo", params.dateTo);
    const res = await apiClient.get<{ items: AgentSubmissionItem[]; total: number; page: number; limit: number }>(
      `/api/agent/submissions?${search}`
    );
    return {
      items: res.items ?? [],
      total: res.total ?? 0,
      page: res.page ?? page,
      limit: res.limit ?? limit,
    };
  },

  /** Tableau de bord individuel "Agent Terrain Migrant" (soumissions pcl-5-terrain / sdq-terrain de l'agent connecté). */
  async getMigrantsDashboard(params?: {
    dateFrom?: string;
    dateTo?: string;
    site?: string;
    sexe?: string;
    ageBucket?: string;
  }): Promise<AgentMigrantsDashboard> {
    const search = new URLSearchParams();
    if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
    if (params?.dateTo) search.set("dateTo", params.dateTo);
    if (params?.site && params.site !== "tous") search.set("site", params.site);
    if (params?.sexe && params.sexe !== "tous") search.set("sexe", params.sexe);
    if (params?.ageBucket && params.ageBucket !== "tous") search.set("ageBucket", params.ageBucket);
    const qs = search.toString();
    return apiClient.get<AgentMigrantsDashboard>(`/api/agent/migrants/dashboard${qs ? `?${qs}` : ""}`);
  },

  async getReferrals(params?: { page?: number; limit?: number; dateFrom?: string; dateTo?: string; type?: 'centre' | 'professional' }): Promise<{
    items: AgentReferralItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const search = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
    if (params?.dateTo) search.set("dateTo", params.dateTo);
    if (params?.type) search.set("type", params.type);
    const res = await apiClient.get<{ items: AgentReferralItem[]; total: number; page: number; limit: number }>(
      `/api/agent/referrals?${search}`
    );
    return {
      items: res.items ?? [],
      total: res.total ?? 0,
      page: res.page ?? page,
      limit: res.limit ?? limit,
    };
  },

  /** `status: "received"` = orientations déjà prises en charge par mon centre. */
  async getPendingReferralsForCentre(params?: {
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
    status?: "pending" | "received";
  }): Promise<{
    items: AgentPendingReferralItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const search = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
    if (params?.dateTo) search.set("dateTo", params.dateTo);
    if (params?.status) search.set("status", params.status);
    const res = await apiClient.get<{
      items: AgentPendingReferralItem[];
      total: number;
      page: number;
      limit: number;
    }>(`/api/agent/referrals/pending-for-centre?${search}`);
    return {
      items: res.items ?? [],
      total: res.total ?? 0,
      page: res.page ?? page,
      limit: res.limit ?? limit,
    };
  },

  async getReceivedPatients(params: { page?: number; limit?: number; dateFrom?: string; dateTo?: string }): Promise<{
    items: AgentReceivedPatientItem[];
    total: number;
    page: number;
    limit: number;
    stats: AgentReceivedPatientsStats;
  }> {
    const { page = 1, limit = 20, dateFrom, dateTo } = params;
    const search = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (dateFrom) search.set("dateFrom", dateFrom);
    if (dateTo) search.set("dateTo", dateTo);
    const res = await apiClient.get<{
      items: AgentReceivedPatientItem[];
      total: number;
      page: number;
      limit: number;
      stats: AgentReceivedPatientsStats;
    }>(`/api/agent/received-patients?${search}`);
    return {
      items: res.items ?? [],
      total: res.total ?? 0,
      page: res.page ?? page,
      limit: res.limit ?? limit,
      stats: res.stats ?? { total: res.total ?? 0, orientes: 0, referes: 0, nonOrientes: undefined },
    };
  },

  async getSubmissionResult(submissionId: number): Promise<AgentSubmissionResult> {
    return apiClient.get<AgentSubmissionResult>(`/api/agent/submissions/${submissionId}/result`);
  },

  /** Résultat de la soumission liée à une orientation (cas orienté vers mon centre). */
  async getReferralSubmissionResult(referralId: number): Promise<AgentSubmissionResult> {
    return apiClient.get<AgentSubmissionResult>(`/api/agent/referrals/${referralId}/submission-result`);
  },

  /**
   * Marquer une orientation comme reçue (flow 2 — agent de santé prend en charge).
   * Referral.status = RECEIVED ; le cas disparaît de la liste "en attente" des autres agents du centre.
   */
  async receiveReferral(referralId: number): Promise<{
    id: number;
    status: string;
    receivedAt: string;
    careEpisodeId?: number | null;
  }> {
    return apiClient.patch(`/api/agent/referrals/${referralId}/receive`);
  },

  /** Suivi longitudinal : dossiers ouverts liés à l'agent (orientation / contre-réf / acteur). */
  async getSuiviLongitudinal(params?: { page?: number; limit?: number; q?: string }): Promise<{
    items: AgentSuiviLongitudinalItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const search = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (params?.q?.trim()) search.set("q", params.q.trim());
    return apiClient.get(`/api/agent/suivi-longitudinal?${search}`);
  },

  async getSuiviLongitudinalDetail(careEpisodeId: number): Promise<AgentSuiviLongitudinalDetail> {
    return apiClient.get(`/api/agent/suivi-longitudinal/${careEpisodeId}`);
  },

  async createSuiviCheckIn(
    careEpisodeId: number,
    payload: {
      milestone?: string;
      phq9Total?: number;
      notes?: string;
      submissionId?: number;
      symptomScore?: number;
      adherence?: number;
      mood?: "amelioration" | "stable" | "aggravation";
      sideEffects?: string[];
    },
  ): Promise<{ id: number; at: string; alert: boolean; summary: string }> {
    return apiClient.post(`/api/agent/suivi-longitudinal/${careEpisodeId}/check-ins`, payload);
  },

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
    return apiClient.post(`/api/agent/suivi-longitudinal/${careEpisodeId}/referrals`, payload);
  },

  /** Historique du patient (tests, orientations/références) pour la timeline. */
  async getSubmissionHistory(submissionId: number): Promise<AgentSubmissionHistoryResponse> {
    return apiClient.get<AgentSubmissionHistoryResponse>(`/api/agent/submissions/${submissionId}/history`);
  },

  /** Liste des RDV visibles par l'agent (pool + RDV de son centre, y compris ceux assignés à un spécialiste). */
  async listAppointments(params: {
    onlyVideo?: boolean;
    upcoming?: boolean;
    limit?: number;
    /** Person id du patient (filtre optionnel). */
    patientId?: number;
    careEpisodeId?: number;
  } = {}): Promise<{
    items: AgentPoolAppointment[];
    total: number;
  }> {
    const qs = new URLSearchParams();
    if (params.onlyVideo) qs.set("onlyVideo", "1");
    if (params.upcoming !== undefined) qs.set("upcoming", params.upcoming ? "1" : "0");
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.patientId != null) qs.set("patientId", String(params.patientId));
    if (params.careEpisodeId != null) qs.set("careEpisodeId", String(params.careEpisodeId));
    const s = qs.toString();
    return apiClient.get(`/api/agent/appointments${s ? "?" + s : ""}`);
  },

  /**
   * Crée un rendez-vous : si `doctorId` fourni, assigné au spécialiste choisi ;
   * sinon "pool" visible par tous les spécialistes.
   */
  async createAppointment(payload: {
    patientId: number | string;
    date: string;            // YYYY-MM-DD
    startTime: string;       // HH:mm
    endTime?: string;        // HH:mm (optionnel)
    duration?: number;       // minutes (défaut 30)
    title?: string;
    reason?: string;
    locationType?: "video" | "in_person";
    doctorId?: number | null; // Person ID du spécialiste cible
    careEpisodeId?: number;
  }): Promise<{
    message: string;
    item: {
      id: number; date: string; startTime: string; endTime: string; duration: number;
      patient: { id: number; firstName: string | null; lastName: string | null };
      locationType: "video" | "in_person" | null;
      status: string;
      meetingLink?: string | null;
      externalMeetingLink?: string | null;
      meetingProvider?: string | null;
      doctor?: { id: number; firstName: string | null; lastName: string | null } | null;
    };
  }> {
    return apiClient.post("/api/agent/appointments", payload);
  },

  /** Liste des créneaux 10 min pour le centre de l'agent à une date donnée. */
  async listAppointmentSlots(date: string): Promise<{
    date: string;
    centre: { id: number; name: string | null };
    slotDurationMinutes: number;
    openingHours: { start: string; end: string };
    slots: Array<{ time: string; available: boolean }>;
  }> {
    return apiClient.get(`/api/agent/appointments/slots?date=${encodeURIComponent(date)}`);
  },

  /** Liste des spécialistes santé mentale (pour attribution d'un RDV ou d'une référence). */
  async listSpecialists(q?: string, limit = 30): Promise<{
    items: Array<{
      id: number;
      firstName: string | null;
      lastName: string | null;
      name: string;
      speciality: string | null;
    }>;
  }> {
    const qs = new URLSearchParams();
    if (q && q.trim()) qs.set("q", q.trim());
    qs.set("limit", String(limit));
    return apiClient.get(`/api/agent/professionals?${qs.toString()}`);
  },
};

/** Résultat d'une soumission (scores + référence éventuelle) pour détail. */
export interface AgentSubmissionResult {
  submissionId: number;
  questionnaireKey: string;
  type?: string | null;
  date?: string | null;
  scores: Array<{
    scale: string;
    label?: string | null;
    value?: number | null;
    denominator?: number | null;
    normalized?: number | null;
    interpretation?: string | null;
    severityLabel?: string | null;
    semanticLevel?: string | null;
    domain?: string;
    domainName?: string;
    subdomain?: string;
    subdomainName?: string;
    type?: string;
  }>;
  overallScore?: number | null;
  overallDenominator?: number | null;
  answers?: Array<{
    questionId?: string;
    questionText?: string | null;
    answer?: string | null;
    answerValue?: unknown;
  }>;
  referral: {
    type: "centre" | "professional";
    motif: string;
    niveauPriorite: string;
    referredToName: string | null;
    notes: string | null;
  } | null;
}

/** Événement de l'historique patient (timeline). */
export interface AgentSubmissionHistoryEvent {
  type: "evaluation" | "referral";
  submissionId?: number;
  referralId?: number;
  questionnaireKey?: string;
  questionnaireLabel?: string;
  date: string;
  time: string;
  action: string;
  acteur: string;
  details: string;
  referredToName?: string;
  motif?: string;
  priority?: string;
}

export interface AgentSuiviLongitudinalItem {
  id: number;
  careEpisodeId: number;
  patientId?: number | null;
  personId?: number | null;
  internalPatientCode?: string | null;
  patientName: string | null;
  openedAt: string | null;
  problemType?: string | null;
  problemCode?: string | null;
  currentState?: string | null;
  currentCareLevel?: string | null;
  hasProtocol: boolean;
  inProgressProtocolRuns: Array<{
    id: number;
    protocolCode: string;
    protocolTitle: string;
    currentStep?: string | null;
  }>;
  checkInCount: number;
  lastCheckInAt?: string | null;
  alert: boolean;
  isCurrentActor: boolean;
}

export interface AgentSuiviCheckIn {
  id: number;
  at: string | null;
  performedBy: string | null;
  milestone?: string | null;
  phq9Total?: number | null;
  submissionId?: number | null;
  symptomScore: number | null;
  adherence: number | null;
  mood: string | null;
  sideEffects: string[];
  notes: string | null;
  alert: boolean;
}

export interface AgentSuiviLongitudinalDetail extends AgentSuiviLongitudinalItem {
  checkIns: AgentSuiviCheckIn[];
  protocolSuiviVisits: Array<{
    runId: number;
    careEpisodeId?: number | null;
    protocolCode: string;
    protocolTitle?: string | null;
    id?: string | null;
    milestone?: string | null;
    phq9Total?: number | null;
    notes?: string | null;
    at?: string | null;
  }>;
  referrals: Array<{
    id: number;
    type: string;
    status: string;
    motif: string;
    toCentreName?: string | null;
    toActorName?: string | null;
    createdAt?: string | null;
    pendingForMe?: boolean;
  }>;
}

export interface AgentSubmissionHistoryResponse {
  events: AgentSubmissionHistoryEvent[];
}

export interface AgentMigrantsDashboardMeta {
  dateFrom: string | null;
  dateTo: string | null;
  availableSites: string[];
}

export interface AgentIndicateurClinique {
  key: string;
  label: string;
  femmes: number;
  hommes: number;
  total: number;
  tauxPct: number;
}

export interface AgentEvenementExposition {
  key: string;
  label: string;
  vecuCount: number;
  pct: number;
}

export interface AgentMigrantsDashboard {
  meta: AgentMigrantsDashboardMeta;
  stats: {
    personnesEvaluees: number;
    enfantsEvalues: number;
    adultesAdosEvalues: number;
    fichesCompletes: number;
    fichesCompletesPct: number;
    casAOrienterEnPriorite: number;
    trendVsHier: number;
  };
  repartitionSexe: { homme: number; femme: number; autre: number };
  repartitionAge: Record<string, number>;
  sdqDistribution: { normal: number; limite: number; anormal: number };
  depressionDistribution: {
    absence: number;
    mineurs: number;
    mineure: number;
    moderee: number;
    severe: number;
  };
  alertes: {
    tspt: number;
    ideationSuicidaire: number;
    symptomePsychotique: number;
    sdqAnormal: number;
    fichesIncompletes: number;
  };
  indicateursCliniques: AgentIndicateurClinique[];
  expositionEvenements: AgentEvenementExposition[];
  detail: {
    parTrancheAgeEtSexe: Record<string, { filles_femmes: number; garcons_hommes: number; total: number }>;
    casPrioritairesParSexe: Record<string, Record<string, number>>;
    accompagnementEnfants: Record<string, number>;
  };
}
