import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getApiUrl } from '../config';

const API_URL = getApiUrl('/api/auth/profile');

const DashboardScreen = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      const fetchUserProfile = async () => {
        try {
          const token = await AsyncStorage.getItem('userToken');
          if (!token) {
            navigation.navigate('Login');
            return;
          }

          const response = await axios.get(API_URL, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          setUser(response.data);
          setIsLoading(false);

        } catch (error) {
          Alert.alert('Erreur', 'Échec de la récupération du profil.');
          console.error(error);
          setIsLoading(false);
        }
      };
      
      fetchUserProfile();
      
      return () => {
        setIsLoading(true);
        setUser(null);
      };
    }, [])
  );

  if (isLoading || !user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Chargement du profil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Bonjour, {user.full_name}!</Text>
      <Text style={styles.balance}>Solde: {user.balance} GNF</Text>
      <View style={styles.buttonContainer}>
        <Button
          title="Envoyer de l'argent"
          onPress={() => navigation.navigate('Transfer')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  balance: {
    fontSize: 20,
    color: 'green',
    marginBottom: 20,
  },
  buttonContainer: {
    marginTop: 20,
    gap: 10,
  },
});

export default DashboardScreen;