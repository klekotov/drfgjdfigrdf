/**
 * IDs used to check game-specific passes and badges.
 */
export interface GameCheckInput {
  gameId: number;
  gamepassIds?: number[];
  badgeIds?: number[];
}
