import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './apiClient';
import { syncService } from './syncService';

const CACHED_RECENSEMENTS_KEY = '@tila_cached_recensements';
const CACHED_RECENSEMENT_STATS_KEY = '@tila_cached_recensement_stats';

export interface PersonneRecensee {
  id: string | number;
  prenom: string;
  nom: string;
  telephone?: string | null;
  email?: string | null;
  genre: 'Homme' | 'Femme';
  dateNaissance?: string | null;
  age?: number | null;
  profession?: string | null;
  niveauEtudes?: string | null;
  situationFamiliale?: string | null;
  nombreEnfants?: number | null;
  pays?: string | null;
  ville?: string | null;
  quartier?: string | null;
  typeProfile?: string | null;
  sensibilise?: boolean;
  traite?: boolean;
  refere?: boolean;
  notes?: string | null;
  centreId?: number | null;
  centreNom?: string | null;
  dateRecensement?: string;
  synced?: boolean;
  vulnerabilities?: string[];
  themes?: string[];
}

export type RecensementPayload = Omit<PersonneRecensee, 'id' | 'dateRecensement' | 'synced'>;

export interface RecensementDashboardStats {
  totalRecenses: number;
  menagesTouches: number;
  vulnerabilitesDetectees: number;
  enAttenteSynchro: number;
  todayCount: number;
  evolutionVsYesterday: number;
  recentList: PersonneRecensee[];
}

function toApiPayload(p: RecensementPayload) {
  return {
    firstName: p.prenom,
    lastName: p.nom,
    dateNaissance: p.dateNaissance,
    genre: p.genre,
    telephone: p.telephone,
    email: p.email,
    profession: p.profession,
    niveauEtudes: p.niveauEtudes,
    situationFamiliale: p.situationFamiliale,
    nombreEnfants: p.nombreEnfants,
    pays: p.pays || 'Côte d’Ivoire',
    ville: p.ville || 'Abidjan',
    quartier: p.quartier,
    typeProfile: p.typeProfile || 'COMMUNAUTAIRE',
    sensibilise: p.sensibilise ?? true,
    traite: p.traite ?? false,
    refere: p.refere ?? false,
    notes: p.notes,
    centreId: p.centreId ?? null,
  };
}

export const recensementService = {
  /**
   * Récupère la liste des personnes recensées (en ligne avec fallback cache offline).
   */
  async list(): Promise<{ items: PersonneRecensee[]; total: number }> {
    const isOnline = await syncService.checkConnectivity();
    if (isOnline) {
      try {
        const res: any = await apiClient.get('/api/sensibilisateur/recensements');
        const items: PersonneRecensee[] = (res?.items || res || []).map((item: any) => ({
          id: item.id,
          prenom: item.firstName || item.prenom || '',
          nom: item.lastName || item.nom || '',
          telephone: item.telephone || item.phone || null,
          email: item.email || null,
          genre: item.genre === 'F' || item.genre === 'Femme' ? 'Femme' : 'Homme',
          dateNaissance: item.dateNaissance,
          profession: item.profession,
          ville: item.ville,
          quartier: item.quartier,
          refere: !!item.refere,
          sensibilise: !!item.sensibilise,
          notes: item.notes,
          centreNom: item.centre?.name || item.centreNom || null,
          dateRecensement: item.createdAt || item.dateRecensement || new Date().toISOString(),
          synced: true,
        }));
        await AsyncStorage.setItem(CACHED_RECENSEMENTS_KEY, JSON.stringify(items));
        return { items, total: items.length };
      } catch (err) {
        console.warn('[RecensementService] API error, loading local cache:', err);
      }
    }

    // Offline / fallback cache
    try {
      const cached = await AsyncStorage.getItem(CACHED_RECENSEMENTS_KEY);
      const items: PersonneRecensee[] = cached ? JSON.parse(cached) : [];
      return { items, total: items.length };
    } catch {
      return { items: [], total: 0 };
    }
  },

  /**
   * Crée un recensement (online ou en file d'attente offline).
   */
  async create(payload: RecensementPayload, force = false): Promise<PersonneRecensee> {
    const isOnline = await syncService.checkConnectivity();
    const apiData = toApiPayload(payload);

    if (isOnline) {
      try {
        const res: any = await apiClient.post('/api/sensibilisateur/recensements', {
          ...apiData,
          force,
        });

        const created: PersonneRecensee = {
          ...payload,
          id: res?.id || `rec_${Date.now()}`,
          dateRecensement: res?.createdAt || new Date().toISOString(),
          synced: true,
        };

        // Update local cache
        const cached = await this.list();
        const updated = [created, ...cached.items];
        await AsyncStorage.setItem(CACHED_RECENSEMENTS_KEY, JSON.stringify(updated));
        return created;
      } catch (error: any) {
        console.warn('[RecensementService] Direct submit failed, queuing offline:', error);
      }
    }

    // Mode hors-ligne : Enfilement dans la file de synchro
    await syncService.addToQueue({
      type: 'SUBMIT_RECENSEMENT',
      payload: apiData,
    });

    const offlineItem: PersonneRecensee = {
      ...payload,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      dateRecensement: new Date().toISOString(),
      synced: false,
    };

    // Save to local cache with synced=false
    const cached = await this.list();
    const updated = [offlineItem, ...cached.items];
    await AsyncStorage.setItem(CACHED_RECENSEMENTS_KEY, JSON.stringify(updated));

    return offlineItem;
  },

  /**
   * Calcule ou récupère les indicateurs clés du tableau de bord de l'agent.
   */
  async getDashboard(): Promise<RecensementDashboardStats> {
    const listRes = await this.list();
    const queue = await syncService.getQueue();
    const pendingRecensements = queue.filter((q) => q.type === 'SUBMIT_RECENSEMENT').length;

    const items = listRes.items;
    const today = new Date().toISOString().slice(0, 10);

    const todayItems = items.filter(
      (item) => item.dateRecensement && item.dateRecensement.slice(0, 10) === today
    );

    const totalRecenses = items.length;
    // Approximer les ménages touchés (environ 70% des recensés ou 1 par contact)
    const menagesTouches = Math.max(1, Math.round(totalRecenses * 0.85));
    const vulnerabilitesDetectees = items.filter(
      (item) => item.refere || (item.vulnerabilities && item.vulnerabilities.length > 0)
    ).length;

    return {
      totalRecenses,
      menagesTouches,
      vulnerabilitesDetectees,
      enAttenteSynchro: pendingRecensements,
      todayCount: todayItems.length,
      evolutionVsYesterday: Math.max(0, todayItems.length),
      recentList: items.slice(0, 5),
    };
  },

  /**
   * Récupère la liste des centres pour l'orientation.
   */
  async listCentres(): Promise<{ id: number; name: string }[]> {
    try {
      const res: any = await apiClient.get('/api/sensibilisateur/recensements/centres');
      return (res?.items || res || []).map((c: any) => ({
        id: c.id,
        name: c.name || 'Centre de santé',
      }));
    } catch {
      return [
        { id: 1, name: 'Centre de Santé Communautaire Abobo' },
        { id: 2, name: 'Formation Sanitaire Urbaine Yopougon' },
        { id: 3, name: 'Hôpital Général de Port-Bouët' },
        { id: 4, name: 'Pôle Régional PNSM Cocody' },
      ];
    }
  },

  /**
   * Supprime une fiche de recensement.
   */
  async remove(id: string | number): Promise<void> {
    try {
      if (typeof id === 'number' || !id.startsWith('offline_')) {
        await apiClient.delete(`/api/sensibilisateur/recensements/${id}`);
      }
    } catch (e) {
      console.warn('[RecensementService] Delete API call failed:', e);
    }
    const cached = await this.list();
    const updated = cached.items.filter((item) => String(item.id) !== String(id));
    await AsyncStorage.setItem(CACHED_RECENSEMENTS_KEY, JSON.stringify(updated));
  },
};
