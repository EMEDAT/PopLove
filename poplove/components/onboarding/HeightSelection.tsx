// components/onboarding/HeightSelection.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const ITEM_HEIGHT = 65; // Height of each height option (increased for better visibility)
const VISIBLE_ITEMS = 5; // Keep exactly 5 items visible

interface HeightSelectionProps {
  height: string;
  onHeightChange: (height: string) => void;
}

export default function HeightSelection({ height, onHeightChange }: HeightSelectionProps) {
  // Define our height option type
  interface HeightOption {
    label: string;
    value: number;
  }
  
  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userScrollingRef = useRef(false);
  
  // State
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [measurementUnit, setMeasurementUnit] = useState<'CM' | 'FT'>('FT');
  const [isScrolling, setIsScrolling] = useState(false);
  const [currentHeightValue, setCurrentHeightValue] = useState<number | null>(null);
  
  // Generate height options from 4'0" to 7'0" (or 122cm to 213cm)
  const generateHeightOptions = (unit: 'FT' | 'CM'): HeightOption[] => {
    if (unit === 'FT') {
      const options: HeightOption[] = [];
      // From 4'0" to 7'0"
      for (let feet = 4; feet <= 7; feet++) {
        for (let inch = 0; inch < 12; inch++) {
          options.push({
            label: `${feet}' ${inch}"`,
            value: Math.round((feet * 12 + inch) * 2.54) // Convert to cm for internal storage
          });
          // Stop at 7'0"
          if (feet === 7 && inch === 0) break;
        }
      }
      return options;
    } else {
      const options: HeightOption[] = [];
      // From 122cm to 213cm
      for (let cm = 122; cm <= 213; cm++) {
        options.push({
          label: `${cm} cm`,
          value: cm
        });
      }
      return options;
    }
  };
  
  const [heightOptions, setHeightOptions] = useState<HeightOption[]>(generateHeightOptions('FT'));
  
  // Find default index (5'8" or 173cm if not provided)
  const getDefaultIndex = (): number => {
    if (height && !isNaN(parseInt(height))) {
      const heightValue = parseInt(height);
      const index = heightOptions.findIndex(opt => opt.value === heightValue);
      if (index !== -1) return index;
    }
    
    // Find 5'8" (173cm) as default
    const defaultIndex = heightOptions.findIndex(opt => opt.value === 173);
    return defaultIndex !== -1 ? defaultIndex : Math.floor(heightOptions.length / 3);
  };
  
  // Scroll to position with proper offset
  const scrollToPosition = (index: number, animated: boolean = true) => {
    if (!scrollViewRef.current) return;
    
    const y = index * ITEM_HEIGHT;
    
    try {
      scrollViewRef.current.scrollTo({
        y,
        animated
      });
    } catch (err) {
      console.error("Scroll error:", err);
    }
  };
  
  // Initialize the scroll position
  useEffect(() => {
    const initialIndex = getDefaultIndex();
    setSelectedIndex(initialIndex);
    
    // Use a microtask to ensure DOM is ready
    requestAnimationFrame(() => {
      if (scrollViewRef.current) {
        // Ensure scroll to exact position with no animation
        scrollViewRef.current.scrollTo({
          y: initialIndex * ITEM_HEIGHT,
          animated: false
        });
      }
    });
  }, []);
  
  // Adding gradient masks for wheel effect
  useEffect(() => {
    const applyWheelEffect = () => {
      if (Platform.OS === 'web' && scrollViewRef.current) {
        // For web platform, we can use CSS
        const scrollViewNode = scrollViewRef.current as any;
        if (scrollViewNode && scrollViewNode.style) {
          scrollViewNode.style.maskImage = 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)';
          scrollViewNode.style.WebkitMaskImage = 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)';
        }
      }
      // For native platforms, we use the maskView approach in JSX
    };
    
    // Apply after a short delay to ensure the component is mounted
    setTimeout(applyWheelEffect, 100);
  }, []);
  
  // Report height changes to parent (only after scrolling stops)
  useEffect(() => {
    if (isScrolling) return;
    
    const option = heightOptions[selectedIndex];
    if (option) {
      onHeightChange(option.value.toString());
      setCurrentHeightValue(option.value);
    }
  }, [selectedIndex, isScrolling]);
  
  // Handle measurement unit change
  useEffect(() => {
    if (userScrollingRef.current) return;
    
    const currentValue = heightOptions[selectedIndex]?.value || 173;
    const newOptions = generateHeightOptions(measurementUnit);
    setHeightOptions(newOptions);
    
    // Find equivalent height in new unit options
    const newIndex = newOptions.findIndex(opt => opt.value === currentValue);
    if (newIndex !== -1) {
      setSelectedIndex(newIndex);
      
      // Scroll after a delay to ensure state is updated
      setTimeout(() => {
        scrollToPosition(newIndex, false);
      }, 50);
    }
  }, [measurementUnit]);
  
  // Handle scroll events
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    userScrollingRef.current = true;
    setIsScrolling(true);
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  };
  
  // Handle scroll end with faster snap
  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    
    // Ensure valid index
    const validIndex = Math.max(0, Math.min(index, heightOptions.length - 1));
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Update selected index immediately for visual feedback
    setSelectedIndex(validIndex);
    
    // Snap to position immediately with minimal delay
    scrollTimeoutRef.current = setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: validIndex * ITEM_HEIGHT,
        animated: true
      });
      
      setIsScrolling(false);
      userScrollingRef.current = false;
      
      // Update parent with selected value
      const option = heightOptions[validIndex];
      if (option) {
        onHeightChange(option.value.toString());
      }
    }, 10); // Very short delay for immediate snapping
  };
  
  // Toggle between CM and FT
  const toggleMeasurementUnit = () => {
    // Remove the isScrolling check to allow quick toggling
    // Toggle between CM and FT
    const newUnit = measurementUnit === 'CM' ? 'FT' : 'CM';
    setMeasurementUnit(newUnit);
    
    // Ensure the measurement options are updated
    const newOptions = generateHeightOptions(newUnit);
    setHeightOptions(newOptions);
    
    // Find the closest equivalent height in the new unit
    const currentValue = heightOptions[selectedIndex]?.value;
    
    if (currentValue) {
      const newIndex = newOptions.findIndex(opt => opt.value === currentValue);
      
      if (newIndex !== -1) {
        setSelectedIndex(newIndex);
        
        // Scroll to the new position
        requestAnimationFrame(() => {
          scrollToPosition(newIndex, true);
        });
      }
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>How tall are you?</Text>
      
      {/* Height Picker */}
      <View style={styles.pickerContainer}>
        {/* Top mask for wheel effect */}
        <View style={styles.topMask} />
        
        {/* Bottom mask for wheel effect */}
        <View style={styles.bottomMask} />
        
        {/* Selection Background (Fixed) */}
        <View style={styles.selectionBackground} />
        
        {/* Top line (Fixed) */}
        <View style={styles.topLine} />
        
        {/* Bottom line (Fixed) */}
        <View style={styles.bottomLine} />
        
        {/* Scrollable height options */}
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast" // Use fast for immediate stopping
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleScrollEnd}
          fadingEdgeLength={ITEM_HEIGHT * 2} // Add fading edges on Android
          style={styles.scrollView}
        >
          {/* Extra space at top to allow scrolling */}
          <View style={{ height: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2) }} />
          
          {/* Height options */}
          {heightOptions.map((option, index) => {
            // Calculate distance from selected index to create perspective effect
            const distance = Math.abs(index - selectedIndex);
            // Calculate scale factor (1.0 for selected, smaller for others)
            const scaleFactor = distance === 0 ? 1.0 : Math.max(0.8, 1 - (distance * 0.08));
            // Calculate opacity (1.0 for selected, fading for others)
            const opacity = distance === 0 ? 1.0 : Math.max(0.5, 1 - (distance * 0.15));
            
            // More dramatic rotation effect - items above rotate backward, items below rotate forward
            const rotationDegree = (index - selectedIndex) * 12; // More rotation per item
            
            return (
              <View 
                key={`height-${index}`} 
                style={[
                  styles.heightItem,
                  { 
                    transform: [
                      { scale: scaleFactor },
                      { perspective: 1000 },
                      { rotateX: `${rotationDegree}deg` },
                      // Add slight Y translation for better 3D effect
                      { translateY: (index - selectedIndex) * 3 }
                    ],
                    opacity: opacity
                  }
                ]}
              >
                <Text 
                  style={[
                    styles.heightText,
                    index === selectedIndex && styles.selectedHeightText
                  ]}
                >
                  {option.label}
                </Text>
              </View>
            );
          })}
          
          {/* Extra space at bottom to allow scrolling */}
          <View style={{ height: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2) }} />
        </ScrollView>
      </View>
      
      {/* Unit toggle */}
      <View style={styles.unitToggleContainer}>
        <TouchableOpacity 
          style={styles.visibilityRow}
          activeOpacity={0.7}
        >
          <Ionicons name="eye-outline" size={20} color="#333" />
          <Text style={styles.visibilityText}>Always visible on profile</Text>
        </TouchableOpacity>
        
        <View style={styles.unitToggleWrapper}>
          <TouchableOpacity
            style={[
              styles.unitToggleButton, 
              measurementUnit === 'FT' && styles.activeUnitToggle
            ]}
            onPress={toggleMeasurementUnit}
          >
            <Text style={[
              styles.unitToggleText, 
              measurementUnit === 'FT' && styles.activeUnitToggleText
            ]}>FT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.unitToggleButton, 
              measurementUnit === 'CM' && styles.activeUnitToggle
            ]}
            onPress={toggleMeasurementUnit}
          >
            <Text style={[
              styles.unitToggleText, 
              measurementUnit === 'CM' && styles.activeUnitToggleText
            ]}>CM</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F2F1ED',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 40,
    color: '#000000',
    textAlign: 'left',
  },
  pickerContainer: {
    marginBottom: 40,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 10, // Add rounded corners to the container
    // Explicitly set height to ensure exactly 5 items are visible
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
  },
  selectionBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -ITEM_HEIGHT/2,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(245, 245, 245, 0.6)', // More transparent background
    zIndex: 1,
  },
  topLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -ITEM_HEIGHT/2,
    height: 1,
    backgroundColor: '#000000',
    zIndex: 3,
  },
  bottomLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: ITEM_HEIGHT/2,
    height: 1,
    backgroundColor: '#000000',
    zIndex: 3,
  },
  // Top and bottom masks for wheel effect
  topMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 0.3,
    backgroundColor: '#F2F1ED',
    opacity: 0.7, // More transparent to see numbers better
    zIndex: 4,
    // Add gradient fade
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: ITEM_HEIGHT },
    shadowOpacity: 0.8,
    shadowRadius: ITEM_HEIGHT / 2,
    elevation: 5,
  },
  bottomMask: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 0.3,
    backgroundColor: '#F2F1ED',
    opacity: 0.7, // More transparent to see numbers better
    zIndex: 4,
    // Add gradient fade
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: -ITEM_HEIGHT },
    shadowOpacity: 0.8,
    shadowRadius: ITEM_HEIGHT / 2,
    elevation: 5,
  },
  scrollView: {
    zIndex: 3,
  },
  scrollContent: {
    alignItems: 'center',
  },
  heightItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    width: width - 40, // Full width minus container padding
  },
  heightText: {
    fontSize: 22,
    color: '#AAAAAA',
    fontWeight: '400',
    zIndex: 2, // Make text appear above the selection background
  },
  selectedHeightText: {
    color: '#000000',
    fontSize: 28,
    fontWeight: '700',
  },
  unitToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
  },
  visibilityText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#333333',
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 15,
  },
  unitText: {
    fontSize: 15,
    color: '#777777',
    paddingHorizontal: 5,
  },
  activeUnitText: {
    color: '#000000',
    fontWeight: '500',
  },
  unitDivider: {
    fontSize: 15,
    color: '#CCCCCC',
    paddingHorizontal: 2,
  },
  unitToggleWrapper: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 20,
    marginBottom: 100,
    overflow: 'hidden',
  },
  unitToggleButton: {
    paddingVertical: 5,
    paddingHorizontal: 15,
  },
  activeUnitToggle: {
    backgroundColor: '#000',
  },
  unitToggleText: {
    color: '#000',
    fontWeight: '400',
  },
  activeUnitToggleText: {
    color: 'white',
    fontWeight: '500',
  },
});