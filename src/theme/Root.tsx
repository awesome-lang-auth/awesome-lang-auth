import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import CookieConsent from '../components/CookieConsent';
import AuthBackground from '../components/AuthBackground';

export default function Root({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <>
      <BrowserOnly>{() => <AuthBackground />}</BrowserOnly>
      {children}
      <BrowserOnly>{() => <CookieConsent />}</BrowserOnly>
    </>
  );
}
