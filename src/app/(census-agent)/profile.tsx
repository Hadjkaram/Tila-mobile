import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  HardDrive,
  LogOut,
  RefreshCw,
  Trash2,
  CloudCheck,
  CloudOff,
  Sparkles,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { tokenService } from '../../services/apiClient';
import { syncService, SyncStatus } from '../../services/syncService';
import { useTheme } from '../../context/ThemeContext';

export default function CensusAgentProfileScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [userContext, setUserContext] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    queueCount: 0,
    lastSyncSuccess: null,
    lastSyncTime: null,
  });
  const [isClearingCache, setIsClearingCache] = useState(false);

  useEffect(() => {
    const loadContext = async () => {
      try {
        const stored = await AsyncStorage.getItem('tila_user_context');
        if (stored) {
          setUserContext(JSON.parse(stored));
        }
      } catch {}
    };
    loadContext();

    syncService.getStatus().then(setSyncStatus);
    const unsubscribe = syncService.subscribe((s) => setSyncStatus(s));
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    try {
      const isOnline = await syncService.checkConnectivity();
      if (!isOnline) {
        Alert.alert('Connexion requise', 'Impossible de synchroniser : vous êtes actuellement hors-ligne.');
        return;
      }
      await syncService.syncPendingData();
      const st = await syncService.getStatus();
      setSyncStatus(st);
      Alert.alert('Synchronisation terminée', 'Toutes les données en file d’attente ont été transmises.');
    } catch (e: any) {
      Alert.alert('Erreur', 'La synchronisation a rencontré un problème.');
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Vider le cache local ?',
      'Cette action efface les données temporaires mises en mémoire cache sans toucher à vos identifiants ni à vos fiches en attente de synchro.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider le cache',
          style: 'destructive',
          onPress: async () => {
            setIsClearingCache(true);
            try {
              await AsyncStorage.removeItem('@tila_cached_recensement_stats');
              Alert.alert('Succès', 'Le cache a été vidé.');
            } finally {
              setIsClearingCache(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          await tokenService.clearTokens();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const fullName = [userContext?.firstName, userContext?.lastName].filter(Boolean).join(' ') || 'Agent Sensibilisateur';

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Carte Profil principale */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>
                {(userContext?.firstName?.[0] || 'A') + (userContext?.lastName?.[0] || 'S')}
              </Text>
            </View>
            <View style={styles.roleBadge}>
              <Sparkles size={11} color="#00A651" style={{ marginRight: 4 }} />
              <Text style={styles.roleBadgeText}>AGENT SENSIBILISATEUR</Text>
            </View>
          </View>

          <Text style={[styles.userName, { color: colors.text }]}>{fullName}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {userContext?.email || 'agent.recensement@tila.ci'}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <Building2 size={16} color="#00A651" style={{ marginRight: 10 }} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>ONG :</Text>
            <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
              {userContext?.organisation?.name || userContext?.ong?.name || 'ONG Partenaire TILA'}
            </Text>
          </View>

          {userContext?.phone ? (
            <View style={styles.infoRow}>
              <Phone size={16} color="#00A651" style={{ marginRight: 10 }} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Tél :</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{userContext.phone}</Text>
            </View>
          ) : null}
        </View>

        {/* État de synchronisation Hors-Ligne */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <HardDrive size={18} color="#00A651" style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Synchronisation Hors-Ligne</Text>
          </View>

          <View style={styles.syncStatusRow}>
            <View style={styles.syncStatusItem}>
              {syncStatus.isOnline ? (
                <CloudCheck size={20} color="#00A651" style={{ marginRight: 8 }} />
              ) : (
                <CloudOff size={20} color="#ea580c" style={{ marginRight: 8 }} />
              )}
              <View>
                <Text style={[styles.syncStatusTitle, { color: colors.text }]}>
                  {syncStatus.isOnline ? 'Connecté à Internet' : 'Hors-ligne'}
                </Text>
                <Text style={[styles.syncStatusSub, { color: colors.textSecondary }]}>
                  {syncStatus.queueCount} fiche(s) en attente d'envoi
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.syncButton, syncStatus.isSyncing && { opacity: 0.6 }]}
              onPress={handleManualSync}
              disabled={syncStatus.isSyncing}
              activeOpacity={0.8}
            >
              {syncStatus.isSyncing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <RefreshCw size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.syncButtonText}>Synchroniser</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Maintenance & Cache */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Shield size={18} color="#00A651" style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Données & Stockage</Text>
          </View>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={handleClearCache}
            disabled={isClearingCache}
            activeOpacity={0.7}
          >
            <View style={styles.actionRowLeft}>
              <Trash2 size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
              <Text style={[styles.actionRowText, { color: colors.text }]}>Vider le cache temporaire</Text>
            </View>
            {isClearingCache ? <ActivityIndicator size="small" color="#00A651" /> : null}
          </TouchableOpacity>
        </View>

        {/* Bouton de Déconnexion */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <LogOut size={18} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#00A651',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  roleBadgeText: {
    color: '#00A651',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  divider: {
    width: '100%',
    height: 1,
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    marginRight: 6,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    flex: 1,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  syncStatusTitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  syncStatusSub: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 1,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A651',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionRowText: {
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
});
