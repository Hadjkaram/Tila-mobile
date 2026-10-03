import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text } from './Text';
import {
  FileText,
  User,
  Heart,
  Shield,
  MapPin,
  Check,
  AlertTriangle,
  ArrowRightLeft,
  ArrowLeft,
  Activity,
  CheckCircle2,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import {
  SubmissionScore,
  getScoreDisplayName,
  getScoreInfo,
  PSYCHOSE_QUESTIONS,
} from '../utils/evaluationScoreDisplay';
import { SubmissionResponse } from '../services/agent';

interface EvaluationResultsViewProps {
  submissionResponse: SubmissionResponse;
  patientName?: string;
  centreName?: string;
  questionnaireTitle?: string;
  onOrient?: () => void;
  onClose: () => void;
  orientButtonLabel?: string;
}

export function EvaluationResultsView({
  submissionResponse,
  patientName,
  centreName,
  questionnaireTitle,
  onOrient,
  onClose,
  orientButtonLabel = 'Orienter le Patient',
}: EvaluationResultsViewProps) {
  const { colors, isDark } = useTheme();

  const scores = (submissionResponse?.scores || []) as SubmissionScore[];
  const hasScores = scores.length > 0;

  // Filter scores for migrant layout
  const sociodemoScores = scores.filter((s) => s.scale?.startsWith('sociodemo_'));
  const evenementScores = scores.filter((s) => s.scale?.startsWith('evenement_'));
  const psychoseScores = scores.filter((s) => s.scale?.startsWith('psychose_'));
  const phq9ImpactScore = scores.find((s) => s.scale === 'phq9_impact');
  const isMigrantAdultLayout = evenementScores.length > 0 || psychoseScores.length > 0;

  const differentScores = scores.filter(
    (s) =>
      !s.scale?.startsWith('sociodemo_') &&
      !s.scale?.startsWith('evenement_') &&
      !s.scale?.startsWith('psychose_') &&
      s.scale !== 'phq9_impact'
  );

  // Alarming indicators
  const indicators = submissionResponse?.indicators || [];
  const suicidalScore = scores.find((s) => s.scale === 'suicide');
  const hasSuicideAlert =
    suicidalScore && (suicidalScore.value ?? 0) >= 1;
  const hasPsychoseAlert = psychoseScores.some(
    (s) => (s.value ?? 0) >= 1 || s.interpretation === 'Oui'
  );
  const hasAlarmingAlerts =
    hasSuicideAlert ||
    hasPsychoseAlert ||
    indicators.some((ind) => ind.semanticLevel === 'alert') ||
    scores.some((s) => s.semanticLevel === 'alert');

  // Overall Score
  const totalScore =
    submissionResponse?.overallScore ??
    scores.reduce((sum, s) => sum + (s.value ?? 0), 0);
  const totalDenominator =
    submissionResponse?.overallDenominator ??
    scores.reduce((sum, s) => sum + (s.denominator ?? 0), 0);

  // Helper for personal info line
  const renderPersonalInfoLine = (score: SubmissionScore, index: number) => {
    const lines = (score.interpretation ?? '').split('\n');
    const label = (lines[0] ?? '').replace(/^Question\s*:\s*/, '');
    const value = (lines[1] ?? '').replace(/^Réponse\s*:\s*/, '');
    return (
      <View key={index} style={[styles.infoRow, index > 0 && styles.infoRowBorder]}>
        <Text style={[styles.infoLabel, isDark && { color: colors.textSecondary }]}>
          {label}
        </Text>
        <Text style={[styles.infoValue, isDark && { color: colors.text }]}>
          {value || 'Non renseigné'}
        </Text>
      </View>
    );
  };

  // Helper for stressful events
  const renderEventCard = (score: SubmissionScore, index: number) => {
    const lines = (score.interpretation ?? '').split('\n');
    const title = (lines[0] ?? '').replace(/^Événement\s*:\s*/, '');
    const status = (lines[1] ?? '').replace(/^Statut\s*:\s*/, '');
    const isExposed = status && status !== 'Non renseigné';

    return (
      <View
        key={index}
        style={[
          styles.eventCard,
          isDark && { backgroundColor: colors.card, borderColor: colors.border },
          isExposed && styles.eventCardExposed,
        ]}
      >
        <Text style={[styles.eventTitle, isDark && { color: colors.text }]}>
          {title}
        </Text>
        <View style={[styles.eventBadge, isExposed ? styles.eventBadgeExposed : styles.eventBadgeNone]}>
          <Text
            style={[
              styles.eventBadgeText,
              isExposed ? styles.eventBadgeTextExposed : styles.eventBadgeTextNone,
            ]}
          >
            {status}
          </Text>
        </View>
      </View>
    );
  };

  // Helper for score card
  const renderScoreCard = (score: SubmissionScore, index: number) => {
    const isClassification = score.type === 'classification';
    const scoreInfo = getScoreInfo(score);
    const fullScaleName = getScoreDisplayName(score);

    const hasNormalized =
      typeof score.normalized === 'number' && !Number.isNaN(score.normalized);
    const progressPercent = hasNormalized
      ? Math.max(0, Math.min(score.normalized ?? 0, 100))
      : score.denominator != null && score.denominator > 0
      ? (Number(score.value) / score.denominator) * 100
      : 0;

    return (
      <View
        key={index}
        style={[
          styles.scoreCard,
          { backgroundColor: isDark ? colors.card : scoreInfo.bgColor, borderColor: scoreInfo.borderColor },
        ]}
      >
        {/* Score Header */}
        <View style={styles.scoreCardHeader}>
          <View style={styles.scoreTitleRow}>
            <Activity size={18} color={scoreInfo.color} style={{ marginRight: 6 }} />
            <Text style={[styles.scoreScaleName, { color: isDark ? colors.text : '#0f172a' }]}>
              {fullScaleName}
            </Text>
          </View>
          <View style={[styles.severityBadge, { backgroundColor: scoreInfo.bgColor, borderColor: scoreInfo.borderColor }]}>
            <Text style={[styles.severityBadgeText, { color: scoreInfo.color }]}>
              {isClassification ? score.interpretation : scoreInfo.level}
            </Text>
          </View>
        </View>

        {/* Progress Bar & Value */}
        {!isClassification && (
          <View style={styles.scoreProgressRow}>
            <View style={[styles.progressBarTrack, isDark && { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, Math.max(0, progressPercent))}%`, backgroundColor: scoreInfo.barColor },
                ]}
              />
            </View>
            <Text style={[styles.scoreValueFraction, isDark && { color: colors.text }]}>
              {score.value}
              {score.denominator !== undefined && ` / ${score.denominator}`}
            </Text>
          </View>
        )}

        {/* Interpretation */}
        {!isClassification && !!score.interpretation && score.interpretation !== scoreInfo.level && (
          <View style={styles.scoreInterpretationWrap}>
            <Text style={[styles.scoreInterpretationText, isDark && { color: colors.textSecondary }]}>
              {score.interpretation}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Helper for psychotic symptom items
  const renderPsychoseItem = (score: SubmissionScore, index: number) => {
    const isPositive =
      score.interpretation === 'Oui' || (score.value !== null && score.value !== undefined && score.value >= 1);
    const questionText = PSYCHOSE_QUESTIONS[score.scale] || getScoreDisplayName(score);

    return (
      <View
        key={index}
        style={[
          styles.psychoseCard,
          isDark && { backgroundColor: colors.card, borderColor: colors.border },
          isPositive && styles.psychoseCardAlert,
        ]}
      >
        <Text style={[styles.psychoseQuestionText, isDark && { color: colors.text }]}>
          {questionText}
        </Text>
        <View style={styles.psychoseResponseRow}>
          {isPositive ? (
            <View style={styles.psychoseResponseBadgeDanger}>
              <AlertTriangle size={14} color="#dc2626" style={{ marginRight: 4 }} />
              <Text style={styles.psychoseResponseTextDanger}>Réponse : Oui (Positif)</Text>
            </View>
          ) : (
            <View style={styles.psychoseResponseBadgeSafe}>
              <Check size={14} color="#16a34a" style={{ marginRight: 4 }} />
              <Text style={styles.psychoseResponseTextSafe}>Réponse : Non</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, isDark && { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Title & Header */}
      <View style={styles.headerWrap}>
        <View style={styles.headerIconCircle}>
          <FileText size={24} color="#00A651" />
        </View>
        <Text style={[styles.screenTitle, isDark && { color: colors.text }]}>
          Résultat et orientation
        </Text>
        <Text style={[styles.screenSubtitle, isDark && { color: colors.textSecondary }]}>
          Évaluation enregistrée avec succès. Consultez les résultats puis orientez le patient si nécessaire.
        </Text>

        {/* Patient Tag */}
        <View style={[styles.patientBadgeWrap, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
          <User size={15} color="#00A651" style={{ marginRight: 6 }} />
          <Text style={[styles.patientBadgeText, isDark && { color: colors.text }]}>
            {patientName || 'Patient évalué'}
          </Text>
          {!!centreName && (
            <Text style={[styles.centreBadgeText, isDark && { color: colors.textSecondary }]}>
              • {centreName}
            </Text>
          )}
        </View>
      </View>

      {/* Alarming Signs Banner */}
      {hasAlarmingAlerts && (
        <View style={styles.alertBanner}>
          <View style={styles.alertBannerHeader}>
            <AlertTriangle size={20} color="#dc2626" style={{ marginRight: 8 }} />
            <Text style={styles.alertBannerTitle}>Signes d'alerte cliniques détectés</Text>
          </View>
          <Text style={styles.alertBannerDesc}>
            Une attention particulière ou une prise en charge médicale / psychiatrique rapide est recommandée pour ce patient.
          </Text>
          <View style={styles.alertItemsRow}>
            {hasSuicideAlert && (
              <View style={styles.alertTag}>
                <Text style={styles.alertTagText}>⚠️ Idéation suicidaire rapportée</Text>
              </View>
            )}
            {hasPsychoseAlert && (
              <View style={styles.alertTag}>
                <Text style={styles.alertTagText}>⚠️ Manifestations psychotiques rapportées</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Global / Total Score Card */}
      {hasScores && (
        <View style={[styles.globalScoreCard, isDark && { backgroundColor: 'rgba(0, 166, 81, 0.12)', borderColor: '#00A651' }]}>
          <Text style={[styles.globalScoreLabel, isDark && { color: colors.textSecondary }]}>
            Score global
          </Text>
          <Text style={styles.globalScoreValue}>
            {totalScore}
            {totalDenominator > 0 && <Text style={styles.globalScoreDenominator}> / {totalDenominator}</Text>}
          </Text>
          <Text style={styles.globalScoreHint}>
            Indicateur synthétique d'évaluation clinique
          </Text>
        </View>
      )}

      {/* Migrant Layout vs General Layout */}
      {isMigrantAdultLayout ? (
        <>
          {/* Section 1: Informations personnelles */}
          {sociodemoScores.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <User size={18} color="#00A651" style={{ marginRight: 8 }} />
                <Text style={[styles.sectionTitle, isDark && { color: colors.text }]}>
                  Informations personnelles
                </Text>
              </View>
              <View style={[styles.cardContainer, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
                {sociodemoScores.map((score, idx) => renderPersonalInfoLine(score, idx))}
              </View>
            </View>
          )}

          {/* Section 2: Événements stressants */}
          {evenementScores.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <MapPin size={18} color="#00A651" style={{ marginRight: 8 }} />
                <Text style={[styles.sectionTitle, isDark && { color: colors.text }]}>
                  Événements stressants
                </Text>
              </View>
              <View style={styles.eventsGrid}>
                {evenementScores.map((score, idx) => renderEventCard(score, idx))}
              </View>
            </View>
          )}

          {/* Section 3: Analyse détaillée par dimension */}
          {differentScores.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <Heart size={18} color="#00A651" style={{ marginRight: 8 }} />
                <Text style={[styles.sectionTitle, isDark && { color: colors.text }]}>
                  Analyse détaillée par dimension
                </Text>
              </View>
              <View style={styles.scoresList}>
                {differentScores.map((score, idx) => renderScoreCard(score, idx))}
                {!!phq9ImpactScore && (
                  <View style={[styles.contextCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.contextCardText, isDark && { color: colors.text }]}>
                      {phq9ImpactScore.interpretation}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Section 4: Troubles psychotiques */}
          {psychoseScores.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <Shield size={18} color="#00A651" style={{ marginRight: 8 }} />
                <Text style={[styles.sectionTitle, isDark && { color: colors.text }]}>
                  Troubles psychotiques
                </Text>
              </View>
              <View style={styles.psychoseList}>
                {psychoseScores.map((score, idx) => renderPsychoseItem(score, idx))}
              </View>
            </View>
          )}
        </>
      ) : (
        /* General Questionnaire Layout */
        hasScores && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <Heart size={18} color="#00A651" style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, isDark && { color: colors.text }]}>
                Analyse détaillée par dimension
              </Text>
            </View>
            <View style={styles.scoresList}>
              {scores.map((score, idx) => renderScoreCard(score, idx))}
            </View>
          </View>
        )
      )}

      {/* Bottom Action Buttons */}
      <View style={styles.actionsWrap}>
        {onOrient && (
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={onOrient}
            activeOpacity={0.8}
          >
            <ArrowRightLeft size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryActionBtnText}>{orientButtonLabel}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.secondaryActionBtn, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={[styles.secondaryActionBtnText, isDark && { color: colors.text }]}>
            Retour au tableau de bord
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerWrap: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  headerIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 166, 81, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
    fontFamily: 'Montserrat_700Bold',
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: '90%',
    marginBottom: 12,
  },
  patientBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  patientBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  centreBadgeText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },

  /* Alert Banner */
  alertBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  alertBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b91c1c',
  },
  alertBannerDesc: {
    fontSize: 12,
    color: '#991b1b',
    lineHeight: 16,
    marginBottom: 8,
  },
  alertItemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  alertTag: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  alertTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b91c1c',
  },

  /* Global Score */
  globalScoreCard: {
    backgroundColor: 'rgba(0, 166, 81, 0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 166, 81, 0.25)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  globalScoreLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  globalScoreValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  globalScoreDenominator: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
  },
  globalScoreHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },

  /* Section Styles */
  sectionWrap: {
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  infoRow: {
    paddingVertical: 9,
  },
  infoRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },

  /* Events Grid */
  eventsGrid: {
    gap: 8,
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventCardExposed: {
    borderColor: '#fed7aa',
    backgroundColor: '#fffbeb',
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  eventBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventBadgeExposed: {
    backgroundColor: '#ffedd5',
  },
  eventBadgeNone: {
    backgroundColor: '#f1f5f9',
  },
  eventBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventBadgeTextExposed: {
    color: '#c2410c',
  },
  eventBadgeTextNone: {
    color: '#94a3b8',
  },

  /* Scores List */
  scoresList: {
    gap: 12,
  },
  scoreCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  scoreCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  scoreScaleName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scoreProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValueFraction: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    minWidth: 50,
    textAlign: 'right',
  },
  scoreInterpretationWrap: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  scoreInterpretationText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  contextCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  contextCardText: {
    fontSize: 13,
    color: '#475569',
  },

  /* Psychose List */
  psychoseList: {
    gap: 8,
  },
  psychoseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  psychoseCardAlert: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  psychoseQuestionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 18,
  },
  psychoseResponseRow: {
    flexDirection: 'row',
  },
  psychoseResponseBadgeDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  psychoseResponseTextDanger: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b91c1c',
  },
  psychoseResponseBadgeSafe: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  psychoseResponseTextSafe: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
  },

  /* Action Buttons */
  actionsWrap: {
    marginTop: 10,
    gap: 10,
  },
  primaryActionBtn: {
    backgroundColor: '#00A651',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
  },
  secondaryActionBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
});
