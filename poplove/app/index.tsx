import { Redirect } from '../utils/routerHelpers';
export default function Index() {
// Always redirect to splash screen first
return <Redirect href="/(onboarding)/splash" />;
} 