import AsyncStorage from '@react-native-async-storage/async-storage';
import { AgentCentre, AgentPatient, agentService } from './agent';
import { professionalService } from './professionals';
import { syncService } from './syncService';
import { tokenService, apiClient } from './apiClient';

const STORAGE_KEY_CENTRES = '@offline_centres';
const STORAGE_KEY_PATIENTS = '@offline_all_patients';

export const referentialCache = {
  /**
   * Récupère la liste des centres réels depuis la base de données TILA (/api/me/centres) avec mise en cache locale
   */
  async getCentres(): Promise<AgentCentre[]> {
    try {
      const isOnline = await syncService.checkConnectivity();
      const token = await tokenService.getToken();
      if (isOnline && token) {
        let remoteCentres: any[] = [];
        try {
          const agentCentres = await agentService.getCentres(undefined, 100);
          if (Array.isArray(agentCentres) && agentCentres.length > 0) {
            remoteCentres = agentCentres;
          }
        } catch {}

        if (remoteCentres.length === 0) {
          try {
            const res = await apiClient.get<any>('/api/me/centres?limit=100');
            remoteCentres = Array.isArray(res) ? res : res?.items || [];
          } catch {}
        }

        if (Array.isArray(remoteCentres) && remoteCentres.length > 0) {
          const formatted: AgentCentre[] = remoteCentres.map((c: any) => ({
            id: c.id,
            name: c.name || c.title || 'Centre de Santé',
            description: c.description || null,
            careLevel: c.careLevel || null,
          }));
          await this.cacheAllCentres(formatted);
          return formatted;
        }
      }
    } catch (e) {
      console.warn('[ReferentialCache] Récupération réseau échouée, lecture des centres en cache local');
    }
    return this.getLocalCentres();
  },

  /**
   * Sauvegarde les vrais centres de TILA dans le stockage persistant
   */
  async cacheAllCentres(centres: AgentCentre[]): Promise<void> {
    if (!centres || centres.length === 0) return;
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CENTRES, JSON.stringify(centres));
    } catch (e) {
      console.warn('[ReferentialCache] Erreur lors de la mise en cache des centres:', e);
    }
  },

  /**
   * Récupère la liste des centres réels stockés localement (uniquement les centres TILA sauvegardés)
   */
  async getLocalCentres(): Promise<AgentCentre[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_CENTRES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[ReferentialCache] Erreur lors de la lecture des centres locaux:', e);
    }
    return [];
  },

  /**
   * Sauvegarde la liste complète des patients dans le stockage persistant
   */
  async cacheAllPatients(patients: AgentPatient[] | any[]): Promise<void> {
    if (!patients || !Array.isArray(patients)) return;
    try {
      const existing = await this.getLocalPatients();
      const map = new Map<number, AgentPatient>();
      
      // Insérer les existants
      existing.forEach(p => map.set(p.id, p));
      // Insérer ou mettre à jour avec les nouveaux
      patients.forEach(p => {
        const formatted: AgentPatient = {
          id: p.id,
          firstName: p.firstName || (p.name ? p.name.split(' ')[0] : ''),
          lastName: p.lastName || (p.name ? p.name.split(' ').slice(1).join(' ') : ''),
          phoneNumber: p.phoneNumber || p.phone || null,
          email: p.email || null,
          birthdate: p.birthdate || null,
          internalPatientCode: p.internalPatientCode || null,
          externalPatientCode: p.externalPatientCode || null,
        };
        map.set(formatted.id, formatted);
      });

      const merged = Array.from(map.values());
      await AsyncStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(merged));
    } catch (e) {
      console.warn('[ReferentialCache] Erreur lors de la mise en cache des patients:', e);
    }
  },

  /**
   * Ajoute ou met à jour un patient dans le cache local permanent
   */
  async appendLocalPatient(patient: AgentPatient | any): Promise<void> {
    if (!patient) return;
    try {
      const existing = await this.getLocalPatients();
      const formatted: AgentPatient = {
        id: patient.id,
        firstName: patient.firstName || (patient.name ? patient.name.split(' ')[0] : ''),
        lastName: patient.lastName || (patient.name ? patient.name.split(' ').slice(1).join(' ') : ''),
        phoneNumber: patient.phoneNumber || patient.phone || null,
        email: patient.email || null,
        birthdate: patient.birthdate || null,
        internalPatientCode: patient.internalPatientCode || null,
        externalPatientCode: patient.externalPatientCode || null,
      };
      const updated = [formatted, ...existing.filter(p => p.id !== formatted.id)];
      await AsyncStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(updated));
    } catch (e) {
      console.warn('[ReferentialCache] Erreur lors de l’ajout du patient local:', e);
    }
  },

  /**
   * Récupère tous les patients locaux
   */
  async getLocalPatients(): Promise<AgentPatient[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_PATIENTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[ReferentialCache] Erreur lecture patients locaux:', e);
    }
    return [];
  },

  /**
   * Recherche instantanée dans la base locale (0ms, 100% hors-ligne)
   */
  async searchLocalPatients(query: string): Promise<AgentPatient[]> {
    const q = query.trim().toLowerCase();
    const all = await this.getLocalPatients();
    if (!q) return all.slice(0, 10);

    return all.filter(p => {
      const fn = (p.firstName || '').toLowerCase();
      const ln = (p.lastName || '').toLowerCase();
      const name = `${fn} ${ln}`;
      const phone = (p.phoneNumber || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      const internalCode = (p.internalPatientCode || '').toLowerCase();
      const externalCode = (p.externalPatientCode || '').toLowerCase();

      return (
        fn.includes(q) ||
        ln.includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        internalCode.includes(q) ||
        externalCode.includes(q)
      );
    });
  },

  /**
   * Télécharge et met en cache la liste initiale des patients depuis le serveur
   */
  async fetchAndCacheInitialPatients(): Promise<AgentPatient[]> {
    const isOnline = await syncService.checkConnectivity();
    const token = await tokenService.getToken();
    if (!isOnline || !token) {
      return this.getLocalPatients();
    }

    const fetchedPatients: any[] = [];

    // 1. Tenter via professionalService (retourne tous les patients assignés / généraux)
    try {
      const proRes = await professionalService.listPatients({ limit: 200 });
      if (proRes?.items && Array.isArray(proRes.items)) {
        fetchedPatients.push(...proRes.items);
      }
    } catch {}

    // 2. Tenter via agentService.getReceivedPatients (patients reçus / dépistés par l'agent)
    try {
      const agentRes = await agentService.getReceivedPatients({ limit: 100 });
      if (agentRes?.items && Array.isArray(agentRes.items)) {
        agentRes.items.forEach((item: any) => {
          fetchedPatients.push({
            id: item.personId || item.patientId || item.id,
            firstName: item.patientName ? item.patientName.split(' ')[0] : '',
            lastName: item.patientName ? item.patientName.split(' ').slice(1).join(' ') : '',
            phoneNumber: item.phoneNumber || null,
            internalPatientCode: item.internalPatientCode || null,
            externalPatientCode: item.externalPatientCode || null,
          });
        });
      }
    } catch {}

    // 3. Tenter via agentService.getSubmissions (derniers patients évalués)
    try {
      const subsRes = await agentService.getSubmissions({ limit: 50 });
      if (subsRes?.items && Array.isArray(subsRes.items)) {
        subsRes.items.forEach((sub: any) => {
          if (sub.patientId && sub.patientName) {
            fetchedPatients.push({
              id: sub.patientId,
              firstName: sub.patientName.split(' ')[0] || '',
              lastName: sub.patientName.split(' ').slice(1).join(' ') || '',
            });
          }
        });
      }
    } catch {}

    if (fetchedPatients.length > 0) {
      await this.cacheAllPatients(fetchedPatients);
    }

    return this.getLocalPatients();
  },

  /**
   * Recherche unifiée de patients : interroge la base de données réelle TILA et combine avec le cache local instantané
   */
  async searchPatientsUnified(query: string): Promise<AgentPatient[]> {
    const q = query.trim();
    const isOnline = await syncService.checkConnectivity();
    const token = await tokenService.getToken();

    const resultsMap = new Map<number, AgentPatient>();

    // Toujours charger d'abord les correspondances du cache local (0ms)
    const localMatches = await this.searchLocalPatients(q);
    localMatches.forEach(p => resultsMap.set(p.id, p));

    // Si en ligne, chercher dans la base distante
    if (isOnline && token && q.length >= 1) {
      try {
        // 1. Recherche via agentService (/api/agent/patients?q=...)
        const agentResults = await agentService.searchPatients(q, 30).catch(() => []);
        if (Array.isArray(agentResults)) {
          agentResults.forEach(p => resultsMap.set(p.id, p));
        }

        // 2. Recherche via professionalService (/api/professionals/me/patients/search?q=...)
        const proResults = await professionalService.searchPatients(q, 30).catch(() => []);
        if (Array.isArray(proResults)) {
          proResults.forEach((p: any) => {
            if (!resultsMap.has(Number(p.id))) {
              resultsMap.set(Number(p.id), {
                id: Number(p.id),
                firstName: p.firstName || (p.name ? p.name.split(' ')[0] : ''),
                lastName: p.lastName || (p.name ? p.name.split(' ').slice(1).join(' ') : ''),
                phoneNumber: p.phoneNumber || p.phone || null,
                email: p.email || null,
                birthdate: p.birthdate || null,
                internalPatientCode: p.internalPatientCode || null,
                externalPatientCode: p.externalPatientCode || null,
              });
            }
          });
        }

        // Mettre à jour le cache local avec tous les patients trouvés en ligne
        const allFound = Array.from(resultsMap.values());
        if (allFound.length > 0) {
          this.cacheAllPatients(allFound).catch(() => {});
        }
      } catch (e) {
        console.warn('[ReferentialCache] Recherche distante échouée, conservation résultats locaux:', e);
      }
    }

    const finalResults = Array.from(resultsMap.values());

    // Si la recherche est vide et qu'aucun résultat local n'existe, tenter de pré-charger la base
    if (finalResults.length === 0 && q.length === 0 && isOnline && token) {
      return this.fetchAndCacheInitialPatients();
    }

    return finalResults;
  },

  /**
   * Téléchargement proactif et silencieux des référentiels dès qu'une connexion réseau est active
   */
  async syncReferentials(): Promise<void> {
    const isOnline = await syncService.checkConnectivity();
    if (!isOnline) return;

    const token = await tokenService.getToken();
    if (!token) return;

    console.log('[ReferentialCache] Synchronisation des référentiels (Centres & Patients)...');

    try {
      // 1. Centres
      const centresPromise = this.getCentres().catch(() => []);

      // 2. Patients de la base
      const patientsPromise = this.fetchAndCacheInitialPatients().catch(() => []);

      await Promise.allSettled([centresPromise, patientsPromise]);
      console.log('[ReferentialCache] Référentiels synchronisés avec succès.');
    } catch (e) {
      console.warn('[ReferentialCache] Échec non bloquant de la synchronisation des référentiels:', e);
    }
  },
};
