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
  Sparkles,
  ClipboardList,
  User,
  Brain,
  HeartHandshake,
  Smile,
  Activity
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

// Default Fallback Questions with canonical q1, q2... IDs (matching Symfony database)
const FALLBACK_QUESTIONS: Record<string, QuestionItem[]> = {
  ods: [
    { id: 'q1', text: 'Au cours des 2 dernières semaines, à quelle fréquence avez-vous eu peu d’intérêt ou de plaisir à faire des choses ?', section_title: 'Dépression (PHQ-2)', scale_labels: [{ value: 0, label: '0 jours' }, { value: 1, label: '1-7 jours' }, { value: 2, label: '8-11 jours' }, { value: 3, label: '12-14 jours' }] },
    { id: 'q2', text: 'Au cours des 2 dernières semaines, à quelle fréquence vous êtes-vous senti(e) triste, déprimé(e) ou désespéré(e) ?', section_title: 'Dépression (PHQ-2)', scale_labels: [{ value: 0, label: '0 jours' }, { value: 1, label: '1-7 jours' }, { value: 2, label: '8-11 jours' }, { value: 3, label: '12-14 jours' }] },
    { id: 'q3', text: 'Au cours des 2 dernières semaines, à quelle fréquence vous êtes-vous senti(e) nerveux(se), anxieux(se) ou sur les nerfs ?', section_title: 'Anxiété (GAD-2)', scale_labels: [{ value: 0, label: '0 jours' }, { value: 1, label: '1-7 jours' }, { value: 2, label: '8-11 jours' }, { value: 3, label: '12-14 jours' }] },
    { id: 'q4', text: 'Au cours des 2 dernières semaines, à quelle fréquence avez-vous été incapable d’arrêter de vous faire du souci ou de contrôler vos inquiétudes ?', section_title: 'Anxiété (GAD-2)', scale_labels: [{ value: 0, label: '0 jours' }, { value: 1, label: '1-7 jours' }, { value: 2, label: '8-11 jours' }, { value: 3, label: '12-14 jours' }] },
    { id: 'q5', text: 'Au cours des 12 derniers mois, à quelle fréquence avez-vous consommé des boissons contenant de l’alcool ?', section_title: 'Alcool (AUDIT-C)', scale_labels: [{ value: 0, label: 'Jamais' }, { value: 1, label: 'Mensuel ou moins' }, { value: 2, label: '2-4 fois/mois' }, { value: 3, label: '2-3 fois/semaine' }, { value: 4, label: '4+ fois/semaine' }] },
    { id: 'q6', text: 'Combien de verres contenant de l’alcool consommez-vous un jour typique lorsque vous buvez ?', section_title: 'Alcool (AUDIT-C)', scale_labels: [{ value: 0, label: '1 ou 2' }, { value: 1, label: '3 ou 4' }, { value: 2, label: '5 ou 6' }, { value: 3, label: '7 à 9' }, { value: 4, label: '10 ou plus' }] },
    { id: 'q7', text: 'Au cours des 12 derniers mois, à quelle fréquence avez-vous bu 6 verres ou plus en une seule occasion ?', section_title: 'Alcool (AUDIT-C)', scale_labels: [{ value: 0, label: 'Jamais' }, { value: 1, label: 'Moins d’une fois par mois' }, { value: 2, label: 'Tous les mois' }, { value: 3, label: 'Toutes les semaines' }, { value: 4, label: 'Tous les jours ou presque' }] },
    { id: 'q8', text: 'Au cours des 12 derniers mois, avez-vous consommé des drogues ou d’autres substances illicites ?', section_title: 'Usage de Substances', scale_labels: [{ value: 0, label: 'Non' }, { value: 1, label: 'Oui' }] },
    { id: 'q9', text: 'Au cours du dernier mois, avez-vous pensé qu’il vaudrait mieux mourir ou pensé à vous faire du mal ?', section_title: 'Risque Suicidaire', scale_labels: [{ value: 0, label: 'Non' }, { value: 1, label: 'Oui' }] },
    { id: 'q10', text: 'Avez-vous déjà élaboré un plan pour mettre fin à vos jours ?', section_title: 'Risque Suicidaire', scale_labels: [{ value: 0, label: 'Non' }, { value: 1, label: 'Oui' }] },
    { id: 'q11', text: 'Avez-vous déjà fait une tentative de suicide dans votre vie ?', section_title: 'Risque Suicidaire', scale_labels: [{ value: 0, label: 'Non' }, { value: 1, label: 'Oui' }] },
  ],
  berger: [
    { id: 'q1', text: 'Certaines personnes évitent de me toucher lorsqu’elles savent que j’ai le VIH.', section_title: 'Stigmatisation Personnalisée', scale_labels: [{ value: 1, label: 'Pas du tout d’accord' }, { value: 2, label: 'Pas d’accord' }, { value: 3, label: 'D’accord' }, { value: 4, label: 'Tout à fait d’accord' }] },
    { id: 'q2', text: 'Des personnes qui me sont chères ont cessé de m’appeler après avoir appris que j’avais le VIH.', section_title: 'Stigmatisation Personnalisée', scale_labels: [{ value: 1, label: 'Pas du tout d’accord' }, { value: 2, label: 'Pas d’accord' }, { value: 3, label: 'D’accord' }, { value: 4, label: 'Tout à fait d’accord' }] },
    { id: 'q3', text: 'J’ai perdu des amis en leur disant que j’avais le VIH.', section_title: 'Stigmatisation Personnalisée', scale_labels: [{ value: 1, label: 'Pas du tout d’accord' }, { value: 2, label: 'Pas d’accord' }, { value: 3, label: 'D’accord' }, { value: 4, label: 'Tout à fait d’accord' }] },
    { id: 'q4', text: 'Dire à quelqu’un que j’ai le VIH est risqué.', section_title: 'Préoccupations Liées à la Divulgation', scale_labels: [{ value: 1, label: 'Pas du tout d’accord' }, { value: 2, label: 'Pas d’accord' }, { value: 3, label: 'D’accord' }, { value: 4, label: 'Tout à fait d’accord' }] },
    { id: 'q5', text: 'Je fais très attention à qui je dis que j’ai le VIH.', section_title: 'Préoccupations Liées à la Divulgation', scale_labels: [{ value: 1, label: 'Pas du tout d’accord' }, { value: 2, label: 'Pas d’accord' }, { value: 3, label: 'D’accord' }, { value: 4, label: 'Tout à fait d’accord' }] },
    { id: 'q6', text: 'Je m’inquiète que des gens qui savent que j’ai le VIH le disent à d’autres.', section_title: 'Préoccupations Liées à la Divulgation', scale_labels: [{ value: 1, label: 'Pas du tout d’accord' }, { value: 2, label: 'Pas d’accord' }, { value: 3, label: 'D’accord' }, { value: 4, label: 'Tout à fait d’accord' }] },
    { id: 'q7', text: 'La plupart des gens pensent qu’une personne avec le VIH est dégoûtante.', section_title: 'Attitudes Publiques Perçues', scale_labels: [{ value: 1, label: 'Pas du tout d’accord' }, { value: 2, label: 'Pas d’accord' }, { value: 3, label: 'D’accord' }, { value: 4, label: 'Tout à fait d’accord' }] },
    { id: 'q8', text: 'La plupart des gens ont peur d’une personne qui a le VIH.', section_title: 'Attitudes Publiques Perçues', scale_labels: [{ value: 1, label: 'Pas du tout d’accord' }, { value: 2, label: 'Pas d’accord' }, { value: 3, label: 'D’accord' }, { value: 4, label: 'Tout à fait d’accord' }] },
    { id: 'q9', text: 'La plupart des gens évitent une personne ayant le VIH.', section_title: 'Attitudes Publiques Perçues', scale_labels: [{ value: 1, label: 'Pas du tout d’accord' }, { value: 2, label: 'Pas d’accord' }, { value: 3, label: 'D’accord' }, { value: 4, label: 'Tout à fait d’accord' }] },
    { id: 'q10', text: 'Avoir le VIH me fait me sentir sale.', section_title: 'Image de Soi Négative', scale_labels: [{ value: 1, label: 'Pas du tout d’accord' }, { value: 2, label: 'Pas d’accord' }, { value: 3, label: 'D’accord' }, { value: 4, label: 'Tout à fait d’accord' }] },
    { id: 'q11', text: 'Je me sens coupable d’avoir le VIH.', section_title: 'Image de Soi Négative', scale_labels: [{ value: 1, label: 'Pas du tout d’accord' }, { value: 2, label: 'Pas d’accord' }, { value: 3, label: 'D’accord' }, { value: 4, label: 'Tout à fait d’accord' }] },
    { id: 'q12', text: 'Je ne me sens pas aussi bien que les autres à cause du VIH.', section_title: 'Image de Soi Négative', scale_labels: [{ value: 1, label: 'Pas du tout d’accord' }, { value: 2, label: 'Pas d’accord' }, { value: 3, label: 'D’accord' }, { value: 4, label: 'Tout à fait d’accord' }] },
  ],
  sdq: [
    { id: 'q1', text: 'Se plaint souvent de maux de tête ou d’estomac.', section_title: 'Troubles Émotionnels', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q2', text: 'S’inquiète souvent, paraît souvent soucieux(se).', section_title: 'Troubles Émotionnels', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q3', text: 'Souvent malheureux(se), abattu(e) ou en larmes.', section_title: 'Troubles Émotionnels', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q4', text: 'Mal à l’aise dans les situations nouvelles, manque d’assurance.', section_title: 'Troubles Émotionnels', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q5', text: 'A de nombreuses peurs, facilement effrayé(e).', section_title: 'Troubles Émotionnels', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q6', text: 'Fait souvent des colères, s’énerve facilement.', section_title: 'Troubles du Comportement', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q7', text: 'En général obéissant(e) envers les adultes.', section_title: 'Troubles du Comportement', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q8', text: 'Se bagarre souvent avec les autres enfants.', section_title: 'Troubles du Comportement', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q9', text: 'Ment ou triche souvent.', section_title: 'Troubles du Comportement', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q10', text: 'Vole à la maison, à l’école ou ailleurs.', section_title: 'Troubles du Comportement', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q11', text: 'Agité(e), turbulent(e), ne tient pas en place.', section_title: 'Hyperactivité & Attention', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q12', text: 'A la bougeotte, se tortille constamment.', section_title: 'Hyperactivité & Attention', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q13', text: 'Facilement distrait(e), a du mal à se concentrer.', section_title: 'Hyperactivité & Attention', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q14', text: 'Réfléchit avant d’agir.', section_title: 'Hyperactivité & Attention', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q15', text: 'Va jusqu’au bout des tâches ou devoirs.', section_title: 'Hyperactivité & Attention', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q16', text: 'Plutôt solitaire, a tendance à jouer seul(e).', section_title: 'Relations avec les Pairs', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q17', text: 'A au moins un(e) bon(ne) ami(e).', section_title: 'Relations avec les Pairs', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q18', text: 'Généralement aimé(e) des autres enfants.', section_title: 'Relations avec les Pairs', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q19', text: 'Se fait souvent embêter ou rejeter par les autres enfants.', section_title: 'Relations avec les Pairs', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q20', text: 'S’entend mieux avec les adultes qu’avec les enfants.', section_title: 'Relations avec les Pairs', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q21', text: 'Prend en considération les sentiments d’autrui.', section_title: 'Comportement Prosocial', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q22', text: 'Partage volontiers avec les autres enfants.', section_title: 'Comportement Prosocial', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q23', text: 'Aide volontiers quand quelqu’un s’est fait mal ou a de la peine.', section_title: 'Comportement Prosocial', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q24', text: 'Gentil(le) avec les enfants plus jeunes.', section_title: 'Comportement Prosocial', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
    { id: 'q25', text: 'Toujours prêt(e) à aider les autres (parents, enseignants).', section_title: 'Comportement Prosocial', scale_labels: [{ value: 0, label: 'Pas vrai' }, { value: 1, label: 'Parfois ou un peu vrai' }, { value: 2, label: 'Très vrai' }] },
  ],
};

export default function SpecialistAssessmentRunnerScreen() {
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

  const questionnaireKey = params.key || 'ods';
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
  const { data: questionnaire, isLoading } = useQuery({
    queryKey: ['agent_questionnaire_detail', questionnaireKey],
    queryFn: () => agentService.getQuestionnaireByKey(questionnaireKey),
    enabled: !!questionnaireKey,
  });

  // Extract all questions from sections or fallback
  const allQuestions = useMemo(() => {
    if (questionnaire?.sections && Array.isArray(questionnaire.sections) && questionnaire.sections.length > 0) {
      const questions: QuestionItem[] = [];
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

    // Fallbacks
    const k = questionnaireKey.toLowerCase();
    if (k.includes('berger')) return FALLBACK_QUESTIONS.berger;
    if (k.includes('sdq')) return FALLBACK_QUESTIONS.sdq;
    return FALLBACK_QUESTIONS.ods;
  }, [questionnaire, questionnaireKey]);

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
      { value: 0, label: 'Non / Jamais' },
      { value: 1, label: 'Parfois' },
      { value: 2, label: 'Souvent' },
      { value: 3, label: 'Presque toujours' },
    ];
  };

  const currentOptions = getQuestionOptions(currentQuestion);

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
    return currentOptions;
  }, [locQuestionnaire, currentOptions]);

  const displayTitle = useMemo(() => {
    if (locQuestionnaire) return locQuestionnaire.title;
    return questionnaire?.name || 'Évaluation Clinique';
  }, [locQuestionnaire, questionnaire]);

  // Set answer for current question
  const handleSelectAnswer = (value: number | string) => {
    if (!currentQuestion) return;
    const qKey = currentQuestion.id || `q_${currentIndex}`;
    setAnswers(prev => ({
      ...prev,
      [qKey]: value,
    }));
  };

  const isCurrentAnswered = useMemo(() => {
    if (!currentQuestion) return false;
    const qKey = currentQuestion.id || `q_${currentIndex}`;
    return answers[qKey] !== undefined;
  }, [currentQuestion, answers, currentIndex]);

  const currentAnswerValue = currentQuestion 
    ? answers[currentQuestion.id || `q_${currentIndex}`]
    : undefined;

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        patientId,
        centre: centreName,
        answers,
      };

      const isOnline = await syncService.checkConnectivity();
      if (!isOnline) {
        // Enregistrer dans la file d'attente hors-ligne
        await syncService.addToQueue({
          type: 'SUBMIT_ASSESSMENT',
          payload: {
            questionnaireKey,
            ...payload,
          },
        });

        // Calcul local du score
        let localScore = 0;
        Object.values(answers).forEach((val) => {
          if (typeof val === 'number') localScore += val;
        });

        const localResult: SubmissionResponse = {
          success: true,
          submissionId: Date.now(),
          patientId,
          overallScore: localScore,
          scores: [
            {
              scale: questionnaireKey,
              value: localScore,
              interpretation: localScore > 8 ? 'Score élevé (Sauvegardé hors-ligne)' : 'Score dans la norme (Sauvegardé hors-ligne)',
              severityLabel: localScore > 12 ? 'Élevé' : localScore > 6 ? 'Modéré' : 'Faible',
            }
          ],
          message: 'Évaluation enregistrée localement. Elle sera synchronisée dès le retour du réseau.',
        };

        return localResult;
      }

      return agentService.submitEvaluation(questionnaireKey, payload);
    },
    onSuccess: (data) => {
      setResultData(data);
      setShowResultModal(true);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['pro_patient', String(patientId)] });
      queryClient.invalidateQueries({ queryKey: ['pro_patient_timeline', String(patientId)] });
    },
    onError: (error: any) => {
      Alert.alert(
        lang === 'en' ? 'Submission error' : 'Erreur',
        error.message || (lang === 'en' ? 'Failed to save evaluation.' : "Échec de l'enregistrement de l'évaluation.")
      );
    },
  });

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Last question reached, ask to submit
      if (!isCurrentAnswered) {
        Alert.alert(
          lang === 'en' ? 'Attention' : 'Attention',
          lang === 'en'
            ? 'Please answer this question before submitting.'
            : 'Veuillez répondre à cette question avant de soumettre.'
        );
        return;
      }
      submitMutation.mutate();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const progressPercent = totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0;

  const primaryScore = resultData?.overallScore ?? (resultData?.scores && resultData.scores[0]?.value) ?? 'N/A';
  const primarySeverity = (resultData?.scores && resultData.scores[0]?.severityLabel) || (resultData?.scores && resultData.scores[0]?.semanticLevel) || null;
  const primaryInterpretation = (resultData?.scores && resultData.scores[0]?.interpretation) || resultData?.message || null;

  if (isLoading && !questionnaire) {
    return (
      <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00A651" />
          <Text style={[styles.loadingText, isDark && { color: colors.textSecondary }]}>
            {lang === 'en' ? 'Loading clinical questionnaire...' : 'Chargement du questionnaire clinique...'}
          </Text>
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
          <Text style={[styles.headerSubtitle, isDark && { color: colors.textSecondary }]} numberOfLines={1}>
            {lang === 'en' ? 'Patient' : 'Patient'} : {patientName} {centreName ? `• ${centreName}` : ''}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressContainer, isDark && { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.progressInfoRow}>
          <Text style={[styles.progressStepText, isDark && { color: colors.textSecondary }]}>
            Question {currentIndex + 1} {lang === 'en' ? 'of' : 'sur'} {totalQuestions}
          </Text>
          <Text style={styles.progressPercentText}>{progressPercent}%</Text>
        </View>
        <View style={[styles.progressBarTrack, isDark && { backgroundColor: colors.border }]}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Question Content */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Sélecteur de langue */}
        <AssessmentLanguageSelector
          language={lang}
          onLanguageChange={setLang}
          style={{ marginBottom: 12 }}
        />

        {currentQuestion ? (
          <View style={[styles.questionCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            {!!currentQuestion.section_title && (
              <View style={[styles.sectionBadge, isDark && { backgroundColor: colors.bgSecondary }]}>
                <Text style={[styles.sectionBadgeText, isDark && { color: colors.textSecondary }]}>{currentQuestion.section_title}</Text>
              </View>
            )}

            <Text style={[styles.questionText, isDark && { color: colors.text }]}>
              {displayQuestionText}
            </Text>

            {/* Options List */}
            <View style={styles.optionsList}>
              {displayOptions.map((opt, idx) => {
                const isSelected = currentAnswerValue === opt.value;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.optionCard,
                      isDark && { backgroundColor: colors.bgSecondary, borderColor: colors.border },
                      isSelected && styles.optionCardSelected
                    ]}
                    onPress={() => handleSelectAnswer(opt.value)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.radioCircle,
                      isSelected && styles.radioCircleSelected
                    ]}>
                      {isSelected && <View style={styles.radioInnerCircle} />}
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
          </View>
        ) : (
          <View style={styles.emptyQuestionBox}>
            <Text style={styles.emptyQuestionText}>Aucune question disponible.</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Footer */}
      <View style={styles.bottomFooter}>
        <TouchableOpacity
          style={[styles.navButton, styles.prevButton, currentIndex === 0 && styles.buttonDisabled]}
          onPress={handlePrev}
          disabled={currentIndex === 0}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color={currentIndex === 0 ? '#94a3b8' : '#0f172a'} style={{ marginRight: 4 }} />
          <Text style={[styles.navButtonText, currentIndex === 0 && styles.buttonTextDisabled]}>Précédent</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.nextButton,
            !isCurrentAnswered && styles.buttonDisabled
          ]}
          onPress={handleNext}
          disabled={!isCurrentAnswered || submitMutation.isPending}
          activeOpacity={0.8}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {currentIndex === totalQuestions - 1 ? 'Valider' : 'Suivant'}
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

      {/* RESULT MODAL */}
      <Modal visible={showResultModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.resultModalCard}>
            <View style={styles.resultIconContainer}>
              <CheckCircle2 size={54} color="#00A651" />
            </View>

            <Text style={styles.resultModalTitle}>Évaluation Terminée !</Text>
            <Text style={styles.resultModalSubtitle}>
              Les réponses ont été enregistrées pour {patientName}.
            </Text>

            {/* Score Summary Box */}
            <View style={styles.scoreBox}>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Score Global Obtenu</Text>
                <Text style={styles.scoreValue}>{String(primaryScore)}</Text>
              </View>

              {!!primarySeverity && (
                <View style={styles.severityRow}>
                  <Text style={styles.severityLabel}>Niveau de sévérité clinique :</Text>
                  <View style={[
                    styles.severityBadge,
                    primarySeverity.toLowerCase().includes('élevé') ? styles.sevHigh :
                    primarySeverity.toLowerCase().includes('modéré') ? styles.sevMedium : styles.sevLow
                  ]}>
                    <Text style={styles.severityBadgeText}>{primarySeverity}</Text>
                  </View>
                </View>
              )}

              {!!primaryInterpretation && (
                <Text style={styles.interpretationText}>{primaryInterpretation}</Text>
              )}
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={() => {
                setShowResultModal(false);
                router.replace(`/(specialist)/patients/${patientId}` as any);
              }}
            >
              <User size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.modalPrimaryButtonText}>Voir la fiche du patient</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={() => {
                setShowResultModal(false);
                router.replace('/(specialist)/dashboard');
              }}
            >
              <Text style={styles.modalSecondaryButtonText}>Retour au tableau de bord</Text>
            </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  progressContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressStepText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00A651',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00A651',
    borderRadius: 3,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
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
    fontWeight: '700',
    color: '#00A651',
  },
  questionText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
    lineHeight: 24,
    marginBottom: 20,
  },
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  optionCardSelected: {
    backgroundColor: '#ecfdf5',
    borderColor: '#00A651',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioCircleSelected: {
    borderColor: '#00A651',
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00A651',
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  optionLabelSelected: {
    color: '#065f46',
    fontWeight: '700',
  },
  emptyQuestionBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyQuestionText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  bottomFooter: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
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
  },
  buttonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  buttonTextDisabled: {
    color: '#94a3b8',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  resultIconContainer: {
    marginBottom: 16,
  },
  resultModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  resultModalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  scoreBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00A651',
  },
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  severityLabel: {
    fontSize: 12.5,
    color: '#64748b',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sevLow: {
    backgroundColor: '#ecfdf5',
  },
  sevMedium: {
    backgroundColor: '#fffbeb',
  },
  sevHigh: {
    backgroundColor: '#fef2f2',
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  interpretationText: {
    fontSize: 12.5,
    color: '#475569',
    marginTop: 10,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  modalPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    marginBottom: 10,
  },
  modalPrimaryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalSecondaryButton: {
    paddingVertical: 12,
  },
  modalSecondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
});
