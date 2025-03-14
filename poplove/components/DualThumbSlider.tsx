// First, install: npm install rn-range-slider
// For a quick fix, use this implementation

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RangeSlider from 'rn-range-slider';

interface RangeSliderProps {
  min: number;
  max: number;
  initialLow: number;
  initialHigh: number;
  step: number;
  onValueChanged: (low: number, high: number) => void;
}

// Customizable Range Slider that matches your design
const DualThumbSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  initialLow,
  initialHigh,
  step,
  onValueChanged
}) => {
  const renderThumb = useCallback(() => (
    <View style={styles.thumb} />
  ), []);
  
  const renderRail = useCallback(() => (
    <View style={styles.rail} />
  ), []);
  
  const renderRailSelected = useCallback(() => (
    <View style={styles.railSelected} />
  ), []);
  
  return (
    <RangeSlider
      style={styles.slider}
      min={min}
      max={max}
      step={step}
      low={initialLow}
      high={initialHigh}
      onValueChanged={onValueChanged}
      renderThumb={renderThumb}
      renderRail={renderRail}
      renderRailSelected={renderRailSelected}
    />
  );
};

const styles = StyleSheet.create({
  slider: {
    height: 40,
    width: '100%',
    marginTop: 5,
  },
  thumb: {
    width: 20, 
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF', // White fill
    borderWidth: 2,
    borderColor: '#FF6B6B', // Red border to match your design
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  rail: {
    height: 3, // Thicker line as requested
    backgroundColor: '#E5E5E5', // Light gray
    borderRadius: 2,
  },
  railSelected: {
    height: 3, // Keep same thickness
    backgroundColor: '#FF6B6B', // Red to match your design
    borderRadius: 2,
  },
});

export default DualThumbSlider;