import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert, ActivityIndicator, Modal } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import QRCode from 'react-native-qrcode-svg';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { getApiUrl } from '../config';

const QRCodeScreen = () => {
  const navigation = useNavigation();
  const [amount, setAmount] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [qrData, setQrData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Demander la permission pour le scanner
  React.useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Générer un QR code
  const generateQRCode = async () => {
    if (!amount || !receiverPhone || parseFloat(amount) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant et un numéro de téléphone valides.');
      return;
    }

    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Erreur', 'Token non trouvé. Veuillez vous reconnecter.');
        navigation.navigate('Login');
        return;
      }

      const response = await axios.post(
        getApiUrl('/api/transactions/generate-qr'),
        { amount: parseFloat(amount), receiver_phone: receiverPhone },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setQrData({
        qr_code: response.data.qr_code,
        amount: response.data.amount,
        receiver_phone: response.data.receiver_phone
      });

    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        Alert.alert('Erreur', error.response.data.message);
      } else {
        Alert.alert('Erreur', 'Échec de la génération du QR code.');
      }
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Scanner un QR code
  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Erreur', 'Token non trouvé. Veuillez vous reconnecter.');
        navigation.navigate('Login');
        return;
      }

      const response = await axios.post(
        getApiUrl('/api/transactions/validate-qr'),
        { qr_code: data },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      Alert.alert('Succès', response.data.message);
      setShowScanner(false);
      navigation.navigate('Main');

    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        Alert.alert('Erreur', error.response.data.message);
      } else {
        Alert.alert('Erreur', 'Échec du paiement via QR code.');
      }
      console.error(error);
    }
  };

  if (hasPermission === null) {
    return <Text>Demande de permission pour la caméra...</Text>;
  }
  if (hasPermission === false) {
    return <Text>Accès à la caméra refusé</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QR Code</Text>
      
      {/* Section Génération QR Code */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Générer un QR Code</Text>
        <TextInput
          style={styles.input}
          placeholder="Montant (GNF)"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={styles.input}
          placeholder="Numéro de téléphone du destinataire"
          keyboardType="phone-pad"
          value={receiverPhone}
          onChangeText={setReceiverPhone}
        />
        <Button
          title="Générer QR Code"
          onPress={generateQRCode}
          disabled={isLoading}
        />
        
        {isLoading && <ActivityIndicator size="small" color="#0000ff" />}
        
        {qrData && (
          <View style={styles.qrContainer}>
            <Text style={styles.qrText}>Montant: {qrData.amount} GNF</Text>
            <Text style={styles.qrText}>Pour: {qrData.receiver_phone}</Text>
            <QRCode
              value={qrData.qr_code}
              size={200}
              backgroundColor="white"
              color="black"
            />
            <Text style={styles.qrCodeText}>Code: {qrData.qr_code}</Text>
          </View>
        )}
      </View>

      {/* Section Scanner QR Code */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scanner un QR Code</Text>
        <Button
          title="Scanner QR Code"
          onPress={() => setShowScanner(true)}
        />
      </View>

      {/* Modal Scanner */}
      <Modal
        visible={showScanner}
        animationType="slide"
        transparent={false}
      >
        <View style={styles.scannerContainer}>
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.scannerOverlay}>
            <Text style={styles.scannerText}>Scannez le QR code</Text>
            <Button
              title="Annuler"
              onPress={() => {
                setShowScanner(false);
                setScanned(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    backgroundColor: 'white',
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  qrText: {
    fontSize: 16,
    marginBottom: 10,
  },
  qrCodeText: {
    fontSize: 12,
    marginTop: 10,
    color: 'gray',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  scannerOverlay: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scannerText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
  },
});

export default QRCodeScreen;
