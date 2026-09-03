import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import {
  LayoutDashboard,
  FileSearch,
  AlertTriangle,
  Menu,
} from 'lucide-react-native';
import { CustomDrawerContent } from '../../components/navigation/CustomDrawerContent';
import { useTheme } from '../../context/ThemeContext';

export default function SupervisorLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Drawer
      initialRouteName="dashboard"
      drawerContent={(props) => (
        <CustomDrawerContent {...props} profileRoute="/(supervisor)/profile" />
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

      {/* 2. Dépistages & Revues cliniques */}
      <Drawer.Screen
        name="screenings/index"
        options={{
          title: 'Revues & Dépistages',
          drawerIcon: ({ color, size }) => <FileSearch size={size} color={color} />,
        }}
      />

      {/* 3. Alertes & Priorités */}
      <Drawer.Screen
        name="alerts/index"
        options={{
          title: 'Alertes & Priorités',
          drawerIcon: ({ color, size }) => <AlertTriangle size={size} color={color} />,
        }}
      />

      {/* Profil masqué de la liste des items du Drawer (accessible via la carte d'en-tête utilisateur du Drawer) */}
      <Drawer.Screen
        name="profile"
        options={{
          drawerItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />
    </Drawer>
  );
}
