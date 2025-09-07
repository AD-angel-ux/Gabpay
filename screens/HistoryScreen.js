import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import jwtDecode from 'jwt-decode';
import { getApiUrl } from '../config';

const API_URL = getApiUrl('/api/transactions/history');

const HistoryScreen = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const fetchTransactions = async () => {
        try {
          const token = await AsyncStorage.getItem('userToken');
          if (!token) {
            setIsLoading(false);
            return;
          }

          const decodedToken = jwtDecode(token);
          const currentUserId = decodedToken.userId;
          setUserId(currentUserId);

          const response = await axios.get(API_URL, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          setTransactions(response.data);
          setIsLoading(false);
        } catch (error) {
          Alert.alert('Erreur', 'Échec de la récupération de l\'historique des transactions.');
          console.error(error);
          setIsLoading(false);
        }
      };
      
      fetchTransactions();
      
      return () => {
        setIsLoading(true);
        setUserId(null);
      };
    }, [])
  );

  if (isLoading || userId === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Chargement de l'historique...</Text>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Historique des transactions</Text>
        <Text style={styles.emptyText}>Aucune transaction pour le moment.</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const isSender = item.sender_id === userId;
    const transactionType = isSender ? 'Envoyé' : 'Reçu';
    const color = isSender ? 'red' : 'green';
    const amountSign = isSender ? '-' : '+';
    const otherPartyName = isSender ? item.receiver_name : item.sender_name;

    return (
      <View style={styles.itemContainer}>
        <Text style={styles.itemText}>{transactionType} à {otherPartyName}</Text>
        <Text style={[styles.itemAmount, { color }]}>{amountSign}{item.amount} GNF</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historique des transactions</Text>
      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
      />
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
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  itemText: {
    fontSize: 16,
  },
  itemAmount: {
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    color: 'gray',
  },
});

export default HistoryScreen;