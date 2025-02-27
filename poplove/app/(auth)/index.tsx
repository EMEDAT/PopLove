// app/(auth)/index.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function AuthIndex() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/images/splash-icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>PopLove</Text>
      </View>
      
      <View style={styles.socialButtons}>
        <TouchableOpacity 
          style={styles.socialButton}
          onPress={() => console.log('Google login - to be implemented')}
        >
          <Image 
            source={require('../../assets/icons/GoogleIcon.png')} 
            style={styles.socialIcon}
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.socialButton}
          onPress={() => console.log('Apple login - to be implemented')}
        >
          <Image 
            source={require('../../assets/icons/AppleIcon.png')} 
            style={styles.socialIcon}
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
      
      <TouchableOpacity 
        style={styles.emailButton}
        onPress={() => router.push('/(auth)/signup')}
      >
        <LinearGradient
          colors={['#FF6B6B', '#FFA07A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <Text style={styles.buttonText}>Create Account</Text>
        </LinearGradient>
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => router.push('/(auth)/login')}
        style={styles.loginLink}
      >
        <Text style={styles.loginText}>Already have an account? <Text style={styles.loginTextBold}>Log In</Text></Text>
      </TouchableOpacity>
    </SafeAreaView>
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B'
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 20
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  socialIcon: {
    width: 24,
    height: 24
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
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
  loginLink: {
    marginTop: 10
  },
  loginText: {
    color: '#666',
    fontSize: 15
  },
  loginTextBold: {
    color: '#FF6B6B',
    fontWeight: '600'
  }
});