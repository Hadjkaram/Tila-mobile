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
  Shield,
  Bell,
  HardDrive,
  LogOut,
  ArrowLeft,
  Heart,
  Calendar,
  Building2,
  Trash2,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { tokenService } from '../../services/apiClient';
import { patientService, PatientProfile } from '../../services/patient';

export default function PatientProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [isClearingCache, setIsClearingCache] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await patientService.me();
        setProfile(data);
      } catch {
        const stored = await AsyncStorage.getItem('tila_user_context');
        if (stored) {
          setProfile(JSON.parse(stored));
        }
      }
    };
    loadProfile();
  }, []);

  const handleClearCache = async () => {
    Alert.alert(
      'Vider le cache',
      'Cette action va nettoyer les données temporaires mises en cache sur votre appareil.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: async () => {
            setIsClearingCache(true);
            try {
              const keys = await AsyncStorage.getAllKeys();
              const offlineKeys = keys.filter(k => k.startsWith('@offline_'));
              await AsyncStorage.multiRemove(offlineKeys);
              Alert.alert('Succès', 'Le cache local a été vidé.');
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
      'Êtes-vous sûr de vouloir vous déconnecter de votre espace patient ?',
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

  const firstName = profile?.firstName || '';
  const lastName = profile?.lastName || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || (profile as any)?.name || 'Bénéficiaire TILA';
  const email = profile?.email || 'Non renseigné';
  const phone = (profile as any)?.phoneNumber || (profile as any)?.phone || '+225 00 00 00 00 00';
  const initials = ((firstName[0] || '') + (lastName[0] || 'P')).toUpperCase() || 'PT';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header avec flèche de retour */}
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
        {/* 1. Carte Identité Patient */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{fullName}</Text>
          <View style={styles.roleBadge}>
            <Heart size={13} color="#00A651" style={{ marginRight: 4 }} />
            <Text style={styles.roleBadgeText}>PATIENT / BÉNÉFICIAIRE</Text>
          </View>
        </View>

        {/* 2. Coordonnées */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Mes Coordonnées</Text>
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

        {/* 3. Notifications & Rappels de RDV */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Bell size={16} color="#00A651" />
            <Text style={styles.sectionTitle}>Rappels & Notifications</Text>
          </View>

          <View style={styles.prefRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.prefTitle}>Rappels de rendez-vous Push</Text>
              <Text style={styles.prefSub}>Notification 1h avant vos consultations</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: '#cbd5e1', true: '#00A651' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.prefRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.prefTitle}>Rappels SMS de consultation</Text>
              <Text style={styles.prefSub}>Confirmation de vos prises de RDV par SMS</Text>
            </View>
            <Switch
              value={smsEnabled}
              onValueChange={setSmsEnabled}
              trackColor={{ false: '#cbd5e1', true: '#00A651' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* 4. Données locales & Cache */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <HardDrive size={16} color="#64748b" />
            <Text style={styles.sectionTitle}>Stockage local</Text>
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
            <Text style={styles.clearCacheBtnText}>Vider les données en cache</Text>
          </TouchableOpacity>
        </View>

        {/* 5. Bouton Déconnexion */}
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
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#a7f3d0',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    fontFamily: 'Montserrat_700Bold',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00A651',
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
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 6,
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
