// poplove\app\(auth)\index.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'react-native';

export default function AuthIndex() {
  return (
    <View style={styles.container}>

      <TouchableOpacity 
        style={styles.emailButton}
        onPress={() => router.push('/(auth)/signup')}
      >
        <LinearGradient
          colors={['#EC5F61', '#F0B433'] }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <Text style={styles.buttonText}>Continue with Email</Text>
        </LinearGradient>
      </TouchableOpacity>
      
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialButtons}>
        <TouchableOpacity style={styles.socialButton}>
          <Image 
            source={require('../../assets/icons/GoogleIcon.png')} 
            style={styles.socialIcon}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton}>
          <Image 
            source={require('../../assets/icons/AppleIcon.png')} 
            style={styles.socialIcon}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton}>
          <Image 
            source={require('../../assets/icons/FacebookIcon.png')} 
            style={styles.socialIcon}
          />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
        <Text style={styles.loginText}>Already have an account? Log In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white'
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 20
  },
  socialButton: {
    width: 90,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  socialIcon: {
    width: 30,
    height: 30
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5'
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666'
  },
  emailButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    marginBottom: 20,
    overflow: 'hidden'
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  loginText: {
    color: '#FF6B6B',
    fontSize: 15
  }
});