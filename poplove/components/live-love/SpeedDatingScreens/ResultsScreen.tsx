// components/live-love/SpeedDating/ResultsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Match } from '../SpeedDatingMode';
import { LinearGradient } from 'expo-linear-gradient';

interface ResultsScreenProps {
  matches: Match[];
  onViewDetails: (match: Match) => void;
  onBack: () => void;
}

export default function ResultsScreen({ 
  matches,
  onViewDetails,
  onBack
}: ResultsScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <View style={styles.iconCircle}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </View>
      </TouchableOpacity>
        <Text style={styles.title}>Speed Date</Text>
        <TouchableOpacity style={styles.optionsButton}>
        <View style={styles.iconCircle}>
          <Ionicons name="menu" size={24} color="#000" />
        </View>
      </TouchableOpacity>
      </View>
      
      <Text style={styles.matchesCount}>
      <Text style={styles.matchesLabel}>Matches found: </Text>
      <Text style={styles.matchesValue}>{matches.length}</Text>
    </Text>
      
      {/* Match list */}
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.matchesListContent}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.matchCard}
              onPress={() => onViewDetails(item)}
              activeOpacity={0.9}
            >
              <Image 
                source={{ uri: item.photoURL }} 
                style={styles.matchImage}
                resizeMode="cover"
              />
              
              {/* Make sure this is after the Image but before the gradient */}
              <View style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>{item.matchPercentage}% match</Text>
              </View>
              
              {/* Make sure connect button has a high zIndex */}
              <TouchableOpacity 
                style={styles.floatingConnectButton}
                onPress={() => onViewDetails(item)}
              >
                <Ionicons name="chatbubble" size={18} color="#FF6B6B" />
              </TouchableOpacity>
                            <TouchableOpacity 
                style={styles.floatingConnectButton}
                onPress={() => onViewDetails(item)}
              >
                <Ionicons name="chatbubble-outline" size={18} color="white" />
              </TouchableOpacity>
              
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.5)']}
                style={styles.matchGradient}
              >
                <View style={styles.frostOverlay} />
                <View style={styles.matchNameContainer}>
                  <Text style={styles.matchName}>{item.displayName}, {item.ageRange}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F1ED',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 30 : 10,
    marginBottom: 20,
    marginTop: 30,
  },
  backButton: {
    padding: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  optionsButton: {
    padding: 10,
  },
  matchesCount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 35,
  },
  matchesListContent: {
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  matchesLabel: {
    fontSize: 16,
    fontWeight: '400', // Lighter weight
    color: '#666',
  },
  matchesValue: {
    fontSize: 18,
    fontWeight: '700', // Bolder for the number
    color: '#333',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderColor: '#344054',
    borderWidth: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchCard: {
    width: '48%',  // Adjust to allow 2 cards per row
    height: 170,   // Shorter height
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  matchImage: {
    width: '100%',
    height: '100%',
  },
  matchBadge: {
    position: 'absolute',
    top: -5,
    left: '50%',
    transform: [{ translateX: -40 }], // Adjust this value based on your badge width
    backgroundColor: 'rgba(255, 107, 107, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    width: 80, // Fixed width for centering
    alignItems: 'center',
  },
  matchBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  matchGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 35,
    // For a more snowy/frosted look:
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // Add light white tint
  },
  matchNameContainer: {
    position: 'absolute',
    bottom: 5,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  matchName: {
    color: 'white',
    fontSize: 13, // Smaller font
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  connectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frostOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },  
  floatingConnectButton: {
    position: 'absolute',
    width: 33,
    height: 33,
    borderRadius: 18,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    // You can position it anywhere on the image
    bottom: 20, // Adjust as needed
    right: 1,  // Adjust as needed
    zIndex: 10,  // Ensure it's above other elements
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
});