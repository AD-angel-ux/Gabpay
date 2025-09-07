import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { getApiUrl } from '../config';

const SavingsScreen = () => {
  const [savingsBalance, setSavingsBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchSavingsBalance();
    }, [])
  );

  const fetchSavingsBalance = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await axios.get(getApiUrl('/api/savings'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setSavingsBalance(response.data.balance || 0);
      setIsLoading(false);
    } catch (error) {
      Alert.alert('Erreur', 'Échec de la récupération du solde d\'épargne.');
      console.error(error);
      setIsLoading(false);
    }
  };

  const depositToSavings = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide.');
      return;
    }

    try {
      setIsProcessing(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Erreur', 'Token non trouvé. Veuillez vous reconnecter.');
        return;
      }

      const response = await axios.post(
        getApiUrl('/api/savings/deposit'),
        { amount: parseFloat(amount) },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      Alert.alert('Succès', response.data.message);
      setAmount('');
      fetchSavingsBalance(); // Rafraîchir le solde
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        Alert.alert('Erreur', error.response.data.message);
      } else {
        Alert.alert('Erreur', 'Échec du dépôt d\'épargne.');
      }
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const withdrawFromSavings = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide.');
      return;
    }

    if (parseFloat(amount) > savingsBalance) {
      Alert.alert('Erreur', 'Montant supérieur au solde d\'épargne disponible.');
      return;
    }

    try {
      setIsProcessing(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Erreur', 'Token non trouvé. Veuillez vous reconnecter.');
        return;
      }

      const response = await axios.post(
        getApiUrl('/api/savings/withdraw'),
        { amount: parseFloat(amount) },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      Alert.alert('Succès', response.data.message);
      setAmount('');
      fetchSavingsBalance(); // Rafraîchir le solde
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        Alert.alert('Erreur', error.response.data.message);
      } else {
        Alert.alert('Erreur', 'Échec du retrait d\'épargne.');
      }
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Chargement du solde d'épargne...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Épargne</Text>
      
      {/* Affichage du solde */}
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Solde d'épargne</Text>
        <Text style={styles.balanceAmount}>{savingsBalance.toLocaleString()} GNF</Text>
      </View>

      {/* Formulaire de transaction */}
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Montant (GNF)"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.depositButton]}
            onPress={depositToSavings}
            disabled={isProcessing}
          >
            <Text style={styles.buttonText}>Déposer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.withdrawButton]}
            onPress={withdrawFromSavings}
            disabled={isProcessing || parseFloat(amount) > savingsBalance}
          >
            <Text style={styles.buttonText}>Retirer</Text>
          </TouchableOpacity>
        </View>
        
        {isProcessing && (
          <ActivityIndicator size="small" color="#0000ff" style={styles.loader} />
        )}
      </View>

      {/* Informations */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Comment ça marche ?</Text>
        <Text style={styles.infoText}>
          • <Text style={styles.bold}>Déposer</Text> : Transfère de l'argent de votre compte principal vers votre épargne
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.bold}>Retirer</Text> : Transfère de l'argent de votre épargne vers votre compte principal
        </Text>
        <Text style={styles.infoText}>
          • Votre argent est en sécurité et disponible à tout moment
        </Text>
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceContainer: {
    backgroundColor: '#e8f5e8',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  balanceLabel: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 5,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  formContainer: {
    marginBottom: 30,
  },
  input: {
    height: 50,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  depositButton: {
    backgroundColor: '#4caf50',
  },
  withdrawButton: {
    backgroundColor: '#ff9800',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 10,
  },
  infoContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
});

export default SavingsScreen;
