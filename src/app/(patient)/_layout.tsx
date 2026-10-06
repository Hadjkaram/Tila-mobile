import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Home,
  Calendar,
  Video,
  ClipboardList,
  FileText,
  FileCheck,
  Menu,
  MessagesSquare,
  ArrowLeft,
  UserCircle2,
  Route as RouteIcon,
  Stethoscope,
  HeartPulse,
  Sparkles,
  BookOpen,
  LifeBuoy,
  ShieldCheck,
  Users,
} from 'lucide-react-native';
import { CustomDrawerContent } from '../../components/navigation/CustomDrawerContent';
import { useTheme } from '../../context/ThemeContext';

export default function PatientLayout() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <Drawer
      initialRouteName="dashboard"
      drawerContent={(props) => (
        <CustomDrawerContent {...props} profileRoute="/(patient)/profile" />
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
          fontSize: 14,
          fontWeight: '500',
          marginLeft: -10,
          fontFamily: 'Montserrat_500Medium',
        },
        drawerType: 'front',
        overlayColor: 'rgba(0, 0, 0, 0.65)',
        drawerStyle: {
          width: '84%',
          maxWidth: 330,
          backgroundColor: colors.bg,
          borderRightWidth: 0,
        },
        sceneContainerStyle: {
          backgroundColor: colors.bg,
        },
      })}
    >
      {/* ─── GROUPE 1 : MON ESPACE ─── */}
      <Drawer.Screen
        name="dashboard"
        options={{
          title: 'Accueil',
          drawerIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />

      <Drawer.Screen
        name="profile"
        options={{
          drawerItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />

      <Drawer.Screen
        name="parcours"
        options={{
          title: 'Mon parcours',
          drawerIcon: ({ color, size }) => <RouteIcon size={size} color={color} />,
        }}
      />

      <Drawer.Screen
        name="evaluations"
        options={{
          title: 'Mes évaluations',
          drawerIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
        }}
      />

      {/* ─── GROUPE 2 : MES SOINS ─── */}
      <Drawer.Screen
        name="dossier"
        options={{
          title: 'Mes consultations',
          drawerIcon: ({ color, size }) => <Stethoscope size={size} color={color} />,
        }}
      />

      <Drawer.Screen
        name="teleconsultation"
        options={{
          title: 'Mes téléconsultations',
          drawerIcon: ({ color, size }) => <Video size={size} color={color} />,
        }}
      />

      <Drawer.Screen
        name="appointments"
        options={{
          title: 'Mes rendez-vous',
          drawerIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />

      <Drawer.Screen
        name="soins"
        options={{
          title: 'Mes soins & santé',
          drawerIcon: ({ color, size }) => <HeartPulse size={size} color={color} />,
        }}
      />

      <Drawer.Screen
        name="documents"
        options={{
          title: 'Documents',
          drawerIcon: ({ color, size }) => <FileText size={size} color={color} />,
        }}
      />

      <Drawer.Screen
        name="prescriptions"
        options={{
          title: 'Ordonnances',
          drawerIcon: ({ color, size }) => <FileCheck size={size} color={color} />,
        }}
      />

      {/* ─── GROUPE 3 : BIEN-ÊTRE & SOUTIEN ─── */}
      <Drawer.Screen
        name="bien-etre"
        options={{
          title: 'Mon bien-être',
          drawerIcon: ({ color, size }) => <Sparkles size={size} color={color} />,
        }}
      />

      <Drawer.Screen
        name="ressources"
        options={{
          title: 'Ressources',
          drawerIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />

      <Drawer.Screen
        name="forum"
        options={{
          title: 'Forum & Entraide',
          drawerIcon: ({ color, size }) => <MessagesSquare size={size} color={color} />,
        }}
      />

      <Drawer.Screen
        name="aide"
        options={{
          title: 'Aide & urgence (143)',
          drawerIcon: ({ color, size }) => <LifeBuoy size={size} color={color} />,
        }}
      />

      {/* ─── GROUPE 4 : CONFIDENTIALITÉ ─── */}
      <Drawer.Screen
        name="autorisations"
        options={{
          title: 'Mes autorisations',
          drawerIcon: ({ color, size }) => <ShieldCheck size={size} color={color} />,
        }}
      />

      <Drawer.Screen
        name="famille"
        options={{
          title: 'Ma famille',
          drawerIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />

      {/* ─── SOUS-ROUTES ET ÉCRANS SECONDAIRES ─── */}
      <Drawer.Screen
        name="forum/[groupId]"
        options={{
          drawerItemStyle: { display: 'none' },
          title: 'Discussion',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 16 }}
              activeOpacity={0.7}
            >
              <ArrowLeft color="#00A651" size={24} />
            </TouchableOpacity>
          ),
        }}
      />

      <Drawer.Screen
        name="directory"
        options={{
          drawerItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />
    </Drawer>
  );
}
