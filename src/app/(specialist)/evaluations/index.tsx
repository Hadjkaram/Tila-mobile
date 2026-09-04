import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ClipboardList, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  HeartHandshake, 
  Brain, 
  Smile, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { agentService } from '../../../services/agent';
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
    key: 'ods',
    name: 'ODS / BMH-MWT',
    subtitle: 'Dépistage des Troubles Mentaux Courants',
    description: 'Évaluation simplifiée et ciblée pour le dépistage précoce des troubles dépressifs, de l’anxiété et du stress aigu.',
    duration: '5 - 10 min',
    icon: Brain,
    color: '#00A651',
    bgLight: '#ecfdf5',
    tags: ['Dépression', 'Anxiété', 'Stress', 'Prioritaire'],
  },
  {
    key: 'berger-hiv-stigma',
    name: 'Échelle de Berger (VIH)',
    subtitle: 'Stigmatisation liée au VIH',
    description: 'Mesure multidimensionnelle de la stigmatisation perçue à travers 4 sous-échelles : personnalisée, révélation, auto-image et attitudes publiques.',
    duration: '10 - 15 min',
    icon: HeartHandshake,
    color: '#0284c7',
    bgLight: '#f0f9ff',
    tags: ['VIH', 'Stigmatisation', 'Qualité de vie'],
  },
  {
    key: 'sdq',
    name: 'SDQ (Forces et Difficultés)',
    subtitle: 'Évaluation Comportementale Enfants & Ados',
    description: 'Questionnaire bref d’évaluation des forces et difficultés psychologiques chez les enfants et adolescents (comportement, émotions, hyperactivité).',
    duration: '8 - 12 min',
    icon: Smile,
    color: '#8b5cf6',
    bgLight: '#f5f3ff',
    tags: ['Enfants / Ados', 'Comportement', 'Émotions'],
  },
  {
    key: 'pcl-5-terrain',
    name: 'PCL-5 TERRAIN (Trauma & Migrants)',
    subtitle: 'Évaluation TSPT, Dépression & Psychose',
    description: 'Évaluation composite pour adultes et adolescents migrants / victimes de traite (TSPT, PHQ-9, événements stressants et dépistage psychotique).',
    duration: '15 - 20 min',
    icon: ShieldCheck,
    color: '#ea580c',
    bgLight: '#fff7ed',
    tags: ['TSPT', 'Trauma', 'Migrants', 'PHQ-9'],
  },
];

export default function SpecialistEvaluationsCatalogScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  // Pre-fetch or sync backend questionnaires
  const { data: questionnaires, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['agent_questionnaires'],
    queryFn: () => agentService.getQuestionnaires(),
  });

  const handleSelectTool = (toolKey: string) => {
    // If backend provides a specific key matching this tool (e.g. bmh-mwt, berger-vih, sdq-fr), map or pass directly
    let effectiveKey = toolKey;
    if (questionnaires && Array.isArray(questionnaires)) {
      const match = questionnaires.find((q: any) => 
        (q.key && q.key.toLowerCase().includes(toolKey.toLowerCase())) ||
        (q.title && q.title.toLowerCase().includes(toolKey.toLowerCase()))
      );
      if (match?.key) {
        effectiveKey = match.key;
      }
    }

    router.push(`/(specialist)/evaluations/new?key=${effectiveKey}` as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#00A651']} />
        }
      >
        {/* Banner */}
        <View style={[styles.heroBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroHeader}>
            <View style={[styles.heroIconBox, { backgroundColor: isDark ? 'rgba(0,166,81,0.15)' : '#ecfdf5', borderColor: isDark ? '#00A651' : '#86efac' }]}>
              <ClipboardList size={26} color="#00A651" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>Outils d'Évaluation Clinique</Text>
              <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                Sélectionnez une échelle validée pour évaluer un patient et calculer automatiquement ses scores.
              </Text>
            </View>
          </View>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Questionnaires Disponibles</Text>
          <View style={[styles.toolCountBadge, { backgroundColor: colors.cardSecondary }]}>
            <Text style={[styles.toolCountText, { color: colors.textSecondary }]}>{CLINICAL_TOOLS.length} Outils</Text>
          </View>
        </View>

        {/* Tools Cards */}
        {CLINICAL_TOOLS.map((tool) => {
          const IconComponent = tool.icon;
          return (
            <View key={tool.key} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardTopRow}>
                <View style={[styles.toolIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : tool.bgLight }]}>
                  <IconComponent size={28} color={tool.color} />
                </View>
                <View style={styles.cardTitleContainer}>
                  <Text style={[styles.toolName, { color: colors.text }]}>{tool.name}</Text>
                  <Text style={[styles.toolSub, { color: colors.textSecondary }]}>{tool.subtitle}</Text>
                </View>
              </View>

              <Text style={[styles.toolDescription, { color: colors.textSecondary }]}>{tool.description}</Text>

              {/* Tags and Duration */}
              <View style={styles.metaRow}>
                <View style={[styles.durationBadge, { backgroundColor: colors.cardSecondary }]}>
                  <Clock size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={[styles.durationText, { color: colors.textSecondary }]}>{tool.duration}</Text>
                </View>

                <View style={styles.tagsContainer}>
                  {tool.tags.map((tag, idx) => (
                    <View key={idx} style={[styles.tagBadge, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                      <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Action Button */}
              <TouchableOpacity 
                style={[styles.selectButton, { backgroundColor: tool.color }]}
                onPress={() => handleSelectTool(tool.key)}
                activeOpacity={0.8}
              >
                <Text style={styles.selectButtonText}>Sélectionner cet outil</Text>
                <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          );
        })}
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
    paddingBottom: 40,
  },
  heroBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  toolCountBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  toolCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  toolIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardTitleContainer: {
    flex: 1,
  },
  toolName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  toolSub: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  toolDescription: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
    fontWeight: '500',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
