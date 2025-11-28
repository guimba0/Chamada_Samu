import { IconSymbol } from '@/components/ui/icon-symbol';
import { addContact, deleteContact, getContacts, getUserData, setLoggedUser, updateUserData } from '@/services/db';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Button, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

/**
 * ============================================================================
 * TELA DE PERFIL E FICHA MÉDICA
 * ============================================================================
 * Responsável por:
 * 1. Exibir e editar dados do usuário (Ficha Médica).
 * 2. Gerenciar contatos de emergência.
 * 3. Realizar o Logout (Sair) do sistema.
 */

// Lista para o seletor de Tipo Sanguíneo (Padronização)
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Não sei'];

export default function PerfilScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showBloodPicker, setShowBloodPicker] = useState(false); // Controle do modal

  // --- Estado do Formulário ---
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    bloodType: '', 
    age: '', weight: '', height: '',
    allergies: '', medications: ''
  });

  const [contacts, setContacts] = useState<any[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // Carrega dados do banco ao abrir a tela
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = () => {
    const user: any = getUserData();
    if (user) {
      setForm(user);
      setContacts(getContacts());
    }
    setLoading(false);
  };

  // Salva alterações no banco
  const handleUpdate = () => {
    const sucesso = updateUserData(form);
    if (sucesso) Alert.alert("Sucesso", "Dados médicos atualizados com segurança.");
    else Alert.alert("Erro", "Falha ao atualizar.");
  };

  // Adiciona contato de emergência
  const handleAddContact = () => {
    if (!newContactName || !newContactPhone) {
      Alert.alert("Atenção", "Preencha nome e telefone do contato.");
      return;
    }
    addContact(newContactName, newContactPhone);
    setNewContactName('');
    setNewContactPhone('');
    setContacts(getContacts()); 
  };

  const handleDeleteContact = (id: number) => {
    deleteContact(id);
    setContacts(getContacts());
  };

  // Logout da conta (Não funcionando)
  const handleLogout = () => {
    Alert.alert("Sair", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Sim, Sair", onPress: () => {
          // 1. Limpa a variável de sessão
          setLoggedUser(null); 
          
          // 2. Pequeno delay para evitar conflito com o fechamento do Alert
          setTimeout(() => {
            // Fecha qualquer modal ou pilha de navegação aberta
            if (router.canDismiss()) {
              router.dismissAll();
            }
            // Substitui a rota atual pela raiz (Login), impedindo o botão "Voltar"
            router.replace('/'); 
          }, 100);
        } 
      }
    ]);
  };

  // Componente Modal para seleção de sangue
  const renderBloodSelect = () => (
    <Modal visible={showBloodPicker} transparent={true} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Selecione o Tipo Sanguíneo</Text>
          <FlatList
            data={BLOOD_TYPES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.modalItem} 
                onPress={() => {
                  setForm({ ...form, bloodType: item });
                  setShowBloodPicker(false);
                }}
              >
                <Text style={styles.modalItemText}>{item}</Text>
                {form.bloodType === item && <IconSymbol name="checkmark" size={20} color="#0a7ea4"/>}
              </TouchableOpacity>
            )}
          />
          <Button title="Cancelar" onPress={() => setShowBloodPicker(false)} color="#d32f2f"/>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      {renderBloodSelect()}
      
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <IconSymbol size={50} name="person.fill" color="#fff" />
        </View>
        <Text style={styles.nameTitle}>{form.name || "Usuário"}</Text>
        <Text style={styles.subTitle}>Ficha do Paciente</Text>
      </View>

      {/* Dados Pessoais */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dados Pessoais & Acesso</Text>
        <Text style={styles.label}>Nome Completo</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={(t) => setForm({...form, name: t})} />
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={form.email} onChangeText={(t) => setForm({...form, email: t})} />
        <Text style={styles.label}>Senha</Text>
        <TextInput style={styles.input} value={form.password} onChangeText={(t) => setForm({...form, password: t})} secureTextEntry />
        <Text style={styles.label}>Celular</Text>
        <TextInput style={styles.input} value={form.phone} onChangeText={(t) => setForm({...form, phone: t})} keyboardType="phone-pad" />
      </View>

      {/* Ficha Médica */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ficha Médica</Text>
        
        <View style={styles.row}>
          <View style={{flex: 1, marginRight: 5}}>
            <Text style={styles.label}>Tipo Sangue</Text>
            {/* Botão seletor em vez de texto livre */}
            <TouchableOpacity style={styles.selectorButton} onPress={() => setShowBloodPicker(true)}>
              <Text style={styles.selectorText}>{form.bloodType || "Selecionar..."}</Text>
              <IconSymbol name="chevron.down" size={20} color="#666"/>
            </TouchableOpacity>
          </View>
          <View style={{flex: 1, marginLeft: 5}}>
            <Text style={styles.label}>Idade</Text>
            <TextInput style={styles.input} value={form.age} onChangeText={(t) => setForm({...form, age: t})} keyboardType="numeric" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{flex: 1, marginRight: 5}}>
            <Text style={styles.label}>Peso (kg)</Text>
            <TextInput style={styles.input} value={form.weight} onChangeText={(t) => setForm({...form, weight: t})} keyboardType="numeric" />
          </View>
          <View style={{flex: 1, marginLeft: 5}}>
            <Text style={styles.label}>Altura (m)</Text>
            <TextInput style={styles.input} value={form.height} onChangeText={(t) => setForm({...form, height: t})} keyboardType="numeric" />
          </View>
        </View>

        <Text style={styles.label}>Alergias</Text>
        <TextInput style={styles.input} value={form.allergies} onChangeText={(t) => setForm({...form, allergies: t})} placeholder="Ex: Penicilina, Dipirona..." />

        <Text style={styles.label}>Medicamentos contínuos</Text>
        <TextInput style={[styles.input, {height: 60}]} value={form.medications} onChangeText={(t) => setForm({...form, medications: t})} multiline />
      
        <Button title="SALVAR DADOS" color="#0a7ea4" onPress={handleUpdate} />
      </View>

      {/* Contatos */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: '#d32f2f'}]}>Contatos de Emergência</Text>
        <View style={styles.addContactBox}>
          <TextInput style={[styles.input, {marginBottom: 5}]} placeholder="Nome (ex: Mãe)" value={newContactName} onChangeText={setNewContactName} />
          <TextInput style={styles.input} placeholder="Telefone" value={newContactPhone} onChangeText={setNewContactPhone} keyboardType="phone-pad" />
          <Button title="Adicionar Contato" color="#d32f2f" onPress={handleAddContact} />
        </View>
        {contacts.map((c) => (
          <View key={c.id} style={styles.contactItem}>
            <View>
              <Text style={styles.contactName}>{c.contactName}</Text>
              <Text style={styles.contactPhone}>{c.contactPhone}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteContact(c.id)}>
              <IconSymbol size={24} name="trash.fill" color="#666" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>SAIR DO APLICATIVO</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  header: { alignItems: 'center', padding: 30, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  nameTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  subTitle: { color: '#666' },
  section: { padding: 20, backgroundColor: '#fff', marginTop: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
  label: { fontSize: 14, color: '#666', marginBottom: 5, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 15, fontSize: 16, backgroundColor: '#fff' },
  selectorButton: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectorText: { fontSize: 16, color: '#333' },
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '50%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
  modalItemText: { fontSize: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  addContactBox: { backgroundColor: '#ffebeb', padding: 10, borderRadius: 8, marginBottom: 15 },
  contactItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  contactName: { fontWeight: 'bold', fontSize: 16 },
  contactPhone: { color: '#555' },
  footer: { padding: 20, paddingBottom: 120 },
  logoutButton: { backgroundColor: '#333', padding: 15, borderRadius: 8, alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: 'bold' }
});