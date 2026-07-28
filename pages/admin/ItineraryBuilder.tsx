import React from 'react';
import { ItineraryProvider } from '../../components/itinerary/ItineraryContext';
import { ItineraryWizard } from '../../components/itinerary/ItineraryWizard';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';

export const ItineraryBuilder: React.FC = () => {
    return (
        <ItineraryProvider>
            <ErrorBoundary fallbackTitle="Itinerary Builder Error">
                <ItineraryWizard />
            </ErrorBoundary>
        </ItineraryProvider>
    );
};