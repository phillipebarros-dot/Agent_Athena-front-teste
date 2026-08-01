'use client';
import React from 'react';

export const UntitledLogo = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src="/athena-logo.png"
    alt="Athena Logo"
    style={{
      width: 36, height: 36, objectFit: 'contain',
      filter: 'drop-shadow(0 2px 8px rgba(196,30,30,.2))',
    }}
  />
);
