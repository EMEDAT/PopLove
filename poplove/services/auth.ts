// services/auth.ts
import { auth, firestore, serverTimestamp } from '../lib/firebase';

class AuthService {
  async signInWithEmail(email: string, password: string) {
    try {
      // NOTE: Using auth() as a function
      const response = await auth().signInWithEmailAndPassword(email, password);
      console.log('Sign in successful:', response.user.uid);
      return response;
    } catch (error: any) {
      console.error('Error signing in with email:', error);
      throw error;
    }
  }

  async signUpWithEmail(email: string, password: string) {
    try {
      // NOTE: Using auth() as a function
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      
      if (userCredential.user) {
        try {
          const uid = userCredential.user.uid;
          
          // NOTE: Using firestore() as a function
          await firestore().collection('users').doc(uid).set({
            email: email,
            createdAt: serverTimestamp(),
            hasCompletedOnboarding: false,
            status: 'active'
          }, { merge: true });
        } catch (firestoreError: any) {
          console.error('Firestore Document Creation Error:', firestoreError);
        }
      }
  
      return userCredential.user;
    } catch (error: any) {
      console.error('Sign Up Error:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      // NOTE: Using auth() as a function
      await auth().signOut();
      console.log('Sign out successful');
    } catch (error: any) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  async resetAuth() {
    try {
      // NOTE: Using auth() as a function
      const currentUser = auth().currentUser;
      if (currentUser) {
        await currentUser.delete();
      }
      
      await this.signOut();
      
      console.log('Auth reset successful');
    } catch (error) {
      console.error('Error resetting auth:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();