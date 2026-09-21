import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    canonical?: string;
    type?: 'website' | 'article';
    schema?: Record<string, any> | Array<Record<string, any>>;
}

const DEFAULT_TITLE = 'SHRAWELLO Travel Hub | Corporate Travel & Curated Holiday Packages';
const DEFAULT_DESCRIPTION = 'Book curated holiday packages, corporate travel, luxury retreats & customized itineraries with SHRAWELLO Travel Hub. 24/7 travel concierge & transparent pricing.';
const DEFAULT_IMAGE = 'https://shrawellotravels.com/logo.png';
const SITE_URL = 'https://shrawellotravels.com';

export const SEO: React.FC<SEOProps> = ({
    title,
    description = DEFAULT_DESCRIPTION,
    keywords = 'SHRAWELLO Travel Hub, travel, tour packages, holiday booking, india tours, corporate travel, luxury vacations, honeymoon, adventure',
    image = DEFAULT_IMAGE,
    url,
    canonical,
    type = 'website',
    schema,
}) => {
    const fullTitle = title ? `${title} | SHRAWELLO Travel Hub` : DEFAULT_TITLE;
    const resolvedUrl = url || (typeof window !== 'undefined' ? window.location.href : SITE_URL);
    const resolvedCanonical = canonical || (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : SITE_URL);

    return (
        <Helmet>
            {/* Primary Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="title" content={fullTitle} />
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords} />

            {/* Canonical Link */}
            <link rel="canonical" href={resolvedCanonical} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:site_name" content="SHRAWELLO Travel Hub" />
            <meta property="og:locale" content="en_US" />
            <meta property="og:url" content={resolvedUrl} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={resolvedUrl} />
            <meta property="twitter:title" content={fullTitle} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={image} />

            {/* Additional Directives */}
            <meta name="robots" content="index, follow, max-image-preview:large" />
            <meta name="language" content="English" />
            <meta name="author" content="SHRAWELLO Travel Hub" />

            {/* Optional Structured Data JSON-LD */}
            {schema && (
                <script type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            )}
        </Helmet>
    );
};

export default SEO;
