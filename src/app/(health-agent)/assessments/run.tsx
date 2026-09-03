import React, { useState, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Modal
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
  ClipboardList
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentService, QuestionItem, SubmissionResponse, ScaleLabel } from '../../../services/agent';
import { syncService } from '../../../services/syncService';
import { useTheme } from '../../../context/ThemeContext';
import {
  AssessmentLanguage,
  getLocalizedQuestionnaire,
} from '../../../constants/bilingualQuestionnaires';
import { AssessmentLanguageSelector } from '../../../components/AssessmentLanguageSelector';

export default function AssessmentRunnerScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ 
    key: string; 
    patientId: string; 
    patientName?: string; 
    centre?: string;
    lang?: string;
  }>();

  const [lang, setLang] = useState<AssessmentLanguage>(
    params.lang === 'en' ? 'en' : 'fr'
  );

  const questionnaireKey = params.key;
  const patientId = params.patientId ? parseInt(params.patientId, 10) : 0;
  const patientName = params.patientName || 'Patient';
  const centreName = params.centre || undefined;

  // Answers state
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Results modal state
  const [resultData, setResultData] = useState<SubmissionResponse | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // Fetch Questionnaire Data
  const { data: questionnaire, isLoading, error } = useQuery({
    queryKey: ['agent_questionnaire_detail', questionnaireKey],
    queryFn: () => agentService.getQuestionnaireByKey(questionnaireKey),
    enabled: !!questionnaireKey,
  });

  // Extract all questions from sections or flat array
  const allQuestions = useMemo(() => {
    if (!questionnaire) return [];
    const questions: QuestionItem[] = [];
    if (questionnaire.sections && Array.isArray(questionnaire.sections) && questionnaire.sections.length > 0) {
      questionnaire.sections.forEach(sec => {
        if (sec.items && Array.isArray(sec.items)) {
          sec.items.forEach(item => {
            questions.push({
              ...item,
              section_title: sec.title || item.section_title
            });
          });
        }
      });
      if (questions.length > 0) return questions;
    }

    const rawQuestions = (questionnaire as any)?.bloc2_questions?.all_questions || (questionnaire as any)?.questions || (questionnaire as any)?.items;
    if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
      return rawQuestions;
    }

    return questions;
  }, [questionnaire]);

  const currentQuestion: QuestionItem | undefined = allQuestions[currentIndex];
  const totalQuestions = allQuestions.length;

  // Helper to extract options/labels for current question
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
      { value: 0, label: "Non / Jamais" },
      { value: 1, label: "Un peu / Parfois" },
      { value: 2, label: "Moyennement / Souvent" },
      { value: 3, label: "Beaucoup / Presque toujours" },
    ];
  };

  const options = useMemo(() => getQuestionOptions(currentQuestion), [currentQuestion, questionnaire]);

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
    mutationFn: () => {
      const payload = {
        patientId,
        centre: centreName,
        answers,
      };
      return agentService.submitEvaluation(questionnaireKey, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agent_submissions'] });
      queryClient.invalidateQueries({ queryKey: ['agent_submissions_list'] });
      setResultData(data);
      setShowResultModal(true);
    },
    onError: async (err: any) => {
      const isNetworkError = !err?.response || err?.code === 'ECONNABORTED' || err?.message?.includes('Network');
      if (isNetworkError) {
        await syncService.addToQueue({
          type: 'SUBMIT_ASSESSMENT',
          payload: {
            questionnaireKey,
            patientId,
            centre: centreName,
            answers,
          }
        });
        Alert.alert(
          'Enregistré hors-ligne 📶',
          'Vous êtes actuellement hors-ligne. Le dépistage a été sauvegardé sur votre appareil et sera synchronisé automatiquement dès le retour du réseau.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(health-agent)/assessments')
            }
          ]
        );
        return;
      }
      Alert.alert(
        lang === 'en' ? 'Submission error' : 'Erreur',
        err?.message || (lang === 'en' ? 'An error occurred during submission.' : 'Une erreur est survenue lors de la soumission du dépistage.')
      );
    }
  });

  const handleSelectOption = (val: number | string) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      if (!isCurrentAnswered) {
        Alert.alert(
          lang === 'en' ? 'Attention' : 'Attention',
          lang === 'en'
            ? 'Please select an answer before continuing.'
            : 'Veuillez sélectionner une réponse pour cette question avant de continuer.'
        );
        return;
      }
      submitMutation.mutate();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const isCurrentAnswered = currentQuestion ? answers[currentQuestion.id] !== undefined : false;
  const selectedAnswerValue = currentQuestion ? answers[currentQuestion.id] : undefined;
  const progressPercent = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00A651" />
          <Text style={[styles.loadingText, isDark && { color: colors.textSecondary }]}>
            {lang === 'en' ? 'Loading questionnaire...' : 'Chargement du questionnaire...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || allQuestions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#0f172a" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
          <Text style={[styles.errorTitle, isDark && { color: colors.text }]}>
            {lang === 'en' ? 'Questionnaire unavailable' : 'Questionnaire indisponible'}
          </Text>
          <Text style={[styles.errorSubtitle, isDark && { color: colors.textSecondary }]}>
            {lang === 'en'
              ? 'Failed to load questionnaire items.'
              : 'Impossible de charger les questions du dépistage.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>
              {lang === 'en' ? 'Return' : 'Retour'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={[styles.header, isDark && { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={isDark ? colors.text : '#0f172a'} />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          <Text style={[styles.headerTitle, isDark && { color: colors.text }]} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text style={[styles.headerPatientName, isDark && { color: colors.textSecondary }]} numberOfLines={1}>
            {lang === 'en' ? 'Patient' : 'Patient'} : {patientName} {centreName ? `• ${centreName}` : ''}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressContainer, isDark && { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.progressBarTrack, isDark && { backgroundColor: colors.border }]}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
        <View style={styles.progressTextRow}>
          <Text style={[styles.progressStepText, isDark && { color: colors.textSecondary }]}>
            Question {currentIndex + 1} {lang === 'en' ? 'of' : 'sur'} {totalQuestions}
          </Text>
          <Text style={[styles.progressPercentText, isDark && { color: colors.textSecondary }]}>{Math.round(progressPercent)}%</Text>
        </View>
      </View>

      {/* Question Content */}
      <ScrollView contentContainerStyle={styles.questionScrollContent} showsVerticalScrollIndicator={false}>
        {/* Sélecteur de langue */}
        <AssessmentLanguageSelector
          language={lang}
          onLanguageChange={setLang}
          style={{ marginBottom: 12 }}
        />
        
        {/* Section / Domain Badge */}
        {!!(currentQuestion?.section_title || currentQuestion?.domain) && (
          <View style={[styles.sectionBadge, isDark && { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.sectionBadgeText, isDark && { color: colors.textSecondary }]}>
              {currentQuestion?.section_title || currentQuestion?.domain}
            </Text>
          </View>
        )}

        {/* Question Text */}
        <Text style={[styles.questionText, isDark && { color: colors.text }]}>
          {displayQuestionText}
        </Text>

        {/* Options List */}
        <View style={styles.optionsList}>
          {displayOptions.map((opt, idx) => {
            const isSelected = selectedAnswerValue === opt.value;

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.optionCard,
                  isDark && { backgroundColor: colors.card, borderColor: colors.border },
                  isSelected && styles.optionCardSelected
                ]}
                onPress={() => handleSelectOption(opt.value)}
                activeOpacity={0.7}
              >
                <View style={[styles.optionRadio, isSelected && styles.optionRadioSelected]}>
                  {isSelected && <View style={styles.optionRadioInner} />}
                </View>
                <Text style={[
                  styles.optionLabel,
                  isDark && { color: colors.text },
                  isSelected && styles.optionLabelSelected
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Navigation Buttons */}
      <View style={[styles.bottomBar, isDark && { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.navButton, styles.prevButton, currentIndex === 0 && styles.navButtonDisabled]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ArrowLeft size={18} color={currentIndex === 0 ? '#94a3b8' : '#334155'} style={{ marginRight: 4 }} />
          <Text style={[styles.navButtonText, currentIndex === 0 && styles.navButtonTextDisabled]}>
            Précédent
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, styles.nextButton]}
          onPress={handleNext}
          disabled={submitMutation.isPending}
          activeOpacity={0.85}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {currentIndex === totalQuestions - 1 ? "Valider le dépistage" : "Suivant"}
              </Text>
              {currentIndex === totalQuestions - 1 ? (
                <Check size={18} color="#ffffff" style={{ marginLeft: 6 }} />
              ) : (
                <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 6 }} />
              )}
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Results Modal */}
      <Modal visible={showResultModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.resultModalCard}>
            <View style={styles.resultIconContainer}>
              <CheckCircle2 size={54} color="#00A651" />
            </View>

            <Text style={styles.resultTitle}>Dépistage Terminé !</Text>
            <Text style={styles.resultSubtitle}>
              L'évaluation pour <Text style={{ fontWeight: 'bold' }}>{patientName}</Text> a été enregistrée avec succès.
            </Text>

            {/* Scores summary */}
            {resultData?.scores && resultData.scores.length > 0 && (
              <View style={styles.scoresContainer}>
                {resultData.scores.map((s, i) => (
                  <View key={i} style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>{s.label || s.scale || 'Score'}</Text>
                    <View style={styles.scoreValueBadge}>
                      <Text style={styles.scoreValueText}>
                        {s.value} {s.denominator ? `/ ${s.denominator}` : ''}
                      </Text>
                      {!!s.interpretation && (
                        <Text style={styles.scoreInterpretation}>({s.interpretation})</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.primaryResultButton}
                onPress={() => {
                  setShowResultModal(false);
                  router.replace('/(health-agent)/assessments');
                }}
              >
                <Text style={styles.primaryResultButtonText}>Retour aux Dépistages</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryResultButton}
                onPress={() => {
                  setShowResultModal(false);
                  router.push('/(health-agent)/referrals');
                }}
              >
                <ArrowRightLeft size={16} color="#00A651" style={{ marginRight: 6 }} />
                <Text style={styles.secondaryResultButtonText}>Orienter le Patient</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 6,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerPatientName: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  progressContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00A651',
    borderRadius: 3,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStepText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00A651',
  },
  questionScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00A651',
  },
  questionText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 28,
    marginBottom: 24,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  optionCardSelected: {
    borderColor: '#00A651',
    backgroundColor: '#f0fdf4',
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionRadioSelected: {
    borderColor: '#00A651',
  },
  optionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00A651',
  },
  optionLabel: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
  optionLabelSelected: {
    color: '#00A651',
    fontWeight: '700',
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  prevButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#00A651',
    shadowColor: '#00A651',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  navButtonTextDisabled: {
    color: '#94a3b8',
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#64748b',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#00A651',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultModalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  resultIconContainer: {
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  scoresContainer: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  scoreValueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreValueText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#00A651',
    marginRight: 6,
  },
  scoreInterpretation: {
    fontSize: 12,
    color: '#64748b',
  },
  resultActions: {
    width: '100%',
    gap: 10,
  },
  primaryResultButton: {
    backgroundColor: '#00A651',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryResultButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryResultButton: {
    flexDirection: 'row',
    backgroundColor: '#ecfdf5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  secondaryResultButtonText: {
    color: '#00A651',
    fontSize: 15,
    fontWeight: '700',
  },
});
