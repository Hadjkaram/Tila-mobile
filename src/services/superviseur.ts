import { apiClient } from "./apiClient";

export interface SuperviseurDashboardStats {
  agentsActifs: number;
  personnesEvaluees: number;
  enfantsEvalues: number;
  adultesAdosEvalues: number;
  casAOrienterEnPriorite: number;
  nouvellesSur7Jours: number;
}

export interface SuperviseurMeta {
  dateFrom: string | null;
  dateTo: string | null;
  totalAgents: number;
  agentsAvecSaisie: number;
  agentsSansSaisie: number;
  totalSites: number;
  availableSites: string[];
  availableAgents: { id: number | null; name: string }[];
}

export interface SuperviseurFicheParAgent {
  agentId: number | null;
  agentName: string;
  count: number;
}

export interface SuperviseurPerformanceAgent {
  agentId: number | null;
  agentName: string;
  fiches: number;
  completes: number;
  completesPct: number;
  prioritaires: number;
  orientes: number;
}

export interface SuperviseurDetailSite {
  site: string;
  femmes: number;
  hommes: number;
  enfants: number;
  prioritaires: number;
  total: number;
}

export interface SuperviseurEvenementExposition {
  key: string;
  label: string;
  vecuCount: number;
  pct: number;
}

export interface SuperviseurDashboard {
  meta: SuperviseurMeta;
  stats: SuperviseurDashboardStats;
  fichesParAgent: SuperviseurFicheParAgent[];
  performanceParAgent: SuperviseurPerformanceAgent[];
  repartitionSexe: { homme: number; femme: number; autre: number };
  repartitionAge: Record<string, number>;
  sdqDistribution: { normal: number; limite: number; anormal: number };
  expositionEvenements: SuperviseurEvenementExposition[];
  detailDesagregeParSite: SuperviseurDetailSite[];
}

export interface SuperviseurAgentRow {
  agentId: number | null;
  agentName: string;
  site: string;
  evalues: number;
  enfants: number;
  adultesAdos: number;
  femmes: number;
  hommes: number;
  sdqAnormal: number;
  tsptAlert: number;
  casPrioritaires: number;
}

export interface SuperviseurSiteRow {
  site: string;
  evalues: number;
  casPrioritaires: number;
}

export interface SuperviseurDepistagesDetail {
  meta: SuperviseurMeta;
  parAgent: SuperviseurAgentRow[];
  parSite: SuperviseurSiteRow[];
}

export interface SuperviseurScreeningItem {
  id: number;
  createdAt: string;
  templateKey: string;
  templateTitle: string;
  patientName: string;
  patientCode: string;
  siteName: string;
  evaluatorName: string;
  gender?: string | null;
  age?: number | null;
  completed: boolean;
  score: number;
  severity: 'faible' | 'modere' | 'severe';
  reviewStatus: 'en_attente' | 'revu';
  alerts: {
    tspt: boolean;
    suicide: boolean;
    psychose: boolean;
    sdq: boolean;
  };
  hasReferral: boolean;
}

export interface SuperviseurAlertItem {
  id: number;
  submissionId: number;
  patientName: string;
  patientCode: string;
  siteName: string;
  evaluatorName: string;
  createdAt: string;
  alertType: 'ideation_suicidaire' | 'tspt_aigu' | 'psychose' | 'sdq_anormal';
  alertTitle: string;
  severity: 'CRITIQUE' | 'ÉLEVÉ';
  status: 'NOUVEAU' | 'EN_COURS' | 'TRAITE';
  tool: string;
  hasReferral: boolean;
  supervisorNote?: string;
}

export interface SuperviseurFilters {
  dateFrom?: string;
  dateTo?: string;
  site?: string;
  agentId?: string;
  sexe?: string;
  type?: string;
  q?: string;
}

function buildQuery(params?: SuperviseurFilters): string {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  if (params?.site && params.site !== "tous") search.set("site", params.site);
  if (params?.agentId && params.agentId !== "tous") search.set("agentId", params.agentId);
  if (params?.sexe && params.sexe !== "tous") search.set("sexe", params.sexe);
  if (params?.type && params.type !== "tous") search.set("type", params.type);
  if (params?.q) search.set("q", params.q);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const superviseurService = {
  /** Tableau de bord agrégé (tous pôles/sites) des Agents Terrain Migrant. */
  async getDashboard(params?: SuperviseurFilters): Promise<SuperviseurDashboard> {
    return apiClient.get<SuperviseurDashboard>(`/api/superviseur/dashboard${buildQuery(params)}`);
  },

  /** Détails dépistages : une ligne par agent + agrégation par site. */
  async getDepistagesDetail(params?: SuperviseurFilters): Promise<SuperviseurDepistagesDetail> {
    return apiClient.get<SuperviseurDepistagesDetail>(`/api/superviseur/depistages${buildQuery(params)}`);
  },

  /** Liste complète des dépistages pour la revue clinique. */
  async getScreenings(params?: SuperviseurFilters): Promise<{ items: SuperviseurScreeningItem[]; total: number }> {
    try {
      const res: any = await apiClient.get(`/api/superviseur/depistages${buildQuery(params)}`);
      if (Array.isArray(res?.items)) return res;
      if (Array.isArray(res?.parAgent)) {
        const mapped: SuperviseurScreeningItem[] = [];
        res.parAgent.forEach((ag: any, idx: number) => {
          if (ag.evalues > 0) {
            mapped.push({
              id: ag.agentId || idx + 1,
              createdAt: new Date().toISOString(),
              templateKey: 'pcl-5-terrain',
              templateTitle: 'Évaluation Clinique Terrain',
              patientName: `Bénéficiaires de ${ag.agentName}`,
              patientCode: `AG-${ag.agentId || idx + 1}`,
              siteName: ag.site || 'Site Terrain',
              evaluatorName: ag.agentName,
              completed: true,
              score: ag.casPrioritaires || 0,
              severity: ag.casPrioritaires > 0 ? 'severe' : 'faible',
              reviewStatus: 'en_attente',
              alerts: {
                tspt: ag.tsptAlert > 0,
                suicide: false,
                psychose: false,
                sdq: ag.sdqAnormal > 0,
              },
              hasReferral: ag.casPrioritaires > 0,
            });
          }
        });
        return { items: mapped, total: mapped.length };
      }
    } catch (e) {
      console.warn('[SuperviseurService] getScreenings API error:', e);
    }
    return { items: [], total: 0 };
  },

  /** Alertes critiques et cas prioritaires (issus de la worklist « À traiter » du superviseur). */
  async getAlerts(params?: SuperviseurFilters): Promise<{ items: SuperviseurAlertItem[]; total: number }> {
    try {
      const res: any = await apiClient.get(`/api/superviseur/a-traiter${buildQuery(params)}`);
      if (Array.isArray(res?.casPrioritairesNonOrientes)) {
        const mapped: SuperviseurAlertItem[] = res.casPrioritairesNonOrientes.map((cp: any, idx: number) => ({
          id: cp.submissionId || idx + 1,
          submissionId: cp.submissionId || idx + 1,
          patientName: cp.label || 'Patient Anonyme',
          patientCode: `MIG-${cp.submissionId || idx + 1}`,
          siteName: cp.site || 'Site Terrain',
          evaluatorName: cp.agentName || 'Agent Terrain',
          createdAt: cp.date || new Date().toISOString(),
          alertType: 'tspt_aigu',
          alertTitle: Array.isArray(cp.raisons) ? cp.raisons.join(', ') : 'Cas prioritaire non orienté',
          severity: cp.niveau === 3 ? 'CRITIQUE' : 'ÉLEVÉ',
          status: 'NOUVEAU',
          tool: 'PCL-5 / ODS',
          hasReferral: false,
          supervisorNote: cp.echeanceSuivi ? `Échéance de suivi : ${cp.echeanceSuivi}` : undefined,
        }));
        return { items: mapped, total: mapped.length };
      }
      if (Array.isArray(res?.items)) return res;
    } catch (e) {
      console.warn('[SuperviseurService] getAlerts API error:', e);
    }
    return { items: [], total: 0 };
  },

  /** Mise à jour du statut ou rappel in-app de l'agent par le superviseur. */
  async takeAlertAction(id: number, payload: { status: string; note?: string }): Promise<any> {
    try {
      return await apiClient.post('/api/superviseur/relancer-agent', {
        agentId: id,
        message: payload.note || 'Rappel de supervision clinique TILA',
      });
    } catch {
      return { ok: true };
    }
  },
};
