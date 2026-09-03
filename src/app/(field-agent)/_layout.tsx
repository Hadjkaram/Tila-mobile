import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { TouchableOpacity } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import {
  LayoutDashboard,
  ClipboardList,
  ArrowRightLeft,
  User,
  Menu,
} from 'lucide-react-native';
import { CustomDrawerContent } from '../../components/navigation/CustomDrawerContent';
import { useTheme } from '../../context/ThemeContext';

export default function FieldAgentLayout() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <Drawer
      initialRouteName="dashboard"
      drawerContent={(props) => (
        <CustomDrawerContent {...props} profileRoute="/(field-agent)/profile" />
      )}
      screenOptions={({ navigation }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.headerBg,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.toggleDrawer()}
            style={{ marginLeft: 16 }}
            activeOpacity={0.7}
          >
            <Menu color="#00A651" size={24} />
          </TouchableOpacity>
        ),
        headerTintColor: '#00A651',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
          fontFamily: 'Montserrat_700Bold',
          color: colors.headerText,
        },
        drawerActiveTintColor: '#00A651',
        drawerInactiveTintColor: colors.textSecondary,
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
          marginLeft: -10,
          fontFamily: 'Montserrat_500Medium',
        },
        drawerStyle: {
          width: '82%',
          maxWidth: 320,
          backgroundColor: colors.card,
        },
        sceneContainerStyle: {
          backgroundColor: colors.bgSecondary,
        },
      })}
    >
      {/* 1. Tableau de bord principal */}
      <Drawer.Screen
        name="dashboard"
        options={{
          title: 'Accueil',
          drawerIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />

      {/* 2. Évaluations terrain */}
      <Drawer.Screen
        name="assessments/index"
        options={{
          title: 'Évaluations terrain',
          drawerIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
        }}
      />

      {/* 3. Orientations & Référés */}
      <Drawer.Screen
        name="referrals/index"
        options={{
          title: 'Orientations & Référés',
          drawerIcon: ({ color, size }) => <ArrowRightLeft size={size} color={color} />,
        }}
      />

      {/* Profil masqué de la liste des items du Drawer (accessible via l'en-tête du Drawer) */}
      <Drawer.Screen
        name="profile"
        options={{
          drawerItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />

      {/* Sub-routes masquées du Drawer avec flèches de retour */}
      <Drawer.Screen
        name="assessments/new"
        options={{
          drawerItemStyle: { display: 'none' },
          title: 'Nouvelle évaluation',
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="assessments/run"
        options={{
          drawerItemStyle: { display: 'none' },
          title: 'Passation du questionnaire',
          headerShown: false,
        }}
      />
    </Drawer>
  );
}
