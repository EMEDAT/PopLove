// app/chat/[id].tsx
import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { useAuthContext } from '../../components/auth/AuthProvider';
import ChatScreen from '../../components/chat/ChatScreen';

export default function ChatDetail() {
  const { user } = useAuthContext();
  const { id } = useLocalSearchParams();
  const matchId = typeof id === 'string' ? id : '';
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);

  useEffect(() => {
    const fetchMatchData = async () => {
      try {
        if (!matchId || !user) {
          setError('Invalid match or user');
          setLoading(false);
          return;
        }
  
        // Try to find match in both collections
        let matchRef = doc(firestore, 'matches', matchId);
        let matchSnap = await getDoc(matchRef);
        
        // If not found in matches, try speedDatingConnections
        if (!matchSnap.exists()) {
          matchRef = doc(firestore, 'speedDatingConnections', matchId);
          matchSnap = await getDoc(matchRef);
          
          if (!matchSnap.exists()) {
            setError('Match not found in any collection');
            setLoading(false);
            return;
          }
        }
        
        const data = matchSnap.data();
        setMatchData(data);
        
        // Find the other user in the match
        const otherUserId = data.users.find((uid: string) => uid !== user.uid);
        
        // Get user profile data from the match data
        if (otherUserId && data.userProfiles && data.userProfiles[otherUserId]) {
          setOtherUser({
            id: otherUserId,
            ...data.userProfiles[otherUserId],
            status: 'Online' // You could implement real status later
          });
        } else {
          setError('Other user not found in match');
        }
      } catch (err) {
        console.error('Error fetching match data:', err);
        setError('Failed to load chat');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMatchData();
  }, [matchId, user]);

  const handleGoBack = () => {
    // Navigate to matches tab instead of home
    router.replace('/(tabs)/matches');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !matchData || !otherUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Something went wrong'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ChatScreen
      matchId={matchId}
      otherUser={otherUser}
      onGoBack={handleGoBack}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F1ED',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
  }
});