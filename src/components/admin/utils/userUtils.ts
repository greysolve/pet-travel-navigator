
export const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'site_manager':
      return 'bg-red-500';
    case 'pet_caddie':
      return 'bg-purple-500';
    default:
      return 'bg-blue-500';
  }
};

export const getPlanBadgeColor = (plan: string) => {
  switch (plan) {
    case 'teams':
      return 'bg-purple-500';
    case 'premium':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
};
