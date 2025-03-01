// components/onboarding/ProfilePrompts.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput,
  ScrollView
} from 'react-native';

interface PromptAnswer {
  question: string;
  answer: string;
}

interface ProfilePromptsProps {
  prompts: PromptAnswer[];
  onUpdatePrompt: (index: number, answer: string) => void;
}

export default function ProfilePrompts({ prompts, onUpdatePrompt }: ProfilePromptsProps) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Answer the following Questions</Text>
      
      {prompts.map((prompt, index) => (
        <View key={index} style={styles.promptContainer}>
          <Text style={styles.promptQuestion}>{prompt.question}</Text>
          <TextInput
            style={styles.promptInput}
            placeholder="Your answer..."
            value={prompt.answer}
            onChangeText={(text) => onUpdatePrompt(index, text)}
            multiline
            textAlignVertical="top"
            placeholderTextColor="#aaa"
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 30,
  },
  promptContainer: {
    marginBottom: 24,
  },
  promptQuestion: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  promptInput: {
    height: 120,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
    color: '#000',
  }
});