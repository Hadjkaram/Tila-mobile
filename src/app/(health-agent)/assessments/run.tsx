import React, { useState, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  AlertTriangle, 
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
import { EvaluationResultsView } from '../../../components/EvaluationResultsView';

export default function AssessmentRunnerScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ 
    key: string; 
    questionnaireKey?: string;
    patientId: string; 
    patientName?: string; 
    centre?: string;
    lang?: string;
    patientProfile?: string;
    patientProfileOther?: string;
    pvvihPatientType?: string;
  }>();

  const [lang, setLang] = useState<AssessmentLanguage>(
    params.lang === 'en' ? 'en' : 'fr'
  );

  const questionnaireKey = params.questionnaireKey || params.key || 'ods';
  const patientId = params.patientId ? parseInt(params.patientId, 10) : 0;
  const patientName = params.patientName || 'Patient évalué';
  const centreName = params.centre || undefined;
  const patientProfile = params.patientProfile || undefined;
  const patientProfileOther = params.patientProfileOther || undefined;
  const pvvihPatientType = params.pvvihPatientType || undefined;

  // Answers state
  const [answers, setAnswers] = useState<Record<string, any>>({});
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

  const locQuestionnaire = useMemo(() => {
    return getLocalizedQuestionnaire(questionnaireKey, lang);
  }, [questionnaireKey, lang]);

  // Extract all questions with guaranteed offline fallback
  const allQuestions = useMemo(() => {
    if (questionnaire) {
      const questions: QuestionItem[] = [];
      if (questionnaire.sections && Array.isArray(questionnaire.sections) && questionnaire.sections.length > 0) {
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
    }

    // Mode Hors-Ligne Garanti : Fallback direct sur le dictionnaire bilingue local
    if (locQuestionnaire && Array.isArray(locQuestionnaire.questions) && locQuestionnaire.questions.length > 0) {
      return locQuestionnaire.questions.map((q) => ({
        id: q.id,
        text: q.text,
        dimension: q.dimension,
        required: true,
        scale_labels: locQuestionnaire.options,
      }));
    }

    return [];
  }, [questionnaire, locQuestionnaire]);

  const currentQuestion: QuestionItem | undefined = allQuestions[currentIndex];
  const totalQuestions = allQuestions.length;

  // Helper to extract options/labels strictly respecting the question's specific scale
  const getQuestionOptions = (q: QuestionItem | undefined): ScaleLabel[] => {
    if (!q) return [];
    if (q.scale_labels && q.scale_labels.length > 0) return q.scale_labels;
    if (q.options && q.options.length > 0 && q.scale_type !== 'multiple_choice') {
      return q.options.map((opt) => ({
        value: opt.value,
        label: opt.label,
      }));
    }
    if (q.scale_type === 'yes_no') {
      return [
        { value: 0, label: lang === 'en' ? 'No' : 'Non' },
        { value: 1, label: lang === 'en' ? 'Yes' : 'Oui' },
      ];
    }
    if (q.scale_type === 'frequency_4point') {
      return [
        { value: 0, label: lang === 'en' ? 'Not at all' : 'Jamais' },
        { value: 1, label: lang === 'en' ? 'Several days' : 'Plusieurs jours' },
        { value: 2, label: lang === 'en' ? 'More than half the days' : 'Plus de la moitié du temps' },
        { value: 3, label: lang === 'en' ? 'Nearly every day' : 'Presque tous les jours' },
      ];
    }
    if (q.scale_type === 'frequency_5point') {
      return [
        { value: 0, label: lang === 'en' ? 'Not at all' : 'Pas du tout' },
        { value: 1, label: lang === 'en' ? 'Rarely' : 'Rarement' },
        { value: 2, label: lang === 'en' ? 'Sometimes' : 'Quelquefois' },
        { value: 3, label: lang === 'en' ? 'Several times' : 'Plusieurs fois' },
        { value: 4, label: lang === 'en' ? 'Every day' : 'Tous les jours' },
      ];
    }
    if (q.scale_type === 'impact_scale') {
      return [
        { value: 0, label: lang === 'en' ? 'Not difficult at all' : 'Pas du tout difficile(s)' },
        { value: 1, label: lang === 'en' ? 'Somewhat difficult' : 'Assez difficile(s)' },
        { value: 2, label: lang === 'en' ? 'Very difficult' : 'Très difficile(s)' },
        { value: 3, label: lang === 'en' ? 'Extremely difficult' : 'Extrêmement difficile(s)' },
      ];
    }
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
    if (locQuestionnaire?.options && locQuestionnaire.options.length > 0) {
      return locQuestionnaire.options;
    }
    return [
      { value: 0, label: lang === 'en' ? 'No / Never' : 'Non / Jamais' },
      { value: 1, label: lang === 'en' ? 'A little / Sometimes' : 'Un peu / Parfois' },
      { value: 2, label: lang === 'en' ? 'Moderately / Often' : 'Moyennement / Souvent' },
      { value: 3, label: lang === 'en' ? 'A lot / Almost always' : 'Beaucoup / Presque toujours' },
    ];
  };

  const options = useMemo(
    () => getQuestionOptions(currentQuestion),
    [currentQuestion, questionnaire, locQuestionnaire, lang]
  );

  const displayQuestionText = useMemo(() => {
    if (
      locQuestionnaire &&
      locQuestionnaire.questions[currentIndex] &&
      locQuestionnaire.questions[currentIndex].id === currentQuestion?.id
    ) {
      return locQuestionnaire.questions[currentIndex].text;
    }
    return currentQuestion?.text || '';
  }, [locQuestionnaire, currentIndex, currentQuestion]);

  const displayOptions = useMemo(() => {
    if (options && options.length > 0) {
      return options;
    }
    if (locQuestionnaire && locQuestionnaire.options && locQuestionnaire.options.length > 0) {
      return locQuestionnaire.options;
    }
    return options;
  }, [options, locQuestionnaire]);

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
        patientProfile,
        patientProfileOther,
        pvvihPatientType,
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
            patientProfile,
            patientProfileOther,
            pvvihPatientType,
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

      const errorMessage = err?.response?.data?.message || err?.message || 'Erreur lors de l’enregistrement.';
      Alert.alert(
        lang === 'en' ? 'Submission error' : 'Erreur de soumission',
        errorMessage
      );
    }
  });

  const handleSelectOption = (value: number | string) => {
    if (!currentQuestion) return;
    const qKey = currentQuestion.id || `q_${currentIndex}`;
    setAnswers((prev) => ({
      ...prev,
      [qKey]: value,
    }));

    if (currentIndex < totalQuestions - 1) {
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 150);
    }
  };

  const isCurrentAnswered = useMemo(() => {
    if (!currentQuestion) return false;
    if (currentQuestion.required === false) return true;

    const qKey = currentQuestion.id || `q_${currentIndex}`;
    const ans = answers[qKey];
    if (ans === undefined || ans === null || ans === '') return false;
    if (Array.isArray(ans) && ans.length === 0) return false;
    return true;
  }, [currentQuestion, answers, currentIndex]);

  const answeredCount = Object.keys(answers).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  if (isLoading && allQuestions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }, styles.centered]}>
        <ActivityIndicator size="large" color="#00A651" />
        <Text style={[styles.loadingText, isDark && { color: colors.textSecondary }]}>
          {lang === 'en' ? 'Loading questionnaire...' : 'Chargement du questionnaire...'}
        </Text>
      </SafeAreaView>
    );
  }

  if (allQuestions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }, styles.centered]}>
        <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
        <Text style={[styles.errorTitle, isDark && { color: colors.text }]}>
          {lang === 'en' ? 'Questionnaire unavailable' : 'Questionnaire indisponible'}
        </Text>
        <Text style={[styles.errorDesc, isDark && { color: colors.textSecondary }]}>
          Impossible de charger le contenu de {questionnaireKey}.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>
            {lang === 'en' ? 'Back' : 'Retourner'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const qKey = currentQuestion?.id || `q_${currentIndex}`;
  const isTextInput =
    currentQuestion?.scale_type === 'text_input' ||
    currentQuestion?.type === 'open_text' ||
    currentQuestion?.type === 'open_text_long';
  const isNumberInput = currentQuestion?.scale_type === 'number_input';
  const isMultipleChoice = currentQuestion?.scale_type === 'multiple_choice';

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={[styles.header, isDark && { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={isDark ? colors.text : '#0f172a'} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, isDark && { color: colors.text }]} numberOfLines={1}>
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
            <Text style={[styles.sectionTitleText, isDark && { color: colors.textSecondary }]}>
              {currentQuestion.section_title}
            </Text>
          </View>
        )}

        {/* Question Box */}
        <View style={[styles.questionBox, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.questionHeaderRow}>
            <Text style={[styles.questionNumber, isDark && { color: colors.textSecondary }]}>
              Question {currentIndex + 1}
            </Text>
            {currentQuestion?.required === false && (
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalBadgeText}>Optionnel</Text>
              </View>
            )}
          </View>
          <Text style={[styles.questionText, isDark && { color: colors.text }]}>
            {displayQuestionText}
          </Text>
        </View>

        {/* 1. Free Text Input */}
        {isTextInput && (
          <View style={styles.inputCard}>
            <TextInput
              style={[
                styles.textInputField,
                isDark && { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
                currentQuestion?.type === 'open_text_long' && styles.textInputMultiline,
              ]}
              placeholder={
                currentQuestion?.placeholder ||
                (lang === 'en' ? 'Type response...' : 'Saisir la réponse...')
              }
              placeholderTextColor={isDark ? colors.textSecondary : '#94a3b8'}
              value={String(answers[qKey] ?? '')}
              onChangeText={(txt) => {
                setAnswers((prev) => ({
                  ...prev,
                  [qKey]: txt,
                }));
              }}
              multiline={currentQuestion?.type === 'open_text_long'}
              keyboardType={currentQuestion?.input_format === 'phone' ? 'phone-pad' : 'default'}
            />
          </View>
        )}

        {/* 2. Numeric Input */}
        {isNumberInput && (
          <View style={styles.inputCard}>
            <TextInput
              style={[
                styles.textInputField,
                isDark && { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="0"
              placeholderTextColor={isDark ? colors.textSecondary : '#94a3b8'}
              keyboardType="numeric"
              value={answers[qKey] !== undefined ? String(answers[qKey]) : ''}
              onChangeText={(txt) => {
                const num = txt === '' ? '' : parseFloat(txt);
                setAnswers((prev) => ({
                  ...prev,
                  [qKey]: !isNaN(num as number) ? num : txt,
                }));
              }}
            />
          </View>
        )}

        {/* 3. Multiple Choice */}
        {isMultipleChoice && (
          <View style={styles.optionsList}>
            {(currentQuestion.options || [
              { value: 'vecu', label: 'Vécu' },
              { value: 'temoin', label: 'Témoin' },
              { value: 'rapporte', label: 'Rapporté' },
            ]).map((opt, idx) => {
              const selectedValues = Array.isArray(answers[qKey])
                ? (answers[qKey] as string[])
                : [];
              const isChecked = selectedValues.includes(String(opt.value));

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.optionCard,
                    isDark && { backgroundColor: colors.card, borderColor: colors.border },
                    isChecked && styles.optionCardSelected,
                  ]}
                  onPress={() => {
                    const cur = Array.isArray(answers[qKey]) ? [...(answers[qKey] as string[])] : [];
                    const optVal = String(opt.value);
                    const next = isChecked ? cur.filter((v) => v !== optVal) : [...cur, optVal];
                    setAnswers((prev) => ({
                      ...prev,
                      [qKey]: next,
                    }));
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkboxSquare, isChecked && styles.checkboxSquareSelected]}>
                    {isChecked && <Check size={14} color="#ffffff" />}
                  </View>
                  <Text
                    style={[
                      styles.optionLabel,
                      isDark && { color: colors.text },
                      isChecked && styles.optionLabelSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {currentQuestion?.required === false && (
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  isDark && { backgroundColor: colors.card, borderColor: colors.border },
                  (!answers[qKey] || (Array.isArray(answers[qKey]) && (answers[qKey] as string[]).length === 0)) &&
                    styles.optionCardNeutral,
                ]}
                onPress={() => {
                  setAnswers((prev) => ({
                    ...prev,
                    [qKey]: [],
                  }));
                  if (currentIndex < totalQuestions - 1) {
                    setTimeout(() => setCurrentIndex((prev) => prev + 1), 150);
                  }
                }}
              >
                <Text style={[styles.optionLabel, { color: '#64748b', fontStyle: 'italic' }]}>
                  {lang === 'en' ? 'None / Not applicable' : 'Aucun / Non concerné'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 4. Single Choice / Likert Scale */}
        {!isTextInput && !isNumberInput && !isMultipleChoice && (
          <View style={styles.optionsList}>
            {displayOptions.map((opt, idx) => {
              const isSelected =
                answers[qKey] === opt.value || String(answers[qKey]) === String(opt.value);

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.optionCard,
                    isDark && { backgroundColor: colors.card, borderColor: colors.border },
                    isSelected && styles.optionCardSelected,
                  ]}
                  onPress={() => handleSelectOption(opt.value)}
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
        )}

        {/* Navigation Buttons */}
        <View style={styles.navButtonsRow}>
          <TouchableOpacity
            style={[
              styles.navBtn,
              currentIndex === 0 && styles.navBtnDisabled,
              isDark && { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
          >
            <ArrowLeft
              size={18}
              color={currentIndex === 0 ? '#94a3b8' : isDark ? colors.text : '#334155'}
            />
            <Text
              style={[
                styles.navBtnText,
                currentIndex === 0 && { color: '#94a3b8' },
                isDark && currentIndex > 0 && { color: colors.text },
              ]}
            >
              {lang === 'en' ? 'Previous' : 'Précédent'}
            </Text>
          </TouchableOpacity>

          {currentIndex < totalQuestions - 1 ? (
            <TouchableOpacity
              style={[
                styles.navBtn,
                !isCurrentAnswered && styles.navBtnDisabled,
                isDark && { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
              disabled={!isCurrentAnswered}
            >
              <Text
                style={[
                  styles.navBtnText,
                  !isCurrentAnswered && { color: '#94a3b8' },
                  isDark && isCurrentAnswered && { color: colors.text },
                ]}
              >
                {lang === 'en' ? 'Next' : 'Suivant'}
              </Text>
              <ArrowRight
                size={18}
                color={!isCurrentAnswered ? '#94a3b8' : isDark ? colors.text : '#334155'}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!isCurrentAnswered || submitMutation.isPending) && styles.navBtnDisabled,
              ]}
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

      {/* Full-Screen Evaluation Results View (Mirrors Web AgentSanteResultatReferral) */}
      <Modal visible={showResultModal} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView
          style={{ flex: 1, backgroundColor: isDark ? colors.bg : '#f8fafc' }}
          edges={['top', 'bottom']}
        >
          {resultData && (
            <EvaluationResultsView
              submissionResponse={resultData}
              patientName={patientName}
              centreName={centreName}
              questionnaireTitle={displayTitle}
              orientButtonLabel="Référer le Patient"
              onOrient={() => {
                setShowResultModal(false);
                const firstScore = resultData?.scores?.[0];
                const scoreStr =
                  resultData?.overallScore != null
                    ? `${resultData.overallScore}${
                        resultData.overallDenominator ? `/${resultData.overallDenominator}` : ''
                      }`
                    : firstScore?.value != null
                    ? `${firstScore.value}`
                    : '';
                const sevStr = firstScore?.severityLabel || firstScore?.interpretation || '';

                router.push({
                  pathname: '/(health-agent)/referrals/new',
                  params: {
                    submissionId: resultData ? String(resultData.submissionId) : undefined,
                    patientId: String(resultData?.patientId || patientId),
                    patientName: patientName,
                    questionnaireName: questionnaire?.name || questionnaire?.title || questionnaireKey,
                    score: scoreStr,
                    severity: sevStr,
                    centre: centreName,
                  },
                });
              }}
              onClose={() => {
                setShowResultModal(false);
                router.replace('/(health-agent)/assessments');
              }}
            />
          )}
        </SafeAreaView>
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
    textAlign: 'center',
    marginBottom: 8,
  },
  errorDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: '#00A651',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  patientSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  counterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#e2e8f0',
    width: '100%',
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
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  sectionTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  questionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  optionalBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optionalBadgeText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 23,
    fontFamily: 'Montserrat_600SemiBold',
  },
  inputCard: {
    marginBottom: 16,
  },
  textInputField: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  textInputMultiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  optionsList: {
    gap: 10,
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionCardSelected: {
    borderColor: '#00A651',
    backgroundColor: 'rgba(0, 166, 81, 0.05)',
  },
  optionCardNeutral: {
    borderColor: '#cbd5e1',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxSquareSelected: {
    backgroundColor: '#00A651',
    borderColor: '#00A651',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
  },
  optionLabelSelected: {
    color: '#00A651',
    fontWeight: '700',
  },
  navButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
  },
  navBtnDisabled: {
    opacity: 0.45,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    borderRadius: 12,
    paddingVertical: 14,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
  },
});
