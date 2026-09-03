import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Globe } from 'lucide-react-native';
import { AssessmentLanguage } from '../constants/bilingualQuestionnaires';
import { useTheme } from '../context/ThemeContext';

interface Props {
  language: AssessmentLanguage;
  onLanguageChange: (lang: AssessmentLanguage) => void;
  style?: any;
}

export const AssessmentLanguageSelector: React.FC<Props> = ({
  language,
  onLanguageChange,
  style,
}) => {
  const { isDark, colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        isDark && { backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]}
    >
      <View style={styles.iconBox}>
        <Globe size={15} color={colors.primary} />
        <Text style={[styles.langLabel, isDark && { color: colors.textSecondary }]}>
          Langue / Language :
        </Text>
      </View>

      <View style={[styles.switchTrack, isDark && { backgroundColor: colors.bgSecondary }]}>
        <TouchableOpacity
          style={[
            styles.switchBtn,
            language === 'fr' && [
              styles.switchBtnActive,
              { backgroundColor: colors.primary },
            ],
          ]}
          onPress={() => onLanguageChange('fr')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.switchBtnText,
              language === 'fr' && styles.switchBtnTextActive,
            ]}
          >
            🇫🇷 Français
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.switchBtn,
            language === 'en' && [
              styles.switchBtnActive,
              { backgroundColor: colors.primary },
            ],
          ]}
          onPress={() => onLanguageChange('en')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.switchBtnText,
              language === 'en' && styles.switchBtnTextActive,
            ]}
          >
            🇬🇧 English
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  iconBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Montserrat_600SemiBold',
  },
  switchTrack: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  switchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  switchBtnActive: {
    backgroundColor: '#00A651',
    shadowColor: '#00A651',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  switchBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Montserrat_600SemiBold',
  },
  switchBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
});
