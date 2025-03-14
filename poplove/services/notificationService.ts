// services/notificationService.ts

import { 
    collection, 
    query, 
    where, 
    getDocs, 
    addDoc, 
    setDoc,
    updateDoc, 
    serverTimestamp, 
    onSnapshot,
    doc,
    orderBy,
    limit
  } from 'firebase/firestore';
  import { firestore } from '../lib/firebase';
  
  export interface Notification {
    id: string;
    userId: string;
    type: string;
    message: string;
    data?: any;
    createdAt: any;
    isRead: boolean;
  }
  
  // Add new notification
  export const addNotification = async (
    userId: string,
    type: string,
    message: string,
    data: any = {}
  ): Promise<string> => {
    const notificationRef = await addDoc(collection(firestore, 'notifications'), {
      userId,
      type,
      message,
      data,
      createdAt: serverTimestamp(),
      isRead: false
    });
    
    return notificationRef.id;
  };
  
  // Get user notifications
  export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
    const notificationsRef = collection(firestore, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50) // Limit to most recent 50 notifications
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Notification[];
  };
  
  // Mark notification as read
  export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    await updateDoc(doc(firestore, 'notifications', notificationId), {
      isRead: true
    });
  };
  
  // Mark all notifications as read
  export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    const notifications = await getUserNotifications(userId);
    
    const unreadNotifications = notifications.filter(notification => !notification.isRead);
    
    for (const notification of unreadNotifications) {
      await markNotificationAsRead(notification.id);
    }
  };
  
  // Get unread notification count
  export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
    const notificationsRef = collection(firestore, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.size;
  };
  
  // Subscribe to notification changes
  export const subscribeToNotifications = (
    userId: string,
    callback: (notifications: Notification[]) => void
  ) => {
    const notificationsRef = collection(firestore, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      callback(notifications);
    });
  };

  const debugLog = (area: string, message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [${area}] ${message}`, data ? data : '');
  };
  
/**
 * Add turn notification for lineup - fixed to use unique ID and better tracking
 * @param userId User ID to notify
 * @param sessionId Session ID
 * @returns Promise with notification ID
 */
export const addLineupTurnNotification = async (userId: string, sessionId: string): Promise<string> => {
  debugLog('Notification', `Adding turn notification for user ${userId} in session ${sessionId}`);

  try {
    // Check if user already has an active lineup notification
    const notificationsRef = collection(firestore, 'notifications');
    const existingQuery = query(
      notificationsRef,
      where('userId', '==', userId),
      where('type', '==', 'lineup_turn'),
      where('data.sessionId', '==', sessionId),
      where('isRead', '==', false),
      limit(1)
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    
    // If notification already exists, don't create another one
    if (!existingSnapshot.empty) {
      debugLog('Notification', 'User already has an active turn notification, skipping');
      return existingSnapshot.docs[0].id;
    }
    
    // Create unique ID to prevent duplicates
    const notificationId = `turn_${userId}_${Date.now()}`;
    
    // Use setDoc with explicit ID instead of addDoc
    await setDoc(doc(firestore, 'notifications', notificationId), {
      userId,
      type: 'lineup_turn',
      message: "It's your turn in the Line-Up! You're now the featured contestant.",
      data: { sessionId },
      createdAt: serverTimestamp(),
      isRead: false,
      sentAt: serverTimestamp() // Track when notification was sent
    });
    
    debugLog('Notification', 'Turn notification added successfully with ID: ' + notificationId);
    return notificationId;
  } catch (error) {
    debugLog('Notification', 'Error adding turn notification:', error);
    throw error;
  }
};
  
  // Add match notification for lineup
  export const addLineupMatchNotification = async (
    userId: string, 
    matchUserId: string, 
    matchName: string
  ): Promise<string> => {
    return await addNotification(
      userId,
      'lineup_match',
      `You have a new match with ${matchName}!`,
      { matchUserId }
    );
  };