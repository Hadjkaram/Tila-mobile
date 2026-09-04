import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ClipboardList,
  Clock,
  ArrowRight,
  ShieldCheck,
  Brain,
  Smile,
  HeartHandshake,
  Plus,
  CheckCircle2,
  Calendar,
  User,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { agentService, AgentSubmissionItem } from '../../../services/agent';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../../context/ThemeContext';

interface ClinicalTool {
  key: string;
  name: string;
  subtitle: string;
  description: string;
  duration: string;
  icon: any;
  color: string;
  bgLight: string;
  tags: string[];
}

const CLINICAL_TOOLS: ClinicalTool[] = [
  {
    key: 'pcl-5-terrain',
    name: 'PCL-5 TERRAIN (Trauma & Migrants)',
    subtitle: 'Évaluation TSPT, PHQ-9 & Événements Stressants',
    description:
      'Outil prioritaire pour les adultes et adolescents migrants : mesure l’exposition aux traumatismes vécus, les symptômes de stress post-traumatique, la dépression et les alertes psychotiques.',
    duration: '15 - 20 min',
    icon: ShieldCheck,
    color: '#ea580c',
    bgLight: '#fff7ed',
    tags: ['TSPT', 'Trauma', 'Migrants', 'PHQ-9', 'Prioritaire'],
  },
  {
    key: 'sdq',
    name: 'SDQ (Forces et Difficultés)',
    subtitle: 'Évaluation Comportementale Enfants & Adolescents',
    description:
      'Questionnaire validé internationalement pour détecter les difficultés émotionnelles, relationnelles et comportementales chez les mineurs déplacés ou migrants.',
    duration: '8 - 12 min',
    icon: Smile,
    color: '#8b5cf6',
    bgLight: '#f5f3ff',
    tags: ['Enfants / Ados', 'Émotions', 'Comportement'],
  },
  {
    key: 'ods',
    name: 'ODS / BMH-MWT',
    subtitle: 'Dépistage des Troubles Mentaux Courants',
    description:
      'Outil de dépistage spécifique pour l’identification précoce de la dépression, de l’anxiété généralisée et du stress aigu chez les adultes.',
    duration: '5 - 10 min',
    icon: Brain,
    color: '#00A651',
    bgLight: '#ecfdf5',
    tags: ['Dépression', 'Anxiété', 'Stress'],
  },
  {
    key: 'berger-hiv-stigma',
    name: 'Échelle de Berger (VIH)',
    subtitle: 'Stigmatisation liée au VIH',
    description:
      'Mesure la stigmatisation perçue et vécue par les personnes vivant avec le VIH en contexte de vulnérabilité ou de migration.',
    duration: '10 - 15 min',
    icon: HeartHandshake,
    color: '#0284c7',
    bgLight: '#f0f9ff',
    tags: ['VIH', 'Stigmatisation', 'Qualité de vie'],
  },
];

export default function FieldAgentAssessmentsCatalogScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  // Load questionnaires & submissions
  const { data: questionnaires, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['agent_questionnaires'],
    queryFn: () => agentService.getQuestionnaires(),
  });

  const { data: submissionsData } = useQuery({
    queryKey: ['agent_submissions_list'],
    queryFn: () => agentService.getSubmissions({ limit: 10 }),
  });

  const submissions = submissionsData?.items || [];

  const handleSelectTool = (toolKey: string) => {
    // Map to backend key if matching questionnaire exists
    let effectiveKey = toolKey;
    if (questionnaires && Array.isArray(questionnaires)) {
      const match = questionnaires.find(
        (q: any) =>
          (q.key && q.key.toLowerCase().includes(toolKey.toLowerCase())) ||
          (q.title && q.title.toLowerCase().includes(toolKey.toLowerCase()))
      );
      if (match?.key) {
        effectiveKey = match.key;
      }
    }
    router.push({
      pathname: '/(field-agent)/assessments/new',
      params: { toolKey: effectiveKey },
    });
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy à HH:mm', { locale: fr });
    } catch {
      return dateStr;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#00A651" />}
      >
        {/* En-tête du catalogue */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Outils d’évaluation terrain</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Sélectionnez un outil adapté à la situation du migrant pour démarrer un dépistage.
          </Text>
        </View>

        {/* Liste des outils cliniques */}
        <View style={styles.toolsList}>
          {CLINICAL_TOOLS.map((tool) => {
            const IconComponent = tool.icon;
            return (
              <View key={tool.key} style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.toolTopRow}>
                  <View style={[styles.toolIconBox, { backgroundColor: isDark ? '#1e293b' : tool.bgLight }]}>
                    <IconComponent size={24} color={tool.color} />
                  </View>
                  <View style={styles.toolHeaderInfo}>
                    <Text style={[styles.toolName, { color: colors.text }]}>{tool.name}</Text>
                    <Text style={[styles.toolSubtitle, { color: colors.textSecondary }]}>{tool.subtitle}</Text>
                  </View>
                </View>

                <Text style={[styles.toolDescription, { color: colors.textSecondary }]}>{tool.description}</Text>

                {/* Tags & Durée */}
                <View style={styles.tagsContainer}>
                  <View style={[styles.durationBadge, { backgroundColor: colors.cardSecondary }]}>
                    <Clock size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.durationText, { color: colors.textSecondary }]}>{tool.duration}</Text>
                  </View>

                  {tool.tags.map((t) => (
                    <View
                      key={t}
                      style={[
                        styles.tagBadge,
                        { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                        t === 'Prioritaire' && { backgroundColor: isDark ? '#451a1a' : '#fff1f2', borderColor: isDark ? '#7f1d1d' : '#fecdd3' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          { color: colors.textSecondary },
                          t === 'Prioritaire' && { color: '#e11d48', fontWeight: '600' },
                        ]}
                      >
                        {t}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Bouton Démarrer */}
                <TouchableOpacity
                  style={[styles.startButton, { backgroundColor: tool.color }]}
                  onPress={() => handleSelectTool(tool.key)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.startButtonText}>Démarrer l’évaluation</Text>
                  <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Section Dernières Évaluations */}
        {submissions.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.sectionHeader}>
              <ClipboardList size={18} color="#00A651" />
              <Text style={[styles.historySectionTitle, { color: colors.text }]}>Historique récent des évaluations</Text>
            </View>

            <View style={styles.historyList}>
              {submissions.slice(0, 5).map((item) => (
                <View key={item.id} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.historyCardHeader}>
                    <Text style={[styles.historyPatientName, { color: colors.text }]}>{item.patientName || 'Migrant évalué'}</Text>
                    <View style={[styles.historyStatus, item.completed ? [styles.statusDone, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }] : [styles.statusPending, { backgroundColor: isDark ? '#431407' : '#fef3c7' }]]}>
                      <Text style={[styles.historyStatusText, item.completed ? styles.textDone : styles.textPending]}>
                        {item.completed ? 'Terminé' : 'En cours'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.historyToolName}>{item.questionnaireTitle || item.questionnaireKey}</Text>
                  <View style={styles.historyDateRow}>
                    <Calendar size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[styles.historyDateText, { color: colors.textSecondary }]}>{formatDate(item.createdAt)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
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
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
    fontFamily: 'Montserrat_400Regular',
  },
  toolsList: {
    gap: 16,
  },
  toolCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toolTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  toolIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toolHeaderInfo: {
    flex: 1,
  },
  toolName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  toolSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_500Medium',
  },
  toolDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'Montserrat_500Medium',
  },
  tagBadge: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tagText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Montserrat_400Regular',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  historySection: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  historySectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  historyList: {
    gap: 10,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyPatientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Montserrat_600SemiBold',
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusDone: {
    backgroundColor: '#ecfdf5',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  historyStatusText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  textDone: {
    color: '#00A651',
  },
  textPending: {
    color: '#d97706',
  },
  historyToolName: {
    fontSize: 12,
    color: '#00A651',
    fontFamily: 'Montserrat_500Medium',
  },
  historyDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  historyDateText: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Montserrat_400Regular',
  },
});
