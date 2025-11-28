import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

/**
 * ============================================================================
 * TELA DE RASTREIO E MONITORAMENTO
 * ============================================================================
 * Funcionalidades:
 * 1. Mapa em tempo real com GPS.
 * 2. Animação da viatura com rotação dinâmica.
 * 3. Fluxo de atendimento (A caminho -> Chegou -> Finalizado).
 */

// Hacks para evitar erros de tipagem do Maps
const MapViewIg = MapView as any;
const MarkerIg = Marker as any;
const PolylineIg = Polyline as any;

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImI1MmQxZDgwZmM5YzRkZDRiMjNiMmJhMWEzOTIxOGFmIiwiaCI6Im11cm11cjY0In0='; 
const HOSPITAL_COORDS = { latitude: -24.005618, longitude: -46.4241265 };

// Função matemática para calcular o ângulo de rotação (Bearing)
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
  const params = useLocalSearchParams();
  const chamadoAtivo = params.ativo === 'true';
  const tipoEmergencia = params.tipo as string || "Geral"; // Recebe o tipo da triagem
  
  // --- Estados do Mapa e Fluxo ---
  const [userLocation, setUserLocation] = useState<any>(null);
  const [ambulanceCoords, setAmbulanceCoords] = useState(HOSPITAL_COORDS);
  const [ambulanceRotation, setAmbulanceRotation] = useState(0); // Rotação do ícone
  const [statusChamado, setStatusChamado] = useState('Aguardando solicitação...');
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [showAmbulance, setShowAmbulance] = useState(false);
  
  // Controle de etapas
  const [ambulanciaChegou, setAmbulanciaChegou] = useState(false);
  const [atendimentoIniciado, setAtendimentoIniciado] = useState(false);

  const mapRef = useRef<MapView>(null);
  // useRef<any> corrige o erro de tipagem do NodeJS.Timeout
  const animationInterval = useRef<any>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
    })();
  }, []);

  useEffect(() => {
    if (chamadoAtivo && userLocation) {
      setStatusChamado(`Solicitando: ${tipoEmergencia}...`);
      // Reseta estados anteriores
      setAmbulanciaChegou(false);
      setAtendimentoIniciado(false);

      setTimeout(() => {
        Alert.alert("Central SAMU", "Viatura despachada! Acompanhe o trajeto.", [
          { text: "OK", onPress: () => buscarRotaETrajeto() }
        ]);
      }, 2000);
    }
  }, [chamadoAtivo, userLocation]);

  const buscarRotaETrajeto = async () => {
    if (!userLocation) return;
    setStatusChamado("Calculando rota de resgate...");
    setShowAmbulance(true);

    try {
      const start = `${HOSPITAL_COORDS.longitude},${HOSPITAL_COORDS.latitude}`;
      const end = `${userLocation.coords.longitude},${userLocation.coords.latitude}`;
      const response = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${start}&end=${end}`);
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const points = data.features[0].geometry.coordinates.map((p: any) => ({ latitude: p[1], longitude: p[0] }));
        setRouteCoords(points);
        iniciarAnimacaoNaRota(points);
      } else { iniciarAnimacaoNaRota([]); }
    } catch (error) { iniciarAnimacaoNaRota([]); }
  };

  const iniciarAnimacaoNaRota = (coordenadasRota: any[]) => {
    setStatusChamado("Viatura a caminho - Prioridade Máxima");
    
    const rotaFinal = coordenadasRota.length > 0 ? coordenadasRota : [
        HOSPITAL_COORDS, 
        {latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude}
    ];

    mapRef.current?.fitToCoordinates(rotaFinal, {
      edgePadding: { top: 50, right: 50, bottom: 200, left: 50 },
      animated: true,
    });

    let index = 0;
    const step = Math.max(1, Math.ceil(rotaFinal.length / 100)); 
    
    if (animationInterval.current) clearInterval(animationInterval.current);

    animationInterval.current = setInterval(() => {
      // Chegada ao destino
      if (index >= rotaFinal.length) {
        if (animationInterval.current) clearInterval(animationInterval.current);
        setStatusChamado("A unidade chegou ao local!");
        setAmbulanciaChegou(true); // Ativa botão de confirmação
        Alert.alert("SAMU", "A equipe de resgate chegou ao seu local.");
        return;
      }

      // Calcula a rotação para o próximo ponto
      const currentPoint = rotaFinal[index];
      const nextPoint = rotaFinal[index + step] || rotaFinal[rotaFinal.length - 1];
      if (currentPoint && nextPoint) {
        const angle = getBearing(currentPoint.latitude, currentPoint.longitude, nextPoint.latitude, nextPoint.longitude);
        setAmbulanceRotation(angle);
      }
      setAmbulanceCoords(currentPoint);
      index += step;
    }, 100);
  };

  // Limpa o mapa e encerra a ocorrência
  const limparMapa = (mensagem: string) => {
    if (animationInterval.current) clearInterval(animationInterval.current);
    setShowAmbulance(false);
    setRouteCoords([]);
    setAmbulanceCoords(HOSPITAL_COORDS);
    setStatusChamado(mensagem);
    setAmbulanciaChegou(false);
    setAtendimentoIniciado(false);
  };

  const handleCancelarChamado = () => {
    Alert.alert("Cancelar Chamado", "Qual o motivo?", [
        { text: "Alerta Falso", onPress: () => limparMapa("Cancelado: Alerta Falso") },
        { text: "Resolvido", onPress: () => limparMapa("Cancelado: Situação Resolvida") },
        { text: "Voltar", style: "cancel" }
      ]);
  };

  const handleConfirmarChegada = () => {
    setStatusChamado("Equipe realizando atendimento.");
    setAtendimentoIniciado(true); // Muda para o estado de atendimento
  };

  const handleFinalizarTudoBem = () => {
    Alert.alert("Encerrar", "O atendimento foi concluído?", [
      { text: "Sim, Finalizar", onPress: () => limparMapa("Ocorrência Finalizada com Sucesso") },
      { text: "Não", style: "cancel" }
    ]);
  };

  if (!userLocation) { return (<View style={styles.loadingContainer}><ActivityIndicator size="large" color="#d32f2f" /><Text style={{marginTop: 10}}>Localizando GPS...</Text></View>); }

  return (
    <View style={styles.container}>
      <MapViewIg ref={mapRef} style={styles.map} initialRegion={{ latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015, }} showsUserLocation={true} >
        <MarkerIg coordinate={HOSPITAL_COORDS} title="PS Central"><View style={styles.hospitalMarker}><Text style={{fontSize: 20}}>🏥</Text></View></MarkerIg>
        
        {showAmbulance && ( 
          <>
            <PolylineIg coordinates={routeCoords} strokeColor="#00b0ff" strokeWidth={4} />
            <MarkerIg 
              coordinate={ambulanceCoords} 
              title="Viatura 01" 
              anchor={{ x: 0.5, y: 0.5 }} 
              rotation={ambulanceRotation} // Rotação aplicada
              flat={true} 
            >
              <Image source={require('@/assets/images/ambulancia.png')} style={{ width: 50, height: 50, resizeMode: 'contain' }} />
            </MarkerIg>
          </> 
        )}
      </MapViewIg>

      <View style={styles.statusCard}>
        <View style={styles.handleBar} />
        <Text style={styles.statusTitle}>{chamadoAtivo ? "EMERGÊNCIA EM ANDAMENTO" : "STATUS"}</Text>
        <Text style={styles.statusMain}>{statusChamado}</Text>
        
        {/* Lógica de Botões de Ação */}
        
        {showAmbulance && !ambulanciaChegou && (
          <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#d32f2f'}]} onPress={handleCancelarChamado}>
            <Text style={styles.actionText}>CANCELAR CHAMADO</Text>
          </TouchableOpacity>
        )}

        {ambulanciaChegou && !atendimentoIniciado && (
          <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#f57c00'}]} onPress={handleConfirmarChegada}>
            <Text style={styles.actionText}>CONFIRMAR CHEGADA DA EQUIPE</Text>
          </TouchableOpacity>
        )}

        {atendimentoIniciado && (
          <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#2e7d32'}]} onPress={handleFinalizarTudoBem}>
            <Text style={styles.actionText}>JÁ ESTÁ TUDO BEM (FINALIZAR)</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { width: Dimensions.get('window').width, height: '100%' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hospitalMarker: { backgroundColor: '#fff', padding: 5, borderRadius: 20, elevation: 5, borderWidth: 1, borderColor: '#ddd' },
  statusCard: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: Platform.OS === 'ios' ? 90 : 70, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.2, elevation: 15 },
  handleBar: { width: 40, height: 5, backgroundColor: '#ddd', borderRadius: 5, alignSelf: 'center', marginBottom: 15 },
  statusTitle: { fontSize: 12, color: '#888', fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  statusMain: { fontSize: 20, fontWeight: 'bold', color: '#333', marginVertical: 5 },
  actionButton: { marginTop: 15, padding: 15, borderRadius: 10, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});