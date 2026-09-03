import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { Text } from './Text';
import { syncService, SyncStatus } from '../services/syncService';
import { WifiOff, CheckCircle2, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function NetworkBanner() {
  const insets = useSafeAreaInsets();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    queueCount: 0,
    lastSyncSuccess: null,
    lastSyncTime: null,
  });

  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const prevSyncingRef = useRef(false);

  useEffect(() => {
    // Start auto network sync listener
    const unsubNet = syncService.initNetworkSync();

    // Subscribe to state updates
    const unsubStatus = syncService.subscribe((status) => {
      // Detect when syncing transitions from true to false with success
      if (prevSyncingRef.current && !status.isSyncing && status.lastSyncSuccess) {
        setShowSuccessBanner(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        const timer = setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => setShowSuccessBanner(false));
        }, 3000);

        return () => clearTimeout(timer);
      }

      prevSyncingRef.current = status.isSyncing;
      setSyncStatus(status);
    });

    return () => {
      unsubNet();
      unsubStatus();
    };
  }, []);

  // Offline banner takes precedence when offline
  if (!syncStatus.isOnline) {
    return (
      <View style={[styles.offlineBanner, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.bannerContent}>
          <WifiOff size={16} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.bannerText}>
            Mode Hors-Ligne
            {syncStatus.queueCount > 0 ? ` — ${syncStatus.queueCount} élément(s) en attente` : ''}
          </Text>
        </View>
      </View>
    );
  }

  // Syncing banner
  if (syncStatus.isSyncing) {
    return (
      <View style={[styles.syncingBanner, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.bannerContent}>
          <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.bannerText}>Synchronisation en cours...</Text>
        </View>
      </View>
    );
  }

  // Temporary success banner
  if (showSuccessBanner) {
    return (
      <Animated.View 
        style={[
          styles.successBanner, 
          { paddingTop: Math.max(insets.top, 8), opacity: fadeAnim }
        ]}
      >
        <View style={styles.bannerContent}>
          <CheckCircle2 size={16} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.bannerText}>Synchronisation réussie !</Text>
        </View>
      </Animated.View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: '#ea580c', // Darker warm orange/amber
    paddingBottom: 6,
    paddingHorizontal: 16,
    zIndex: 9999,
    width: '100%',
  },
  syncingBanner: {
    backgroundColor: '#0284c7', // Sky blue
    paddingBottom: 6,
    paddingHorizontal: 16,
    zIndex: 9999,
    width: '100%',
  },
  successBanner: {
    backgroundColor: '#059669', // Emerald green
    paddingBottom: 6,
    paddingHorizontal: 16,
    zIndex: 9999,
    width: '100%',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});
