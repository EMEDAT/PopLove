// app/subscription.tsx
// This is a standalone route that renders the subscription screen without 
// conflicting with the onboarding flow's subscription screen

import SubscriptionScreen from '../app/(screens)/subscription';

export default function SubscriptionRoute() {
  return <SubscriptionScreen />;
}