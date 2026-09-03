import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, AppState, AppStateStatus } from 'react-native';
import { agentService } from './agent';
import { professionalService } from './professionals';
import { apiClient, tokenService } from './apiClient';

const QUEUE_STORAGE_KEY = '@offline_queue';

export type SyncActionType = 'SUBMIT_ASSESSMENT' | 'CREATE_PATIENT' | 'SUBMIT_RECENSEMENT';

export interface QueueItem {
  id: string;
  type: SyncActionType;
  payload: any;
  createdAt: string;
  retryCount?: number;
  lastError?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  queueCount: number;
  lastSyncSuccess: boolean | null;
  lastSyncTime: string | null;
}

type SyncListener = (status: SyncStatus) => void;

// Safe wrapper around NetInfo to prevent crashes if the native module isn't linked yet
let NetInfoModule: any = null;
try {
  if (NativeModules.RNCNetInfo) {
    NetInfoModule = require('@react-native-community/netinfo').default;
  }
} catch (e) {
  console.warn('[SyncService] NetInfo native module not linked, using network ping fallback.');
}

class SyncService {
  private isSyncing = false;
  private isOnline = true;
  private lastSyncSuccess: boolean | null = null;
  private lastSyncTime: string | null = null;
  private listeners: Set<SyncListener> = new Set();
  private netInfoUnsubscribe: (() => void) | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.checkConnectivity();
  }

  /** Vérifie la connectivité réelle (via NetInfo si dispo, ou via ping HTTP léger). */
  async checkConnectivity(): Promise<boolean> {
    if (NetInfoModule) {
      try {
        const state = await NetInfoModule.fetch();
        this.isOnline = !!(state.isConnected && state.isInternetReachable !== false);
        this.notifyListeners();
        return this.isOnline;
      } catch (err) {
        console.warn('[SyncService] NetInfo fetch error:', err);
      }
    }

    // Fallback: fast HTTP HEAD/GET probe
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://clients3.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      this.isOnline = res.status >= 200 && res.status < 400;
    } catch {
      this.isOnline = false;
    }

    this.notifyListeners();
    return this.isOnline;
  }

  /** Ajoute une action à la file d'attente hors-ligne. */
  async addToQueue(action: { type: SyncActionType; payload: any }): Promise<QueueItem> {
    const queue = await this.getQueue();
    const newItem: QueueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: action.type,
      payload: action.payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    queue.push(newItem);
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    this.notifyListeners();
    return newItem;
  }

  /** Récupère la liste des actions en attente dans l'ordre chronologique. */
  async getQueue(): Promise<QueueItem[]> {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('[SyncService] Failed to read queue:', error);
      return [];
    }
  }

  /** Supprime un élément de la file d'attente par son ID. */
  async removeFromQueue(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter((item) => item.id !== id);
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(filtered));
    this.notifyListeners();
  }

  /** Vide l'intégralité de la file d'attente. */
  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    this.notifyListeners();
  }

  /** Exécute la synchronisation de toutes les actions en attente. */
  async syncPendingData(): Promise<{ syncedCount: number; failedCount: number }> {
    if (this.isSyncing) {
      console.log('[SyncService] Sync already in progress, skipping.');
      return { syncedCount: 0, failedCount: 0 };
    }

    const isConnected = await this.checkConnectivity();
    if (!isConnected) {
      console.log('[SyncService] Cannot sync: Offline.');
      return { syncedCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners();

    const queue = await this.getQueue();
    let syncedCount = 0;
    let failedCount = 0;

    console.log(`[SyncService] Starting sync for ${queue.length} item(s)...`);

    for (const item of queue) {
      try {
        if (item.type === 'CREATE_PATIENT') {
          const activeContext = await tokenService.getActiveContext();
          if (activeContext === 'PROFESSIONAL') {
            await professionalService.createPatient(item.payload);
          } else {
            try {
              await agentService.createPatient(item.payload);
            } catch {
              await professionalService.createPatient(item.payload);
            }
          }
        } else if (item.type === 'SUBMIT_ASSESSMENT') {
          const { questionnaireKey, ...restPayload } = item.payload;
          await agentService.submitEvaluation(questionnaireKey, restPayload);
        } else if (item.type === 'SUBMIT_RECENSEMENT') {
          await apiClient.post('/api/sensibilisateur/recensements', item.payload);
        }

        // Action successful -> remove from queue
        await this.removeFromQueue(item.id);
        syncedCount++;
      } catch (error: any) {
        console.error(`[SyncService] Error processing item ${item.id} (${item.type}):`, error?.message || error);
        failedCount++;

        // Update retry count in storage
        const currentQueue = await this.getQueue();
        const updated = currentQueue.map((q) =>
          q.id === item.id
            ? { ...q, retryCount: (q.retryCount || 0) + 1, lastError: error?.message || 'Unknown error' }
            : q
        );
        await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
      }
    }

    this.isSyncing = false;
    this.lastSyncSuccess = failedCount === 0 && syncedCount > 0;
    this.lastSyncTime = new Date().toISOString();
    this.notifyListeners();

    console.log(`[SyncService] Sync finished: ${syncedCount} synced, ${failedCount} failed.`);
    return { syncedCount, failedCount };
  }

  /** Initialise l'écouteur réseau automatique. */
  initNetworkSync(): () => void {
    if (NetInfoModule) {
      if (!this.netInfoUnsubscribe) {
        this.netInfoUnsubscribe = NetInfoModule.addEventListener((state: any) => {
          const wasOnline = this.isOnline;
          this.isOnline = !!(state.isConnected && state.isInternetReachable !== false);
          this.notifyListeners();

          if (!wasOnline && this.isOnline) {
            console.log('[SyncService] Network reconnected! Triggering automatic sync...');
            this.syncPendingData();
          }
        });
      }
    } else {
      // Fallback listener: AppState change + interval ping
      if (!this.pingInterval) {
        this.pingInterval = setInterval(async () => {
          const wasOnline = this.isOnline;
          const isNowOnline = await this.checkConnectivity();
          if (!wasOnline && isNowOnline) {
            console.log('[SyncService] Network restored (ping)! Triggering sync...');
            this.syncPendingData();
          }
        }, 10000);
      }

      const appStateSub = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          this.checkConnectivity();
        }
      });

      return () => {
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        appStateSub.remove();
      };
    }

    return () => {
      if (this.netInfoUnsubscribe) {
        this.netInfoUnsubscribe();
        this.netInfoUnsubscribe = null;
      }
    };
  }

  /** S'abonne aux changements d'état de synchronisation. */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.getStatus().then((status) => listener(status));
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Récupère le statut actuel. */
  async getStatus(): Promise<SyncStatus> {
    const queue = await this.getQueue();
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      queueCount: queue.length,
      lastSyncSuccess: this.lastSyncSuccess,
      lastSyncTime: this.lastSyncTime,
    };
  }

  private async notifyListeners(): Promise<void> {
    const status = await this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.error('[SyncService] Listener error:', err);
      }
    });
  }
}

export const syncService = new SyncService();
