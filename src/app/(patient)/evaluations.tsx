import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ClipboardList,
  Calendar,
  Sparkles,
  ChevronRight,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Video,
  Play,
  ArrowLeft,
  ArrowRight,
  Check,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { patientService, AssessmentItem } from '../../services/patient';
import { useTheme } from '../../context/ThemeContext';
import {
  AssessmentLanguage,
  getLocalizedQuestionnaire,
} from '../../constants/bilingualQuestionnaires';
import { AssessmentLanguageSelector } from '../../components/AssessmentLanguageSelector';

// Outils d'évaluation certifiés disponibles pour le patient
interface ToolDef {
  key: string;
  title: string;
  category: string;
  description: string;
  options: { label: string; value: number }[];
  questions: string[];
  interpret: (score: number) => { level: string; message: string; needConsult: boolean };
}

const EVALUATION_TOOLS: ToolDef[] = [
  {
    key: 'phq9',
    title: 'PHQ-9 • Humeur & Dépression',
    category: 'Santé émotionnelle',
    description: 'Évaluez la présence et l’intensité des symptômes dépressifs sur les 2 dernières semaines.',
    options: [
      { label: 'Jamais', value: 0 },
      { label: 'Plusieurs jours', value: 1 },
      { label: 'Plus de la moitié du temps', value: 2 },
      { label: 'Presque tous les jours', value: 3 },
    ],
    questions: [
      'Avoir peu d’intérêt ou de plaisir à faire les choses',
      'Vous sentir triste, déprimé(e) ou désespéré(e)',
      'Difficultés à vous endormir, réveils fréquents ou trop dormir',
      'Vous sentir fatigué(e) ou manquer d’énergie',
      'Manque d’appétit ou manger de manière excessive',
      'Avoir une mauvaise image de vous-même ou sentiment d’échec',
      'Difficultés de concentration (lecture, travail, télévision)',
      'Ralentissement physique ou au contraire grande agitation motrice',
      'Pensées sombres ou sentiment que vous seriez mieux mort(e)',
    ],
    interpret: (score: number) => {
      if (score <= 4) {
        return {
          level: 'Faible',
          message: 'Symptômes minimes ou absents. Votre équilibre émotionnel est globalement stable.',
          needConsult: false,
        };
      } else if (score <= 9) {
        return {
          level: 'Léger',
          message: 'Légère baisse de moral. Prenez du temps pour vous reposer et pratiquer des activités ressourçantes.',
          needConsult: false,
        };
      } else if (score <= 14) {
        return {
          level: 'Modéré',
          message: 'Symptômes dépressifs notables. Un échange avec un professionnel de santé mentale est vivement recommandé.',
          needConsult: true,
        };
      } else {
        return {
          level: 'Élevé',
          message: 'Symptômes sévères nécessitant une prise en charge médicale et un accompagnement spécialisé sans attendre.',
          needConsult: true,
        };
      }
    },
  },
  {
    key: 'gad7',
    title: 'GAD-7 • Anxiété & Stress',
    category: 'Gestion de l’anxiété',
    description: 'Mesurez votre niveau d’anxiété, de nervosité et de tension au quotidien.',
    options: [
      { label: 'Pas du tout', value: 0 },
      { label: 'Plusieurs jours', value: 1 },
      { label: 'Plus de la moitié du temps', value: 2 },
      { label: 'Presque tous les jours', value: 3 },
    ],
    questions: [
      'Sentiment de nervosité, d’anxiété ou d’être sur le qui-vive',
      'Incapacité à arrêter de vous inquiéter ou à contrôler vos angoisses',
      'Inquiétudes excessives à propos de divers sujets',
      'Grande difficulté à vous détendre et vous relaxer',
      'Être si agité(e) qu’il est difficile de rester en place',
      'Devenir facilement agacé(e) ou irritable',
      'Peur panique que quelque chose de terrible se produise',
    ],
    interpret: (score: number) => {
      if (score <= 4) {
        return {
          level: 'Faible',
          message: 'Niveau d’anxiété dans la norme. Pas de trouble anxieux significatif décelé.',
          needConsult: false,
        };
      } else if (score <= 9) {
        return {
          level: 'Léger',
          message: 'Anxiété légère. La relaxation, le sommeil et la respiration peuvent vous aider.',
          needConsult: false,
        };
      } else if (score <= 14) {
        return {
          level: 'Modéré',
          message: 'Niveau d’anxiété significatif impactant votre quotidien. Une téléconsultation est recommandée.',
          needConsult: true,
        };
      } else {
        return {
          level: 'Élevé',
          message: 'Anxiété sévère. Il est conseillé de consulter rapidement un médecin ou psychologue.',
          needConsult: true,
        };
      }
    },
  },
  {
    key: 'ods',
    title: 'ODS • Bien-être & Santé Globale',
    category: 'Bilan général TILA',
    description: 'Outil de dépistage standardisé du bien-être psychologique global.',
    options: [
      { label: 'Jamais', value: 0 },
      { label: 'Parfois', value: 1 },
      { label: 'Souvent', value: 2 },
      { label: 'Très souvent', value: 3 },
    ],
    questions: [
      'Avez-vous ressenti un sentiment de bien-être et de sérénité récemment ?',
      'Avez-vous réussi à faire face aux difficultés habituelles de la vie ?',
      'Avez-vous ressenti du soutien de la part de vos proches ?',
      'Avez-vous souffert d’insomnies ou de cauchemars récurrents ?',
      'Avez-vous ressenti des douleurs physiques sans cause médicale claire ?',
      'Avez-vous perdu confiance en vous ou en vos capacités ?',
      'Avez-vous eu l’impression d’être dépassé(e) par vos obligations ?',
    ],
    interpret: (score: number) => {
      if (score <= 6) {
        return {
          level: 'Faible',
          message: 'Bon équilibre global de bien-être mental et psychosocial.',
          needConsult: false,
        };
      } else if (score <= 12) {
        return {
          level: 'Modéré',
          message: 'Présence de tensions modérées. Un bilan avec un professionnel peut vous soulager.',
          needConsult: true,
        };
      } else {
        return {
          level: 'Élevé',
          message: 'Niveau de détresse psychologique important justifiant un soutien médical.',
          needConsult: true,
        };
      }
    },
  },
];

export default function PatientEvaluations() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [lang, setLang] = useState<AssessmentLanguage>('fr');
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // États pour le flux d'auto-évaluation interactif
  const [isSelectToolOpen, setIsSelectToolOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolDef | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [evaluationResult, setEvaluationResult] = useState<{
    score: number;
    maxScore: number;
    level: string;
    message: string;
    needConsult: boolean;
    toolTitle: string;
  } | null>(null);

  const fetchAssessments = async () => {
    try {
      const data: any = await patientService.recentAssessments();
      const arr = Array.isArray(data) ? data : (data?.items || []);
      setAssessments(arr);
    } catch (e) {
      console.warn('[PatientEvaluations] Erreur:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAssessments();
  };

  // Démarrer une nouvelle auto-évaluation
  const handleStartTool = (tool: ToolDef) => {
    setActiveTool(tool);
    setCurrentQuestionIdx(0);
    setAnswers({});
    setEvaluationResult(null);
    setIsSelectToolOpen(false);
  };

  // Enregistrer une réponse
  const handleAnswerQuestion = (value: number) => {
    setAnswers((prev) => ({ ...prev, [currentQuestionIdx]: value }));
  };

  // Passer à la question suivante ou terminer
  const handleNextQuestion = () => {
    if (!activeTool) return;
    const content = getLocalizedQuestionnaire(activeTool.key, lang);
    const questionsList = content?.questions || activeTool.questions;

    if (currentQuestionIdx < questionsList.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
    } else {
      // Calcul du score final
      let total = 0;
      for (let i = 0; i < questionsList.length; i++) {
        total += answers[i] ?? 0;
      }
      const maxScore = questionsList.length * 3;
      const interpretation = content
        ? content.interpret(total)
        : activeTool.interpret(total);

      const result = {
        score: total,
        maxScore,
        level: (interpretation as any).levelLabel || (interpretation as any).level,
        message: interpretation.message,
        needConsult: interpretation.needConsult,
        toolTitle: content?.title || activeTool.title,
      };

      setEvaluationResult(result);

      // Ajouter localement à l'historique
      const newAssessmentItem: AssessmentItem = {
        id: Date.now(),
        type: content?.title || activeTool.title,
        date: new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR'),
        score: total,
        level: (interpretation as any).levelLabel || (interpretation as any).level,
        interpretation: interpretation.message,
      };
      setAssessments((prev) => [newAssessmentItem, ...prev]);

      // Persister pour transmission lors de la prise de RDV
      try {
        AsyncStorage.setItem('@patient_last_self_assessment', JSON.stringify(newAssessmentItem));
        AsyncStorage.getItem('@patient_self_assessments').then((raw) => {
          const list = raw ? JSON.parse(raw) : [];
          AsyncStorage.setItem('@patient_self_assessments', JSON.stringify([newAssessmentItem, ...list]));
        });
      } catch (e) {
        console.warn('Erreur sauvegarde auto-évaluation:', e);
      }
    }
  };

  const handleCloseRunner = () => {
    setActiveTool(null);
    setEvaluationResult(null);
    setCurrentQuestionIdx(0);
    setAnswers({});
  };

  const handleBookTeleconsultation = () => {
    handleCloseRunner();
    router.push('/(patient)/appointments');
  };

  const getSeverityStyle = (level?: string) => {
    switch (level) {
      case 'Faible':
      case 'Normal':
        return { bg: '#ecfdf5', text: '#00A651', border: '#a7f3d0' };
      case 'Léger':
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
      case 'Modéré':
        return { bg: '#fef3c7', text: '#d97706', border: '#fde68a' };
      case 'Élevé':
      case 'Sévère':
      case 'Très élevé':
        return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' };
      default:
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]} edges={['bottom']}>
      {/* 1. Bouton CTA Principal : Faire une auto-évaluation */}
      <View
        style={[
          styles.ctaBanner,
          isDark && {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.ctaBannerContent}>
          <View style={styles.ctaBadge}>
            <Sparkles size={13} color="#00A651" style={{ marginRight: 4 }} />
            <Text style={styles.ctaBadgeText}>Auto-Évaluation Gratuite</Text>
          </View>
          <Text style={[styles.ctaTitle, isDark && { color: colors.text }]}>Faire un bilan de santé mentale</Text>
          <Text style={[styles.ctaSubtitle, isDark && { color: colors.textSecondary }]}>
            Évaluez vos ressentis en 3 minutes grâce aux outils médicaux reconnus (PHQ-9, GAD-7, ODS).
          </Text>
        </View>

        <TouchableOpacity
          style={styles.startCtaBtn}
          onPress={() => setIsSelectToolOpen(true)}
          activeOpacity={0.85}
        >
          <Play size={16} color="#ffffff" fill="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.startCtaBtnText}>Commencer une évaluation</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Liste de l'historique des bilans */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00A651" />
          <Text style={[styles.loadingText, isDark && { color: colors.textSecondary }]}>Chargement de vos évaluations...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#00A651" />
          }
        >
          <View style={styles.sectionHeaderRow}>
            <ClipboardList size={18} color="#00A651" />
            <Text style={[styles.sectionTitle, isDark && { color: colors.text }]}>Historique de mes bilans ({assessments.length})</Text>
          </View>

          {assessments.length === 0 ? (
            <View style={[styles.emptyCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ClipboardList size={44} color="#cbd5e1" style={{ marginBottom: 10 }} />
              <Text style={[styles.emptyTitle, isDark && { color: colors.text }]}>Aucune évaluation enregistrée</Text>
              <Text style={[styles.emptySub, isDark && { color: colors.textSecondary }]}>
                Cliquez sur le bouton ci-dessus pour réaliser votre premier bilan émotionnel.
              </Text>
            </View>
          ) : (
            assessments.map((item, index) => {
              const sev = getSeverityStyle(item.level);

              return (
                <TouchableOpacity
                  key={item.id || index}
                  style={[styles.card, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setSelectedAssessment(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.iconWrap}>
                      <ClipboardList size={18} color="#00A651" />
                    </View>
                    <View style={styles.cardHeaderMeta}>
                      <Text style={[styles.cardTitle, isDark && { color: colors.text }]}>
                        {item.type || item.questionnaireKey || 'Bilan de santé mentale'}
                      </Text>
                      <View style={styles.dateRow}>
                        <Calendar size={13} color="#94a3b8" style={{ marginRight: 4 }} />
                        <Text style={styles.dateText}>{item.date || 'Récemment'}</Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color="#94a3b8" />
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.scoreRow}>
                      <Text style={[styles.scoreLabel, isDark && { color: colors.textSecondary }]}>Score :</Text>
                      <Text style={[styles.scoreValue, isDark && { color: colors.text }]}>{item.score ?? '-'}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: sev.bg, borderColor: sev.border }]}>
                      <Text style={[styles.badgeText, { color: sev.text }]}>
                        {item.level || 'Modéré'}
                      </Text>
                    </View>
                  </View>

                  {item.interpretation ? (
                    <Text style={[styles.interpretationSnippet, isDark && { color: colors.textSecondary }]} numberOfLines={2}>
                      {item.interpretation}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* 3. Modal Choix de l'Outil Clinique */}
      <Modal visible={isSelectToolOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={[styles.modalContainer, isDark && { backgroundColor: colors.bg }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, isDark && { color: colors.text }]}>
                  {lang === 'en' ? 'Choose a self-assessment' : 'Choisir une auto-évaluation'}
                </Text>
                <Text style={[styles.modalSubtitle, isDark && { color: colors.textSecondary }]}>
                  {lang === 'en' ? 'Certified and confidential clinical tools' : 'Outils certifiés et confidentiels'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsSelectToolOpen(false)}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <X size={20} color={isDark ? colors.text : '#0f172a'} />
              </TouchableOpacity>
            </View>

            {/* Sélecteur de Langue FR / EN */}
            <AssessmentLanguageSelector
              language={lang}
              onLanguageChange={setLang}
              style={{ marginBottom: 14 }}
            />

            <ScrollView contentContainerStyle={styles.toolsList} showsVerticalScrollIndicator={false}>
              {EVALUATION_TOOLS.map((tool) => {
                const loc = getLocalizedQuestionnaire(tool.key, lang);
                const toolTitle = loc?.title || tool.title;
                const toolCategory = loc?.category || tool.category;
                const toolDesc = loc?.description || tool.description;
                const questionsCount = loc?.questions.length || tool.questions.length;

                return (
                  <TouchableOpacity
                    key={tool.key}
                    style={[
                      styles.toolCard,
                      isDark && { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                    onPress={() => handleStartTool(tool)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.toolCardTop}>
                      <View style={styles.toolCategoryBadge}>
                        <Text style={styles.toolCategoryText}>{toolCategory}</Text>
                      </View>
                      <Text style={[styles.toolQuestionsCount, isDark && { color: colors.textSecondary }]}>
                        {questionsCount} {lang === 'en' ? 'questions' : 'questions'}
                      </Text>
                    </View>
                    <Text style={[styles.toolTitle, isDark && { color: colors.text }]}>{toolTitle}</Text>
                    <Text style={[styles.toolDesc, isDark && { color: colors.textSecondary }]}>{toolDesc}</Text>
                    <View style={styles.toolCardFooter}>
                      <Text style={styles.toolStartText}>
                        {lang === 'en' ? 'Start test →' : 'Démarrer le test →'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* 4. Modal de Passation de l'Évaluation (Runner) & Résultat */}
      <Modal visible={!!activeTool} animationType="slide">
        <SafeAreaView style={[styles.runnerContainer, isDark && { backgroundColor: colors.bg }]}>
          {(() => {
            const locContent = activeTool ? getLocalizedQuestionnaire(activeTool.key, lang) : null;
            const currentQuestions = locContent?.questions || (activeTool?.questions.map((q, i) => ({ id: `q${i+1}`, text: q })) || []);
            const currentOptions = locContent?.options || activeTool?.options || [];
            const currentTitle = locContent?.title || activeTool?.title || '';

            if (evaluationResult) {
              return (
                /* ÉCRAN DE RÉSULTATS IMMÉDIAT */
                <ScrollView contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>
                  <View style={[styles.resultCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.resultIconWrap}>
                      <CheckCircle2 size={48} color="#00A651" />
                    </View>
                    <Text style={[styles.resultHeaderTitle, isDark && { color: colors.text }]}>
                      {lang === 'en' ? 'Assessment Completed' : 'Évaluation Terminée'}
                    </Text>
                    <Text style={styles.resultToolTitle}>{evaluationResult.toolTitle}</Text>

                    {/* Score Total */}
                    <View style={styles.scoreBox}>
                      <Text style={[styles.scoreBoxNumber, isDark && { color: colors.text }]}>
                        {evaluationResult.score} <Text style={styles.scoreBoxMax}>/ {evaluationResult.maxScore}</Text>
                      </Text>
                      <View
                        style={[
                          styles.resultBadge,
                          {
                            backgroundColor: getSeverityStyle(evaluationResult.level).bg,
                            borderColor: getSeverityStyle(evaluationResult.level).border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.resultBadgeText,
                            { color: getSeverityStyle(evaluationResult.level).text },
                          ]}
                        >
                          {lang === 'en' ? 'Level: ' : 'Niveau constaté : '}{evaluationResult.level}
                        </Text>
                      </View>
                    </View>

                    {/* Message d'interprétation */}
                    <View style={[styles.interpretationCard, isDark && { backgroundColor: colors.bgSecondary }]}>
                      <Text style={[styles.interpretationTitle, isDark && { color: colors.text }]}>
                        {lang === 'en' ? 'Clinical Insights & Feedback' : 'Interprétation bienveillante'}
                      </Text>
                      <Text style={[styles.interpretationBody, isDark && { color: colors.textSecondary }]}>
                        {evaluationResult.message}
                      </Text>
                    </View>

                    {/* BOUTON PRENDRE RENDEZ-VOUS EN TÉLÉCONSULTATION */}
                    <TouchableOpacity
                      style={styles.teleconsultBtn}
                      onPress={handleBookTeleconsultation}
                      activeOpacity={0.85}
                    >
                      <Video size={18} color="#ffffff" style={{ marginRight: 8 }} />
                      <Text style={styles.teleconsultBtnText}>
                        {lang === 'en' ? 'Schedule a teleconsultation' : 'Prendre rendez-vous en téléconsultation'}
                      </Text>
                    </TouchableOpacity>

                    {/* Bouton Fermer */}
                    <TouchableOpacity
                      style={[styles.finishBtn, isDark && { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
                      onPress={handleCloseRunner}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.finishBtnText, isDark && { color: colors.text }]}>
                        {lang === 'en' ? 'Close & View History' : 'Fermer et voir mon historique'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              );
            }

            if (!activeTool) return null;

            return (
              /* ÉCRAN DU QUESTIONNAIRE ACTIF */
              <View style={{ flex: 1, padding: 18 }}>
                {/* Runner Top Bar */}
                <View style={styles.runnerTopBar}>
                  <TouchableOpacity onPress={handleCloseRunner} style={styles.closeBtn}>
                    <X size={20} color={isDark ? colors.text : '#0f172a'} />
                  </TouchableOpacity>
                  <Text style={[styles.runnerToolHeader, isDark && { color: colors.text }]}>
                    {currentTitle}
                  </Text>
                  <Text style={[styles.runnerProgressCounter, isDark && { color: colors.textSecondary }]}>
                    {currentQuestionIdx + 1}/{currentQuestions.length}
                  </Text>
                </View>

                {/* Sélecteur de Langue dynamique en cours d'évaluation */}
                <AssessmentLanguageSelector
                  language={lang}
                  onLanguageChange={setLang}
                  style={{ marginVertical: 8 }}
                />

                {/* Barre de progression */}
                <View style={[styles.progressBarTrack, isDark && { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${((currentQuestionIdx + 1) / currentQuestions.length) * 100}%`,
                      },
                    ]}
                  />
                </View>

                {/* Question */}
                <View style={[styles.questionCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={styles.questionNumberText}>
                    Question {currentQuestionIdx + 1}
                  </Text>
                  <Text style={[styles.questionText, isDark && { color: colors.text }]}>
                    {currentQuestions[currentQuestionIdx]?.text || ''}
                  </Text>
                </View>

                {/* Options de réponse */}
                <ScrollView contentContainerStyle={styles.optionsList} showsVerticalScrollIndicator={false}>
                  {currentOptions.map((opt) => {
                    const isSelected = answers[currentQuestionIdx] === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.optionBtn,
                          isDark && { backgroundColor: colors.card, borderColor: colors.border },
                          isSelected && styles.optionBtnSelected,
                        ]}
                        onPress={() => handleAnswerQuestion(opt.value)}
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
                </ScrollView>

                {/* Runner Footer Controls */}
                <View style={styles.runnerFooter}>
                  {currentQuestionIdx > 0 && (
                    <TouchableOpacity
                      style={[styles.navBackBtn, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => setCurrentQuestionIdx((p) => p - 1)}
                      activeOpacity={0.7}
                    >
                      <ArrowLeft size={16} color={isDark ? colors.textSecondary : '#64748b'} style={{ marginRight: 6 }} />
                      <Text style={[styles.navBackBtnText, isDark && { color: colors.textSecondary }]}>
                        {lang === 'en' ? 'Previous' : 'Précédent'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.navNextBtn,
                      answers[currentQuestionIdx] === undefined && { opacity: 0.5 },
                    ]}
                    onPress={handleNextQuestion}
                    disabled={answers[currentQuestionIdx] === undefined}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.navNextBtnText}>
                      {currentQuestionIdx === currentQuestions.length - 1
                        ? (lang === 'en' ? 'See my final score' : 'Voir mon score final')
                        : (lang === 'en' ? 'Next' : 'Suivant')}
                    </Text>
                    <ArrowRight size={16} color="#ffffff" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })()}
        </SafeAreaView>
      </Modal>

      {/* 5. Modal Détail Évaluation Passée */}
      <Modal visible={!!selectedAssessment} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.modalTitle}>
                  {selectedAssessment?.type || selectedAssessment?.questionnaireKey || 'Détails du Bilan'}
                </Text>
                <Text style={styles.modalSubtitle}>Date : {selectedAssessment?.date || 'N/A'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedAssessment(null)}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <X size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedAssessment && (
                <>
                  <View style={styles.modalScoreCard}>
                    <Text style={styles.modalScoreLabel}>Score total enregistré</Text>
                    <Text style={styles.modalScoreNumber}>{selectedAssessment.score ?? '-'}</Text>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: getSeverityStyle(selectedAssessment.level).bg,
                          borderColor: getSeverityStyle(selectedAssessment.level).border,
                          alignSelf: 'center',
                          marginTop: 6,
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: getSeverityStyle(selectedAssessment.level).text, fontSize: 13 },
                        ]}
                      >
                        {selectedAssessment.level || 'Résultat standard'}
                      </Text>
                    </View>
                  </View>

                  {selectedAssessment.interpretation ? (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Interprétation clinique</Text>
                      <Text style={styles.modalSectionText}>{selectedAssessment.interpretation}</Text>
                    </View>
                  ) : null}

                  {/* Possibilité de planifier une téléconsultation depuis l'historique */}
                  <TouchableOpacity
                    style={styles.teleconsultBtn}
                    onPress={() => {
                      setSelectedAssessment(null);
                      router.push('/(patient)/appointments');
                    }}
                    activeOpacity={0.85}
                  >
                    <Video size={18} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.teleconsultBtnText}>Prendre rendez-vous en téléconsultation</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
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
  ctaBanner: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    backgroundColor: '#f0fdf4',
  },
  ctaBannerContent: {
    marginBottom: 14,
  },
  ctaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  ctaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  ctaSubtitle: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    fontFamily: 'Montserrat_400Regular',
  },
  startCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    borderRadius: 12,
    paddingVertical: 12,
  },
  startCtaBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 36,
    gap: 12,
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardHeaderMeta: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dateText: {
    fontSize: 11.5,
    color: '#94a3b8',
    fontFamily: 'Montserrat_400Regular',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreLabel: {
    fontSize: 12.5,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  scoreValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  interpretationSnippet: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginTop: 8,
    fontFamily: 'Montserrat_400Regular',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 10,
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
    lineHeight: 18,
    fontFamily: 'Montserrat_400Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  toolsList: {
    padding: 16,
    gap: 12,
  },
  toolCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toolCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toolCategoryBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  toolCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  toolQuestionsCount: {
    fontSize: 11.5,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  toolDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 10,
    fontFamily: 'Montserrat_400Regular',
  },
  toolCardFooter: {
    alignItems: 'flex-end',
  },
  toolStartText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  runnerContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  runnerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  runnerToolHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  runnerProgressCounter: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00A651',
    borderRadius: 3,
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  questionNumberText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#00A651',
    marginBottom: 6,
    fontFamily: 'Montserrat_700Bold',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 22,
    fontFamily: 'Montserrat_700Bold',
  },
  optionsList: {
    gap: 10,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  optionBtnSelected: {
    borderColor: '#00A651',
    backgroundColor: '#ecfdf5',
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
  optionLabel: {
    fontSize: 14,
    color: '#334155',
    fontFamily: 'Montserrat_500Medium',
  },
  optionLabelSelected: {
    color: '#0f172a',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  runnerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    gap: 12,
  },
  navBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  navBackBtnText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  navNextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    borderRadius: 10,
    paddingVertical: 12,
  },
  navNextBtnText: {
    fontSize: 13.5,
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  resultContent: {
    padding: 20,
    alignItems: 'center',
  },
  resultCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultIconWrap: {
    marginBottom: 12,
  },
  resultHeaderTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  resultToolTitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    fontFamily: 'Montserrat_500Medium',
  },
  scoreBox: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scoreBoxNumber: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  scoreBoxMax: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
  resultBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  resultBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  interpretationCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 20,
  },
  interpretationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
    textTransform: 'uppercase',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  interpretationBody: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
    fontFamily: 'Montserrat_400Regular',
  },
  teleconsultBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 10,
    elevation: 2,
  },
  teleconsultBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
  },
  finishBtn: {
    paddingVertical: 12,
  },
  finishBtnText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  modalBody: {
    padding: 20,
    paddingBottom: 36,
  },
  modalScoreCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalScoreLabel: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  modalScoreNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    fontFamily: 'Montserrat_700Bold',
  },
  modalSectionText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    fontFamily: 'Montserrat_400Regular',
  },
});
