import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { TouchableOpacity } from 'react-native';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Building2,
  FileText,
  User,
  Menu,
} from 'lucide-react-native';
import { CustomDrawerContent } from '../../components/navigation/CustomDrawerContent';
import { useTheme } from '../../context/ThemeContext';

export default function OngManagerLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Drawer
      initialRouteName="dashboard"
      drawerContent={(props) => (
        <CustomDrawerContent {...props} profileRoute="/(ong-manager)/profile" />
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
      {/* 1. Vue d'ensemble */}
      <Drawer.Screen
        name="dashboard"
        options={{
          title: "Vue d'ensemble",
          drawerIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />

      {/* 2. Annuaire des agents */}
      <Drawer.Screen
        name="agents"
        options={{
          title: 'Mes Agents',
          drawerIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />

      {/* 3. Validations en attente */}
      <Drawer.Screen
        name="validation"
        options={{
          title: 'Validations en attente',
          drawerIcon: ({ color, size }) => <UserCheck size={size} color={color} />,
        }}
      />

      {/* 4. Centres de santé partenaires */}
      <Drawer.Screen
        name="centers"
        options={{
          title: 'Centres partenaires',
          drawerIcon: ({ color, size }) => <Building2 size={size} color={color} />,
        }}
      />

      {/* 5. Rapports d'activité */}
      <Drawer.Screen
        name="reports"
        options={{
          title: "Rapports d'activité",
          drawerIcon: ({ color, size }) => <FileText size={size} color={color} />,
        }}
      />

      {/* 6. Profil ONG (masqué du drawer, accessible par la carte profil) */}
      <Drawer.Screen
        name="profile"
        options={{
          title: 'Profil ONG',
          drawerIcon: ({ color, size }) => <User size={size} color={color} />,
          drawerItemStyle: { display: 'none' },
        }}
      />
    </Drawer>
  );
}
