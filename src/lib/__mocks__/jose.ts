export const SignJWT = jest.fn().mockImplementation(() => ({
  setProtectedHeader: jest.fn().mockReturnThis(),
  setIssuedAt: jest.fn().mockReturnThis(),
  setExpirationTime: jest.fn().mockReturnThis(),
  sign: jest.fn().mockResolvedValue('mock-token'),
}));
export const jwtVerify = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JWTPayload = any;
