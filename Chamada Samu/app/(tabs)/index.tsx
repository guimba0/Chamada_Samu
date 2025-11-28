import { IconSymbol } from '@/components/ui/icon-symbol';
import { getUserData } from '@/services/db';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * ============================================================================
 * TELA PRINCIPAL - TRIAGEM DE EMERGÊNCIA
 * ============================================================================
 * Atualizações:
 * - Triagem com seleção de tipo de emergência (Risco de Vida, Acidente, etc).
 * - Alerta automático de ficha médica pendente.
 */

export default function ChamadaScreen() {
  const router = useRouter();
  const [showTriageModal, setShowTriageModal] = useState(false);

  // Verifica se o usuário tem dados médicos preenchidos
  useEffect(() => {
    const user: any = getUserData();
    // Se não tiver tipo sanguíneo ou alergias preenchidos, avisa.
    if (user && (!user.bloodType || !user.allergies)) {
      Alert.alert(
        "Atenção: Ficha Incompleta", 
        "Para agilizar o atendimento, preencha seus dados médicos.", 
        [
          { text: "Depois", style: "cancel" }, 
          { text: "Preencher Agora", onPress: () => router.push('/(tabs)/produto') }
        ]
      );
    }
  }, []);

  // Inicia o chamado enviando o tipo selecionado para a tela de mapa
  const iniciarChamado = (tipo: string) => {
    setShowTriageModal(false);
    router.push(`/(tabs)/explore?ativo=true&tipo=${encodeURIComponent(tipo)}`);
  };

  const renderTriageModal = () => (
    <Modal visible={showTriageModal} transparent={true} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Qual a emergência?</Text>
          <Text style={styles.modalSubtitle}>Isso ajuda a preparar a equipe certa</Text>

          {/* Opções de Triagem */}
          <TouchableOpacity style={[styles.triageButton, {backgroundColor: '#d32f2f'}]} onPress={() => iniciarChamado('Risco de Vida Iminente')}>
            <IconSymbol name="heart.fill" size={24} color="#fff" style={{marginRight: 10}}/>
            <Text style={styles.triageText}>Risco de Vida (Parada, Infarto)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.triageButton, {backgroundColor: '#f57c00'}]} onPress={() => iniciarChamado('Acidente de Trânsito')}>
            <IconSymbol name="car.fill" size={24} color="#fff" style={{marginRight: 10}}/>
            <Text style={styles.triageText}>Acidente / Trauma</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.triageButton, {backgroundColor: '#0288d1'}]} onPress={() => iniciarChamado('Mal Súbito')}>
            <IconSymbol name="person.fill" size={24} color="#fff" style={{marginRight: 10}}/>
            <Text style={styles.triageText}>Mal Súbito / Tontura</Text>
          </TouchableOpacity>

          <View style={{height: 1, backgroundColor: '#eee', marginVertical: 15}} />

          {/* Botão de Pânico (Chamada Rápida) */}
          <TouchableOpacity style={[styles.triageButton, {backgroundColor: '#000'}]} onPress={() => iniciarChamado('CHAMADA RÁPIDA (PÂNICO)')}>
            <IconSymbol name="bolt.fill" size={24} color="#fff" style={{marginRight: 10}}/>
            <Text style={[styles.triageText, {fontWeight: '900'}]}>CHAMADA RÁPIDA (PULAR)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.closeButton} onPress={() => setShowTriageModal(false)}>
             <Text style={{color: '#666'}}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {renderTriageModal()}
      <Text style={styles.title}>Emergência</Text>
      <Text style={styles.subtitle}>Toque para iniciar o atendimento</Text>

      <TouchableOpacity 
        style={styles.panicButton} 
        onPress={() => setShowTriageModal(true)}
        activeOpacity={0.7}
      >
        <IconSymbol size={120} name="phone.fill" color="#fff" />
        <Text style={styles.panicText}>192</Text>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <IconSymbol size={24} name="info.circle" color="#666" />
        <Text style={{marginLeft: 10, color: '#666'}}>Mantenha a calma. O GPS enviará sua posição.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#d32f2f', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 40 },
  panicButton: { width: 280, height: 280, borderRadius: 140, backgroundColor: '#d32f2f', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#d32f2f', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, shadowRadius: 10, borderWidth: 10, borderColor: '#ff6666' },
  panicText: { color: '#fff', fontSize: 40, fontWeight: 'bold', marginTop: 10 },
  infoBox: { flexDirection: 'row', marginTop: 50, padding: 20, backgroundColor: '#f5f5f5', borderRadius: 10 },
  
  // Estilos do Modal
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, paddingBottom: 40 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  modalSubtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 25 },
  triageButton: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2 },
  triageText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  closeButton: { marginTop: 15, alignItems: 'center', padding: 10 }
});