import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

/* TELA DE RASTREIO E MONITORAMENTO
 * 1. Mapa em tempo real com GPS.
 * 2. Animação da viatura com rotação dinâmica (Bearing).
 * 3. Cálculo de rota usando OpenRouteService.
 * 4. Fluxo de atendimento com Timer de Finalização (Cooldown de 5s).
 */


// Evitar erros de tipagem do Maps no React 19
const MapViewIg = MapView as any;
const MarkerIg = Marker as any;
const PolylineIg = Polyline as any;

// Chave da API OpenRouteService para cálculo de rotas 
const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImI1MmQxZDgwZmM5YzRkZDRiMjNiMmJhMWEzOTIxOGFmIiwiaCI6Im11cm11cjY0In0=';
// Coordenadas fixas do Ponto de Partida (Hospital Central)
const HOSPITAL_COORDS = { latitude: -24.005618, longitude: -46.4241265 };

// Função para calcular rotação (Bearing) entre dois pontos GPS (para animação do ícone)
function getBearing(startLat: number, startLng: number, destLat: number, destLng: number) {
  const startLatRad = (startLat * Math.PI) / 180;
  const startLngRad = (startLng * Math.PI) / 180;
  const destLatRad = (destLat * Math.PI) / 180;
  const destLngRad = (destLng * Math.PI) / 180;
  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) - Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export default function RastreioScreen() {
  // Parâmetros de navegação (recebe se o chamado foi ativado e o tipo de emergência)
  const params = useLocalSearchParams();
  const chamadoAtivo = params.ativo === 'true';
  const tipoEmergencia = params.tipo as string || "Geral";

  // --- Estados ---
  const [userLocation, setUserLocation] = useState<any>(null); // Posição GPS do usuário/destino
  const [ambulanceCoords, setAmbulanceCoords] = useState(HOSPITAL_COORDS); // Posição da ambulância (inicia no Hospital)
  const [ambulanceRotation, setAmbulanceRotation] = useState(0); // Rotação do ícone da ambulância
  const [statusChamado, setStatusChamado] = useState('Aguardando solicitação...'); // Mensagem de status para o usuário
  const [routeCoords, setRouteCoords] = useState<any[]>([]); // Coordenadas da rota retornada pela API
  const [showAmbulance, setShowAmbulance] = useState(false); // Controla a visibilidade da ambulância/rota

  // Controle de etapas do fluxo de atendimento
  const [ambulanciaChegou, setAmbulanciaChegou] = useState(false);
  const [atendimentoIniciado, setAtendimentoIniciado] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false); // Bloqueia ações durante o timer de finalização (cooldown)

  // --- Referências (Ref) para controlar o mapa e os timers ---
  const mapRef = useRef<MapView>(null); // Referência para manipular o MapView
  const animationInterval = useRef<any>(null); // Ref para o timer de animação de movimento
  const resetTimeout = useRef<any>(null); // Ref para o timer de 5s após finalizar o chamado

  // Efeito para solicitar permissão de localização e obter a posição inicial do usuário
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
    })();
  }, []);

  // Efeito de limpeza: Garante que todos os timers sejam interrompidos ao desmontar o componente
  useEffect(() => {
    return () => {
      if (animationInterval.current) clearInterval(animationInterval.current);
      if (resetTimeout.current) clearTimeout(resetTimeout.current);
    };
  }, []);

  // Efeito para iniciar o fluxo de atendimento quando o chamado estiver ativo e a localização do usuário for conhecida
  useEffect(() => {
    if (chamadoAtivo && userLocation) {
      setStatusChamado(`Solicitando: ${tipoEmergencia}...`);
      setAmbulanciaChegou(false);
      setAtendimentoIniciado(false);
      setIsCooldown(false);

      // Simula o tempo de despache
      setTimeout(() => {
        Alert.alert("Central SAMU", "Viatura despachada! Acompanhe o trajeto.", [
          { text: "OK", onPress: () => buscarRotaETrajeto() }
        ]);
      }, 2000);
    }
  }, [chamadoAtivo, userLocation]);

  // Busca a rota de navegação do Hospital até o usuário via API do OpenRouteService
  const buscarRotaETrajeto = async () => {
    if (!userLocation) return;
    setStatusChamado("Calculando rota...");
    setShowAmbulance(true);
    try {
      const start = `${HOSPITAL_COORDS.longitude},${HOSPITAL_COORDS.latitude}`;
      const end = `${userLocation.coords.longitude},${userLocation.coords.latitude}`;
      const response = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${start}&end=${end}`);
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        // Extrai as coordenadas para a Polyline e animação
        const points = data.features[0].geometry.coordinates.map((p: any) => ({ latitude: p[1], longitude: p[0] }));
        setRouteCoords(points);
        iniciarAnimacaoNaRota(points);
      } else { iniciarAnimacaoNaRota([]); } // Fallback
    } catch (error) { iniciarAnimacaoNaRota([]); } // Fallback
  };

  // Inicia a animação do ícone da ambulância seguindo a rota
  const iniciarAnimacaoNaRota = (coordenadasRota: any[]) => {
    setStatusChamado("Viatura a caminho - Prioridade Máxima");

    // Rota de fallback (linha reta) caso a API de rota falhe
    const rotaFinal = coordenadasRota.length > 0 ? coordenadasRota : [
      HOSPITAL_COORDS,
      {latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude}
    ];

    // Ajusta o zoom e foco do mapa para mostrar a rota completa
    mapRef.current?.fitToCoordinates(rotaFinal, {
      edgePadding: { top: 50, right: 50, bottom: 200, left: 50 },
      animated: true,
    });

    let index = 0;
    // Define o passo da animação (ajusta a velocidade)
    const step = Math.max(1, Math.ceil(rotaFinal.length / 100));

    if (animationInterval.current) clearInterval(animationInterval.current);

    // Inicia o Intervalo de animação
    animationInterval.current = setInterval(() => {
      // Condição de parada: Ambulância chegou ao destino
      if (index >= rotaFinal.length) {
        if (animationInterval.current) clearInterval(animationInterval.current);
        setStatusChamado("A unidade chegou ao local!");
        setAmbulanciaChegou(true);
        Alert.alert("SAMU", "A equipe de resgate chegou ao seu local.");
        return;
      }

      const currentPoint = rotaFinal[index];
      const nextPoint = rotaFinal[index + step] || rotaFinal[rotaFinal.length - 1];

      // Atualiza a rotação do ícone
      if (currentPoint && nextPoint) {
        const angle = getBearing(currentPoint.latitude, currentPoint.longitude, nextPoint.latitude, nextPoint.longitude);
        setAmbulanceRotation(angle);
      }

      // Atualiza a posição e avança o índice
      setAmbulanceCoords(currentPoint);
      index += step;
    }, 100);
  };

  // Limpa todos os estados relacionados ao chamado
  const limparMapa = (mensagem: string) => {
    if (animationInterval.current) clearInterval(animationInterval.current);
    if (resetTimeout.current) clearTimeout(resetTimeout.current);

    setShowAmbulance(false);
    setRouteCoords([]);
    setAmbulanceCoords(HOSPITAL_COORDS);
    setStatusChamado(mensagem);

    // Reseta estados de fluxo
    setAmbulanciaChegou(false);
    setAtendimentoIniciado(false);
    setIsCooldown(false);
  };

  // Lida com o cancelamento do chamado
  const handleCancelarChamado = () => {
    Alert.alert("Cancelar Chamado", "Qual o motivo?", [
        { text: "Alerta Falso", onPress: () => limparMapa("Cancelado: Alerta Falso") },
        { text: "Resolvido", onPress: () => limparMapa("Cancelado: Situação Resolvida") },
        { text: "Voltar", style: "cancel" }
      ]);
  };

  // Confirma a chegada e avança para a etapa de Atendimento
  const handleConfirmarChegada = () => {
    setStatusChamado("Equipe realizando atendimento.");
    setAtendimentoIniciado(true);
  };

  // Lida com a finalização do chamado e inicia o Cooldown
  const handleFinalizarTudoBem = () => {
    Alert.alert("Encerrar", "O atendimento foi concluído?", [
      {
        text: "Sim, Finalizar",
        onPress: () => {
          // 1. Ativa o Cooldown (bloqueia botões)
          setIsCooldown(true);
          setStatusChamado("Ocorrência finalizada. Reiniciando sistema...");

          // 2. Inicia o timer de 5 segundos para limpar completamente o sistema
          resetTimeout.current = setTimeout(() => {
            limparMapa("Pronto para nova solicitação");
          }, 5000);
        }
      },
      { text: "Não", style: "cancel" }
    ]);
  };

  // Tela de Loading enquanto espera a localização inicial do GPS
  if (!userLocation) { return (<View style={styles.loadingContainer}><ActivityIndicator size="large" color="#d32f2f" /><Text style={{marginTop: 10}}>Localizando GPS...</Text></View>); }

  return (
    <View style={styles.container}>
      <MapViewIg ref={mapRef} style={styles.map} initialRegion={{ latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015, }} showsUserLocation={true} >
        {/* Marcador do Hospital (Origem) */}
        <MarkerIg coordinate={HOSPITAL_COORDS} title="PS Central"><View style={styles.hospitalMarker}><Text style={{fontSize: 20}}>🏥</Text></View></MarkerIg>

        {showAmbulance && (
          <>
            {/* Desenha a rota calculada */}
            <PolylineIg coordinates={routeCoords} strokeColor="#00b0ff" strokeWidth={4} />
            {/* Marcador da Ambulância: Rotação dinâmica e ícone personalizado */}
            <MarkerIg coordinate={ambulanceCoords} title="samu 01" anchor={{ x: 0.5, y: 0.5 }} rotation={ambulanceRotation} flat={true} >
              {/* Nota: É necessário ter a imagem 'ambulancia.png' em '@/assets/images/' */}
              <Image source={require('@/assets/images/ambulancia.png')} style={{ width: 50, height: 50, resizeMode: 'contain' }} />
            </MarkerIg>
          </>
        )}
      </MapViewIg>

      {/* Card de Status e Ações na parte inferior */}
      <View style={styles.statusCard}>
        <View style={styles.handleBar} />
        <Text style={styles.statusTitle}>{chamadoAtivo ? `EMERGÊNCIA: ${tipoEmergencia.toUpperCase()}` : "STATUS"}</Text>
        <Text style={styles.statusMain}>{statusChamado}</Text>

        {/* Botões de Ação controlados pelo fluxo, visíveis apenas se não estiver em Cooldown */}
        {!isCooldown && (
          <>
            {/* 1. CANCELAR: Visível enquanto a viatura está a caminho */}
            {showAmbulance && !ambulanciaChegou && (
              <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#d32f2f'}]} onPress={handleCancelarChamado}>
                <Text style={styles.actionText}>CANCELAR CHAMADO</Text>
              </TouchableOpacity>
            )}

            {/* 2. CONFIRMAR CHEGADA: Visível após a chegada e antes de iniciar o atendimento */}
            {ambulanciaChegou && !atendimentoIniciado && (
              <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#f57c00'}]} onPress={handleConfirmarChegada}>
                <Text style={styles.actionText}>CONFIRMAR CHEGADA DA EQUIPE</Text>
              </TouchableOpacity>
            )}

            {/* 3. FINALIZAR: Visível após o atendimento iniciado */}
            {atendimentoIniciado && (
              <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#2e7d32'}]} onPress={handleFinalizarTudoBem}>
                <Text style={styles.actionText}>JÁ ESTÁ TUDO BEM (FINALIZAR)</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Indicador de Cooldown */}
        {isCooldown && (
          <View style={{marginTop: 20, alignItems: 'center'}}>
            <ActivityIndicator size="small" color="#999" />
            <Text style={{color: '#999', marginTop: 5}}>Aguarde...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Estilos Visuais
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { width: Dimensions.get('window').width, height: '100%' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hospitalMarker: { backgroundColor: '#fff', padding: 5, borderRadius: 20, elevation: 5, borderWidth: 1, borderColor: '#ddd' },
  // Estilo do Card de Status (Bottom Sheet)
  statusCard: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: Platform.OS === 'ios' ? 90 : 70, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.2, elevation: 15 },
  handleBar: { width: 40, height: 5, backgroundColor: '#ddd', borderRadius: 5, alignSelf: 'center', marginBottom: 15 },
  statusTitle: { fontSize: 12, color: '#888', fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  statusMain: { fontSize: 20, fontWeight: 'bold', color: '#333', marginVertical: 5 },
  actionButton: { marginTop: 15, padding: 15, borderRadius: 10, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});