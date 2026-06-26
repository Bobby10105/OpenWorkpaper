export const SignJWT = jest.fn().mockImplementation(() => ({
  setProtectedHeader: jest.fn().mockReturnThis(),
  setIssuedAt: jest.fn().mockReturnThis(),
  setExpirationTime: jest.fn().mockReturnThis(),
  sign: jest.fn().mockResolvedValue('mock-token'),
}));
export const jwtVerify = jest.fn();
export type JWTPayload = {
  user?: {
    id: string;
    username: string;
    role: string;
    mustChangePassword?: boolean;
  };
  [key: string]: unknown;
};
