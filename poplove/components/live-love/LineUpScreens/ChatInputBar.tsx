// components/live-love/LineUpScreens/ChatInputBar.tsx
import React, { useState, useRef } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Platform,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { debugLog } from './utils';

interface ChatInputBarProps {
  onSendMessage: (text: string) => Promise<void>;
}

export default function ChatInputBar({ onSendMessage }: ChatInputBarProps) {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Handle send button press
  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    
    try {
      debugLog('ChatInput', 'Sending message');
      setSending(true);
      
      const text = inputText.trim();
      setInputText('');
      
      // Dismiss keyboard for better UX
      Keyboard.dismiss();
      
      // Send the message
      await onSendMessage(text);
    } catch (error) {
      debugLog('ChatInput', 'Error sending message', error);
    } finally {
      setSending(false);
    }
  };

  // Handle submit via keyboard
  const handleSubmitEditing = () => {
    if (inputText.trim()) {
      handleSend();
    }
  };

  return (
    <View style={styles.fixedHeightContainer}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder="Type a message..."
        value={inputText}
        onChangeText={setInputText}
        maxLength={500}
        onSubmitEditing={handleSubmitEditing}
        returnKeyType="send"
        blurOnSubmit={false}
      />
      
      <TouchableOpacity
        style={[
          styles.sendButton,
          (!inputText.trim() || sending) && styles.disabledButton
        ]}
        onPress={handleSend}
        disabled={!inputText.trim() || sending}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="send" size={20} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fixedHeightContainer: {
    height: 70, // Fixed height - critical for preventing keyboard issues
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 10,
    paddingBottom: 20,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#FFB6B6',
  }
});