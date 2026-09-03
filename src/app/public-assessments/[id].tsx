import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Heart,
  UserPlus,
  LogIn,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Calendar,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../services/apiClient';
import { useTheme } from '../../context/ThemeContext';
import {
  AssessmentLanguage,
  getLocalizedQuestionnaire,
} from '../../constants/bilingualQuestionnaires';
import { AssessmentLanguageSelector } from '../../components/AssessmentLanguageSelector';

interface QuestionItem {
  id: string;
  text: string;
  dimension?: string;
}

interface QuestionnaireConfig {
  id: string;
  title: string;
  subtitle: string;
  instructions: string;
  options: Array<{ value: number; label: string }>;
  questions: QuestionItem[];
  calculateScore: (answers: Record<string, number>) => {
    total: number;
    maxScore: number;
    level: 'normal' | 'moderate' | 'elevated';
    levelLabel: string;
    levelColor: string;
    levelBg: string;
    interpretation: string;
    recommendations: string[];
    subscales?: Array<{ name: string; score: number; max: number }>;
  };
}

const QUESTIONNAIRES: Record<string, QuestionnaireConfig> = {
  ods: {
    id: 'ods',
    title: 'ODS / BMH-MWT',
    subtitle: 'Dépistage des Troubles Mentaux Courants',
    instructions:
      'Au cours des 2 dernières semaines, à quelle fréquence avez-vous été gêné(e) par les problèmes suivants ?',
    options: [
      { value: 0, label: 'Jamais' },
      { value: 1, label: 'Quelques jours' },
      { value: 2, label: 'Plus de la moitié du temps' },
      { value: 3, label: 'Presque tous les jours' },
    ],
    questions: [
      { id: 'q1', text: 'Peu d’intérêt ou de plaisir à faire les choses habituelles.', dimension: 'Humeur' },
      { id: 'q2', text: 'Sentiment d’être triste, déprimé(e) ou désespéré(e).', dimension: 'Humeur' },
      { id: 'q3', text: 'Difficultés à vous endormir, réveils fréquents ou sommeil excessif.', dimension: 'Sommeil' },
      { id: 'q4', text: 'Sensation de fatigue permanente ou manque d’énergie au quotidien.', dimension: 'Énergie' },
      { id: 'q5', text: 'Perte d’appétit ou tendance excessive à trop manger.', dimension: 'Soma' },
      { id: 'q6', text: 'Mauvaise image de vous-même, sentiment d’échec ou de déception envers vos proches.', dimension: 'Estime' },
      { id: 'q7', text: 'Difficultés à vous concentrer sur la lecture, le travail ou les discussions.', dimension: 'Cognition' },
      { id: 'q8', text: 'Lenteur inhabituelle dans vos mouvements ou au contraire agitation motrice.', dimension: 'Moteur' },
      { id: 'q9', text: 'Sentiment d’angoisse, nervosité ou tension intérieure vive.', dimension: 'Anxiété' },
      { id: 'q10', text: 'Consommation d’alcool ou de substances pour calmer vos inquiétudes.', dimension: 'Addiction' },
      { id: 'q11', text: 'Pensées que vous seriez mieux mort(e) ou envie de vous faire du mal.', dimension: 'Urgence' },
    ],
    calculateScore: (answers) => {
      const values = Object.values(answers);
      const total = values.reduce((a, b) => a + b, 0);
      const maxScore = 33;
      const hasSuicidalThoughts = (answers['q11'] || 0) > 0;

      if (total >= 16 || hasSuicidalThoughts) {
        return {
          total,
          maxScore,
          level: 'elevated',
          levelLabel: hasSuicidalThoughts ? 'Alerte Clinique Immédiate' : 'Détresse Élevée',
          levelColor: '#ef4444',
          levelBg: '#fef2f2',
          interpretation:
            'Vos réponses indiquent un niveau de détresse psychologique significatif nécessitant une écoute attentive.',
          recommendations: [
            'Prenez rendez-vous sans attendre avec l’un de nos psychologues ou psychiatres TILA.',
            'Parlez de ce que vous ressentez à un proche de confiance.',
            'Ne restez pas seul(e) face à vos pensées sombres.',
          ],
        };
      }
      if (total >= 8) {
        return {
          total,
          maxScore,
          level: 'moderate',
          levelLabel: 'Détresse Modérée',
          levelColor: '#F58220',
          levelBg: '#fff7ed',
          interpretation:
            'Des symptômes d’anxiété ou de baisse de moral sont présents et méritent d’être surveillés.',
          recommendations: [
            'Un soutien psychologique préventif peut vous aider à retrouver un équilibre.',
            'Prenez du temps pour des activités relaxantes et régulez votre sommeil.',
            'Recommencez cette auto-évaluation dans 2 semaines pour observer l’évolution.',
          ],
        };
      }
      return {
        total,
        maxScore,
        level: 'normal',
        levelLabel: 'Bien-être Satisfaisant',
        levelColor: '#00A651',
        levelBg: '#ecfdf5',
        interpretation:
          'Aucun signe marquant de détresse mentale courante n’a été identifié à ce jour.',
        recommendations: [
          'Continuez à prendre soin de votre hygiène de vie et de votre entourage.',
          'N’hésitez pas à refaire un point si vous traversez une période difficile.',
        ],
      };
    },
  },
  berger: {
    id: 'berger',
    title: 'Échelle de Berger (VIH)',
    subtitle: 'Stigmatisation liée au VIH',
    instructions:
      'Indiquez votre niveau d’accord pour chacune des affirmations ci-dessous :',
    options: [
      { value: 1, label: 'Pas du tout d’accord' },
      { value: 2, label: 'Pas d’accord' },
      { value: 3, label: 'D’accord' },
      { value: 4, label: 'Tout à fait d’accord' },
    ],
    questions: [
      { id: 'q1', text: 'Certaines personnes évitent de me toucher lorsqu’elles savent que j’ai le VIH.' },
      { id: 'q2', text: 'Des personnes chères ont cessé de me contacter après avoir appris mon statut.' },
      { id: 'q3', text: 'J’ai perdu des amis en leur disant que j’avais le VIH.' },
      { id: 'q4', text: 'Dire à quelqu’un que j’ai le VIH représente un risque important.' },
      { id: 'q5', text: 'Je fais beaucoup d’efforts pour garder mon statut strictement secret.' },
      { id: 'q6', text: 'Je fais extrêmement attention à qui je confie mon statut.' },
      { id: 'q7', text: 'Les personnes vivant avec le VIH sont souvent traitées comme des exclus.' },
      { id: 'q8', text: 'La plupart des gens croient à tort qu’une personne séropositive est négligente.' },
      { id: 'q9', text: 'La plupart des gens sont mal à l’aise en présence d’une personne séropositive.' },
      { id: 'q10', text: 'Je ressens parfois un sentiment de culpabilité injustifié.' },
      { id: 'q11', text: 'L’attitude des gens par rapport au VIH me donne une image négative de moi-même.' },
      { id: 'q12', text: 'J’ai parfois l’impression de ne pas mériter autant que les autres.' },
    ],
    calculateScore: (answers) => {
      const total = Object.values(answers).reduce((a, b) => a + b, 0);
      const maxScore = 48;

      if (total >= 36) {
        return {
          total,
          maxScore,
          level: 'elevated',
          levelLabel: 'Stigmatisation Élevée',
          levelColor: '#ef4444',
          levelBg: '#fef2f2',
          interpretation:
            'Vous ressentez une forte charge liée au regard des autres ou à l’auto-stigmatisation.',
          recommendations: [
            'Rejoignez un groupe de soutien ou échangez avec un pair-éducateur TILA.',
            'Bénéficiez d’un suivi psychologique bienveillant pour renforcer votre estime.',
            'Rappelez-vous : votre statut ne définit pas votre valeur humaine.',
          ],
        };
      }
      if (total >= 25) {
        return {
          total,
          maxScore,
          level: 'moderate',
          levelLabel: 'Stigmatisation Modérée',
          levelColor: '#F58220',
          levelBg: '#fff7ed',
          interpretation:
            'Vous vivez une certaine appréhension sociale ou des inquiétudes de divulgation.',
          recommendations: [
            'Entourez-vous de personnes de confiance bien informées.',
            'Participez à des ateliers d’affirmation de soi et d’écoute.',
          ],
        };
      }
      return {
        total,
        maxScore,
        level: 'normal',
        levelLabel: 'Faible Stigmatisation',
        levelColor: '#00A651',
        levelBg: '#ecfdf5',
        interpretation:
          'Vous bénéficiez d’une bonne résilience et d’une gestion sereine de votre quotidien.',
        recommendations: [
          'Continuez à cultiver cet environnement positif et bienveillant.',
        ],
      };
    },
  },
  sdq: {
    id: 'sdq',
    title: 'SDQ (Forces et Difficultés)',
    subtitle: 'Évaluation comportementale enfants & ados',
    instructions:
      'Pour chaque affirmation concernant l’enfant ou l’adolescent au cours des 6 derniers mois :',
    options: [
      { value: 0, label: 'Pas vrai' },
      { value: 1, label: 'Un peu vrai' },
      { value: 2, label: 'Tout à fait vrai' },
    ],
    questions: [
      { id: 'q1', text: 'Attentionné(e) envers les sentiments des autres.' },
      { id: 'q2', text: 'Agité(e), remuant(e), ne tient pas en place longtemps.' },
      { id: 'q3', text: 'Se plaint souvent de maux de tête, de ventre ou de nausées.' },
      { id: 'q4', text: 'Partage volontiers avec d’autres enfants (friandises, jouets).' },
      { id: 'q5', text: 'Pique souvent des colères ou s’emporte facilement.' },
      { id: 'q6', text: 'Plutôt solitaire, a tendance à jouer seul(e).' },
      { id: 'q7', text: 'Généralement obéissant(e), fait ce que les adultes demandent.' },
      { id: 'q8', text: 'A beaucoup de soucis, paraît souvent inquiet(e).' },
      { id: 'q9', text: 'Serviable si quelqu’un est blessé ou contrarié.' },
      { id: 'q10', text: 'Constamment en mouvement ou gigote sans arrêt.' },
      { id: 'q11', text: 'A au moins un(e) bon(ne) ami(e).' },
      { id: 'q12', text: 'Se bat souvent avec d’autres enfants ou les tyrannise.' },
      { id: 'q13', text: 'Souvent triste, démoralisé(e) ou en larmes.' },
      { id: 'q14', text: 'Généralement apprécié(e) par les autres enfants.' },
      { id: 'q15', text: 'Facilement distrait(e), a du mal à se concentrer.' },
      { id: 'q16', text: 'Craintif(ve) dans de nouvelles situations, perd vite confiance.' },
      { id: 'q17', text: 'Gentil(le) avec les plus jeunes.' },
      { id: 'q18', text: 'Ment ou triche fréquemment.' },
      { id: 'q19', text: 'Victime de moqueries ou rejeté(e) par ses pairs.' },
      { id: 'q20', text: 'Se propose souvent pour aider (parents, enseignants).' },
      { id: 'q21', text: 'Réfléchit avant d’agir.' },
      { id: 'q22', text: 'Vole des choses à la maison, à l’école ou ailleurs.' },
      { id: 'q23', text: 'S’entend mieux avec les adultes qu’avec les enfants.' },
      { id: 'q24', text: 'A beaucoup de peurs, est facilement effrayé(e).' },
      { id: 'q25', text: 'Termine ce qu’il/elle entreprend, sait maintenir son attention.' },
    ],
    calculateScore: (answers) => {
      const total = Object.values(answers).reduce((a, b) => a + b, 0);
      const maxScore = 50;

      if (total >= 20) {
        return {
          total,
          maxScore,
          level: 'elevated',
          levelLabel: 'Difficultés Importantes',
          levelColor: '#ef4444',
          levelBg: '#fef2f2',
          interpretation:
            'Des difficultés émotionnelles ou relationnelles marquées nécessitent un avis pédopsychiatrique ou psychologique.',
          recommendations: [
            'Consultez un spécialiste en santé mentale de l’enfant et de l’adolescent.',
            'Échangez avec l’équipe éducative de l’école pour coordonner un accompagnement.',
          ],
        };
      }
      if (total >= 14) {
        return {
          total,
          maxScore,
          level: 'moderate',
          levelLabel: 'Zone Limite',
          levelColor: '#F58220',
          levelBg: '#fff7ed',
          interpretation:
            'Certains comportements ou inquiétudes méritent une observation attentive.',
          recommendations: [
            'Privilégiez le dialogue et les temps calmes en famille.',
            'Un bilan de soutien psychologique préventif peut être bénéfique.',
          ],
        };
      }
      return {
        total,
        maxScore,
        level: 'normal',
        levelLabel: 'Développement Harmonieux',
        levelColor: '#00A651',
        levelBg: '#ecfdf5',
        interpretation:
          'L’enfant présente un équilibre relationnel et émotionnel satisfaisant.',
        recommendations: [
          'Poursuivez les encouragements et le renforcement positif.',
        ],
      };
    },
  },
  pcl5: {
    id: 'pcl5',
    title: 'PCL-5 TERRAIN',
    subtitle: 'Trauma, TSPT & Événements stressants',
    instructions:
      'Au cours du dernier mois, à quel point avez-vous été perturbé(e) par les souvenirs d’un événement traumatisant ou éprouvant ?',
    options: [
      { value: 0, label: 'Pas du tout' },
      { value: 1, label: 'Un peu' },
      { value: 2, label: 'Moyennement' },
      { value: 3, label: 'Beaucoup' },
      { value: 4, label: 'Extrêmement' },
    ],
    questions: [
      { id: 'q1', text: 'Souvenirs répétés, involontaires et angoissants de l’événement stressant.' },
      { id: 'q2', text: 'Rêves ou cauchemars fréquents et perturbants liés à l’événement.' },
      { id: 'q3', text: 'Impression soudaine de revivre l’événement (flashbacks).' },
      { id: 'q4', text: 'Détresse émotionnelle intense lorsque quelque chose vous rappelle l’événement.' },
      { id: 'q5', text: 'Réactions physiques fortes (palpitations, sueurs) face aux rappels de l’événement.' },
      { id: 'q6', text: 'Évitement délibéré des souvenirs, pensées ou sentiments liés à l’événement.' },
      { id: 'q7', text: 'Évitement des rappels extérieurs (personnes, lieux, conversations, objets).' },
      { id: 'q8', text: 'Incapacité à vous rappeler des aspects importants de l’événement.' },
      { id: 'q9', text: 'Croyances négatives fortes sur vous-même, les autres ou le monde.' },
      { id: 'q10', text: 'Blâme envers vous-même ou les autres pour ce qui s’est passé.' },
      { id: 'q11', text: 'Émotions négatives permanentes (peur, horreur, colère, culpabilité).' },
      { id: 'q12', text: 'Perte nette d’intérêt pour les activités autrefois appréciées.' },
      { id: 'q13', text: 'Sentiment d’isolement ou de coupure vis-à-vis d’autrui.' },
      { id: 'q14', text: 'Difficultés durables à ressentir des émotions positives (amour, bonheur).' },
      { id: 'q15', text: 'Comportement irritable ou accès de colère sans motif clair.' },
      { id: 'q16', text: 'Prise de risques inconsidérés ou comportements dangereux.' },
      { id: 'q17', text: 'État d’hypervigilance permanente (toujours sur le qui-vive).' },
      { id: 'q18', text: 'Surauts exagérés au moindre bruit ou événement inattendu.' },
      { id: 'q19', text: 'Difficultés marquées de concentration.' },
      { id: 'q20', text: 'Problèmes majeurs d’endormissement ou de sommeil perturbé.' },
    ],
    calculateScore: (answers) => {
      const total = Object.values(answers).reduce((a, b) => a + b, 0);
      const maxScore = 80;

      if (total >= 33) {
        return {
          total,
          maxScore,
          level: 'elevated',
          levelLabel: 'Probable TSPT Sévère',
          levelColor: '#ef4444',
          levelBg: '#fef2f2',
          interpretation:
            'Les symptômes indiquent un impact traumatique aigu pouvant correspondre à un Trouble de Stress Post-Traumatique (TSPT).',
          recommendations: [
            'Une prise en charge psychologique spécialisée en psychotrauma est fortement recommandée.',
            'Consultez un clinicien ou un travailleur social du réseau TILA.',
            'Vous n’êtes pas seul(e) : des thérapies efficaces existent.',
          ],
        };
      }
      if (total >= 22) {
        return {
          total,
          maxScore,
          level: 'moderate',
          levelLabel: 'Symptômes Traumatiques Modérés',
          levelColor: '#F58220',
          levelBg: '#fff7ed',
          interpretation:
            'Des manifestations de stress post-événement sont notables et impactent votre quotidien.',
          recommendations: [
            'Un accompagnement d’écoute thérapeutique peut soulager ces tensions.',
            'Évitez l’isolement et parlez à des personnes bienveillantes.',
          ],
        };
      }
      return {
        total,
        maxScore,
        level: 'normal',
        levelLabel: 'Impact Traumatique Faible',
        levelColor: '#00A651',
        levelBg: '#ecfdf5',
        interpretation:
          'Les réactions face aux événements passés semblent bien intégrées.',
        recommendations: [
          'Prenez soin de votre bien-être et de votre équilibre.',
        ],
      };
    },
  },
};

export default function AssessmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { colors, isDark } = useTheme();
  const [lang, setLang] = useState<AssessmentLanguage>('fr');

  const locConfig = getLocalizedQuestionnaire(id || 'ods', lang);
  const fallbackConfig = QUESTIONNAIRES[id || 'ods'] || QUESTIONNAIRES.ods;

  const currentConfig = locConfig
    ? {
        id: locConfig.id,
        title: locConfig.title,
        subtitle: locConfig.subtitle,
        instructions: locConfig.instructions,
        options: locConfig.options,
        questions: locConfig.questions,
        calculateScore: (answers: Record<string, number>) => {
          const total = Object.values(answers).reduce((a, b) => a + b, 0);
          const maxVal = locConfig.options[locConfig.options.length - 1]?.value || 3;
          const maxScore = locConfig.questions.length * maxVal;
          const res = locConfig.interpret(total, answers);
          return {
            total,
            maxScore,
            level: res.level,
            levelLabel: res.levelLabel,
            levelColor: res.levelColor,
            levelBg: res.levelBg,
            interpretation: res.message,
            recommendations: res.recommendations,
          };
        },
      }
    : fallbackConfig;

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);

  const handleSelectAnswer = (qId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === currentConfig.questions.length;
  const progressPercent = Math.round((answeredCount / currentConfig.questions.length) * 100);

  const handleSubmit = async () => {
    if (!isComplete) {
      Alert.alert(
        lang === 'en' ? 'Incomplete questionnaire' : 'Questionnaire incomplet',
        lang === 'en'
          ? 'Please answer all questions before submitting your self-assessment.'
          : 'Veuillez répondre à toutes les questions avant de valider votre auto-évaluation.'
      );
      return;
    }

    setIsSubmitting(true);
    const scoreResult = currentConfig.calculateScore(answers);

    // Tentative de soumission à l'API Symfony
    let token = '';
    try {
      const res = await apiClient.post('/api/questionnaires/submission', {
        questionnaireKey: currentConfig.id,
        answers,
        userInfo: {},
      });
      if (res && res.evaluationToken) {
        token = res.evaluationToken;
      }
    } catch {
      // Mode hors-ligne ou fallback résilient
      token = `EVAL-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    }

    if (!token) {
      token = `EVAL-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    }

    const finalResult = {
      id: token,
      type: currentConfig.id,
      title: currentConfig.title,
      date: new Date().toISOString(),
      score: scoreResult.total,
      maxScore: scoreResult.maxScore,
      level: scoreResult.level,
      levelLabel: scoreResult.levelLabel,
      interpretation: scoreResult.interpretation,
      recommendations: scoreResult.recommendations,
      token,
    };

    try {
      await AsyncStorage.setItem('evaluation_attach_token', token);
      await AsyncStorage.setItem('evaluation_token', token);
      await AsyncStorage.setItem('@patient_last_self_assessment', JSON.stringify(finalResult));
    } catch (e) {
      console.warn('Erreur stockage token auto-évaluation:', e);
    }

    setEvaluationResult(finalResult);
    setIsSubmitting(false);
  };

  const handleRestart = () => {
    setAnswers({});
    setEvaluationResult(null);
  };

  // ÉCRAN DE RÉSULTATS AVEC OPTIONS DE CONVERSION
  if (evaluationResult) {
    const isRed = evaluationResult.level === 'elevated';
    const isOrange = evaluationResult.level === 'moderate';
    const badgeColor = isRed ? '#ef4444' : isOrange ? '#F58220' : '#00A651';
    const badgeBg = isRed ? '#fef2f2' : isOrange ? '#fff7ed' : '#ecfdf5';

    return (
      <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        {/* Header simple */}
        <View style={[styles.header, isDark && { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => router.replace('/public-assessments')}
            style={[styles.backButton, isDark && { backgroundColor: colors.bgSecondary }]}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={isDark ? colors.text : '#0f172a'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDark && { color: colors.text }]}>
            {lang === 'en' ? 'Assessment Results' : 'Résultats de l’Évaluation'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && styles.scrollContentTablet,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Carte principale de Score */}
          <View style={[styles.resultCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.scoreBadgeCircle, { backgroundColor: badgeBg }]}>
              {isRed ? (
                <AlertTriangle size={36} color={badgeColor} />
              ) : isOrange ? (
                <Sparkles size={36} color={badgeColor} />
              ) : (
                <CheckCircle2 size={36} color={badgeColor} />
              )}
            </View>

            <Text style={[styles.resultToolTitle, isDark && { color: colors.text }]}>{currentConfig.title}</Text>
            <View
              style={[
                styles.levelPill,
                { backgroundColor: badgeBg, borderColor: badgeColor },
              ]}
            >
              <Text style={[styles.levelPillText, { color: badgeColor }]}>
                {evaluationResult.levelLabel}
              </Text>
            </View>

            <View style={styles.scoreRow}>
              <Text style={[styles.scoreBigNumber, { color: badgeColor }]}>
                {evaluationResult.score}
              </Text>
              <Text style={[styles.scoreMax, isDark && { color: colors.textSecondary }]}> / {evaluationResult.maxScore}</Text>
            </View>

            <Text style={[styles.resultInterpretation, isDark && { color: colors.textSecondary }]}>
              {evaluationResult.interpretation}
            </Text>
          </View>

          {/* Recommandations Cliniques Bienveillantes */}
          <View style={[styles.recommendationsCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.recomHeader}>
              <Heart size={18} color="#00A651" style={{ marginRight: 6 }} />
              <Text style={[styles.recomTitle, isDark && { color: colors.text }]}>
                {lang === 'en' ? 'Advice & Recommendations' : 'Conseils & Recommandations'}
              </Text>
            </View>
            <View style={styles.recomList}>
              {evaluationResult.recommendations.map((rec: string, index: number) => (
                <View key={index} style={styles.recomItem}>
                  <View style={styles.bulletDot} />
                  <Text style={[styles.recomText, isDark && { color: colors.textSecondary }]}>{rec}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Section d'attachement & Conversion UX/UI Pro */}
          <View style={styles.conversionSection}>
            <View style={styles.tokenBox}>
              <ShieldCheck size={16} color="#00A651" style={{ marginRight: 6 }} />
              <Text style={styles.tokenText}>
                Réf. anonymisée :{' '}
                <Text style={{ fontWeight: '700' }}>{evaluationResult.token}</Text>
              </Text>
            </View>

            <Text style={styles.conversionDesc}>
              Ne perdez pas ces résultats précieux. Enregistrez-les dès maintenant dans votre espace sécurisé pour les partager avec votre praticien.
            </Text>

            {/* Option 1 : Conserver mes résultats & Créer mon compte */}
            <TouchableOpacity
              style={styles.createAccountBtn}
              onPress={() =>
                router.push({
                  pathname: '/(auth)/register-patient',
                  params: { evaluationToken: evaluationResult.token },
                })
              }
              activeOpacity={0.85}
            >
              <UserPlus size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.createAccountBtnText}>
                Conserver mes résultats & Créer mon compte
              </Text>
            </TouchableOpacity>

            {/* Option 2 : Déjà un compte ? Se connecter */}
            <TouchableOpacity
              style={styles.loginOptionBtn}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.8}
            >
              <LogIn size={17} color="#00A651" style={{ marginRight: 6 }} />
              <Text style={styles.loginOptionBtnText}>
                Déjà un compte ? Se connecter
              </Text>
            </TouchableOpacity>

            {/* Recommencer */}
            <TouchableOpacity
              style={styles.restartBtn}
              onPress={handleRestart}
              activeOpacity={0.7}
            >
              <RotateCcw size={14} color="#64748b" style={{ marginRight: 5 }} />
              <Text style={styles.restartBtnText}>Refaire le test</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ÉCRAN DE PASSATION DU QUESTIONNAIRE
  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, isDark && { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, isDark && { backgroundColor: colors.bgSecondary }]}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={isDark ? colors.text : '#0f172a'} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={[styles.headerMainTitle, isDark && { color: colors.text }]}>{currentConfig.title}</Text>
          <Text style={[styles.headerSubTitle, isDark && { color: colors.textSecondary }]}>
            Question {answeredCount} / {currentConfig.questions.length}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Barre de progression continue */}
      <View style={[styles.progressBarTrack, isDark && { backgroundColor: colors.border }]}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Sélecteur de Langue FR / EN */}
        <AssessmentLanguageSelector
          language={lang}
          onLanguageChange={setLang}
          style={{ marginBottom: 14 }}
        />

        {/* Instructions */}
        <View style={[styles.instructionsCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.instructionsText, isDark && { color: colors.textSecondary }]}>{currentConfig.instructions}</Text>
        </View>

        {/* Liste des Questions */}
        <View style={styles.questionsList}>
          {currentConfig.questions.map((q, index) => {
            const currentVal = answers[q.id];
            const isAnswered = currentVal !== undefined;

            return (
              <View
                key={q.id}
                style={[
                  styles.questionCard,
                  isDark && { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.questionHeader}>
                  <Text style={[styles.questionIndexText, isDark && { color: colors.textSecondary }]}>
                    Question {index + 1}
                  </Text>
                  {q.dimension && (
                    <View style={styles.dimensionBadge}>
                      <Text style={styles.dimensionBadgeText}>{q.dimension}</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.questionPrompt, isDark && { color: colors.text }]}>{q.text}</Text>

                {/* Options de réponse */}
                <View style={styles.optionsList}>
                  {currentConfig.options.map((opt) => {
                    const isSelected = currentVal === opt.value;

                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.optionCard,
                          isDark && { backgroundColor: colors.bgSecondary, borderColor: colors.border },
                          isSelected && styles.optionCardSelected,
                        ]}
                        onPress={() => handleSelectAnswer(q.id, opt.value)}
                        activeOpacity={0.75}
                      >
                        <View
                          style={[
                            styles.radioRing,
                            isSelected && styles.radioRingSelected,
                          ]}
                        >
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
              </View>
            );
          })}
        </View>

        {/* Bouton de validation */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            !isComplete && styles.submitButtonDisabled,
            isSubmitting && { opacity: 0.7 },
          ]}
          onPress={handleSubmit}
          disabled={!isComplete || isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>
                {isComplete
                  ? (lang === 'en' ? 'View assessment results' : 'Voir mes résultats d’évaluation')
                  : (lang === 'en'
                      ? `Answer all questions (${answeredCount}/${currentConfig.questions.length})`
                      : `Répondre à toutes les questions (${answeredCount}/${currentConfig.questions.length})`)}
              </Text>
              {isComplete && (
                <CheckCircle2 size={18} color="#ffffff" style={{ marginLeft: 8 }} />
              )}
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  headerTitles: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  headerMainTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  headerSubTitle: {
    fontSize: 11,
    color: '#00A651',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    marginTop: 1,
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
  scrollContentTablet: {
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
    paddingVertical: 24,
  },
  instructionsCard: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  instructionsText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    fontFamily: 'Montserrat_500Medium',
  },
  questionsList: {
    gap: 16,
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionIndexText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Montserrat_700Bold',
  },
  dimensionBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dimensionBadgeText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  questionPrompt: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 22,
    marginBottom: 14,
    fontFamily: 'Montserrat_700Bold',
  },
  optionsList: {
    gap: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  optionCardSelected: {
    borderColor: '#00A651',
    backgroundColor: '#ecfdf5',
  },
  radioRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioRingSelected: {
    borderColor: '#00A651',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00A651',
  },
  optionLabel: {
    fontSize: 13.5,
    color: '#475569',
    fontFamily: 'Montserrat_500Medium',
    flex: 1,
  },
  optionLabelSelected: {
    color: '#00A651',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F58220', // Orange TILA
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 24,
    shadowColor: '#F58220',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  scoreBadgeCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  resultToolTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 6,
  },
  levelPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  levelPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  scoreBigNumber: {
    fontSize: 38,
    fontWeight: '800',
    fontFamily: 'Montserrat_700Bold',
  },
  scoreMax: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  resultInterpretation: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
  },
  recommendationsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  recomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recomTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  recomList: {
    gap: 10,
  },
  recomItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00A651',
    marginTop: 6,
    marginRight: 10,
  },
  recomText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
  },
  conversionSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  tokenBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  tokenText: {
    fontSize: 11.5,
    color: '#00A651',
    fontFamily: 'Montserrat_500Medium',
  },
  conversionDesc: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 19,
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 16,
  },
  createAccountBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651', // Vert TILA
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#00A651',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  createAccountBtnText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  loginOptionBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#00A651',
    paddingVertical: 13,
    borderRadius: 14,
    marginBottom: 14,
  },
  loginOptionBtnText: {
    color: '#00A651',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  restartBtnText: {
    fontSize: 12.5,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
});
