import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, Button, TouchableOpacity } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { getApiUrl } from '../config';

const BillsScreen = () => {
  const [bills, setBills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchBills();
    }, [showUnpaidOnly])
  );

  const fetchBills = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const endpoint = showUnpaidOnly ? '/api/bills/unpaid' : '/api/bills';
      const response = await axios.get(getApiUrl(endpoint), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setBills(response.data);
      setIsLoading(false);
    } catch (error) {
      Alert.alert('Erreur', 'Échec de la récupération des factures.');
      console.error(error);
      setIsLoading(false);
    }
  };

  const payBill = async (billId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Erreur', 'Token non trouvé. Veuillez vous reconnecter.');
        return;
      }

      const response = await axios.post(
        getApiUrl('/api/bills/pay'),
        { bill_id: billId },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      Alert.alert('Succès', response.data.message);
      fetchBills(); // Rafraîchir la liste
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        Alert.alert('Erreur', error.response.data.message);
      } else {
        Alert.alert('Erreur', 'Échec du paiement de la facture.');
      }
      console.error(error);
    }
  };

  const renderBill = ({ item }) => (
    <View style={[styles.billItem, item.is_paid ? styles.paidBill : styles.unpaidBill]}>
      <View style={styles.billInfo}>
        <Text style={styles.billTitle}>{item.title || 'Facture'}</Text>
        <Text style={styles.billDescription}>{item.description || 'Aucune description'}</Text>
        <Text style={styles.billAmount}>{item.amount} GNF</Text>
        <Text style={styles.billStatus}>
          {item.is_paid ? 'Payée' : 'Impayée'}
        </Text>
        <Text style={styles.billDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      {!item.is_paid && (
        <TouchableOpacity
          style={styles.payButton}
          onPress={() => payBill(item.id)}
        >
          <Text style={styles.payButtonText}>Payer</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Chargement des factures...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Factures</Text>
      
      <View style={styles.filterContainer}>
        <Button
          title={showUnpaidOnly ? "Toutes les factures" : "Factures impayées"}
          onPress={() => setShowUnpaidOnly(!showUnpaidOnly)}
        />
      </View>

      {bills.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {showUnpaidOnly ? 'Aucune facture impayée' : 'Aucune facture'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={bills}
          renderItem={renderBill}
          keyExtractor={item => item.id.toString()}
          style={styles.billsList}
        />
      )}
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
  filterContainer: {
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: 'gray',
  },
  billsList: {
    flex: 1,
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  paidBill: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
  },
  unpaidBill: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
  },
  billInfo: {
    flex: 1,
  },
  billTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  billDescription: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 5,
  },
  billAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
  },
  billStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  billDate: {
    fontSize: 12,
    color: 'gray',
  },
  payButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  payButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default BillsScreen;
