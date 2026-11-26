export const isFreshAnswer = (answeredAt: number, askedAt: number): boolean =>
  answeredAt > 0 && answeredAt >= askedAt
