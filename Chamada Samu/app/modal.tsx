import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

/**
 * ============================================================================
 * TELA MODAL (Exemplo de Navegação)
 * ============================================================================
 * Esta tela é configurada para abrir como um "Modal" (sobrepondo a tela anterior),
 * mantendo o contexto da navegação por trás.
 * Útil para: Avisos rápidos, Termos de Uso, Configurações simples ou Ajuda.
 */

export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Este é um Modal</ThemedText>
      
      {/* O componente Link gerencia a navegação. 'dismissTo' fecha o modal. */}
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">Voltar para a tela inicial</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});