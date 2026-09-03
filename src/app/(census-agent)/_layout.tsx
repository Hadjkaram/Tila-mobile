import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { TouchableOpacity } from 'react-native';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  User,
  Menu,
} from 'lucide-react-native';
import { CustomDrawerContent } from '../../components/navigation/CustomDrawerContent';
import { useTheme } from '../../context/ThemeContext';

export default function CensusAgentLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Drawer
      initialRouteName="dashboard"
      drawerContent={(props) => (
        <CustomDrawerContent {...props} profileRoute="/(census-agent)/profile" />
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
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
      {/* 1. Tableau de bord */}
      <Drawer.Screen
        name="dashboard"
        options={{
          title: 'Accueil',
          drawerIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />

      {/* 2. Nouveau formulaire de recensement */}
      <Drawer.Screen
        name="form"
        options={{
          title: 'Nouveau recensement',
          drawerIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
        }}
      />

      {/* 3. Liste des personnes recensées */}
      <Drawer.Screen
        name="census-list"
        options={{
          title: 'Personnes recensées',
          drawerIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />

      {/* 4. Profil agent (accessible depuis le header du Drawer) */}
      <Drawer.Screen
        name="profile"
        options={{
          title: 'Mon Profil',
          drawerIcon: ({ color, size }) => <User size={size} color={color} />,
          drawerItemStyle: { display: 'none' },
        }}
      />
    </Drawer>
  );
}
