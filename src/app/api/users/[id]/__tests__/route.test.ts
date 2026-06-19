import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "../route";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

describe("User API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH", () => {
    it("should return 401 if user is not authenticated", async () => {
      (getSession as any).mockResolvedValue(null);

      const req = {
        json: vi.fn().mockResolvedValue({ role: "Staff" }),
      } as unknown as Request;

      const res = await PATCH(req, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 if user is not an IT Administrator", async () => {
      (getSession as any).mockResolvedValue({
        user: { role: "Staff" },
      });

      const req = {
        json: vi.fn().mockResolvedValue({ role: "Manager" }),
      } as unknown as Request;

      const res = await PATCH(req, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json).toEqual({ error: "Forbidden" });
    });

    it("should handle error gracefully with invalid JSON body", async () => {
      (getSession as any).mockResolvedValue({
        user: { role: "IT Administrator" },
      });

      const req = {
        json: vi.fn().mockRejectedValue(new Error("Unexpected token")),
      } as unknown as Request;

      const res = await PATCH(req, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json).toEqual({ error: "Unexpected token" });
    });

    it("should handle database error gracefully", async () => {
      (getSession as any).mockResolvedValue({
        user: { role: "IT Administrator" },
      });

      const req = {
        json: vi.fn().mockResolvedValue({ role: "Staff" }),
      } as unknown as Request;

      (prisma.user.update as any).mockRejectedValue(new Error("Database connection failed"));

      const res = await PATCH(req, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json).toEqual({ error: "Database connection failed" });
    });

    it("should return 200 and user data on successful update", async () => {
      (getSession as any).mockResolvedValue({
        user: { role: "IT Administrator" },
      });

      const req = {
        json: vi.fn().mockResolvedValue({ role: "Manager" }),
      } as unknown as Request;

      const updatedUser = {
        id: "1",
        username: "testuser",
        role: "Manager",
        mustChangePassword: true,
        createdAt: new Date("2023-01-01T00:00:00Z"),
      };

      (prisma.user.update as any).mockResolvedValue(updatedUser);

      const res = await PATCH(req, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      // Date gets serialized to string in json
      expect(json).toEqual({
        ...updatedUser,
        createdAt: "2023-01-01T00:00:00.000Z",
      });
    });
  });

  describe("DELETE", () => {
     it("should handle error gracefully if deletion fails", async () => {
      (getSession as any).mockResolvedValue({
        user: { role: "IT Administrator", id: "2" },
      });

      const req = {} as unknown as Request;

      (prisma.user.delete as any).mockRejectedValue(new Error("Database connection failed"));

      const res = await DELETE(req, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json).toEqual({ error: "Delete failed" });
     });
  });
});
