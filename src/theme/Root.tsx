import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import AiAssistant from '../components/AiAssistant';
import CookieConsent from '../components/CookieConsent';
import AuthBackground from '../components/AuthBackground';
import SponsorGate from '../components/SponsorGate';

export default function Root({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <>
      <BrowserOnly>{() => <AuthBackground />}</BrowserOnly>
      {children}
      <AiAssistant />
      <BrowserOnly>{() => <CookieConsent />}</BrowserOnly>
      <BrowserOnly>{() => <SponsorGate />}</BrowserOnly>
    </>
  );
}
