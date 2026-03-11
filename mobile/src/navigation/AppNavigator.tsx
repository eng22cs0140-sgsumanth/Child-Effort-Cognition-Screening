
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import OnboardingParentScreen from '../screens/OnboardingParentScreen';
import OnboardingChildScreen from '../screens/OnboardingChildScreen';
import AssessmentScreen from '../screens/AssessmentScreen';
import ResultsScreen from '../screens/ResultsScreen';
import HelpScreen from '../screens/HelpScreen';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  OnboardingParent: undefined;
  OnboardingChild: undefined;
  Assessment: undefined;
  Results: undefined;
  Help: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#FFF9E6' },
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="OnboardingParent" component={OnboardingParentScreen} />
        <Stack.Screen name="OnboardingChild" component={OnboardingChildScreen} />
        <Stack.Screen name="Assessment" component={AssessmentScreen} />
        <Stack.Screen name="Results" component={ResultsScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
