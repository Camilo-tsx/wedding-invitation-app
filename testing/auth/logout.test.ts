import { NextRequest } from "next/server";
import * as jwt from "jsonwebtoken";

// IMPORTANTE: Mockear ANTES de importar el route
jest.mock("jsonwebtoken");

jest.mock("@/core/services/auth/revokeTokens", () => ({
  addRevokeToken: jest.fn(),
  isTokenRevoked: jest.fn(),
}));

jest.mock("@/config/config", () => ({
  jwtConfig: {
    jwtAccessSecret: "ACCESS_SECRET",
    jwtRefreshSecret: "REFRESH_SECRET",
  },
}));

// Ahora sí importar el route DESPUÉS de los mocks
import { POST } from "@/app/api/auth/logout/route";
import {
  addRevokeToken,
  isTokenRevoked,
} from "@/core/services/auth/revokeTokens";

describe("POST /api/auth/logout", () => {
  const mockRefreshToken = "valid.refresh.token";
  const mockUserId = "user-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("devuelve 404 si no hay refreshToken en las cookies", async () => {
    const req = {
      cookies: {
        get: jest.fn().mockReturnValue(undefined),
      },
    } as unknown as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json).toEqual({ message: "Token error" });
  });

  it("devuelve 403 si el token es inválido", async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    const req = {
      cookies: {
        get: jest.fn().mockReturnValue({ value: "invalid.token" }),
      },
    } as unknown as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json).toEqual({ error: "Invalid or expired token" });
  });

  it("devuelve 403 si el token está expirado", async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      const error = new Error("Token expired");
      error.name = "TokenExpiredError";
      throw error;
    });

    const req = {
      cookies: {
        get: jest.fn().mockReturnValue({ value: mockRefreshToken }),
      },
    } as unknown as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json).toEqual({ error: "Invalid or expired token" });
  });

  it("devuelve 400 si el payload no contiene userId", async () => {
    (jwt.verify as jest.Mock).mockReturnValue({});

    const req = {
      cookies: {
        get: jest.fn().mockReturnValue({ value: mockRefreshToken }),
      },
    } as unknown as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: "Invalid token payload" });
  });

  it("revoca el token y limpia las cookies si el logout es exitoso", async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ userId: mockUserId });
    (isTokenRevoked as jest.Mock).mockResolvedValue(false);
    (addRevokeToken as jest.Mock).mockResolvedValue(true);

    const req = {
      cookies: {
        get: jest.fn().mockReturnValue({ value: mockRefreshToken }),
      },
    } as unknown as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      message: "Logout succesfull",
      success: true,
    });

    // Verificar que se intentó revocar el token
    expect(isTokenRevoked).toHaveBeenCalledWith(mockRefreshToken);
    expect(addRevokeToken).toHaveBeenCalledWith(mockRefreshToken, mockUserId);

    // Verificar que las cookies se limpiaron
    const accessCookie = res.cookies.get("accessToken");
    const refreshCookie = res.cookies.get("refreshToken");

    expect(accessCookie).toBeDefined();
    expect(refreshCookie).toBeDefined();
    expect(accessCookie?.value).toBe("");
    expect(refreshCookie?.value).toBe("");
  });

  it("no revoca el token si ya estaba revocado previamente", async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ userId: mockUserId });
    (isTokenRevoked as jest.Mock).mockResolvedValue(true);
    (addRevokeToken as jest.Mock).mockResolvedValue(true);

    const req = {
      cookies: {
        get: jest.fn().mockReturnValue({ value: mockRefreshToken }),
      },
    } as unknown as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      message: "Logout succesfull",
      success: true,
    });

    expect(isTokenRevoked).toHaveBeenCalledWith(mockRefreshToken);
    expect(addRevokeToken).not.toHaveBeenCalled();
  });
});
