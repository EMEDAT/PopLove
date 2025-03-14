// DualThumbSlider.tsx
import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import RangeSlider from 'rn-range-slider';

interface RangeSliderProps {
  min: number;
  max: number;
  initialLow: number;
  initialHigh: number;
  step: number;
  onValueChanged: (low: number, high: number) => void;
}

const DualThumbSlider = ({
  min, max, initialLow, initialHigh, step, onValueChanged
}: RangeSliderProps) => {
  const renderThumb = useCallback(() => <View style={styles.thumb} />, []);
  const renderRail = useCallback(() => <View style={styles.rail} />, []);
  const renderRailSelected = useCallback(() => <View style={styles.railSelected} />, []);

  return (
<RangeSlider
    style={styles.slider}
    min={min}
    max={max}
    step={step} 
    low={initialLow}
    high={initialHigh}
    disableRange={false}
    onValueChanged={onValueChanged}
    renderThumb={renderThumb}
    renderRail={renderRail}
    renderRailSelected={renderRailSelected}
    thumbRadius={10}
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
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  rail: {
    height: 3,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
  },
  railSelected: {
    height: 3,
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
  },
});

export default DualThumbSlider;