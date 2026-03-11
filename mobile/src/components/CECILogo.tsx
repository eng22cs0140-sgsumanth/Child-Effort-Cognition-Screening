
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Path, Circle } from 'react-native-svg';

interface CECILogoProps {
  size?: number;
}

export default function CECILogo({ size = 120 }: CECILogoProps) {
  const scale = size / 120;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {/* Purple rounded rectangle background */}
        <Rect x="4" y="4" width="112" height="112" rx="28" ry="28" fill="#7C3AED" />
        {/* Orange star accent */}
        <Path
          d="M60 18 L64 32 L78 32 L67 41 L71 55 L60 46 L49 55 L53 41 L42 32 L56 32 Z"
          fill="#FF9F1C"
        />
        {/* Subtle brain/circuit dots */}
        <Circle cx="38" cy="68" r="5" fill="rgba(255,255,255,0.25)" />
        <Circle cx="60" cy="72" r="5" fill="rgba(255,255,255,0.25)" />
        <Circle cx="82" cy="68" r="5" fill="rgba(255,255,255,0.25)" />
        <Path
          d="M38 68 Q49 60 60 72 Q71 60 82 68"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
          fill="none"
        />
      </Svg>
      <View style={[styles.textContainer, { bottom: size * 0.12 }]}>
        <Text style={[styles.ceciText, { fontSize: size * 0.22 }]}>CECI</Text>
        <Text style={[styles.subText, { fontSize: size * 0.1 }]}>Early Screening</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    left: 0,
    right: 0,
  },
  ceciText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 2,
  },
  subText: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
