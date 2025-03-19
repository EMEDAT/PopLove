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
      console.log('Creating user with email:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User created successfully:', userCredential.user.uid);
      
      if (userCredential.user) {
        const uid = userCredential.user.uid;
        console.log('Creating user document in Firestore for:', uid);
        
        try {
          // Create user document in Firestore
          await setDoc(doc(firestore, 'users', uid), {
            email: email,
            createdAt: serverTimestamp(),
            hasCompletedOnboarding: false,
            pronouns: '', // Add this line
            status: 'active'
          });
          
          console.log('User document created successfully');
          return userCredential.user;
        } catch (firestoreError: any) {
          console.error('Firestore Creation Error:', {
            code: firestoreError.code,
            message: firestoreError.message
          });
          
          // Don't automatically delete the user here, as they may need to just
          // continue with profile setup and retry the Firestore operation
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
        try {
          await updateDoc(doc(firestore, 'users', currentUser.uid), {
            hasCompletedOnboarding: false
          });
        } catch (error) {
          console.error('Failed to update user document, continuing with reset');
        }
        
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