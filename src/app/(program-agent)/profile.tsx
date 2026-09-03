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
  Building2,
  Shield,
  LogOut,
  Trash2,
  ShieldCheck,
  Bell,
  Sparkles,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { tokenService } from '../../services/apiClient';
import { useTheme } from '../../context/ThemeContext';

export default function ProgramAgentProfileScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [userContext, setUserContext] = useState<any>(null);
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

  const handleClearCache = async () => {
    Alert.alert(
      'Vider le cache local ?',
      'Cette action efface les données temporaires mises en mémoire cache sans toucher à vos identifiants.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider le cache',
          style: 'destructive',
          onPress: async () => {
            setIsClearingCache(true);
            try {
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

  const fullName = [userContext?.firstName, userContext?.lastName].filter(Boolean).join(' ') || 'Agent Programme National';

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
                {(userContext?.firstName?.[0] || 'P') + (userContext?.lastName?.[0] || 'N')}
              </Text>
            </View>
            <View style={styles.roleBadge}>
              <ShieldCheck size={11} color="#4f46e5" style={{ marginRight: 4 }} />
              <Text style={styles.roleBadgeText}>PROGRAMME NATIONAL (PNSM)</Text>
            </View>
          </View>

          <Text style={[styles.userName, { color: colors.text }]}>{fullName}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {userContext?.email || 'agent.programme@sante.gouv.ci'}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <Building2 size={16} color="#4f46e5" style={{ marginRight: 10 }} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Institution :</Text>
            <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
              Programme National de Santé Mentale (PNSM)
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Shield size={16} color="#4f46e5" style={{ marginRight: 10 }} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Niveau d'accès :</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>Macro-Surveillance Nationale</Text>
          </View>
        </View>

        {/* Maintenance & Cache */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Shield size={18} color="#4f46e5" style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sécurité & Données</Text>
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
            {isClearingCache ? <ActivityIndicator size="small" color="#4f46e5" /> : null}
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
    backgroundColor: '#4f46e5',
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
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  roleBadgeText: {
    color: '#4f46e5',
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
