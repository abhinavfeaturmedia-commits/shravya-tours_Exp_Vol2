import React from 'react';
import { BrandSelect } from './BrandSelect';

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange?: (itemsPerPage: number) => void;
    showItemsPerPage?: boolean;
    itemsPerPageOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    showItemsPerPage = true,
    itemsPerPageOptions = [10, 25, 50, 100]
}) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible + 2) {
            // Show all pages if not many
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage > 3) pages.push('...');

            // Show pages around current
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) pages.push(i);

            if (currentPage < totalPages - 2) pages.push('...');

            // Always show last page
            pages.push(totalPages);
        }

        return pages;
    };

    if (totalItems === 0) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 py-4 border-t border-slate-200 dark:border-slate-800">
            {/* Items per page selector */}
            <div className="flex items-center gap-3 text-sm">
                {showItemsPerPage && onItemsPerPageChange && (
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Show</span>
                        <BrandSelect
                            value={itemsPerPage}
                            labelText="Items per page"
                            onChange={(e) => {
                                onItemsPerPageChange(Number(e.target.value));
                                onPageChange(1); // Reset to first page
                            }}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            {itemsPerPageOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </BrandSelect>
                        <span className="text-slate-500 dark:text-slate-400 font-medium">per page</span>
                    </div>
                )}
                <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
                    Showing <span className="font-bold text-slate-700 dark:text-slate-300">{startItem}-{endItem}</span> of <span className="font-bold text-slate-700 dark:text-slate-300">{totalItems}</span>
                </span>
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-1">
                {/* Previous button */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) =>
                        page === '...' ? (
                            <span key={`ellipsis-${index}`} className="px-2 text-slate-400">...</span>
                        ) : (
                            <button
                                key={page}
                                type="button"
                                onClick={() => onPageChange(page as number)}
                                aria-label={`Page ${page}`}
                                aria-current={currentPage === page ? 'page' : undefined}
                                className={`min-w-[36px] h-9 rounded-lg text-sm font-bold transition-colors
                                    ${currentPage === page
                                        ? 'bg-primary text-white shadow-md shadow-primary/30'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                                    }
                                `}
                            >
                                {page}
                            </button>
                        )
                    )}
                </div>

                {/* Next button */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                >
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
            </div>
        </div>
    );
};

// Hook for pagination state management
export const usePagination = (totalItems: number, defaultItemsPerPage = 10) => {
    const [currentPage, setCurrentPage] = React.useState(1);
    const [itemsPerPage, setItemsPerPage] = React.useState(defaultItemsPerPage);

    // Reset to page 1 when total items changes significantly
    React.useEffect(() => {
        const maxPage = Math.ceil(totalItems / itemsPerPage);
        if (currentPage > maxPage && maxPage > 0) {
            setCurrentPage(maxPage);
        }
    }, [totalItems, itemsPerPage, currentPage]);

    const paginateData = <T,>(data: T[]): T[] => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    };

    return {
        currentPage,
        setCurrentPage,
        itemsPerPage,
        setItemsPerPage,
        paginateData,
        paginationProps: {
            currentPage,
            totalItems,
            itemsPerPage,
            onPageChange: setCurrentPage,
            onItemsPerPageChange: setItemsPerPage
        }
    };
};
