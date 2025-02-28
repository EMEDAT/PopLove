// services/auth.ts
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  deleteUser,
  User 
} from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, firestore, serverTimestamp } from '../lib/firebase';

class AuthService {
  async signInWithEmail(email: string, password: string) {
    try {
      const response = await signInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successful:', response.user.uid);
      return response;
    } catch (error: any) {
      console.error('Sign In Error:', {
        code: error.code,
        message: error.message
      });
      throw error;
    }
  }

  async signUpWithEmail(email: string, password: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user) {
        try {
          const uid = userCredential.user.uid;
          
          // Create user document in Firestore
          await setDoc(doc(firestore, 'users', uid), {
            email: email,
            createdAt: serverTimestamp(),
            hasCompletedOnboarding: false,
            status: 'active'
          }, { merge: true });
        } catch (firestoreError: any) {
          console.error('Firestore Creation Error:', {
            code: firestoreError.code,
            message: firestoreError.message
          });
          // Optionally delete the user if Firestore fails
          await deleteUser(userCredential.user);
          throw firestoreError;
        }
      }
  
      return userCredential.user;
    } catch (error: any) {
      console.error('Sign Up Error:', {
        code: error.code,
        message: error.message
      });
      throw error;
    }
  }

  async signOut() {
    try {
      await firebaseSignOut(auth);
      console.log('Sign out successful');
    } catch (error: any) {
      console.error('Sign Out Error:', {
        code: error.code,
        message: error.message
      });
      throw error;
    }
  }

  async resetAuth() {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await updateDoc(doc(firestore, 'users', currentUser.uid), {
          hasCompletedOnboarding: false
        });
        await deleteUser(currentUser);
      }
      
      await this.signOut();
      
      console.log('Auth reset successful');
    } catch (error: any) {
      console.error('Auth Reset Error:', {
        code: error.code,
        message: error.message
      });
      throw error;
    }
  }
}

export const authService = new AuthService();