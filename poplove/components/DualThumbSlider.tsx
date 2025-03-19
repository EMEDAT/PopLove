// DualThumbSlider.tsx - Updated with values prop support
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import MultiSlider from '@ptomasroos/react-native-multi-slider';

interface DualThumbSliderProps {
  min: number;
  max: number;
  initialLow: number;
  initialHigh: number;
  step: number;
  onValueChanged: (low: number, high: number) => void;
  values?: [number, number]; 
}

const DualThumbSlider = ({
  min, 
  max, 
  initialLow, 
  initialHigh, 
  step, 
  onValueChanged,
  values
}: DualThumbSliderProps) => {
  // Use state to track current values
  const [sliderValues, setSliderValues] = useState([initialLow, initialHigh]);

  // Update when external values change (like reset)
  useEffect(() => {
    if (values) {
      setSliderValues(values);
    }
  }, [values]);

  // Handle value change
  const handleValuesChange = (newValues: number[]) => {
    setSliderValues(newValues);
    onValueChanged(newValues[0], newValues[1]);
  };

  return (
    <View style={styles.container}>
      <MultiSlider
        values={sliderValues}
        min={min}
        max={max}
        step={step}
        allowOverlap={false}
        snapped
        onValuesChange={handleValuesChange}
        selectedStyle={styles.selectedTrack}
        unselectedStyle={styles.unselectedTrack}
        markerStyle={styles.marker}
        containerStyle={styles.sliderContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
  },
  sliderContainer: {
    height: 30,
    width: '100%',
  },
  selectedTrack: {
    backgroundColor: '#FF6B6B',
    height: 3,
  },
  unselectedTrack: {
    backgroundColor: '#E5E5E5',
    height: 3,
  },
  marker: {
    backgroundColor: '#FFF',
    borderColor: '#FF6B6B',
    borderWidth: 2,
    height: 20,
    width: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 1,
  }
});

export default DualThumbSlider;