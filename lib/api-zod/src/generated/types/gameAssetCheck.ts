/**
 * Results for configured game passes or badges owned in a Roblox game.
 */
export interface GameAssetCheck {
  game: string;
  gameId: number;
  imageUrl?: string;
  items: Array<{
    id: number;
    name: string;
  }>;
}
