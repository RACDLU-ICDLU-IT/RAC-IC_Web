import { useEffect } from 'react';
import { useTenant } from './useTenant';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  canonicalPath?: string;
  structuredData?: object;
}

export function useSEO({
  title,
  description,
  keywords,
  ogImage,
  canonicalPath,
  structuredData,
}: SEOProps): void {
  const { tenant } = useTenant();

  useEffect(() => {
    // 1. Set Title
    const pageTitle = title
      ? `${title} | ${tenant.fullName} | ${tenant.shortName}`
      : `${tenant.fullName} | ${tenant.shortName}`;
    document.title = pageTitle;

    // Helper function to update or create meta tags
    const setMetaTag = (attrName: string, attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 2. Set Description
    const metaDescription = description || tenant.seo?.defaultDescription || tenant.tagline;
    setMetaTag('name', 'description', metaDescription);
    setMetaTag('property', 'og:description', metaDescription);
    setMetaTag('name', 'twitter:description', metaDescription);

    // 3. Set Keywords
    const metaKeywords = keywords || tenant.seo?.defaultKeywords || [];
    setMetaTag('name', 'keywords', metaKeywords.join(', '));

    // 4. Set Open Graph / Twitter Tags
    setMetaTag('property', 'og:title', pageTitle);
    setMetaTag('name', 'twitter:title', pageTitle);
    
    setMetaTag('property', 'og:site_name', tenant.fullName);

    const baseUrl = `https://${tenant.hostname}`;
    
    if (ogImage) {
      const fullImageUrl = ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`;
      setMetaTag('property', 'og:image', fullImageUrl);
      setMetaTag('name', 'twitter:image', fullImageUrl);
    } else if (tenant.brand.ogImagePath) {
      setMetaTag('property', 'og:image', `${baseUrl}${tenant.brand.ogImagePath}`);
      setMetaTag('name', 'twitter:image', `${baseUrl}${tenant.brand.ogImagePath}`);
    }

    // 5. Set Canonical URL
    const canonicalUrl = canonicalPath ? `${baseUrl}${canonicalPath !== '/' ? canonicalPath : ''}` : baseUrl;
    let canonicalElement = document.querySelector(`link[rel="canonical"]`);
    if (!canonicalElement) {
      canonicalElement = document.createElement('link');
      canonicalElement.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalElement);
    }
    canonicalElement.setAttribute('href', canonicalUrl);
    setMetaTag('property', 'og:url', canonicalUrl);

    // 6. Set Structured Data (JSON-LD)
    let scriptElement = document.getElementById('structured-data');
    if (!scriptElement) {
      scriptElement = document.createElement('script');
      scriptElement.setAttribute('id', 'structured-data');
      scriptElement.setAttribute('type', 'application/ld+json');
      document.head.appendChild(scriptElement);
    }

    if (structuredData) {
      scriptElement.textContent = JSON.stringify(structuredData);
    } else {
      // Default WebPage structured data
      const defaultData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": pageTitle,
        "description": metaDescription,
        "url": canonicalUrl,
        "publisher": {
          "@type": "Organization",
          "name": tenant.fullName,
          "logo": {
            "@type": "ImageObject",
            "url": `${baseUrl}${tenant.brand.logoPath}`
          }
        }
      };
      scriptElement.textContent = JSON.stringify(defaultData);
    }

    return () => {
      document.title = tenant.shortName;
      if (scriptElement) {
        scriptElement.textContent = '{}';
      }
    };
  }, [title, description, keywords, ogImage, canonicalPath, structuredData, tenant]);
}
