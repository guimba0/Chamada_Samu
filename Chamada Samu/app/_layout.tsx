import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * ============================================================================
 * LAYOUT RAIZ (ROOT LAYOUT)
 * ============================================================================
 * Ponto de entrada da estrutura de navegação.
 * Define a Stack Navigation (pilha de telas) e configurações globais
 * como a Barra de Status e o SafeAreaProvider.
 */

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* Barra de Status (Bateria, Hora, Sinal) configurada com fundo preto */}
      <StatusBar style="light" backgroundColor="#000000" translucent={false} />
      
      {/* Navegador de Pilha: Gerencia a transição entre telas cheias (ex: Login -> Tabs) */}
      <Stack screenOptions={{ headerShown: false }}>
        {/* Rota inicial: Login */}
        <Stack.Screen name="index" />
        
        {/* Rota de Abas (App Logado) */}
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}