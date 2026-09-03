export type AssessmentLanguage = 'fr' | 'en';

export interface LocalizedOption {
  value: number;
  label: string;
}

export interface LocalizedQuestion {
  id: string;
  text: string;
  dimension?: string;
}

export interface LocalizedQuestionnaireContent {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  description: string;
  instructions: string;
  options: LocalizedOption[];
  questions: LocalizedQuestion[];
  interpret: (score: number, answers?: Record<string, number | string>) => {
    level: 'normal' | 'moderate' | 'elevated';
    levelLabel: string;
    levelColor: string;
    levelBg: string;
    message: string;
    recommendations: string[];
    needConsult: boolean;
  };
}

export const BILINGUAL_QUESTIONNAIRES: Record<
  string,
  Record<AssessmentLanguage, LocalizedQuestionnaireContent>
> = {
  ods: {
    fr: {
      id: 'ods',
      title: 'ODS / BMH-MWT',
      subtitle: 'Dépistage des Troubles Mentaux Courants',
      category: 'Santé globale',
      description: 'Dépistage rapide des manifestations anxio-dépressives et de la détresse psychologique.',
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
      interpret: (score, answers = {}) => {
        const hasSuicide = Number(answers['q11'] || 0) > 0;
        if (score >= 16 || hasSuicide) {
          return {
            level: 'elevated',
            levelLabel: hasSuicide ? 'Alerte Clinique Immédiate' : 'Détresse Élevée',
            levelColor: '#ef4444',
            levelBg: '#fef2f2',
            message: 'Vos réponses indiquent un niveau de détresse psychologique significatif nécessitant une écoute attentive.',
            recommendations: [
              'Prenez rendez-vous sans attendre avec l’un de nos psychologues ou psychiatres TILA.',
              'Parlez de ce que vous ressentez à un proche de confiance.',
              'Ne restez pas seul(e) face à vos pensées sombres.',
            ],
            needConsult: true,
          };
        }
        if (score >= 8) {
          return {
            level: 'moderate',
            levelLabel: 'Détresse Modérée',
            levelColor: '#f59e0b',
            levelBg: '#fffbeb',
            message: 'Vous traversez une période de vulnérabilité émotionnelle notable avec quelques signes d’inconfort.',
            recommendations: [
              'Une téléconsultation de soutien avec un praticien TILA vous apporterait des clés précieuses.',
              'Favorisez les temps de repos, l’activité physique douce et le sommeil régulier.',
            ],
            needConsult: true,
          };
        }
        return {
          level: 'normal',
          levelLabel: 'Bien-être Stable',
          levelColor: '#00A651',
          levelBg: '#ecfdf5',
          message: 'Vos résultats se situent dans la zone d’équilibre. Votre santé émotionnelle semble préservée.',
          recommendations: [
            'Continuez à maintenir vos habitudes de vie saines et vos relations positives.',
            'Refaites une auto-évaluation dans 1 mois pour suivre votre bien-être.',
          ],
          needConsult: false,
        };
      },
    },
    en: {
      id: 'ods',
      title: 'ODS / BMH-MWT',
      subtitle: 'Common Mental Health Disorders Screening',
      category: 'Overall Well-being',
      description: 'Rapid assessment of anxiety-depression symptoms and emotional distress.',
      instructions:
        'Over the past 2 weeks, how often have you been bothered by any of the following problems?',
      options: [
        { value: 0, label: 'Never' },
        { value: 1, label: 'A few days' },
        { value: 2, label: 'More than half the time' },
        { value: 3, label: 'Almost every day' },
      ],
      questions: [
        { id: 'q1', text: 'Little interest or pleasure in doing everyday activities.', dimension: 'Mood' },
        { id: 'q2', text: 'Feeling down, depressed, or hopeless.', dimension: 'Mood' },
        { id: 'q3', text: 'Trouble falling asleep, frequent awakenings, or sleeping too much.', dimension: 'Sleep' },
        { id: 'q4', text: 'Feeling tired constantly or lacking daily energy.', dimension: 'Energy' },
        { id: 'q5', text: 'Poor appetite or tendency to overeat.', dimension: 'Soma' },
        { id: 'q6', text: 'Feeling bad about yourself, feeling like a failure or letting loved ones down.', dimension: 'Self-esteem' },
        { id: 'q7', text: 'Trouble concentrating on reading, work, or conversations.', dimension: 'Cognition' },
        { id: 'q8', text: 'Unusual slowness in movement or motor restlessness.', dimension: 'Motor' },
        { id: 'q9', text: 'Feeling anxious, nervous, or intensely on edge.', dimension: 'Anxiety' },
        { id: 'q10', text: 'Using alcohol or substances to cope with stress or worries.', dimension: 'Addiction' },
        { id: 'q11', text: 'Thoughts that you would be better off dead or wanting to hurt yourself.', dimension: 'Urgent' },
      ],
      interpret: (score, answers = {}) => {
        const hasSuicide = Number(answers['q11'] || 0) > 0;
        if (score >= 16 || hasSuicide) {
          return {
            level: 'elevated',
            levelLabel: hasSuicide ? 'Immediate Clinical Alert' : 'High Distress',
            levelColor: '#ef4444',
            levelBg: '#fef2f2',
            message: 'Your answers indicate a significant level of psychological distress requiring attentive medical care.',
            recommendations: [
              'Book an appointment immediately with one of our TILA psychologists or psychiatrists.',
              'Share how you feel with a trusted family member or friend.',
              'Do not stay alone with overwhelming dark thoughts.',
            ],
            needConsult: true,
          };
        }
        if (score >= 8) {
          return {
            level: 'moderate',
            levelLabel: 'Moderate Distress',
            levelColor: '#f59e0b',
            levelBg: '#fffbeb',
            message: 'You are experiencing notable emotional vulnerability with several signs of discomfort.',
            recommendations: [
              'A teleconsultation with a TILA specialist would provide valuable coping strategies.',
              'Prioritize quality rest, gentle physical activity, and regular sleep.',
            ],
            needConsult: true,
          };
        }
        return {
          level: 'normal',
          levelLabel: 'Stable Well-being',
          levelColor: '#00A651',
          levelBg: '#ecfdf5',
          message: 'Your results reflect good emotional balance and overall psychological resilience.',
          recommendations: [
            'Continue nurturing your healthy daily routines and supportive relationships.',
            'Take another self-assessment in 1 month to monitor your well-being.',
          ],
          needConsult: false,
        };
      },
    },
  },

  phq9: {
    fr: {
      id: 'phq9',
      title: 'PHQ-9 • Humeur & Dépression',
      subtitle: 'Évaluation Clinique de l’Humeur',
      category: 'Santé émotionnelle',
      description: 'Évaluez la présence et l’intensité des symptômes dépressifs sur les 2 dernières semaines.',
      instructions:
        'Au cours des 2 dernières semaines, à quelle fréquence avez-vous été gêné(e) par les problèmes suivants ?',
      options: [
        { value: 0, label: 'Jamais' },
        { value: 1, label: 'Plusieurs jours' },
        { value: 2, label: 'Plus de la moitié du temps' },
        { value: 3, label: 'Presque tous les jours' },
      ],
      questions: [
        { id: 'q1', text: 'Avoir peu d’intérêt ou de plaisir à faire les choses.', dimension: 'Anhédonie' },
        { id: 'q2', text: 'Vous sentir triste, déprimé(e) ou désespéré(e).', dimension: 'Humeur' },
        { id: 'q3', text: 'Difficultés à vous endormir, réveils fréquents ou trop dormir.', dimension: 'Sommeil' },
        { id: 'q4', text: 'Vous sentir fatigué(e) ou manquer d’énergie.', dimension: 'Énergie' },
        { id: 'q5', text: 'Manque d’appétit ou manger de manière excessive.', dimension: 'Alimentation' },
        { id: 'q6', text: 'Avoir une mauvaise image de vous-même ou sentiment d’échec.', dimension: 'Culpabilité' },
        { id: 'q7', text: 'Difficultés de concentration (lecture, travail, télévision).', dimension: 'Concentration' },
        { id: 'q8', text: 'Ralentissement physique ou au contraire grande agitation motrice.', dimension: 'Psychomoteur' },
        { id: 'q9', text: 'Pensées sombres ou sentiment que vous seriez mieux mort(e).', dimension: 'Urgence' },
      ],
      interpret: (score) => {
        if (score <= 4) {
          return {
            level: 'normal',
            levelLabel: 'Faible / Normal',
            levelColor: '#00A651',
            levelBg: '#ecfdf5',
            message: 'Symptômes minimes ou absents. Votre équilibre émotionnel est globalement stable.',
            recommendations: ['Maintenez votre équilibre de vie actuel et prenez soin de vous.'],
            needConsult: false,
          };
        } else if (score <= 9) {
          return {
            level: 'normal',
            levelLabel: 'Léger',
            levelColor: '#10b981',
            levelBg: '#ecfdf5',
            message: 'Légère baisse de moral. Prenez du temps pour vous reposer et pratiquer des activités ressourçantes.',
            recommendations: ['Accordez-vous des pauses régulières et privilégiez les activités apaisantes.'],
            needConsult: false,
          };
        } else if (score <= 14) {
          return {
            level: 'moderate',
            levelLabel: 'Modéré',
            levelColor: '#f59e0b',
            levelBg: '#fffbeb',
            message: 'Symptômes dépressifs notables. Un échange avec un professionnel de santé mentale est vivement recommandé.',
            recommendations: ['Prenez rendez-vous en téléconsultation avec un psychologue TILA.'],
            needConsult: true,
          };
        } else {
          return {
            level: 'elevated',
            levelLabel: 'Élevé / Sévère',
            levelColor: '#ef4444',
            levelBg: '#fef2f2',
            message: 'Symptômes sévères nécessitant une prise en charge médicale et un accompagnement spécialisé sans attendre.',
            recommendations: [
              'Consultez un psychiatre ou médecin sans attendre.',
              'Contactez le centre d’urgence ou la ligne nationale 143 en cas d’urgence.',
            ],
            needConsult: true,
          };
        }
      },
    },
    en: {
      id: 'phq9',
      title: 'PHQ-9 • Mood & Depression',
      subtitle: 'Clinical Mood Assessment',
      category: 'Emotional Health',
      description: 'Assess the presence and intensity of depressive symptoms over the last 2 weeks.',
      instructions:
        'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
      options: [
        { value: 0, label: 'Not at all' },
        { value: 1, label: 'Several days' },
        { value: 2, label: 'More than half the days' },
        { value: 3, label: 'Nearly every day' },
      ],
      questions: [
        { id: 'q1', text: 'Little interest or pleasure in doing things.', dimension: 'Anhedonia' },
        { id: 'q2', text: 'Feeling down, depressed, or hopeless.', dimension: 'Mood' },
        { id: 'q3', text: 'Trouble falling or staying asleep, or sleeping too much.', dimension: 'Sleep' },
        { id: 'q4', text: 'Feeling tired or having little energy.', dimension: 'Energy' },
        { id: 'q5', text: 'Poor appetite or overeating.', dimension: 'Eating' },
        { id: 'q6', text: 'Feeling bad about yourself — or that you are a failure or let family down.', dimension: 'Guilt' },
        { id: 'q7', text: 'Trouble concentrating on things, such as reading or watching TV.', dimension: 'Concentration' },
        { id: 'q8', text: 'Moving or speaking noticeably slowly, or being unusually restless/fidgety.', dimension: 'Psychomotor' },
        { id: 'q9', text: 'Thoughts that you would be better off dead, or hurting yourself.', dimension: 'Urgent' },
      ],
      interpret: (score) => {
        if (score <= 4) {
          return {
            level: 'normal',
            levelLabel: 'Minimal / Normal',
            levelColor: '#00A651',
            levelBg: '#ecfdf5',
            message: 'Minimal or absent symptoms. Your emotional balance is healthy and preserved.',
            recommendations: ['Keep sustaining your healthy daily habits and self-care routine.'],
            needConsult: false,
          };
        } else if (score <= 9) {
          return {
            level: 'normal',
            levelLabel: 'Mild',
            levelColor: '#10b981',
            levelBg: '#ecfdf5',
            message: 'Mild low mood. Take extra time to recharge and engage in uplifting activities.',
            recommendations: ['Incorporate relaxing breaks and physical rest into your week.'],
            needConsult: false,
          };
        } else if (score <= 14) {
          return {
            level: 'moderate',
            levelLabel: 'Moderate',
            levelColor: '#f59e0b',
            levelBg: '#fffbeb',
            message: 'Noticeable depressive symptoms. Consulting a mental health professional is strongly recommended.',
            recommendations: ['Schedule a teleconsultation with a TILA psychologist.'],
            needConsult: true,
          };
        } else {
          return {
            level: 'elevated',
            levelLabel: 'Severe',
            levelColor: '#ef4444',
            levelBg: '#fef2f2',
            message: 'Severe depressive symptoms requiring medical evaluation and prompt therapeutic care.',
            recommendations: [
              'Consult a psychiatrist or medical doctor promptly.',
              'Reach out to emergency helpline 143 if experiencing crisis thoughts.',
            ],
            needConsult: true,
          };
        }
      },
    },
  },

  gad7: {
    fr: {
      id: 'gad7',
      title: 'GAD-7 • Anxiété & Stress',
      subtitle: 'Évaluation Clinique de l’Anxiété',
      category: 'Gestion de l’anxiété',
      description: 'Mesurez votre niveau d’anxiété, de nervosité et de tension au quotidien.',
      instructions:
        'Au cours des 2 dernières semaines, à quelle fréquence avez-vous été gêné(e) par les problèmes suivants ?',
      options: [
        { value: 0, label: 'Pas du tout' },
        { value: 1, label: 'Plusieurs jours' },
        { value: 2, label: 'Plus de la moitié du temps' },
        { value: 3, label: 'Presque tous les jours' },
      ],
      questions: [
        { id: 'q1', text: 'Sentiment de nervosité, d’anxiété ou d’être sur le qui-vive.' },
        { id: 'q2', text: 'Incapacité à arrêter de vous inquiéter ou à contrôler vos angoisses.' },
        { id: 'q3', text: 'Inquiétudes excessives à propos de divers sujets.' },
        { id: 'q4', text: 'Grande difficulté à vous détendre et vous relaxer.' },
        { id: 'q5', text: 'Être si agité(e) qu’il est difficile de rester en place.' },
        { id: 'q6', text: 'Devenir facilement agacé(e) ou irritable.' },
        { id: 'q7', text: 'Peur panique que quelque chose de terrible se produise.' },
      ],
      interpret: (score) => {
        if (score <= 4) {
          return {
            level: 'normal',
            levelLabel: 'Faible',
            levelColor: '#00A651',
            levelBg: '#ecfdf5',
            message: 'Niveau d’anxiété dans la norme. Pas de trouble anxieux significatif décelé.',
            recommendations: ['Poursuivez vos activités relaxantes habituelles.'],
            needConsult: false,
          };
        } else if (score <= 9) {
          return {
            level: 'normal',
            levelLabel: 'Léger',
            levelColor: '#10b981',
            levelBg: '#ecfdf5',
            message: 'Anxiété légère. La relaxation, le sommeil et la respiration peuvent vous aider.',
            recommendations: ['Pratiquez des exercices de respiration guidée ou de pleine conscience.'],
            needConsult: false,
          };
        } else if (score <= 14) {
          return {
            level: 'moderate',
            levelLabel: 'Modéré',
            levelColor: '#f59e0b',
            levelBg: '#fffbeb',
            message: 'Niveau d’anxiété significatif impactant votre quotidien. Une téléconsultation est recommandée.',
            recommendations: ['Planifiez une téléconsultation pour explorer des techniques de gestion du stress.'],
            needConsult: true,
          };
        } else {
          return {
            level: 'elevated',
            levelLabel: 'Élevé',
            levelColor: '#ef4444',
            levelBg: '#fef2f2',
            message: 'Anxiété sévère. Il est conseillé de consulter rapidement un médecin ou psychologue.',
            recommendations: [
              'Consultez sans délai un praticien de santé mentale qualifié.',
              'Évitez les stimulants (caféine, alcool) et recherchez un cadre apaisant.',
            ],
            needConsult: true,
          };
        }
      },
    },
    en: {
      id: 'gad7',
      title: 'GAD-7 • Anxiety & Stress',
      subtitle: 'Clinical Anxiety Assessment',
      category: 'Anxiety Management',
      description: 'Measure your daily levels of anxiety, nervous tension, and worry.',
      instructions:
        'Over the last 2 weeks, how often have you been bothered by the following problems?',
      options: [
        { value: 0, label: 'Not at all' },
        { value: 1, label: 'Several days' },
        { value: 2, label: 'More than half the days' },
        { value: 3, label: 'Nearly every day' },
      ],
      questions: [
        { id: 'q1', text: 'Feeling nervous, anxious, or on edge.' },
        { id: 'q2', text: 'Not being able to stop or control worrying.' },
        { id: 'q3', text: 'Worrying too much about different things.' },
        { id: 'q4', text: 'Trouble relaxing.' },
        { id: 'q5', text: 'Being so restless that it is hard to sit still.' },
        { id: 'q6', text: 'Becoming easily annoyed or irritable.' },
        { id: 'q7', text: 'Feeling afraid, as if something awful might happen.' },
      ],
      interpret: (score) => {
        if (score <= 4) {
          return {
            level: 'normal',
            levelLabel: 'Minimal',
            levelColor: '#00A651',
            levelBg: '#ecfdf5',
            message: 'Anxiety levels are within normal range. No significant anxiety disorder detected.',
            recommendations: ['Keep enjoying your regular relaxing activities and hobbies.'],
            needConsult: false,
          };
        } else if (score <= 9) {
          return {
            level: 'normal',
            levelLabel: 'Mild',
            levelColor: '#10b981',
            levelBg: '#ecfdf5',
            message: 'Mild anxiety. Breathwork, quality sleep, and calming routines will help.',
            recommendations: ['Practice deep breathing exercises or guided mindfulness.'],
            needConsult: false,
          };
        } else if (score <= 14) {
          return {
            level: 'moderate',
            levelLabel: 'Moderate',
            levelColor: '#f59e0b',
            levelBg: '#fffbeb',
            message: 'Noticeable anxiety levels affecting daily tasks. Teleconsultation is recommended.',
            recommendations: ['Schedule a consultation to discuss structured anxiety-reduction techniques.'],
            needConsult: true,
          };
        } else {
          return {
            level: 'elevated',
            levelLabel: 'Severe',
            levelColor: '#ef4444',
            levelBg: '#fef2f2',
            message: 'Severe anxiety. Consulting a doctor or clinical psychologist is strongly advised.',
            recommendations: [
              'Consult a qualified mental health practitioner promptly.',
              'Reduce stimulants (caffeine, energy drinks) and seek professional guidance.',
            ],
            needConsult: true,
          };
        }
      },
    },
  },

  berger: {
    fr: {
      id: 'berger',
      title: 'Échelle de Berger',
      subtitle: 'Stigmatisation & Impact Social',
      category: 'Vulnérabilité & Stigmatisation',
      description: 'Évaluation du ressenti de stigmatisation, d’isolement et du rejet social.',
      instructions:
        'Indiquez votre degré d’accord avec les affirmations suivantes concernant votre vécu personnel :',
      options: [
        { value: 0, label: 'Pas du tout d’accord' },
        { value: 1, label: 'Plutôt pas d’accord' },
        { value: 2, label: 'Plutôt d’accord' },
        { value: 3, label: 'Tout à fait d’accord' },
      ],
      questions: [
        { id: 'q1', text: 'Je m’inquiète que les autres apprennent mon état de santé.' },
        { id: 'q2', text: 'Certaines personnes s’éloignent ou m’évitent à cause de ma situation.' },
        { id: 'q3', text: 'Je me sens coupable ou responsable de mes difficultés actuelles.' },
        { id: 'q4', text: 'Je fais de gros efforts pour garder mon statut strictement secret.' },
        { id: 'q5', text: 'Les gens ont peur de moi ou me jugent sans me connaître.' },
        { id: 'q6', text: 'Je me sens exclu(e) ou rejeté(e) par mon entourage ou ma communauté.' },
        { id: 'q7', text: 'Je ressens de la honte face à mon état ou mon parcours.' },
        { id: 'q8', text: 'J’ai perdu des relations amicales ou familiales importantes.' },
        { id: 'q9', text: 'Je crains que mes proches ne soient discriminés à cause de moi.' },
        { id: 'q10', text: 'Je me sens inférieur(e) ou différent(e) des autres personnes.' },
        { id: 'q11', text: 'Certains professionnels ou structures m’ont traité(e) différemment.' },
        { id: 'q12', text: 'Je préfère m’isoler pour éviter le regard ou les remarques des autres.' },
      ],
      interpret: (score) => {
        if (score >= 20) {
          return {
            level: 'elevated',
            levelLabel: 'Stigmatisation Élevée',
            levelColor: '#ef4444',
            levelBg: '#fef2f2',
            message: 'Vous ressentez un poids social et un sentiment de rejet très lourd qui fragilise votre bien-être.',
            recommendations: [
              'Échangez en toute confidentialité avec un psychologue TILA spécialisé en accompagnement psychosocial.',
              'Rejoignez un groupe de soutien bienveillant pour briser l’isolement.',
            ],
            needConsult: true,
          };
        }
        if (score >= 10) {
          return {
            level: 'moderate',
            levelLabel: 'Stigmatisation Modérée',
            levelColor: '#f59e0b',
            levelBg: '#fffbeb',
            message: 'Des craintes d’exclusion ou de jugement vous affectent au quotidien.',
            recommendations: [
              'Un espace d’écoute professionnel vous permettra de renforcer votre estime personnelle.',
            ],
            needConsult: true,
          };
        }
        return {
          level: 'normal',
          levelLabel: 'Impact Faible',
          levelColor: '#00A651',
          levelBg: '#ecfdf5',
          message: 'Le sentiment de stigmatisation est très limité. Vous maintenez une bonne intégration sociale.',
          recommendations: ['Conservez votre réseau de soutien et vos repères positifs.'],
          needConsult: false,
        };
      },
    },
    en: {
      id: 'berger',
      title: 'Berger Scale',
      subtitle: 'Stigma & Social Impact Assessment',
      category: 'Vulnerability & Stigma',
      description: 'Assessment of perceived stigma, isolation, and social rejection.',
      instructions:
        'Please indicate how strongly you agree or disagree with the following statements regarding your experience:',
      options: [
        { value: 0, label: 'Strongly disagree' },
        { value: 1, label: 'Disagree' },
        { value: 2, label: 'Agree' },
        { value: 3, label: 'Strongly agree' },
      ],
      questions: [
        { id: 'q1', text: 'I worry that other people will find out about my health status.' },
        { id: 'q2', text: 'Some people distance themselves or avoid me because of my situation.' },
        { id: 'q3', text: 'I feel guilty or responsible for my current hardships.' },
        { id: 'q4', text: 'I work very hard to keep my condition strictly secret.' },
        { id: 'q5', text: 'People seem uncomfortable around me or judge me without knowing me.' },
        { id: 'q6', text: 'I feel excluded or rejected by my community or social circle.' },
        { id: 'q7', text: 'I feel shame about my status or my personal life journey.' },
        { id: 'q8', text: 'I have lost meaningful friendships or family connections.' },
        { id: 'q9', text: 'I worry that my loved ones might be discriminated against because of me.' },
        { id: 'q10', text: 'I feel unequal or inferior compared to other people.' },
        { id: 'q11', text: 'Some professionals or institutions have treated me differently.' },
        { id: 'q12', text: 'I prefer to isolate myself to avoid unwanted stares or remarks.' },
      ],
      interpret: (score) => {
        if (score >= 20) {
          return {
            level: 'elevated',
            levelLabel: 'High Perceived Stigma',
            levelColor: '#ef4444',
            levelBg: '#fef2f2',
            message: 'You are experiencing heavy social pressure and perceived rejection that weakens your well-being.',
            recommendations: [
              'Speak confidentially with a TILA psychologist specialized in psychosocial support.',
              'Connect with compassionate community peer-support resources to break isolation.',
            ],
            needConsult: true,
          };
        }
        if (score >= 10) {
          return {
            level: 'moderate',
            levelLabel: 'Moderate Stigma',
            levelColor: '#f59e0b',
            levelBg: '#fffbeb',
            message: 'Concerns about discrimination or being judged affect your peace of mind.',
            recommendations: [
              'A dedicated supportive counseling session will help rebuild personal confidence.',
            ],
            needConsult: true,
          };
        }
        return {
          level: 'normal',
          levelLabel: 'Low Stigma Impact',
          levelColor: '#00A651',
          levelBg: '#ecfdf5',
          message: 'Feelings of stigma are very minimal. You maintain sound social integration.',
          recommendations: ['Continue cultivating your trusting relationships and positive connections.'],
          needConsult: false,
        };
      },
    },
  },

  sdq: {
    fr: {
      id: 'sdq',
      title: 'SDQ • Questionnaire Enfants & Ados',
      subtitle: 'Forces & Difficultés Psycho-Comportementales',
      category: 'Enfants & Jeunes',
      description: 'Dépistage global des difficultés émotionnelles et comportementales des 4-17 ans.',
      instructions:
        'Pour chaque affirmation, indiquez si elle est Non vraie, Un peu vraie ou Certainement vraie selon le comportement des 6 derniers mois :',
      options: [
        { value: 0, label: 'Non vrai' },
        { value: 1, label: 'Un peu vrai' },
        { value: 2, label: 'Certainement vrai' },
      ],
      questions: [
        { id: 'q1', text: 'Prend en compte les sentiments d’autrui.' },
        { id: 'q2', text: 'Agité(e), remuant(e), ne peut pas rester longtemps assis(e).' },
        { id: 'q3', text: 'Se plaint souvent de maux de tête, de ventre ou de nausées.' },
        { id: 'q4', text: 'Partage volontiers avec d’autres (bonbons, jouets, crayons).' },
        { id: 'q5', text: 'Fait souvent de grandes colères ou crises de rage.' },
        { id: 'q6', text: 'Plutôt solitaire, joue généralement seul(e).' },
        { id: 'q7', text: 'Généralement obéissant(e), fait ce que les adultes demandent.' },
        { id: 'q8', text: 'A beaucoup de soucis, paraît souvent inquiet(e).' },
        { id: 'q9', text: 'Secourable si quelqu’un est blessé, contrarié ou malade.' },
        { id: 'q10', text: 'Constamment agité(e) ou gigote sans cesse.' },
        { id: 'q11', text: 'A au moins un(e) bon(ne) ami(e).' },
        { id: 'q12', text: 'Se bagarre souvent avec d’autres jeunes ou les bouscule.' },
        { id: 'q13', text: 'Souvent triste, démoralisé(e) ou en larmes.' },
        { id: 'q14', text: 'Généralement apprécié(e) des autres jeunes.' },
        { id: 'q15', text: 'Facilement distrait(e), a du mal à se concentrer.' },
        { id: 'q16', text: 'Nerveux(se) ou collant(e) dans les situations nouvelles.' },
        { id: 'q17', text: 'Gentil(le) avec les plus jeunes que soi.' },
        { id: 'q18', text: 'Ment ou triche souvent.' },
        { id: 'q19', text: 'Pris(e) pour cible ou brimé(e) par d’autres jeunes.' },
        { id: 'q20', text: 'Propose souvent son aide spontanément.' },
        { id: 'q21', text: 'Réfléchit avant d’agir.' },
        { id: 'q22', text: 'Prend des affaires qui ne lui appartiennent pas.' },
        { id: 'q23', text: 'S’entend mieux avec les adultes qu’avec les jeunes.' },
        { id: 'q24', text: 'A beaucoup de peurs, s’effraie facilement.' },
        { id: 'q25', text: 'Va jusqu’au bout de ce qu’il/elle entreprend.' },
      ],
      interpret: (score) => {
        if (score >= 17) {
          return {
            level: 'elevated',
            levelLabel: 'Difficultés Élevées',
            levelColor: '#ef4444',
            levelBg: '#fef2f2',
            message: 'Ce profil présente des difficultés notables pouvant entraver la scolarité et les relations.',
            recommendations: [
              'Un bilan pédopsychologique ou de guidance parentale TILA est fortement préconisé.',
            ],
            needConsult: true,
          };
        }
        if (score >= 14) {
          return {
            level: 'moderate',
            levelLabel: 'Difficultés Modérées',
            levelColor: '#f59e0b',
            levelBg: '#fffbeb',
            message: 'Présence de tensions émotionnelles ou relationnelles nécessitant une attention éducative.',
            recommendations: [
              'Un échange avec un spécialiste de l’enfance aidera à désamorcer les blocages.',
            ],
            needConsult: true,
          };
        }
        return {
          level: 'normal',
          levelLabel: 'Équilibre Global',
          levelColor: '#00A651',
          levelBg: '#ecfdf5',
          message: 'Développement psycho-émotionnel satisfaisant sans alerte clinique particulière.',
          recommendations: ['Poursuivez les activités sociales et le dialogue bienveillant.'],
          needConsult: false,
        };
      },
    },
    en: {
      id: 'sdq',
      title: 'SDQ • Youth Questionnaire',
      subtitle: 'Strengths & Difficulties Questionnaire',
      category: 'Children & Adolescents',
      description: 'Comprehensive screening of emotional and behavioral difficulties for ages 4-17.',
      instructions:
        'For each item, please mark Not True, Somewhat True, or Certainly True based on behavior over the last 6 months:',
      options: [
        { value: 0, label: 'Not True' },
        { value: 1, label: 'Somewhat True' },
        { value: 2, label: 'Certainly True' },
      ],
      questions: [
        { id: 'q1', text: 'Considerate of other people’s feelings.' },
        { id: 'q2', text: 'Restless, overactive, cannot stay still for long.' },
        { id: 'q3', text: 'Often complains of headaches, stomach-aches, or sickness.' },
        { id: 'q4', text: 'Readily shares with other children (treats, toys, pencils).' },
        { id: 'q5', text: 'Often has temper tantrums or hot tempers.' },
        { id: 'q6', text: 'Rather solitary, tends to play alone.' },
        { id: 'q7', text: 'Generally obedient, usually does what adults request.' },
        { id: 'q8', text: 'Has many worries, often seems worried.' },
        { id: 'q9', text: 'Helpful if someone is hurt, upset, or feeling ill.' },
        { id: 'q10', text: 'Constantly fidgeting or squirming.' },
        { id: 'q11', text: 'Has at least one good friend.' },
        { id: 'q12', text: 'Often fights with other children or bullies them.' },
        { id: 'q13', text: 'Often unhappy, downhearted, or tearful.' },
        { id: 'q14', text: 'Generally liked by other children.' },
        { id: 'q15', text: 'Easily distracted, concentration wanders.' },
        { id: 'q16', text: 'Nervous or clingy in new situations, easily loses confidence.' },
        { id: 'q17', text: 'Kind to younger children.' },
        { id: 'q18', text: 'Often lies or cheats.' },
        { id: 'q19', text: 'Picked on or bullied by other youth.' },
        { id: 'q20', text: 'Often volunteers to help others.' },
        { id: 'q21', text: 'Thinks things out before acting.' },
        { id: 'q22', text: 'Steals from home, school, or elsewhere.' },
        { id: 'q23', text: 'Gets along better with adults than with other children.' },
        { id: 'q24', text: 'Has many fears, easily scared.' },
        { id: 'q25', text: 'Finishes tasks, has good attention span.' },
      ],
      interpret: (score) => {
        if (score >= 17) {
          return {
            level: 'elevated',
            levelLabel: 'High Difficulties',
            levelColor: '#ef4444',
            levelBg: '#fef2f2',
            message: 'This profile reflects significant emotional or behavioral challenges impacting daily routines.',
            recommendations: [
              'A dedicated child psychiatric or family guidance consultation is strongly advised.',
            ],
            needConsult: true,
          };
        }
        if (score >= 14) {
          return {
            level: 'moderate',
            levelLabel: 'Moderate Difficulties',
            levelColor: '#f59e0b',
            levelBg: '#fffbeb',
            message: 'Some emotional or social friction that warrants supportive guidance.',
            recommendations: [
              'A focused session with an adolescent mental health professional will help ease tensions.',
            ],
            needConsult: true,
          };
        }
        return {
          level: 'normal',
          levelLabel: 'Overall Balance',
          levelColor: '#00A651',
          levelBg: '#ecfdf5',
          message: 'Satisfactory psychological development without significant clinical alerts.',
          recommendations: ['Continue supporting positive family communication and peer activities.'],
          needConsult: false,
        };
      },
    },
  },

  'pcl-5': {
    fr: {
      id: 'pcl-5',
      title: 'PCL-5 TERRAIN',
      subtitle: 'Dépistage du Trauma & TSPT',
      category: 'Traumatisme & Migrations',
      description: 'Échelle de référence pour le dépistage du Trouble de Stress Post-Traumatique (TSPT).',
      instructions:
        'Au cours du mois écoulé, à quel point avez-vous été gêné(e) par les problèmes suivants liés à un événement très stressant ou traumatisant ?',
      options: [
        { value: 0, label: 'Pas du tout' },
        { value: 1, label: 'Un petit peu' },
        { value: 2, label: 'Moyennement' },
        { value: 3, label: 'Beaucoup' },
        { value: 4, label: 'Extrêmement' },
      ],
      questions: [
        { id: 'q1', text: 'Souvenirs répétés, involontaires et angoissants de l’événement.' },
        { id: 'q2', text: 'Cauchemars ou rêves pénibles répétés en lien avec l’événement.' },
        { id: 'q3', text: 'Impressions soudaines de revivre l’événement comme s’il se reproduisait (flashbacks).' },
        { id: 'q4', text: 'Sentiment de détresse vive lorsque quelque chose vous rappelle l’événement.' },
        { id: 'q5', text: 'Réactions physiques fortes (cœur qui bat vite, sueurs) lors de rappels.' },
        { id: 'q6', text: 'Évitement délibéré des pensées, sentiments ou conversations liés au trauma.' },
        { id: 'q7', text: 'Évitement des lieux, personnes, ou situations rappelant l’événement.' },
        { id: 'q8', text: 'Incapacité à vous souvenir d’aspects importants de l’événement.' },
        { id: 'q9', text: 'Croyances négatives fortes sur vous-même, les autres ou le monde.' },
        { id: 'q10', text: 'Tendance excessive à vous blâmer ou blâmer autrui pour ce qui s’est passé.' },
        { id: 'q11', text: 'Sentiments négatifs persistants (peur, horreur, colère, honte).' },
        { id: 'q12', text: 'Perte nette d’intérêt pour les activités autrefois appréciées.' },
        { id: 'q13', text: 'Sentiment de détachement ou d’éloignement par rapport aux autres.' },
        { id: 'q14', text: 'Difficulté persistante à éprouver des sentiments positifs (amour, joie).' },
        { id: 'q15', text: 'Comportements irritables ou explosions de colère imprévues.' },
        { id: 'q16', text: 'Prise de risques inconsidérés ou comportements autodestructeurs.' },
        { id: 'q17', text: 'Hypervigilance constante, sentiment permanent d’être sur vos gardes.' },
        { id: 'q18', text: 'Réactions de sursaut exagérées au moindre bruit ou imprévu.' },
        { id: 'q19', text: 'Difficultés sévères de concentration dans vos tâches.' },
        { id: 'q20', text: 'Troubles importants de l’endormissement ou réveils nocturnes répétés.' },
      ],
      interpret: (score) => {
        if (score >= 33) {
          return {
            level: 'elevated',
            levelLabel: 'Suspicion TSPT Sévère',
            levelColor: '#ef4444',
            levelBg: '#fef2f2',
            message: 'Votre score suggère une forte probabilité de Trouble de Stress Post-Traumatique nécessitant une prise en charge spécialisée.',
            recommendations: [
              'Bénéficiez sans attendre d’un accompagnement en psychotraumatologie (EMDR, TCC) avec nos spécialistes TILA.',
              'Faites-vous entourer de personnes bienveillantes.',
            ],
            needConsult: true,
          };
        }
        if (score >= 20) {
          return {
            level: 'moderate',
            levelLabel: 'Stress Post-Traumatique Modéré',
            levelColor: '#f59e0b',
            levelBg: '#fffbeb',
            message: 'Des symptômes traumatiques notables perturbent votre sérénité.',
            recommendations: [
              'Une consultation d’évaluation psychologique est vivement recommandée pour éviter la chronicisation.',
            ],
            needConsult: true,
          };
        }
        return {
          level: 'normal',
          levelLabel: 'Impact Traumatique Faible',
          levelColor: '#00A651',
          levelBg: '#ecfdf5',
          message: 'Peu de séquelles traumatiques significatives décelées à ce stade.',
          recommendations: ['Continuez à vous accorder des moments de calme et de sécurité.'],
          needConsult: false,
        };
      },
    },
    en: {
      id: 'pcl-5',
      title: 'PCL-5 TERRAIN',
      subtitle: 'Trauma & PTSD Screening',
      category: 'Trauma & Mobile Populations',
      description: 'Standardized clinical checklist for Post-Traumatic Stress Disorder (PTSD) screening.',
      instructions:
        'In the past month, how much were you bothered by the following problems regarding very stressful or traumatic experiences?',
      options: [
        { value: 0, label: 'Not at all' },
        { value: 1, label: 'A little bit' },
        { value: 2, label: 'Moderately' },
        { value: 3, label: 'Quite a bit' },
        { value: 4, label: 'Extremely' },
      ],
      questions: [
        { id: 'q1', text: 'Repeated, disturbing, and unwanted memories of the stressful experience.' },
        { id: 'q2', text: 'Repeated, disturbing dreams related to the stressful experience.' },
        { id: 'q3', text: 'Suddenly feeling or acting as if the stressful experience were happening again.' },
        { id: 'q4', text: 'Feeling very upset when something reminded you of the stressful experience.' },
        { id: 'q5', text: 'Having strong physical reactions when something reminded you (pounding heart, sweating).' },
        { id: 'q6', text: 'Avoiding memories, thoughts, or feelings related to the stressful experience.' },
        { id: 'q7', text: 'Avoiding external reminders (people, places, conversations, activities, objects).' },
        { id: 'q8', text: 'Trouble remembering important parts of the stressful experience.' },
        { id: 'q9', text: 'Having strong negative beliefs about yourself, other people, or the world.' },
        { id: 'q10', text: 'Blaming yourself or someone else for the stressful experience or what happened after.' },
        { id: 'q11', text: 'Having strong negative feelings such as fear, horror, anger, guilt, or shame.' },
        { id: 'q12', text: 'Loss of interest in activities that you used to enjoy.' },
        { id: 'q13', text: 'Feeling distant or cut off from other people.' },
        { id: 'q14', text: 'Trouble experiencing positive feelings (unable to feel happiness or love).' },
        { id: 'q15', text: 'Irritable behavior, angry outbursts, or acting aggressively.' },
        { id: 'q16', text: 'Taking too many risks or doing things that could cause you harm.' },
        { id: 'q17', text: 'Being “superalert” or watchful or on guard.' },
        { id: 'q18', text: 'Feeling jumpy or easily startled.' },
        { id: 'q19', text: 'Having difficulty concentrating.' },
        { id: 'q20', text: 'Trouble falling or staying asleep.' },
      ],
      interpret: (score) => {
        if (score >= 33) {
          return {
            level: 'elevated',
            levelLabel: 'Probable Severe PTSD',
            levelColor: '#ef4444',
            levelBg: '#fef2f2',
            message: 'Your score suggests a high probability of Post-Traumatic Stress Disorder requiring specialized trauma therapy.',
            recommendations: [
              'Connect promptly with a TILA trauma specialist (EMDR, CBT, trauma-informed counseling).',
              'Keep supportive, trusted friends or family members close.',
            ],
            needConsult: true,
          };
        }
        if (score >= 20) {
          return {
            level: 'moderate',
            levelLabel: 'Moderate PTSD Symptoms',
            levelColor: '#f59e0b',
            levelBg: '#fffbeb',
            message: 'Noticeable traumatic stress symptoms are impacting your peace of mind and sleep.',
            recommendations: [
              'A psychological consultation is strongly recommended to prevent symptoms from becoming chronic.',
            ],
            needConsult: true,
          };
        }
        return {
          level: 'normal',
          levelLabel: 'Low Traumatic Impact',
          levelColor: '#00A651',
          levelBg: '#ecfdf5',
          message: 'Few significant traumatic symptoms detected at this stage.',
          recommendations: ['Continue dedicating time to quiet, secure environments and self-care.'],
          needConsult: false,
        };
      },
    },
  },
};

/**
 * Normalise la clé d'un outil d'évaluation
 */
export function normalizeToolKey(key: string): string {
  const k = (key || '').toLowerCase().trim();
  if (k === 'ods' || k === 'bmh_mwt' || k === 'bmh-mwt') return 'ods';
  if (k === 'phq9' || k === 'phq-9') return 'phq9';
  if (k === 'gad7' || k === 'gad-7') return 'gad7';
  if (k === 'berger' || k === 'berger-vih' || k === 'berger_scale' || k === 'berger-hiv-stigma') return 'berger';
  if (k === 'sdq' || k === 'sdq-terrain') return 'sdq';
  if (k === 'pcl5' || k === 'pcl-5' || k === 'pcl5-terrain' || k === 'pcl-5-terrain') return 'pcl-5';
  return k;
}

/**
 * Récupère le contenu bilingue d'un outil d'évaluation selon la langue demandée
 */
export function getLocalizedQuestionnaire(
  toolKey: string,
  lang: AssessmentLanguage = 'fr'
): LocalizedQuestionnaireContent | null {
  const normalizedKey = normalizeToolKey(toolKey);
  const tool = BILINGUAL_QUESTIONNAIRES[normalizedKey];
  if (!tool) return null;
  return tool[lang] || tool.fr;
}
