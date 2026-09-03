import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
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
  Bell,
  HardDrive,
  LogOut,
  CheckCircle2,
  Trash2,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { tokenService } from '../../services/apiClient';
import { syncService } from '../../services/syncService';
import { useQuery } from '@tanstack/react-query';
import { superviseurService } from '../../services/superviseur';

export default function SupervisorProfileScreen() {
  const router = useRouter();
  const [userContext, setUserContext] = useState<any>(null);
  const [pushAlertsEnabled, setPushAlertsEnabled] = useState(true);
  const [smsAlertsEnabled, setSmsAlertsEnabled] = useState(true);
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
  }, []);

  // Fetch supervisor dashboard for available supervised sites
  const { data: dashboard } = useQuery({
    queryKey: ['supervisor-profile-sites'],
    queryFn: () => superviseurService.getDashboard(),
  });

  const availableSites = dashboard?.meta?.availableSites || [
    'Centre de Santé Urbain TILA',
    'Poste Médical Avancé - Zone Nord',
    'Dispensaire Mobile Migrants',
  ];

  const firstName = userContext?.firstName || '';
  const lastName = userContext?.lastName || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || userContext?.name || 'Dr. Superviseur';
  const email = userContext?.email || 'superviseur@mindwellconnect.com';
  const phone = userContext?.phone || userContext?.phoneNumber || '+225 07 00 00 00 00';
  const specialty = userContext?.specialty || 'Psychiatrie & Santé Publique';

  const handleClearCache = async () => {
    Alert.alert(
      'Vider le cache local',
      'Cette action va nettoyer les données temporaires mises en cache. Les données sauvegardées sur le serveur ne seront pas affectées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider le cache',
          style: 'destructive',
          onPress: async () => {
            setIsClearingCache(true);
            try {
              const keys = await AsyncStorage.getAllKeys();
              const offlineKeys = keys.filter(k => k.startsWith('@offline_') || k.includes('dashboard'));
              await AsyncStorage.multiRemove(offlineKeys);
              Alert.alert('Succès', 'Le cache local de supervision a été vidé.');
            } catch {
              Alert.alert('Erreur', 'Impossible de vider le cache.');
            } finally {
              setIsClearingCache(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter de votre espace superviseur ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await tokenService.clearTokens();
            await AsyncStorage.multiRemove([
              'tila_user_context',
              '@offline_centres',
              '@offline_all_patients',
            ]);
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header avec retour arrière vers le Dashboard */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Mon Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Carte de Profil Principal */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>
              {((firstName[0] || '') + (lastName[0] || 'S')).toUpperCase() || 'SP'}
            </Text>
          </View>
          <Text style={styles.userName}>{fullName}</Text>
          <Text style={styles.userSpecialty}>{specialty}</Text>
          <View style={styles.roleBadge}>
            <Shield size={13} color="#2563eb" style={{ marginRight: 4 }} />
            <Text style={styles.roleBadgeText}>SUPERVISEUR CLINIQUE AGRÉÉ</Text>
          </View>
        </View>

        {/* 2. Coordonnées & Informations */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Coordonnées professionnelles</Text>
          <View style={styles.infoRow}>
            <Mail size={16} color="#64748b" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Adresse email</Text>
              <Text style={styles.infoValue}>{email}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Phone size={16} color="#64748b" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Numéro de téléphone</Text>
              <Text style={styles.infoValue}>{phone}</Text>
            </View>
          </View>
        </View>

        {/* 3. Périmètre de Supervision */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Building2 size={16} color="#00A651" />
            <Text style={styles.sectionTitle}>Centres & Sites supervisés ({availableSites.length})</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Établissements et dispositifs mobiles placés sous votre autorité clinique.
          </Text>

          <View style={styles.sitesList}>
            {availableSites.map((site: string, index: number) => (
              <View key={index} style={styles.siteBadgeItem}>
                <CheckCircle2 size={14} color="#00A651" style={{ marginRight: 8 }} />
                <Text style={styles.siteBadgeItemText}>{site}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 4. Préférences d'Alertes et Notifications */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Bell size={16} color="#ea580c" />
            <Text style={styles.sectionTitle}>Notifications d'urgence vitale</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Canaux prioritaires pour la réception immédiate des alertes cliniques critiques.
          </Text>

          <View style={styles.prefRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.prefTitle}>Alertes Push instantanées</Text>
              <Text style={styles.prefSub}>Notification sonore pour toute idéation suicidaire</Text>
            </View>
            <Switch
              value={pushAlertsEnabled}
              onValueChange={setPushAlertsEnabled}
              trackColor={{ false: '#cbd5e1', true: '#00A651' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.prefRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.prefTitle}>Alerte SMS d'astreinte</Text>
              <Text style={styles.prefSub}>SMS de secours si hors connexion internet</Text>
            </View>
            <Switch
              value={smsAlertsEnabled}
              onValueChange={setSmsAlertsEnabled}
              trackColor={{ false: '#cbd5e1', true: '#00A651' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* 5. Données & Cache Local */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <HardDrive size={16} color="#64748b" />
            <Text style={styles.sectionTitle}>Données & Stockage</Text>
          </View>

          <TouchableOpacity
            style={styles.clearCacheBtn}
            onPress={handleClearCache}
            disabled={isClearingCache}
            activeOpacity={0.7}
          >
            {isClearingCache ? (
              <ActivityIndicator size="small" color="#64748b" style={{ marginRight: 8 }} />
            ) : (
              <Trash2 size={16} color="#64748b" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.clearCacheBtnText}>Vider le cache des données locales</Text>
          </TouchableOpacity>
        </View>

        {/* 6. Déconnexion */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <LogOut size={18} color="#dc2626" style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Montserrat_700Bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
    fontFamily: 'Montserrat_700Bold',
  },
  userSpecialty: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 10,
    fontFamily: 'Montserrat_500Medium',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Montserrat_700Bold',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Montserrat_400Regular',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 1,
    fontFamily: 'Montserrat_600SemiBold',
  },
  sitesList: {
    gap: 8,
  },
  siteBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  siteBadgeItemText: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  prefTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Montserrat_600SemiBold',
  },
  prefSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  clearCacheBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  clearCacheBtnText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  logoutBtnText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
});
