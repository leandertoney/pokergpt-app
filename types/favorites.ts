export type FavoriteItem = {
  id: string;
  type: 'hand' | 'chat';
  favoritedAt: number; // Unix timestamp
};

export type FavoritesState = {
  items: FavoriteItem[];
};
