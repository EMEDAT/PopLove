// components/shared/NotificationBadge.tsx
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  FlatList,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../auth/AuthProvider';
import * as NotificationService from '../../services/notificationService';
import { Notification } from '../../services/notificationService';
import * as LineupService from '../../services/lineupService';
import { router } from 'expo-router';
import { getDoc, doc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';

declare global {
  interface Window {
    lineupContextRef?: {
      current: any;
    };
  }
}

export default function NotificationBadge() {
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  
  useEffect(() => {
    if (!user) return;
    
    // Subscribe to notifications
    const unsubscribe = NotificationService.subscribeToNotifications(
      user.uid,
      (newNotifications) => {
        setNotifications(newNotifications);
        setUnreadCount(newNotifications.filter(n => !n.isRead).length);
      }
    );
    
    return unsubscribe;
  }, [user]);
  
  const handleNotificationPress = async (notification: Notification) => {
    if (!user) return;
    
    // Immediately mark as read to prevent duplicates
    await NotificationService.markNotificationAsRead(notification.id);
    
    // Handle turn notification
    if (notification.type === 'lineup_turn') {
      try {
        // Get fresh session ID from notification
        const sessionId = notification.data?.sessionId;
        
        if (!sessionId) {
          console.error('No sessionId found in notification data');
          router.push('/live-love');
          return;
        }
        
        // Check if the user is still the current contestant
        const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
        
        if (!sessionDoc.exists()) {
          console.error('Session not found for notification');
          router.push('/live-love');
          return;
        }
        
        // Determine user gender
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (!userDoc.exists()) {
          console.error('User document not found');
          router.push('/live-love');
          return;
        }
        
        const userGender = userDoc.data().gender || '';
        const userField = `current${userGender.charAt(0).toUpperCase()}${userGender.slice(1)}ContestantId`;
        
        // Verify this user is current contestant
        if (sessionDoc.data()[userField] !== user.uid) {
          console.warn('User is not current contestant anymore, notification may be stale');
          router.push('/live-love');
          return;
        }
        
        // User is verified as current contestant, set context appropriately
        if (window.lineupContextRef?.current) {
          window.lineupContextRef.current.setIsCurrentUser(true);
          window.lineupContextRef.current.setSessionId(sessionId);
          window.lineupContextRef.current.startContestantTimer();
        }
        
        // Navigate to private screen
        router.push({
          pathname: '/live-love',
          params: { 
            screen: 'private', 
            sessionId,
            direct: 'true'
          }
        });
      } catch (error) {
        console.error('Error handling turn notification:', error);
        router.push('/live-love');
      }
    } else if (notification.type === 'lineup_match') {
      // Navigate to chat with the match
      const matchUserId = notification.data?.matchUserId;
      if (matchUserId) {
        // Check if chat exists
        const existingChatId = await LineupService.checkExistingChat(user.uid, matchUserId);
        
        if (existingChatId) {
          router.push({
            pathname: '/chat/[id]',
            params: { id: existingChatId }
          });
        } else {
          // Navigate to matches
          router.push('/live-love');
        }
      }
    }
    
    // Close modal
    setShowModal(false);
  };
  
  const markAllAsRead = async () => {
    if (!user) return;
    
    await NotificationService.markAllNotificationsAsRead(user.uid);
    setShowModal(false);
  };
  
  // Format notification time for better display
  const formatNotificationTime = (timestamp: any): string => {
    if (!timestamp) {
      return 'Recently';
    }
    
    if (timestamp?.toDate) {
      const date = timestamp.toDate();
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 1) {
        return 'Just now';
      } else if (diffMins < 60) {
        return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    }
    
    return 'Recently';
  };
  
  // Render the badge with proper touch handling
  return (
    <View>
      <TouchableOpacity 
        onPress={() => {
          console.log("Notification icon pressed");
          setShowModal(true);
        }}
        style={styles.iconContainer}
        activeOpacity={0.7}
      >
        {unreadCount > 0 ? (
          <>
            <Ionicons name="notifications" size={24} color="#FF6B6B" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          </>
        ) : (
          <Ionicons name="notifications-outline" size={24} color="#333" />
        )}
      </TouchableOpacity>
      
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
          <View style={styles.modalBackground}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Notifications</Text>
                  <TouchableOpacity 
                    onPress={() => setShowModal(false)}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                  >
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                
                {notifications.length > 0 ? (
                  <>
                    <FlatList
                      data={notifications}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.notificationItem,
                            !item.isRead && styles.unreadNotification
                          ]}
                          onPress={() => handleNotificationPress(item)}
                        >
                          <View style={styles.notificationIconContainer}>
                            {item.type === 'lineup_turn' ? (
                              <Ionicons name="people" size={24} color="#FF6B6B" />
                            ) : (
                              <Ionicons name="heart" size={24} color="#FF6B6B" />
                            )}
                          </View>
                          <View style={styles.notificationContent}>
                            <Text style={styles.notificationText}>{item.message}</Text>
                            <Text style={styles.notificationTime}>
                              {formatNotificationTime(item.createdAt)}
                            </Text>
                          </View>
                          {!item.isRead && (
                            <View style={styles.unreadDot} />
                          )}
                        </TouchableOpacity>
                      )}
                      style={styles.notificationsList}
                    />
                    
                    {unreadCount > 0 && (
                      <TouchableOpacity 
                        style={styles.markAllButton}
                        onPress={markAllAsRead}
                      >
                        <Text style={styles.markAllText}>Mark all as read</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="notifications-off-outline" size={50} color="#ccc" />
                    <Text style={styles.emptyText}>No notifications</Text>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,  // Increase touch target
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '80%',
    minHeight: 200, // Ensure minimum height even with no notifications
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  notificationsList: {
    maxHeight: '70%', // Prevent overflow with mark all button
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    position: 'relative',
    minHeight: 80, // Ensure minimum height for better tappability
  },
  unreadNotification: {
    backgroundColor: '#FFF5F5',
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE4E4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    marginBottom: 5,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
    position: 'absolute',
    top: 15,
    right: 15,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  markAllButton: {
    padding: 15,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  markAllText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  }
});