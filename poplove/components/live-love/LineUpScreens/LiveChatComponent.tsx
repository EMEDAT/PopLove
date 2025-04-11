// components/live-love/LineUpScreens/LiveChatComponent.tsx
import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator,
  TouchableOpacity, 
  Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLineUp } from './LineUpContext';
import { useAuthContext } from '../../auth/AuthProvider';
import ChatInputBar from './ChatInputBar';

export default function LiveChatComponent(props: { onClose?: () => void }) {
  const { messages, sendMessage, loading, currentSpotlight } = useLineUp();
  const { user } = useAuthContext();
  const flatListRef = useRef<FlatList<any>>(null);
  
  // Always scroll to bottom when messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: false});
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    try {
      console.log("Sending message:", text);
      await sendMessage(text);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessageItem = ({ item }) => {
    const isCurrentUser = item.senderId === user?.uid;
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer
      ]}>
        {!isCurrentUser && (
          <Image 
            source={{ uri: item.senderPhoto || 'https://via.placeholder.com/40' }} 
            style={styles.senderAvatar} 
          />
        )}
        
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
        ]}>
          {!isCurrentUser && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}
          
          <Text style={styles.messageText}>
            {item.text}
          </Text>
          
          <Text style={styles.messageTime}>
            {item.timestamp?.toDate 
              ? new Date(item.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Live Chat</Text>
        {currentSpotlight && (
          <View style={styles.participantInfo}>
            <Image source={{ uri: currentSpotlight.photoURL }} style={styles.participantAvatar} />
            <Text style={styles.participantName}>{currentSpotlight.displayName}</Text>
          </View>
        )}
        <TouchableOpacity onPress={props.onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.messagesContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#FF6B6B" />
        ) : (
          messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={50} color="#ddd" />
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id + '-' + Math.random().toString(36).substring(2, 9)}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.contentContainer}
            onContentSizeChange={() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({animated: false});
              }
            }}
          />
          )
        )}
      </View>
      
      <ChatInputBar onSendMessage={handleSendMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 15,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  participantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  participantName: {
    color: '#fff',
    fontSize: 14,
  },
  messagesContainer: {
    flex: 1,
    padding: 10,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    marginTop: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    maxWidth: '80%',
  },
  currentUserContainer: {
    alignSelf: 'flex-end',
  },
  otherUserContainer: {
    alignSelf: 'flex-start',
  },
  senderAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 16,
  },
  currentUserBubble: {
    backgroundColor: '#FFE4E4',
  },
  otherUserBubble: {
    backgroundColor: '#f0f0f0',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  }
});