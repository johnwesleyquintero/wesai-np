export const formatDate = (dateString: string, style: 'short' | 'long' | 'medium' = 'short') => {
    const date = new Date(dateString);
    switch (style) {
        case 'long':
            return date.toLocaleString(undefined, {
                dateStyle: 'long',
                timeStyle: 'short'
            });
        case 'medium':
            return date.toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
        case 'short':
        default:
            return date.toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric'
            });
    }
};
