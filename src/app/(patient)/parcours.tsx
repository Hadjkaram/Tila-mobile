import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Route as RouteIcon,
  CheckCircle2,
  CircleDot,
  Circle,
  FileText,
  Building2,
  User,
  Calendar,
  Sparkles,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { patientSpaceService, formatFr, type ParcoursStep } from '../../services/patientSpace';
import { useTheme } from '../../context/ThemeContext';

const STATUS_MAP = {
  done: { label: 'Réalisé', color: '#00A651', bg: 'rgba(0,166,81,0.12)' },
  current: { label: 'En cours', color: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
  next: { label: 'À venir', color: '#64748b', bg: '#f1f5f9' },
};

export default function PatientParcoursScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [steps, setSteps] = useState<ParcoursStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchParcours = async () => {
    try {
      const res = await patientSpaceService.parcours();
      setSteps(res?.steps || []);
    } catch (e) {
      console.warn('[Parcours] Erreur:', e);
      setSteps([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchParcours();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchParcours();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00A651" />}
      >
        {/* En-tête bienveillant */}
        <View style={[styles.headerCard, { backgroundColor: isDark ? colors.card : '#ecfdf5', borderColor: colors.border }]}>
          <View style={styles.badgeRow}>
            <View style={styles.badgeWrap}>
              <RouteIcon size={14} color="#00A651" style={{ marginRight: 6 }} />
              <Text style={styles.badgeText}>Parcours Clinique TILA</Text>
            </View>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Mon Parcours de Soins</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Suivez l'historique de vos étapes de santé, votre situation actuelle et vos prochains rendez-vous recommandés.
          </Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#00A651" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement de votre parcours...</Text>
          </View>
        ) : steps.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.emptyIconCircle}>
              <Sparkles size={28} color="#00A651" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Votre parcours commencera ici</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Dès votre première auto-évaluation ou consultation avec un spécialiste, les étapes de votre prise en charge s'afficheront chronologiquement.
            </Text>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => router.push({ pathname: '/(patient)/evaluations', params: { start: '1' } })}
              activeOpacity={0.85}
            >
              <Sparkles size={16} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.ctaBtnText}>Faire une évaluation clinique</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {steps.map((step, index) => {
              const statusCfg = STATUS_MAP[step.status] || STATUS_MAP.next;
              const isLast = index === steps.length - 1;

              return (
                <View key={step.id || index} style={styles.stepItemRow}>
                  {/* Colonne de gauche : Icône & Ligne verticale */}
                  <View style={styles.indicatorCol}>
                    <View style={[styles.iconDot, { borderColor: statusCfg.color }]}>
                      {step.status === 'done' ? (
                        <CheckCircle2 size={16} color="#00A651" />
                      ) : step.status === 'current' ? (
                        <CircleDot size={16} color="#2563eb" />
                      ) : (
                        <Circle size={16} color="#94a3b8" />
                      )}
                    </View>
                    {!isLast && <View style={[styles.verticalLine, { backgroundColor: isDark ? colors.border : '#e2e8f0' }]} />}
                  </View>

                  {/* Carte Étape */}
                  <View style={[styles.stepCard, { backgroundColor: colors.card, borderColor: step.status === 'current' ? '#2563eb' : colors.border }]}>
                    <View style={styles.stepHeaderRow}>
                      <Text style={[styles.stepLabel, { color: colors.text }]}>{step.label}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>
                          {statusCfg.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metaGrid}>
                      {step.date ? (
                        <View style={styles.metaItem}>
                          <Calendar size={13} color="#64748b" style={{ marginRight: 5 }} />
                          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                            {formatFr(step.date)}
                          </Text>
                        </View>
                      ) : null}

                      {step.type ? (
                        <View style={styles.metaItem}>
                          <RouteIcon size={13} color="#64748b" style={{ marginRight: 5 }} />
                          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                            {step.type}
                          </Text>
                        </View>
                      ) : null}

                      {step.structure ? (
                        <View style={styles.metaItem}>
                          <Building2 size={13} color="#64748b" style={{ marginRight: 5 }} />
                          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                            {step.structure}
                          </Text>
                        </View>
                      ) : null}

                      {step.intervenant ? (
                        <View style={styles.metaItem}>
                          <User size={13} color="#64748b" style={{ marginRight: 5 }} />
                          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                            {step.intervenant}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {step.document ? (
                      <TouchableOpacity
                        style={styles.docRow}
                        onPress={() => router.push('/(patient)/documents')}
                        activeOpacity={0.7}
                      >
                        <FileText size={14} color="#00A651" style={{ marginRight: 6 }} />
                        <Text style={styles.docText}>{step.document} dans vos documents</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 166, 81, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00A651',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  centered: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 166, 81, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A651',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  ctaBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  timelineContainer: {
    paddingTop: 8,
  },
  stepItemRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  indicatorCol: {
    alignItems: 'center',
    width: 32,
    marginRight: 10,
  },
  iconDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 2,
  },
  verticalLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: -8,
  },
  stepCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepLabel: {
    fontSize: 14.5,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaGrid: {
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,166,81,0.08)',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  docText: {
    color: '#00A651',
    fontSize: 12,
    fontWeight: '600',
  },
});
