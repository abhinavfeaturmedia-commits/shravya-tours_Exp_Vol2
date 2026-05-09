import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    type?: 'website' | 'article';
}

const DEFAULT_TITLE = 'SHRAWELLO Travel Hub - Premium Travel Experiences';
const DEFAULT_DESCRIPTION = 'Book handpicked hotels, seamless flights, and immersive tours. Join 50,000+ travelers for unforgettable experiences across India and beyond.';
const DEFAULT_IMAGE = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDe8BDAUta_Sad0sbfFPp3eGFuTDne-kjCHaSbEmPIsw2A35eYa_4cmO0qQIrrAUnyuBkmJYYx5BswvQ8xoNvi-V48GV78qtY2osp3mRT5dAgVv31-tcAdYZIYq5VwnghdHN-xLMZHlH8DhevC9MvU-RUVOzTxENfRuR9CornjT44jfRzEHiuwDi6on6RQISv-Sa7xPzXf6U61FblGpi9Ou2aXfsR5_PoyNJhX-aCt1zuv1ogRgtmIOXqYjfcAQ79z48VNTNX3nLemm';

export const SEO: React.FC<SEOProps> = ({
    title,
    description = DEFAULT_DESCRIPTION,
    keywords = 'travel, tours, hotels, booking, india, vacation, honeymoon, adventure',
    image = DEFAULT_IMAGE,
    url,
    type = 'website',
}) => {
    const fullTitle = title ? `${title} | SHRAWELLO Travel Hub` : DEFAULT_TITLE;

    return (
        <Helmet>
            {/* Primary Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="title" content={fullTitle} />
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            {url && <meta property="og:url" content={url} />}
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            {url && <meta property="twitter:url" content={url} />}
            <meta property="twitter:title" content={fullTitle} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={image} />

            {/* Additional */}
            <meta name="robots" content="index, follow" />
            <meta name="language" content="English" />
            <meta name="author" content="SHRAWELLO Travel Hub" />
        </Helmet>
    );
};

export default SEO;
