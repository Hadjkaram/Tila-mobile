import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

export function Text(props: TextProps) {
  const { style, ...otherProps } = props;
  
  // Custom logic to map font weights from style object to correct Montserrat font family
  let fontFamily = 'Montserrat_400Regular';
  
  const flattenedStyle = StyleSheet.flatten(style || {});
  
  if (flattenedStyle.fontWeight) {
    if (flattenedStyle.fontWeight === 'bold' || flattenedStyle.fontWeight === '700') {
      fontFamily = 'Montserrat_700Bold';
    } else if (flattenedStyle.fontWeight === '600') {
      fontFamily = 'Montserrat_600SemiBold';
    } else if (flattenedStyle.fontWeight === '500') {
      fontFamily = 'Montserrat_500Medium';
    }
  }

  // Remove fontWeight to avoid warnings/conflicts since we use the font family
  const customStyle = { ...flattenedStyle, fontFamily, fontWeight: undefined };

  return <RNText style={customStyle} {...otherProps} />;
}
