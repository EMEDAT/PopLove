// components/profile/ProfilePrompts.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Modal,
  SafeAreaView,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Prompt {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface ProfilePromptsProps {
  userPrompts: Prompt[];
  onUpdatePrompts: (prompts: Prompt[]) => void;
  onClose: () => void;
}

export default function ProfilePrompts({ 
  userPrompts = [], 
  onUpdatePrompts,
  onClose
}: ProfilePromptsProps) {
  const [selectedCategory, setSelectedCategory] = useState('About me');
  const [showPromptsModal, setShowPromptsModal] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  
  // Available prompt categories
  const categories = [
    'About me',
    'Self-care',
    'Getting personal',
    '🧠 Personality & Values',
    '😂 Humor & Fun',
    '❤️ Relationships & Connection',
    '📺 Pop Culture & Hobbies',
    '🌍 Travel & Adventure',
    '🤖 Quirky & Creative'
  ];

  // Available prompts by category
  const promptsByCategory: Record<string, Prompt[]> = {
    'About me': [
      { id: '1', question: 'A life goal of mine', answer: '', category: 'About me' },
      { id: '2', question: 'Unusual skills', answer: '', category: 'About me' },
      { id: '3', question: 'Dating me is like', answer: '', category: 'About me' },
      { id: '4', question: 'A random fact I love is', answer: '', category: 'About me' },
      { id: '5', question: 'I go crazy for', answer: '', category: 'About me' },
      { id: '6', question: 'My greatest strength', answer: '', category: 'About me' },
      { id: '7', question: 'The way to win me over is', answer: '', category: 'About me' },
      { id: '8', question: 'My most irrational fear', answer: '', category: 'About me' },
      { id: '9', question: 'My simple pleasures', answer: '', category: 'About me' },
      { id: '10', question: 'This year, I really want to', answer: '', category: 'About me' },
      { id: '11', question: 'I recently discovered that', answer: '', category: 'About me' },
      { id: '12', question: 'Typical Sunday', answer: '', category: 'About me' },
    ],
    'Self-care': [
      { id: '13', question: 'My self-care routine includes', answer: '', category: 'Self-care' },
      { id: '14', question: 'I feel most centered when', answer: '', category: 'Self-care' },
    ],
    'Getting personal': [
      { id: '15', question: 'My love language is', answer: '', category: 'Getting personal' },
      { id: '16', question: "What I'm looking for in a partner", answer: '', category: 'Getting personal' },
    ],
    '🧠 Personality & Values': [
      { id: '17', question: 'A fact about me that surprises people...', answer: '', category: '🧠 Personality & Values' },
      { id: '18', question: 'My most controversial opinion is...', answer: '', category: '🧠 Personality & Values' },
      { id: '19', question: "I know it's weird, but I really love...", answer: '', category: '🧠 Personality & Values' },
      { id: '20', question: 'A value I live by is...', answer: '', category: '🧠 Personality & Values' },
      { id: '21', question: "Something I'm currently working on improving is...", answer: '', category: '🧠 Personality & Values' },
    ],
    '😂 Humor & Fun': [
      { id: '22', question: 'The dorkiest thing about me is...', answer: '', category: '😂 Humor & Fun' },
      { id: '23', question: "We'll get along if you laugh at...", answer: '', category: '😂 Humor & Fun' },
      { id: '24', question: 'Change my mind: [blank] is overrated.', answer: '', category: '😂 Humor & Fun' },
      { id: '25', question: 'The most useless talent I have is...', answer: '', category: '😂 Humor & Fun' },
      { id: '26', question: "Pet peeve that's probably too specific...", answer: '', category: '😂 Humor & Fun' },
    ],
    '❤️ Relationships & Connection': [
      { id: '27', question: "I'm looking for someone who...", answer: '', category: '❤️ Relationships & Connection' },
      { id: '28', question: "I'll pick the restaurant if you...", answer: '', category: '❤️ Relationships & Connection' },
      { id: '29', question: 'My love language is...', answer: '', category: '❤️ Relationships & Connection' },
      { id: '30', question: 'On a perfect date, we would...', answer: '', category: '❤️ Relationships & Connection' },
      { id: '31', question: 'What I value most in a partner is...', answer: '', category: '❤️ Relationships & Connection' },
    ],
    '📺 Pop Culture & Hobbies': [
      { id: '32', question: 'The last show I binge-watched was...', answer: '', category: '📺 Pop Culture & Hobbies' },
      { id: '33', question: 'My comfort movie is...', answer: '', category: '📺 Pop Culture & Hobbies' },
      { id: '34', question: "One song I'll never skip is...", answer: '', category: '📺 Pop Culture & Hobbies' },
      { id: '35', question: 'A book that changed how I think is...', answer: '', category: '📺 Pop Culture & Hobbies' },
      { id: '36', question: 'Hot take: [insert celebrity] is underrated.', answer: '', category: '📺 Pop Culture & Hobbies' },
    ],
    '🌍 Travel & Adventure': [
      { id: '37', question: 'My dream vacation includes...', answer: '', category: '🌍 Travel & Adventure' },
      { id: '38', question: "The most spontaneous thing I've done...", answer: '', category: '🌍 Travel & Adventure' },
      { id: '39', question: 'A city I could live in forever...', answer: '', category: '🌍 Travel & Adventure' },
      { id: '40', question: "I'll never forget the time I traveled to...", answer: '', category: '🌍 Travel & Adventure' },
      { id: '41', question: 'My favorite way to spend a weekend is...', answer: '', category: '🌍 Travel & Adventure' },
    ],
    '🤖 Quirky & Creative': [
      { id: '42', question: "If I were a character in a movie, I'd be...", answer: '', category: '🤖 Quirky & Creative' },
      { id: '43', question: 'I judge people (lightly) if they...', answer: '', category: '🤖 Quirky & Creative' },
      { id: '44', question: 'A hill I will absolutely die on is...', answer: '', category: '🤖 Quirky & Creative' },
      { id: '45', question: 'My toxic trait is thinking I can...', answer: '', category: '🤖 Quirky & Creative' },
      { id: '46', question: "In another life, I'd be a...", answer: '', category: '🤖 Quirky & Creative' },
    ],
  };

  // Check if a prompt is already selected by the user
  const isPromptSelected = (promptId: string) => {
    return userPrompts.some(p => p.question === promptsByCategory[selectedCategory].find(item => item.id === promptId)?.question);
  };

  // Handle prompt selection
  const handleSelectPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setShowPromptsModal(false);
  };

  // Handle saving prompt answer
  const handleSavePrompt = (promptQuestion: string, answer: string) => {
    if (!editingPrompt) return;

    const existingPromptIndex = userPrompts.findIndex(p => p.question === promptQuestion);
    let updatedPrompts;

    if (existingPromptIndex >= 0) {
      // Update existing prompt
      updatedPrompts = [...userPrompts];
      updatedPrompts[existingPromptIndex] = {
        ...updatedPrompts[existingPromptIndex],
        answer
      };
    } else {
      // Add new prompt
      updatedPrompts = [
        ...userPrompts,
        {
          id: editingPrompt.id,
          question: promptQuestion,
          answer,
          category: editingPrompt.category
        }
      ];
    }

    onUpdatePrompts(updatedPrompts);
    setEditingPrompt(null);
  };

  // Select a slot to add a prompt
  const handleAddPrompt = (slot: number) => {
    setSelectedPromptId(`slot-${slot}`);
    setShowPromptsModal(true);
  };

  // Render the main profile prompt editing view
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Write your profile answers</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>

      {/* Prompt answers section */}
      <ScrollView style={styles.scrollView}>
        {/* Display existing prompts */}
        {userPrompts.map((prompt, index) => (
          <View key={index} style={styles.promptItem}>
            <Text style={styles.promptQuestion}>{prompt.question}</Text>
            <Text style={styles.promptAnswer}>{prompt.answer}</Text>
          </View>
        ))}

        {/* Empty slots for adding new prompts */}
        {Array.from({ length: 3 - userPrompts.length }).map((_, index) => (
          <TouchableOpacity
            key={`empty-${index}`}
            style={styles.emptyPrompt}
            onPress={() => handleAddPrompt(index)}
          >
            <Text style={styles.emptyPromptText}>Select a Prompt</Text>
            <View style={styles.addButton}>
              <Text style={styles.addButtonText}>+</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.requiredText}>3 answers required</Text>
      </ScrollView>

      {/* Prompts selection modal */}
      <Modal
        visible={showPromptsModal}
        animationType="slide"
        transparent={false}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Prompts</Text>
            <TouchableOpacity onPress={() => setShowPromptsModal(false)}>
              <Text style={styles.closeModalButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Category tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryTab,
                  selectedCategory === category && styles.selectedCategoryTab
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                {selectedCategory === category && (
                  <Ionicons name="checkmark-circle" size={16} color="#FF6B6B" style={styles.checkIcon} />
                )}
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category && styles.selectedCategoryText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Category message */}
          {selectedCategory === 'About me' && userPrompts.some(p => promptsByCategory['About me'].some(q => q.question === p.question)) && (
            <View style={styles.categoryMessage}>
              <Text style={styles.categoryMessageText}>
                You've got 'About me' covered. Why not try another category?
              </Text>
            </View>
          )}

          {/* Prompts list */}
          <ScrollView style={styles.promptsList}>
            {promptsByCategory[selectedCategory]?.map(prompt => (
              <TouchableOpacity
                key={prompt.id}
                style={styles.promptOption}
                onPress={() => handleSelectPrompt(prompt)}
                disabled={isPromptSelected(prompt.id)}
              >
                <Text style={styles.promptOptionText}>{prompt.question}</Text>
                {isPromptSelected(prompt.id) && (
                  <Ionicons name="checkmark" size={20} color="#FF6B6B" />
                )}
              </TouchableOpacity>
            ))}
            {/* Add a padding view at the bottom to ensure all options are visible */}
            <View style={{height: 40}} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Prompt answer editing modal */}
      {editingPrompt && (
        <Modal
          visible={!!editingPrompt}
          animationType="slide"
          transparent={false}
        >
          <SafeAreaView style={styles.editContainer}>
            <View style={styles.editHeader}>
              <TouchableOpacity onPress={() => setEditingPrompt(null)}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.editTitle}>Write answer</Text>
              <TouchableOpacity 
                onPress={() => handleSavePrompt(editingPrompt.question, editingPrompt.answer)}
                disabled={!editingPrompt.answer?.trim()}
              >
                <Text style={[
                  styles.doneButton,
                  !editingPrompt.answer?.trim() && styles.disabledButton
                ]}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.editContent}>
              <Text style={styles.questionLabel}>{editingPrompt.question}</Text>
              <TextInput
                style={styles.answerInput}
                value={editingPrompt.answer}
                onChangeText={(text) => setEditingPrompt({...editingPrompt, answer: text})}
                multiline
                placeholder="The Chicago Bears and standup comedy."
                placeholderTextColor="#ccc"
                autoFocus
              />

              <View style={styles.promptTipContainer}>
                <Text style={styles.promptTipTitle}>Bring out the real you</Text>
                <Text style={styles.promptTipText}>
                  A personal detail or story is a great way to get a conversation started
                </Text>
              </View>

              <Text style={styles.feedbackText}>
                AI feedback is experimental and may make mistakes. Share only what you're comfortable with.{' '}
                <Text style={styles.learnMoreText}>Learn more</Text>
              </Text>
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  promptsList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  promptItem: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  promptQuestion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  promptAnswer: {
    fontSize: 16,
    color: '#333',
  },
  emptyPrompt: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  emptyPromptText: {
    color: '#999',
    fontSize: 16,
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  requiredText: {
    color: '#666',
    fontSize: 14,
    marginTop: 10,
    marginBottom: 30,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  closeModalButton: {
    fontSize: 20,
    color: '#000',
    padding: 5,
  },
  categoriesContainer: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  selectedCategoryTab: {
    backgroundColor: '#FFEEEE',
  },
  checkIcon: {
    marginRight: 5,
  },
  categoryText: {
    color: '#666',
    fontSize: 14,
  },
  selectedCategoryText: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  categoryMessage: {
    backgroundColor: '#F8E7F8',
    padding: 15,
    margin: 10,
    borderRadius: 8,
  },
  categoryMessageText: {
    color: '#666',
    fontSize: 14,
  },
  promptOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  promptOptionText: {
    fontSize: 16,
    color: '#333',
  },
  editContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cancelButton: {
    color: '#333',
    fontSize: 16,
  },
  editTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#000',
  },
  doneButton: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  editContent: {
    flex: 1,
    padding: 20,
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  answerInput: {
    fontSize: 16,
    color: '#333',
    height: 100,
    textAlignVertical: 'top',
    padding: 0,
  },
  promptTipContainer: {
    marginTop: 40,
    padding: 15,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  promptTipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  promptTipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  feedbackText: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  learnMoreText: {
    color: '#FF6B6B',
    textDecorationLine: 'underline',
  },
});