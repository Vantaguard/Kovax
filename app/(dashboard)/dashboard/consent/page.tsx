import ConsentClient from './ConsentClient';

export const metadata = {
  title: 'Consent Required | Kovax',
  description: 'Please review and accept the required agreements to continue using the platform.',
};

export default function ConsentPage() {
  return <ConsentClient />;
}
