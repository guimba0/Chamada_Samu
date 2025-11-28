import { IconSymbol } from '@/components/ui/icon-symbol';
import { initDB, loginUser, registerUser } from '@/services/db';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Button, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

/**
 * ============================================================================
 * TELA DE LOGIN / CADASTRO
 * ============================================================================
 * Validação de email aprimorada e fluxo de entrada.
 */

// Função que valida domínios populares
const isValidEmail = (email: string) => {
  const allowedDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.com', 'icloud.com'];
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  return allowedDomains.includes(parts[1]);
};

export default function LoginScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState(''); 

  useEffect(() => { initDB(); }, []);

  const handleAuth = () => {
    if (!email || !senha) { Alert.alert("Erro", "Preencha todos os campos."); return; }

    // Validação de domínio
    if (!isValidEmail(email)) {
      Alert.alert("Email Inválido", "Use um email válido (@gmail.com, @hotmail.com, etc).");
      return;
    }

    if (isLogin) {
      const result = loginUser(email, senha);
      if (result.success) router.replace('/(tabs)');
      else Alert.alert("Erro", result.message);
    } else {
      if (!nome) { Alert.alert("Erro", "Preencha o nome."); return; }
      const result = registerUser(email, senha, nome);
      if (result.success) Alert.alert("Sucesso", "Conta criada!", [{ text: "OK", onPress: () => router.replace('/(tabs)') }]);
      else Alert.alert("Erro", result.message);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} /> 
      <View style={styles.logoContainer}>
        <IconSymbol size={100} name="staroflife.fill" color="#d32f2f" />
        <Text style={styles.title}>Chamada SAMU</Text>
        <Text style={styles.subtitle}>Socorro Imediato</Text>
      </View>
      <View style={styles.formContainer}>
        <Text style={styles.headerText}>{isLogin ? 'Acessar Conta' : 'Nova Conta'}</Text>
        {!isLogin && <TextInput placeholder="Nome" style={styles.input} value={nome} onChangeText={setNome} />}
        <TextInput placeholder="Email (@gmail.com...)" style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"/>
        <TextInput placeholder="Senha" style={styles.input} secureTextEntry value={senha} onChangeText={setSenha} />
        <View style={styles.buttonWrapper}><Button title={isLogin ? "ENTRAR" : "CADASTRAR"} color="#d32f2f" onPress={handleAuth} /></View>
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}><Text style={styles.switchText}>{isLogin ? "Criar conta" : "Fazer Login"}</Text></TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', padding: 20 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#d32f2f', marginTop: 10 },
  subtitle: { fontSize: 18, color: '#666' },
  formContainer: { backgroundColor: '#f9f9f9', padding: 20, borderRadius: 15, elevation: 5 },
  headerText: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 15, marginBottom: 15, fontSize: 16 },
  buttonWrapper: { marginTop: 10, borderRadius: 8, overflow: 'hidden' },
  switchButton: { marginTop: 20, alignItems: 'center' },
  switchText: { color: '#0a7ea4', fontWeight: '600' }
});   