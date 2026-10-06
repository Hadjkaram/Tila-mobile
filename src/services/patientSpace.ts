import { apiClient } from './apiClient';

export interface ParcoursStep {
  id: string;
  label: string;
  type: string;
  status: 'done' | 'current' | 'next';
  date?: string | null;
  structure?: string | null;
  intervenant?: string | null;
  document?: string | null;
}

export interface FollowPlan {
  referent?: string | null;
  structure?: string | null;
  prochaineAction?: string | null;
  objectifs: { label: string; done: boolean }[];
  historique: { date: string; action: string }[];
  statusLabel?: string | null;
}

export interface SpaceSnapshot {
  identity: {
    firstName?: string | null;
    lastName?: string | null;
    code?: string | null;
    cmu?: string | null;
    birthdate?: string | null;
    gender?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    photo?: string | null;
    city?: string | null;
    country?: string | null;
  };
  parcours: ParcoursStep[];
  suivi: FollowPlan | null;
  documentsUnread: number;
  careItemsCount: number;
  moods: { id: number; level: number; label: string; date: string }[];
}

export interface ConsentItem {
  professionalId: number;
  beneficiaire: string;
  structure?: string | null;
  types?: string[];
  depuis?: string | null;
  active: boolean;
  niveaux: string[];
}

export interface AccessLogItem {
  id: number;
  who: string;
  structure?: string | null;
  action: string;
  date?: string | null;
}

export interface PatientPage<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export const ACCESS_LEVELS = [
  { id: 'parcours', label: 'Parcours et rendez-vous', hint: 'Coordination, rendez-vous, orientations et étapes du parcours' },
  { id: 'sante_mentale', label: 'Santé mentale', hint: 'Évaluations, résultats, consultations, protocoles et humeur' },
  { id: 'documents', label: 'Documents déposés', hint: 'Documents ajoutés au dossier (hors évaluations et ordonnances)' },
  { id: 'autres_soins', label: 'Soins et santé physique', hint: 'Soins déclarés, traitements, mesures, allergies et antécédents' },
] as const;

export const FAMILY_PERMS = [
  { id: 'rendez_vous', label: 'Mes rendez-vous', hint: 'Dates et lieux' },
  { id: 'parcours', label: 'Mon parcours', hint: 'Les grandes étapes' },
  { id: 'traitements', label: 'Mes traitements', hint: 'Pour m\'aider à les prendre' },
  { id: 'documents', label: 'Mes documents', hint: 'Comptes rendus' },
  { id: 'bien_etre', label: 'Mon bien-être', hint: 'Mon humeur' },
  { id: 'sante_mentale', label: 'Santé mentale', hint: 'Évaluations — accord renforcé', sensible: true },
] as const;

export interface FamilyMember {
  id: number;
  nom: string;
  lien: string;
  role: string;
  telephone: string;
  perms: string[];
  status: 'invite' | 'actif' | 'revoque' | string;
  expire?: string | null;
  depuis?: string | null;
}

export interface CallbackItem {
  id: number;
  motif: string;
  creneau: string;
  telephone: string;
  message?: string | null;
  urgence: boolean;
  status: string;
  intervenant?: string | null;
  structure?: string | null;
  historique: { date: string; action: string }[];
  date?: string | null;
  patientName?: string | null;
  patientId?: number | null;
}

export interface ClinicalDocument {
  id: number;
  titre: string;
  type: string;
  texte?: string | null;
  auteur?: string | null;
  lu: boolean;
  date?: string | null;
}

export interface CareItem {
  id: number;
  domaine: string;
  libelle: string;
  structure?: string | null;
  date?: string | null;
}

export interface PhysicalProfile {
  groupeSanguin?: string | null;
  allergies: string[];
  antecedents: string[];
  handicap?: string | null;
  mesures: {
    id: number;
    date?: string | null;
    tension?: string | null;
    poids?: number | null;
    taille?: number | null;
    glycemie?: number | null;
    pouls?: number | null;
    source?: string | null;
  }[];
}

export interface PublicResource {
  id: number;
  title: string;
  description?: string | null;
  mimeType?: string | null;
  url?: string | null;
  originalFilename?: string | null;
  kind?: 'pdf' | 'video' | 'audio' | 'article';
  externalUrl?: string | null;
}

export type InsuranceType = 'CMU' | 'Mutuelle' | 'Assurance privée' | 'Employeur' | 'Autre';

export interface PatientInsurance {
  id: number;
  type: InsuranceType;
  organisme: string;
  numero: string;
  couverture: string;
  validite?: string | null;
}

export interface MobilitySettings {
  pays: string[];
  consent: boolean;
  paysDisponibles: string[];
}

export const patientSpaceService = {
  snapshot: () => apiClient.get<SpaceSnapshot>('/api/patients/me/space'),
  identifiers: () => apiClient.get<{ tila: string | null; cmu: string | null }>('/api/patients/me/identifiers'),
  saveCmu: (cmu: string) => apiClient.put<{ tila: string | null; cmu: string | null }>('/api/patients/me/identifiers/cmu', { cmu }),
  insurances: () => apiClient.get<{ items: PatientInsurance[] }>('/api/patients/me/insurances'),
  addInsurance: (body: Omit<PatientInsurance, 'id'>) => apiClient.post<PatientInsurance>('/api/patients/me/insurances', body),
  removeInsurance: (id: number) => apiClient.delete(`/api/patients/me/insurances/${id}`),
  mobility: () => apiClient.get<MobilitySettings>('/api/patients/me/mobility'),
  saveMobility: (body: { pays: string[]; consent: boolean }) => apiClient.put<MobilitySettings>('/api/patients/me/mobility', body),
  parcours: () => apiClient.get<{ steps: ParcoursStep[] }>('/api/patients/me/parcours'),
  consents: (params: {
    q?: string;
    professionalsPage?: number;
    professionalsLimit?: number;
    logPage?: number;
    logLimit?: number;
  } = {}) => apiClient.get<{ items: PatientPage<ConsentItem>; log: PatientPage<AccessLogItem> }>(
    '/api/patients/me/consents',
    params,
  ),
  saveConsent: (professionalId: number, body: { niveaux: string[]; active: boolean }) =>
    apiClient.put<ConsentItem>(`/api/patients/me/consents/${professionalId}`, body),
  family: () => apiClient.get<{ items: FamilyMember[] }>('/api/patients/me/family'),
  inviteFamily: (body: Record<string, unknown>) => apiClient.post<FamilyMember>('/api/patients/me/family', body),
  updateFamily: (id: number, body: { status?: string; perms?: string[] }) =>
    apiClient.patch<FamilyMember>(`/api/patients/me/family/${id}`, body),
  familyPreview: (id: number) => apiClient.get<Record<string, unknown>>(`/api/patients/me/family/${id}/preview`),
  callbacks: () => apiClient.get<{ items: CallbackItem[] }>('/api/patients/me/callbacks'),
  createCallback: (body: Record<string, unknown>) => apiClient.post<CallbackItem>('/api/patients/me/callbacks', body),
  cancelCallback: (id: number) => apiClient.post<CallbackItem>(`/api/patients/me/callbacks/${id}/cancel`, {}),
  documents: () => apiClient.get<{ items: ClinicalDocument[] }>('/api/patients/me/clinical-documents'),
  markDocumentRead: (id: number) => apiClient.post(`/api/patients/me/clinical-documents/${id}/read`, {}),
  physical: () => apiClient.get<PhysicalProfile>('/api/patients/me/physical'),
  savePhysical: (body: Record<string, unknown>) => apiClient.put<PhysicalProfile>('/api/patients/me/physical', body),
  addMeasure: (body: Record<string, unknown>) => apiClient.post<PhysicalProfile>('/api/patients/me/physical/measures', body),
  careItems: () => apiClient.get<{ items: CareItem[] }>('/api/patients/me/care-items'),
  addCareItem: (body: Record<string, unknown>) => apiClient.post<CareItem>('/api/patients/me/care-items', body),
  deleteCareItem: (id: number) => apiClient.delete(`/api/patients/me/care-items/${id}`),
  moods: () => apiClient.get<{ items: { id: number; level: number; label: string; date: string }[] }>('/api/patients/me/moods'),
  saveMood: (level: number, label: string) => apiClient.post('/api/patients/me/moods', { level, label }),
  resources: () => apiClient.get<{ items: PublicResource[] }>('/api/public/documents'),
};

export function formatFr(d?: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
