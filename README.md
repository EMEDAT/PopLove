# PopLove

PopLove is a modern dating app built with React Native (Expo) and Firebase, featuring real-time matchmaking, chat functionality, and interactive dating experiences.

![PopLove Logo](assets/images/main/heart-icon.png)

## Features

### Core Functionality
- **Profile Creation**: Complete user profiles with photos, bios, interests, and preferences
- **Two Matchmaking Modes**:
  - **Speed Dating**: Quick 1-on-1 matching with timed chat sessions
  - **Line-Up**: Group-based matchmaking with contestant rotations
- **Real-time Chat**: Messaging with read receipts and multimedia support
- **User Stories**: 24-hour content sharing similar to Instagram/Snapchat stories
- **Matching Algorithm**: Advanced compatibility-based matching using interests, location, and preferences

### Technical Features
- **Firebase Integration**: Authentication, Firestore database, Storage, and Cloud Functions
- **Responsive UI**: Mobile-first design with responsive components
- **Navigation**: Tab-based and stack navigation using Expo Router
- **State Management**: Context API for authentication and user data
- **Image Handling**: Upload, storage, and optimization of profile and media images
- **Subscription Management**: Premium features with tiered subscription plans

## Technical Stack

- **Frontend**:
  - React Native with Expo
  - TypeScript
  - React Navigation (Expo Router)
  - React Native Reanimated for animations
  - Expo Vector Icons
  - Linear Gradient components

- **Backend**:
  - Firebase Authentication
  - Cloud Firestore
  - Firebase Storage
  - Firebase Cloud Functions
  - Firebase Hosting

## Project Structure

```
poplove/
├── app/                    # Main application screens using Expo Router
│   ├── (auth)/             # Authentication screens (login, signup)
│   ├── (onboarding)/       # User onboarding flow
│   ├── (tabs)/             # Main tab navigation
│   └── chat/               # Chat functionality
├── assets/                 # Images, fonts, and other static assets
├── components/             # Reusable UI components
│   ├── auth/               # Authentication components
│   ├── chat/               # Chat-related components
│   ├── home/               # Home screen components
│   ├── live-love/          # Live dating features
│   ├── onboarding/         # Onboarding components
│   ├── profile/            # User profile components
│   └── shared/             # Shared/common components
├── contexts/               # React Context providers
├── functions/              # Firebase Cloud Functions
├── hooks/                  # Custom React hooks
├── lib/                    # Library initializations (Firebase, etc.)
├── services/               # API and service integrations
└── utils/                  # Utility functions and helpers
```

## Key Components

### Authentication
- Email/password authentication
- Social login integrations
- Profile creation and verification

### Onboarding Flow
- Step-by-step user data collection
- Preference setting (interests, dating preferences)
- Profile photo upload
- Subscription plan selection

### Live Dating Features
- Speed Dating mode with timed sessions
- Line-Up group dating with contestant rotation
- Compatibility scoring and matching

### Chat System
- Real-time messaging
- Read receipts and typing indicators
- Media sharing capabilities
- Match management

### User Stories
- 24-hour temporary content
- Media upload (photos/videos)
- View tracking and analytics

## Setup and Installation

### Prerequisites
- Node.js 16+
- Expo CLI
- Firebase account

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/poplove.git
cd poplove
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file based on `.env.example` with your Firebase credentials

4. Start the development server
```bash
npx expo start
```

### Firebase Configuration

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Authentication, Firestore, and Storage services
3. Add your Firebase configuration to `.env` file using the template in `.env.example`
4. Deploy Firebase Functions (optional)
```bash
cd functions
npm install
npm run deploy
```

## Development

### Running the App
```bash
# Start Expo development server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

### Building for Production
```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Expo](https://expo.dev/)
- [Firebase](https://firebase.google.com/)
- [React Native](https://reactnative.dev/)
