
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { useApp } from '../context/AppContext';

import LoadingScreen from '../screens/LoadingScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import OnboardingParentScreen from '../screens/OnboardingParentScreen';
import OnboardingChildScreen from '../screens/OnboardingChildScreen';
import AssessmentScreen from '../screens/AssessmentScreen';
import ResultsScreen from '../screens/ResultsScreen';
import HelpScreen from '../screens/HelpScreen';
import DoctorRegisterScreen from '../screens/DoctorRegisterScreen';
import DoctorPendingScreen from '../screens/DoctorPendingScreen';
import DoctorDashboardScreen from '../screens/DoctorDashboardScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';

export type RootStackParamList = {
  Loading: undefined;
  Welcome: undefined;
  Login: undefined;
  OnboardingParent: undefined;
  OnboardingChild: undefined;
  Assessment: undefined;
  Results: undefined;
  Help: undefined;
  DoctorRegister: undefined;
  DoctorPending: undefined;
  DoctorDashboard: undefined;
  AdminDashboard: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { authLoading } = useApp();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={authLoading ? 'Loading' : 'Welcome'}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#FFF9E6' },
        }}
      >
        {/* Loading screen — shown while Firebase Auth resolves */}
        <Stack.Screen
          name="Loading"
          component={LoadingScreen}
          options={{ gestureEnabled: false }}
        />

        {/* Auth / onboarding flow */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="OnboardingParent" component={OnboardingParentScreen} />
        <Stack.Screen name="OnboardingChild" component={OnboardingChildScreen} />

        {/* Child play */}
        <Stack.Screen
          name="Assessment"
          component={AssessmentScreen}
          options={{ gestureEnabled: false }}
        />

        {/* Parent dashboard */}
        <Stack.Screen name="Results" component={ResultsScreen} />

        {/* Doctor flow */}
        <Stack.Screen name="DoctorRegister" component={DoctorRegisterScreen} />
        <Stack.Screen
          name="DoctorPending"
          component={DoctorPendingScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="DoctorDashboard" component={DoctorDashboardScreen} />

        {/* Admin */}
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />

        {/* Help */}
        <Stack.Screen name="Help" component={HelpScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
