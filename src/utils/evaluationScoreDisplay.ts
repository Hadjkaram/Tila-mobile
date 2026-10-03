export interface SubmissionScore {
  scale: string;
  label?: string | null;
  value?: number | null;
  denominator?: number | null;
  normalized?: number | null;
  interpretation?: string | null;
  severityLabel?: string | null;
  semanticLevel?: string | null;
  domain?: string | null;
  domainName?: string | null;
  subdomainName?: string | null;
  type?: string;
  questionId?: string;
}

export interface SubmissionAlarmingIndicator {
  key: string;
  label: string;
  level?: string | null;
  semanticLevel?: string | null;
  interpretation?: string | null;
}

export interface ScoreStyle {
  level: string;
  color: string;
  bgColor: string;
  barColor: string;
  borderColor: string;
}

const SEMANTIC_LEVEL_STYLES: Record<string, Omit<ScoreStyle, 'level'>> = {
  good: {
    color: '#16a34a',
    bgColor: '#dcfce7',
    barColor: '#22c55e',
    borderColor: '#86efac',
  },
  warning: {
    color: '#d97706',
    bgColor: '#fef3c7',
    barColor: '#f59e0b',
    borderColor: '#fcd34d',
  },
  alert: {
    color: '#dc2626',
    bgColor: '#fee2e2',
    barColor: '#ef4444',
    borderColor: '#fca5a5',
  },
};

const NEUTRAL_STYLE: ScoreStyle = {
  level: 'N/A',
  color: '#64748b',
  bgColor: '#f1f5f9',
  barColor: '#94a3b8',
  borderColor: '#cbd5e1',
};

const SEMANTIC_BADGE_FALLBACK: Record<string, string> = {
  good: 'Faible',
  warning: 'Modéré',
  alert: 'Élevé',
};

export function getScoreInfo(score: Partial<SubmissionScore>): ScoreStyle {
  const badgeText =
    score.severityLabel?.trim() ||
    (score.type === 'classification' ? score.interpretation?.trim() : null) ||
    null;

  if (score.semanticLevel && SEMANTIC_LEVEL_STYLES[score.semanticLevel]) {
    const base = SEMANTIC_LEVEL_STYLES[score.semanticLevel];
    return {
      ...base,
      level: badgeText ?? SEMANTIC_BADGE_FALLBACK[score.semanticLevel] ?? 'N/A',
    };
  }

  return { ...NEUTRAL_STYLE, level: badgeText ?? 'N/A' };
}

export function getScoreDisplayName(score: Partial<SubmissionScore>): string {
  if (score.label?.trim()) return score.label.trim();
  if (score.subdomainName?.trim()) return score.subdomainName.trim();
  if (score.domainName?.trim()) return score.domainName.trim();
  if (score.scale) {
    if (score.scale === 'score_tspt') return 'TSPT (PCL-5)';
    if (score.scale === 'score_phq9') return 'Dépression (PHQ-9)';
    if (score.scale === 'suicide') return 'Risque suicidaire';
    if (score.scale === 'score_total') return 'Score total';
    return score.scale;
  }
  return 'Score';
}

/** Libellés officiels de la fiche pcl-5-terrain pour les 3 items troubles psychotiques. */
export const PSYCHOSE_QUESTIONS: Record<string, string> = {
  psychose_p1: "Avez-vous l'impression d'entendre des voix que d'autres personnes autour de vous n'entendent pas ?",
  psychose_p2: "Avez-vous l'impression de voir des choses que les personnes autour de vous ne voient pas ?",
  psychose_p3: "Avez-vous l'impression que les personnes autour de vous sont contre vous ou parlent de vous ?",
};

/** Libellés officiels de la fiche pcl-5-terrain pour les 7 événements stressants. */
export const EVENEMENTS_QUESTIONS: Record<string, string> = {
  ev1: 'Mort',
  ev2: 'Menace de mort',
  ev3: 'Violence sexuelle (tentative de viol, viol)',
  ev4: 'Naufrage',
  ev5: 'Prison',
  ev6: 'Blessure grave (AVP, coups et blessures)',
  ev7: "Maladie au décours de l'aventure",
};

export const EVENEMENTS_LABELS: Record<string, string> = {
  vecu: 'Vécu',
  temoin: 'Témoin',
  rapporte: 'Rapporté',
};
