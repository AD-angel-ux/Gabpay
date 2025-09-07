import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { getApiUrl } from '../config';

const API_URL = getApiUrl('/api/transactions');

const TransferScreen = () => {
  const [receiver_phone, setReceiver_phone] = useState('');
  const [amount, setAmount] = useState('');
  const navigation = useNavigation();

  const handleTransfer = async () => {
    // Validation simple
    if (!receiver_phone || !amount || parseFloat(amount) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone et un montant valides.');
      return;
    }

    try {
      // Récupérer le token du stockage
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Erreur', 'Token non trouvé. Veuillez vous reconnecter.');
        navigation.navigate('Login');
        return;
      }
      
      const response = await axios.post(
        API_URL, 
        { receiver_phone, amount: parseFloat(amount) },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Transfert réussi
      Alert.alert('Succès', response.data.message);
      // Retourner au tableau de bord pour montrer le nouveau solde
      navigation.navigate('Main');
      
    } catch (error) {
      // Gérer les différents messages d'erreur du backend
      if (error.response && error.response.data && error.response.data.message) {
        Alert.alert('Erreur', error.response.data.message);
      } else {
        Alert.alert('Erreur', 'Échec du transfert. Veuillez réessayer.');
      }
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Envoyer de l'argent</Text>
      <TextInput
        style={styles.input}
        placeholder="Numéro de téléphone du bénéficiaire"
        keyboardType="phone-pad"
        value={receiver_phone}
        onChangeText={setReceiver_phone}
      />
      <TextInput
        style={styles.input}
        placeholder="Montant (GNF)"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      <Button
        title="Envoyer"
        onPress={handleTransfer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
});

export default TransferScreen;