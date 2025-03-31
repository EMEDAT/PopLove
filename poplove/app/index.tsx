import { Redirect } from 'expo-router';
export default function Index() {
// Always redirect to splash screen first
return <Redirect href="/(onboarding)/splash" />;
} 