import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  RotateCcw,
  Sparkles,
  ClipboardList,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  agentService,
  QuestionItem,
  SubmissionResponse,
  ScaleLabel,
} from '../../../services/agent';
import { syncService } from '../../../services/syncService';
import { useTheme } from '../../../context/ThemeContext';
import {
  AssessmentLanguage,
  getLocalizedQuestionnaire,
} from '../../../constants/bilingualQuestionnaires';
import { AssessmentLanguageSelector } from '../../../components/AssessmentLanguageSelector';

export default function FieldAgentAssessmentRunnerScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{
    key?: string;
    questionnaireKey?: string;
    patientId: string;
    patientName?: string;
    centre?: string;
    lang?: string;
  }>();

  const [lang, setLang] = useState<AssessmentLanguage>(
    params.lang === 'en' ? 'en' : 'fr'
  );

  const questionnaireKey = params.questionnaireKey || params.key || 'pcl-5-terrain';
  const patientId = params.patientId ? parseInt(params.patientId, 10) : 0;
  const patientName = params.patientName || 'Migrant évalué';
  const centreName = params.centre || undefined;

  // Answers state
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  // Results modal state
  const [resultData, setResultData] = useState<SubmissionResponse | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // Fetch Questionnaire Data
  const {
    data: questionnaire,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['agent_questionnaire_detail', questionnaireKey],
    queryFn: () => agentService.getQuestionnaireByKey(questionnaireKey),
    enabled: !!questionnaireKey,
  });

  // Extract all questions
  const allQuestions = useMemo(() => {
    if (!questionnaire) return [];
    const questions: QuestionItem[] = [];
    if (
      questionnaire.sections &&
      Array.isArray(questionnaire.sections) &&
      questionnaire.sections.length > 0
    ) {
      questionnaire.sections.forEach((sec) => {
        if (sec.items && Array.isArray(sec.items)) {
          sec.items.forEach((item) => {
            questions.push({
              ...item,
              section_title: sec.title || item.section_title,
            });
          });
        }
      });
      if (questions.length > 0) return questions;
    }

    const rawQuestions =
      (questionnaire as any)?.bloc2_questions?.all_questions ||
      (questionnaire as any)?.questions ||
      (questionnaire as any)?.items;
    if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
      return rawQuestions;
    }

    return questions;
  }, [questionnaire]);

  const currentQuestion: QuestionItem | undefined = allQuestions[currentIndex];
  const totalQuestions = allQuestions.length;

  // Helper to extract options/labels
  const getQuestionOptions = (q: QuestionItem | undefined): ScaleLabel[] => {
    if (!q) return [];
    if (q.scale_labels && q.scale_labels.length > 0) return q.scale_labels;
    if (q.scoring && typeof q.scoring === 'object') {
      const labels: ScaleLabel[] = [];
      let idx = 0;
      for (const [labelText, val] of Object.entries(q.scoring)) {
        labels.push({
          value: typeof val === 'number' ? val : idx,
          label: labelText,
        });
        idx++;
      }
      if (labels.length > 0) return labels;
    }
    if (q.scale_type && questionnaire?.scales?.[q.scale_type]?.labels) {
      return questionnaire.scales[q.scale_type].labels!;
    }
    if (questionnaire?.scale?.labels && questionnaire.scale.labels.length > 0) {
      return questionnaire.scale.labels;
    }
    return [
      { value: 0, label: 'Non / Jamais' },
      { value: 1, label: 'Un peu / Parfois' },
      { value: 2, label: 'Moyennement / Souvent' },
      { value: 3, label: 'Beaucoup / Presque toujours' },
    ];
  };

  const options = useMemo(
    () => getQuestionOptions(currentQuestion),
    [currentQuestion, questionnaire]
  );

  const locQuestionnaire = useMemo(() => {
    return getLocalizedQuestionnaire(questionnaireKey, lang);
  }, [questionnaireKey, lang]);

  const displayQuestionText = useMemo(() => {
    if (locQuestionnaire && locQuestionnaire.questions[currentIndex]) {
      return locQuestionnaire.questions[currentIndex].text;
    }
    return currentQuestion?.text || '';
  }, [locQuestionnaire, currentIndex, currentQuestion]);

  const displayOptions = useMemo(() => {
    if (locQuestionnaire && locQuestionnaire.options && locQuestionnaire.options.length > 0) {
      return locQuestionnaire.options;
    }
    return options;
  }, [locQuestionnaire, options]);

  const displayTitle = useMemo(() => {
    if (locQuestionnaire) return locQuestionnaire.title;
    return questionnaire?.name || questionnaireKey;
  }, [locQuestionnaire, questionnaire, questionnaireKey]);

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const isOnline = await syncService.checkConnectivity();
      const payload = {
        questionnaireKey,
        patientId,
        answers,
        centre: centreName,
      };

      if (!isOnline) {
        await syncService.addToQueue({
          type: 'SUBMIT_ASSESSMENT',
          payload,
        });

        const offlineTotal = Object.values(answers).reduce<number>(
          (acc, v) => acc + (typeof v === 'number' ? v : 0),
          0
        );

        return {
          success: true,
          submissionId: Date.now(),
          overallScore: offlineTotal,
          scores: [
            {
              scale: questionnaireKey,
              value: offlineTotal,
              severityLabel: offlineTotal > 12 ? 'Élevé' : offlineTotal > 6 ? 'Modéré' : 'Faible',
              interpretation: 'Évaluation enregistrée hors-ligne avec succès.',
            },
          ],
          message: 'Enregistré localement. Synchronisation dès retour du réseau.',
        } as SubmissionResponse;
      }

      return agentService.submitEvaluation(questionnaireKey, payload);
    },
    onSuccess: (data) => {
      setResultData(data);
      setShowResultModal(true);
      queryClient.invalidateQueries({ queryKey: ['agent_assessments'] });
      queryClient.invalidateQueries({ queryKey: ['agent_patients'] });
    },
    onError: (err: any) => {
      Alert.alert(
        lang === 'en' ? 'Submission error' : 'Erreur de soumission',
        err.message || 'Impossible d’enregistrer cette évaluation.'
      );
    },
  });

  const handleSelectOption = (value: number) => {
    if (!currentQuestion) return;
    const qKey = currentQuestion.id || `q_${currentIndex}`;
    setAnswers((prev) => ({
      ...prev,
      [qKey]: value,
    }));

    // Auto-advance if not last question
    if (currentIndex < totalQuestions - 1) {
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 150);
    }
  };

  const isCurrentAnswered = useMemo(() => {
    if (!currentQuestion) return false;
    const qKey = currentQuestion.id || `q_${currentIndex}`;
    return answers[qKey] !== undefined;
  }, [currentQuestion, answers, currentIndex]);

  const answeredCount = Object.keys(answers).length;
  const progressPercent =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }, styles.centered]}>
        <ActivityIndicator size="large" color="#00A651" />
        <Text style={[styles.loadingText, isDark && { color: colors.textSecondary }]}>
          {lang === 'en' ? 'Loading field assessment...' : 'Chargement du questionnaire terrain...'}
        </Text>
      </SafeAreaView>
    );
  }

  if (error || allQuestions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }, styles.centered]}>
        <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
        <Text style={[styles.errorTitle, isDark && { color: colors.text }]}>
          {lang === 'en' ? 'Unable to load assessment' : 'Impossible de charger l\'évaluation'}
        </Text>
        <Text style={[styles.errorDesc, isDark && { color: colors.textSecondary }]}>
          Le formulaire "{questionnaireKey}" est indisponible ou ne contient aucune question.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{lang === 'en' ? 'Back to selection' : 'Retourner à la sélection'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      {/* Top Bar */}
      <View style={[styles.topBar, isDark && { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={isDark ? colors.text : '#0f172a'} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.toolTitle, isDark && { color: colors.text }]} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text style={[styles.patientSubtitle, isDark && { color: colors.textSecondary }]} numberOfLines={1}>
            {lang === 'en' ? 'Patient' : 'Patient'} : {patientName}
          </Text>
        </View>
        <View style={[styles.counterBadge, isDark && { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.counterText, isDark && { color: colors.text }]}>
            {currentIndex + 1} / {totalQuestions}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBarTrack, isDark && { backgroundColor: colors.border }]}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Language selector toggle */}
        <AssessmentLanguageSelector
          language={lang}
          onLanguageChange={setLang}
          style={{ marginBottom: 12 }}
        />

        {/* Section Title if exists */}
        {!!currentQuestion?.section_title && (
          <View style={[styles.sectionTitleWrap, isDark && { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.sectionTitleText, isDark && { color: colors.textSecondary }]}>{currentQuestion.section_title}</Text>
          </View>
        )}

        {/* Question Box */}
        <View style={[styles.questionBox, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.questionIndexLabel, isDark && { color: colors.textSecondary }]}>
            Question {currentIndex + 1}
          </Text>
          <Text style={[styles.questionText, isDark && { color: colors.text }]}>{displayQuestionText}</Text>
        </View>

        {/* Options List */}
        <View style={styles.optionsList}>
          {displayOptions.map((opt, idx) => {
            const qKey = currentQuestion?.id || `q_${currentIndex}`;
            const isSelected = answers[qKey] === opt.value;

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.optionCard,
                  isDark && { backgroundColor: colors.card, borderColor: colors.border },
                  isSelected && styles.optionCardSelected,
                ]}
                onPress={() => handleSelectOption(opt.value as number)}
                activeOpacity={0.7}
              >
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
                <Text
                  style={[
                    styles.optionLabel,
                    isDark && { color: colors.text },
                    isSelected && styles.optionLabelSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom Navigation Row */}
        <View style={styles.navButtonsRow}>
          <TouchableOpacity
            style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
          >
            <ArrowLeft size={18} color={currentIndex === 0 ? '#94a3b8' : (isDark ? colors.text : '#334155')} />
            <Text style={[styles.navBtnText, currentIndex === 0 && { color: '#94a3b8' }, isDark && currentIndex > 0 && { color: colors.text }]}>
              {lang === 'en' ? 'Previous' : 'Précédent'}
            </Text>
          </TouchableOpacity>

          {currentIndex < totalQuestions - 1 ? (
            <TouchableOpacity
              style={[styles.navBtn, !isCurrentAnswered && styles.navBtnDisabled, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
              disabled={!isCurrentAnswered}
            >
              <Text style={[styles.navBtnText, !isCurrentAnswered && { color: '#94a3b8' }, isDark && isCurrentAnswered && { color: colors.text }]}>
                {lang === 'en' ? 'Next' : 'Suivant'}
              </Text>
              <ArrowRight size={18} color={!isCurrentAnswered ? '#94a3b8' : (isDark ? colors.text : '#334155')} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, (!isCurrentAnswered || submitMutation.isPending) && styles.navBtnDisabled]}
              onPress={() => submitMutation.mutate()}
              disabled={!isCurrentAnswered || submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Check size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>
                    {lang === 'en' ? 'Submit' : 'Enregistrer'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Modal Résultats de l'Évaluation */}
      <Modal visible={showResultModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <CheckCircle2 size={40} color="#00A651" />
              <Text style={styles.resultTitle}>Évaluation Enregistrée !</Text>
              <Text style={styles.resultPatientName}>{patientName}</Text>
            </View>

            <ScrollView style={styles.scoresList}>
              {resultData?.scores?.map((score, i) => (
                <View key={i} style={styles.scoreRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scoreScaleTitle}>{score.label || score.scale}</Text>
                    <Text style={styles.scoreInterpretation}>{score.interpretation}</Text>
                  </View>
                  <View style={styles.scoreValueBadge}>
                    <Text style={styles.scoreValueText}>{score.value}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.actionOrientBtn}
                onPress={() => {
                  setShowResultModal(false);
                  router.replace('/(field-agent)/referrals');
                }}
              >
                <ArrowRightLeft size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.actionOrientBtnText}>Voir les orientations</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCloseBtn}
                onPress={() => {
                  setShowResultModal(false);
                  router.replace('/(field-agent)/dashboard');
                }}
              >
                <Text style={styles.actionCloseBtnText}>Retour au tableau de bord</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    fontFamily: 'Montserrat_500Medium',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    fontFamily: 'Montserrat_700Bold',
  },
  errorDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Montserrat_400Regular',
  },
  backBtn: {
    backgroundColor: '#00A651',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  patientSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
    fontFamily: 'Montserrat_500Medium',
  },
  counterBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    fontFamily: 'Montserrat_600SemiBold',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#e2e8f0',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00A651',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitleWrap: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  sectionTitleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    fontFamily: 'Montserrat_600SemiBold',
  },
  questionBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  questionIndexLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00A651',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    fontFamily: 'Montserrat_600SemiBold',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 22,
    fontFamily: 'Montserrat_600SemiBold',
  },
  optionsList: {
    gap: 10,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionCardSelected: {
    borderColor: '#00A651',
    backgroundColor: '#f0fdf4',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioCircleSelected: {
    borderColor: '#00A651',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00A651',
  },
  optionLabel: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
    lineHeight: 20,
    fontFamily: 'Montserrat_500Medium',
  },
  optionLabelSelected: {
    color: '#0f172a',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  navButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 6,
  },
  navBtnDisabled: {
    opacity: 0.5,
  },
  navBtnText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  navBtnNext: {
    backgroundColor: '#00A651',
    borderColor: '#00A651',
  },
  navBtnNextText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F58220',
    borderRadius: 12,
    paddingVertical: 12,
  },
  submitBtnText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
    fontFamily: 'Montserrat_700Bold',
  },
  resultPatientName: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_500Medium',
  },
  scoresList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  scoreScaleTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Montserrat_600SemiBold',
  },
  scoreInterpretation: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
    fontFamily: 'Montserrat_400Regular',
  },
  scoreValueBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 10,
  },
  scoreValueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  resultActions: {
    gap: 10,
  },
  actionOrientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    borderRadius: 12,
    paddingVertical: 12,
  },
  actionOrientBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  actionCloseBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
  },
  actionCloseBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
});
