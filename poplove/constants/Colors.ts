// constants/Colors.ts

/**
 * PopLove App Color Theme
 * Inspired by Hinge's sophisticated design approach with a warmer aesthetic
 */

export const Colors = {
  // Base Colors
  background: {
    primary: '#F8F6F2',    // Soft Pearl - main background color
    secondary: '#F2F1ED',  // Subtle variant for cards and sections
    tertiary: '#FFF5F5',   // Warm highlight for important sections
  },
  
  // Brand Colors
  brand: {
    primary: '#8B0000',    // Crimson Depth - main brand color
    secondary: '#B22222',  // Lighter variant for buttons & highlights
    tertiary: '#FFE4E4',   // Very light variant for backgrounds
  },
  
  // Text Colors
  text: {
    primary: '#000000',    // Solid black for primary text
    secondary: '#333333',  // Slightly lighter for secondary text
    muted: '#666666',      // Muted text for less emphasis
    light: '#999999',      // Very light text for placeholders
  },
  
  // UI Elements
  ui: {
    border: '#E5E5E5',     // Border color for inputs and cards
    inputBg: '#F9F9F9',    // Background for input fields
    highlight: '#FFE4E4',  // Light crimson for selected items
    selected: '#8B0000',   // Selected items accent
    disabled: '#E0E0E0',   // Disabled state
  },
  
  // Gradients
  gradients: {
    primary: ['#8B0000', '#B22222'],  // Brand gradient
    secondary: ['#EC5F61', '#F0B433'], // Keep current warm gradient
  },
  
  // System
  system: {
    success: '#4CAF50',
    error: '#FF3B30', 
    warning: '#FFC107',
    info: '#2196F3'
  },
  
  // Special
  special: {
    warmsand: '#D2B48C',   // Warm sand color from your color palette
    lightCrimson: '#FFE4E4', // Light variant of Crimson for subtle highlights
    gentleNeutral: '#D2CCCC', // Gentle neutral tint for highlighted text
  }
};

export default Colors;