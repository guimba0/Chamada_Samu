import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
// Hook para calcular áreas seguras (evita sobreposição com "notch" ou barra home)
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * ============================================================================
 * LAYOUT DE NAVEGAÇÃO INTERNA (TABS)
 * ============================================================================
 * Define a estrutura do menu inferior que aparece após o login.
 * Contém as 3 abas principais: Rastreio, Chamar (Botão Central) e Perfil.
 */

export default function TabLayout() {
  const colorScheme = useColorScheme();
  
  // Obtém medidas para ajuste de layout em telas modernas (Edge-to-Edge)
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#d32f2f', // Cor vermelha do SAMU
        headerShown: false,
        tabBarButton: HapticTab, // Feedback tátil ao tocar
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          
          // Ajuste dinâmico de altura considerando a barra de navegação do Android/iOS
          height: 60 + insets.bottom, 
          paddingBottom: insets.bottom + 5, 
          paddingTop: 5,

          // Sombras para dar efeito flutuante (Material Design / iOS Shadow)
          elevation: 10, 
          shadowColor: '#000', 
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
      }}>
      
      {/* Aba 1: Rastreio (Mapa) */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Rastreio',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="location.fill" color={color} />,
        }}
      />

      {/* Aba 2: Home / Chamar (Botão de Destaque) */}
      {/* Utiliza um ícone maior e elevado para destacar a ação principal */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chamar',
          tabBarIcon: ({ color }) => (
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 30,
              padding: 2,
              elevation: 5,
              shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4
            }}>
              <IconSymbol size={44} name="phone.circle.fill" color="#d32f2f" />
            </View>
          ),
          tabBarLabelStyle: { color: '#d32f2f', fontWeight: 'bold', marginBottom: 5 }
        }}
      />

      {/* Aba 3: Perfil (Ficha Médica) */}
      <Tabs.Screen
        name="produto"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}