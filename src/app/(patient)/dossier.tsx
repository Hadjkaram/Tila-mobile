import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FileText,
  Calendar,
  User,
  Stethoscope,
  Clock,
  Shield,
  CheckCircle2,
  ChevronRight,
  HeartPulse,
} from 'lucide-react-native';
import { patientService, PatientConsultationsView, PatientConsultationItem } from '../../services/patient';
import { useTheme } from '../../context/ThemeContext';

export default function PatientDossier() {
  const { colors, isDark } = useTheme();
  const [dossierData, setDossierData] = useState<PatientConsultationsView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDossier = async () => {
    try {
      const data = await patientService.consultations();
      setDossierData(data);
    } catch (e) {
      console.warn('[PatientDossier] Erreur:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDossier();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDossier();
  };

  const consultations: PatientConsultationItem[] = dossierData?.consultations || [];
  const followUps = dossierData?.activeFollowUps || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00A651" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement de votre dossier médical...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#00A651" />
          }
        >
          {/* Header Info */}
          <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconCircle, isDark && { backgroundColor: 'rgba(0,166,81,0.15)' }]}>
              <HeartPulse size={26} color="#00A651" />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Dossier Médical & Suivi Clinique</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              Historique complet de vos consultations, avis médicaux et prises en charge spécialisées.
            </Text>
          </View>

          {/* Suivis en cours */}
          {followUps.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Suivis Actifs ({followUps.length})</Text>
              {followUps.map((fu, idx) => (
                <View key={fu.id || idx} style={[styles.followUpCard, isDark && { backgroundColor: 'rgba(37,99,235,0.15)', borderColor: '#2563eb' }]}>
                  <View style={styles.followUpHeader}>
                    <Text style={[styles.followUpStatus, isDark && { color: '#60a5fa' }]}>{fu.statusLabel || 'En cours'}</Text>
                    <Text style={[styles.followUpDate, { color: colors.textSecondary }]}>{fu.openedAt || ''}</Text>
                  </View>
                  <Text style={[styles.followUpMessage, { color: isDark ? colors.text : '#1e293b' }]}>{fu.message}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Historique des Consultations */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Historique des Consultations ({consultations.length})</Text>

            {consultations.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <FileText size={44} color={colors.textMuted} style={{ marginBottom: 10 }} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucune consultation consignée</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  Les comptes-rendus rédigés par vos médecins et psychologues apparaîtront dans cette rubrique.
                </Text>
              </View>
            ) : (
              consultations.map((c, i) => (
                <View key={c.id || i} style={[styles.consultationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.consultationHeader}>
                    <View style={[styles.doctorIcon, isDark && { backgroundColor: 'rgba(0,166,81,0.15)' }]}>
                      <Stethoscope size={16} color="#00A651" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.doctorName, { color: colors.text }]}>{c.professionalName || 'Praticien'}</Text>
                      <Text style={[styles.specialtyText, { color: colors.textSecondary }]}>{c.specialty || 'Consultation spécialisée'}</Text>
                    </View>
                    <Text style={[styles.consultationDate, { color: colors.textMuted }]}>{c.date || 'Récemment'}</Text>
                  </View>

                  {c.motif ? (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Motif :</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{c.motif}</Text>
                    </View>
                  ) : null}

                  {c.summary ? (
                    <View style={[styles.summaryBox, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Synthèse médicale :</Text>
                      <Text style={[styles.summaryText, { color: colors.text }]}>{c.summary}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 10,
    fontFamily: 'Montserrat_500Medium',
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 17,
    fontFamily: 'Montserrat_400Regular',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
    fontFamily: 'Montserrat_700Bold',
  },
  followUpCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 10,
  },
  followUpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  followUpStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Montserrat_700Bold',
  },
  followUpDate: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Montserrat_400Regular',
  },
  followUpMessage: {
    fontSize: 12.5,
    color: '#1e293b',
    lineHeight: 18,
    fontFamily: 'Montserrat_500Medium',
  },
  consultationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  consultationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  doctorIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  specialtyText: {
    fontSize: 11.5,
    color: '#64748b',
    fontFamily: 'Montserrat_400Regular',
  },
  consultationDate: {
    fontSize: 11.5,
    color: '#94a3b8',
    fontFamily: 'Montserrat_400Regular',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginRight: 6,
    fontFamily: 'Montserrat_600SemiBold',
  },
  detailValue: {
    fontSize: 12,
    color: '#0f172a',
    flex: 1,
    fontFamily: 'Montserrat_500Medium',
  },
  summaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
    fontFamily: 'Montserrat_700Bold',
  },
  summaryText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
    fontFamily: 'Montserrat_400Regular',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    fontFamily: 'Montserrat_700Bold',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 17,
    fontFamily: 'Montserrat_400Regular',
  },
});
