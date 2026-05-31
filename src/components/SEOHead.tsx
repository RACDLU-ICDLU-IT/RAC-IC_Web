import React from 'react';
import { useSEO, SEOProps } from '../hooks/useSEO';

export function SEOHead(props: SEOProps) {
  useSEO(props);
  return null;
}

export default SEOHead;
