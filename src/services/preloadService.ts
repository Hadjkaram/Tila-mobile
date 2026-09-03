import { QueryClient } from '@tanstack/react-query';
import { professionalService } from './professionals';
import { agentService } from './agent';
import { syncService } from './syncService';
import { tokenService } from './apiClient';
import { referentialCache } from './referentialCache';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const preloadService = {
  /**
   * Pré-télécharge silencieusement la base de données locale selon le rôle de l'utilisateur connecté
   * (évite les erreurs 403 sur les routes non autorisées).
   */
  async preloadAllData(queryClient: QueryClient): Promise<void> {
    // 1. Vérifier si l'utilisateur est connecté et si le réseau est disponible
    const token = await tokenService.getToken();
    if (!token) {
      // Non connecté : ne rien précharger pour éviter des 401 / 403
      return;
    }

    const isOnline = await syncService.checkConnectivity();
    if (!isOnline) {
      return;
    }

    // 2. Déterminer le rôle de l'utilisateur
    let userContext: any = null;
    try {
      const stored = await AsyncStorage.getItem('tila_user_context');
      if (stored) {
        userContext = JSON.parse(stored);
      }
    } catch {}

    const activeContext = await tokenService.getActiveContext();
    const roles: string[] = userContext?.roles || [];
    const isSpecialist = 
      activeContext === 'PROFESSIONAL' || 
      roles.some(r => r.includes('ROLE_PROFESSIONAL') || r.includes('ROLE_PRO'));
    
    const isHealthAgent = 
      activeContext === 'HEALTH_AGENT' || 
      roles.some(r => r.includes('ROLE_HEALTH_AGENT') || r.includes('ROLE_COMMUNITY_ACTOR'));

    console.log(`[PreloadService] Démarrage du préchargement ciblé (Rôle: ${isSpecialist ? 'Spécialiste' : isHealthAgent ? 'Agent de Santé' : 'Générique'})...`);

    const prefetchPromises: Promise<any>[] = [];

    // Communs à tous les rôles soignants
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: ['agent_questionnaires'],
        queryFn: () => agentService.getQuestionnaires().catch(() => []),
      }),
      queryClient.prefetchQuery({
        queryKey: ['agent_centres_list'],
        queryFn: () => referentialCache.getCentres().catch(() => []),
      })
    );

    // Données spécifiques Spécialistes
    if (isSpecialist) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ['pro_patients_all'],
          queryFn: async () => {
            try {
              const res = await professionalService.listPatients({ limit: 300 });
              if (res?.items && Array.isArray(res.items)) {
                await referentialCache.cacheAllPatients(res.items);
              }
              return res;
            } catch {
              return { items: [], total: 0 };
            }
          },
        }),
        queryClient.prefetchQuery({
          queryKey: ['pro_pending_referrals'],
          queryFn: () => professionalService.getPendingReferrals().catch(() => []),
        }),
        queryClient.prefetchQuery({
          queryKey: ['pro_care_episodes'],
          queryFn: () => professionalService.getActiveCareEpisodes().catch(() => []),
        }),
        queryClient.prefetchQuery({
          queryKey: ['pro_upcoming_appointments'],
          queryFn: () => professionalService.getUpcomingAppointments(50).catch(() => []),
        })
      );
    }

    // Données spécifiques Agents de Santé
    if (isHealthAgent) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ['agent_submissions_list'],
          queryFn: () => agentService.getSubmissions({ limit: 100 }).catch(() => ({ items: [], total: 0 })),
        }),
        queryClient.prefetchQuery({
          queryKey: ['agent_referrals_list'],
          queryFn: () => agentService.getReferrals({ limit: 100 }).catch(() => ({ items: [], total: 0 })),
        })
      );
    }

    // Données spécifiques Agents de Terrain Migrants (Préchargement 100% Hors-Ligne du Dashboard)
    const isMigrantAgent =
      activeContext === 'MIGRANT_FIELD_AGENT' ||
      roles.some((r) => r.includes('MIGRANT') || r.includes('AGENT_TERRAIN_MIGRANT')) ||
      !isSpecialist;

    if (isMigrantAgent) {
      const now = new Date();
      const toIso = (d: Date) => d.toISOString().slice(0, 10);
      const todayStr = toIso(now);
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 7);
      const firstMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const ranges = [
        { preset: 'today', range: { dateFrom: todayStr, dateTo: todayStr } },
        { preset: 'last_7_days', range: { dateFrom: toIso(d7), dateTo: todayStr } },
        { preset: 'this_month', range: { dateFrom: toIso(firstMonth), dateTo: todayStr } },
      ];

      ranges.forEach(({ preset, range }) => {
        prefetchPromises.push(
          queryClient.prefetchQuery({
            queryKey: ['agent-terrain-migrant-dashboard', range],
            queryFn: async () => {
              try {
                const dash = await agentService.getMigrantsDashboard(range);
                if (dash) {
                  await AsyncStorage.setItem(`@offline_migrant_dashboard_${preset}`, JSON.stringify(dash));
                }
                return dash;
              } catch {
                return null;
              }
            },
          })
        );
      });

      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ['agent-terrain-migrant-submissions', 5],
          queryFn: async () => {
            try {
              const subs = await agentService.getSubmissions({ limit: 10 });
              if (subs?.items) {
                await AsyncStorage.setItem('@offline_migrant_submissions', JSON.stringify(subs.items));
              }
              return subs;
            } catch {
              return { items: [], total: 0 };
            }
          },
        }),
        queryClient.prefetchQuery({
          queryKey: ['agent_referrals_list'],
          queryFn: () => agentService.getReferrals({ limit: 50 }).catch(() => ({ items: [], total: 0 })),
        }),
        referentialCache.fetchAndCacheInitialPatients().catch(() => [])
      );
    }

    try {
      await Promise.allSettled(prefetchPromises);
      console.log('[PreloadService] Préchargement local et persistance hors-ligne terminés.');
    } catch (e) {
      console.warn('[PreloadService] Erreur non bloquante lors du préchargement:', e);
    }
  },
};
