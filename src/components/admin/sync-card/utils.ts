
export const formatTitle = (title: string) => {
  const words = title.split(/(?=[A-Z])|[\s_-]+/);
  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .replace(' Synchronization', '');
};
