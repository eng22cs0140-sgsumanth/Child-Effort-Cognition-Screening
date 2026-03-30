import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../constants';

export default function LoadingScreen() {
  const bounce = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in the text
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Star bounce animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -24, duration: 500, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    // Staggered dot pulse
    const pulseDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      ).start();

    pulseDot(dot1, 0);
    pulseDot(dot2, 150);
    pulseDot(dot3, 300);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.star, { transform: [{ translateY: bounce }] }]}>
        🌟
      </Animated.Text>

      <Animated.View style={{ opacity: fadeIn, alignItems: 'center' }}>
        <Text style={styles.title}>CECI</Text>
        <Text style={styles.tagline}>Child Effort-Cognition Index</Text>
        <Text style={styles.description}>
          Game-based developmental screening{'\n'}for children aged 3–9
        </Text>
      </Animated.View>

      <View style={styles.dotsRow}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
              },
            ]}
          />
        ))}
      </View>

      <Text style={styles.footerText}>Getting things ready...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9E6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  star: {
    fontSize: 88,
    marginBottom: 4,
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 6,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.orange,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 4,
  },
  description: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primaryLight,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 8,
    marginBottom: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray400,
    marginTop: 4,
  },
});
