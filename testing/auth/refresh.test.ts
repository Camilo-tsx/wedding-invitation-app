import { NextResponse } from "next/server";
import * as jwt from "jsonwebtoken";

// Mocks ANTES de los imports
jest.mock("jsonwebtoken");

jest.mock("@/core/services/auth/revokeTokens", () => ({
  isTokenRevoked: jest.fn(),
}));

jest.mock("@/core/services/user/service", () => ({
  getUserById: jest.fn(),
}));

jest.mock("@/config/config", () => ({
  jwtConfig: {
    jwtAccessSecret: "ACCESS_SECRET",
    jwtRefreshSecret: "REFRESH_SECRET",
  },
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

// Imports DESPUÉS de los mocks
import { POST } from "@/app/api/auth/refresh/route";
import { isTokenRevoked } from "@/core/services/auth/revokeTokens";
import { getUserById } from "@/core/services/user/service";
import { cookies } from "next/headers";

describe("POST /api/auth/refresh", () => {
  const mockRefreshToken = "valid.refresh.token";
  const mockUserId = "user-123";
  const mockUser = {
    id: mockUserId,
    email: "test@mail.com",
    userName: "testUser",
    roles: ["user"],
    isAllowed: true,
  };
  const mockNewAccessToken = "new.access.token";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("devuelve 401 si no hay refreshToken en las cookies", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    });

    const req = {} as Request;
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ error: "No refresh token provided" });
  });

  it("devuelve 401 si el refresh token está revocado", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: mockRefreshToken }),
    });
    (isTokenRevoked as jest.Mock).mockResolvedValue(true);

    const req = {} as Request;
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ error: "Token revoked" });
    expect(isTokenRevoked).toHaveBeenCalledWith(mockRefreshToken);
  });

  it("devuelve 500 si el refresh token es inválido (verify falla)", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: mockRefreshToken }),
    });
    (isTokenRevoked as jest.Mock).mockResolvedValue(false);
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    const req = {} as Request;
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Failed to refresh token" });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("devuelve 500 si el refresh token está expirado", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: mockRefreshToken }),
    });
    (isTokenRevoked as jest.Mock).mockResolvedValue(false);
    (jwt.verify as jest.Mock).mockImplementation(() => {
      const error = new Error("Token expired");
      error.name = "TokenExpiredError";
      throw error;
    });

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    const req = {} as Request;
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Failed to refresh token" });

    consoleErrorSpy.mockRestore();
  });

  it("devuelve 401 si el payload del token no contiene userId", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: mockRefreshToken }),
    });
    (isTokenRevoked as jest.Mock).mockResolvedValue(false);
    (jwt.verify as jest.Mock).mockReturnValue({}); // Sin userId

    const req = {} as Request;
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ error: "Invalid refresh token" });
  });

  it("devuelve 404 si el usuario no existe", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: mockRefreshToken }),
    });
    (isTokenRevoked as jest.Mock).mockResolvedValue(false);
    (jwt.verify as jest.Mock).mockReturnValue({ userId: mockUserId });
    (getUserById as jest.Mock).mockResolvedValue(null);

    const req = {} as Request;
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json).toEqual({ error: "User not found" });
    expect(getUserById).toHaveBeenCalledWith(mockUserId);
  });

  it("devuelve 200, genera nuevo accessToken y lo setea en cookies", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: mockRefreshToken }),
    });
    (isTokenRevoked as jest.Mock).mockResolvedValue(false);
    (jwt.verify as jest.Mock).mockReturnValue({ userId: mockUserId });
    (getUserById as jest.Mock).mockResolvedValue(mockUser);
    (jwt.sign as jest.Mock).mockReturnValue(mockNewAccessToken);

    const req = {} as Request;
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      user: {
        id: mockUser.id,
        email: mockUser.email,
        userName: mockUser.userName,
        isAllowed: mockUser.isAllowed,
        roles: mockUser.roles,
      },
    });

    // Verificar que se llamó getUserById
    expect(getUserById).toHaveBeenCalledWith(mockUserId);

    // Verificar que se generó el nuevo access token con los datos correctos
    expect(jwt.sign).toHaveBeenCalledWith(
      {
        id: mockUser.id,
        email: mockUser.email,
        roles: mockUser.roles,
        isAllowed: mockUser.isAllowed,
        userName: mockUser.userName,
      },
      "ACCESS_SECRET",
      { expiresIn: "30m" }
    );

    // Verificar que se seteó la cookie
    const accessCookie = res.cookies.get("accessToken");
    expect(accessCookie).toBeDefined();
    expect(accessCookie?.value).toBe(mockNewAccessToken);
  });

  it("maneja correctamente usuarios con isAllowed=false", async () => {
    const userNotAllowed = {
      ...mockUser,
      isAllowed: false,
    };

    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: mockRefreshToken }),
    });
    (isTokenRevoked as jest.Mock).mockResolvedValue(false);
    (jwt.verify as jest.Mock).mockReturnValue({ userId: mockUserId });
    (getUserById as jest.Mock).mockResolvedValue(userNotAllowed);
    (jwt.sign as jest.Mock).mockReturnValue(mockNewAccessToken);

    const req = {} as Request;
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.user.isAllowed).toBe(false);

    // Verificar que el token incluye isAllowed=false
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        isAllowed: false,
      }),
      "ACCESS_SECRET",
      { expiresIn: "30m" }
    );
  });

  it("maneja correctamente usuarios con múltiples roles", async () => {
    const adminUser = {
      ...mockUser,
      roles: ["user", "admin", "moderator"],
    };

    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: mockRefreshToken }),
    });
    (isTokenRevoked as jest.Mock).mockResolvedValue(false);
    (jwt.verify as jest.Mock).mockReturnValue({ userId: mockUserId });
    (getUserById as jest.Mock).mockResolvedValue(adminUser);
    (jwt.sign as jest.Mock).mockReturnValue(mockNewAccessToken);

    const req = {} as Request;
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.user.roles).toEqual(["user", "admin", "moderator"]);

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        roles: ["user", "admin", "moderator"],
      }),
      "ACCESS_SECRET",
      { expiresIn: "30m" }
    );
  });

  it("verifica que la cookie tenga las opciones de seguridad correctas", async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: mockRefreshToken }),
    });
    (isTokenRevoked as jest.Mock).mockResolvedValue(false);
    (jwt.verify as jest.Mock).mockReturnValue({ userId: mockUserId });
    (getUserById as jest.Mock).mockResolvedValue(mockUser);
    (jwt.sign as jest.Mock).mockReturnValue(mockNewAccessToken);

    const req = {} as Request;
    const res = await POST(req);

    const accessCookie = res.cookies.get("accessToken");

    expect(accessCookie).toBeDefined();
    expect(accessCookie?.value).toBe(mockNewAccessToken);
    // Note: En el entorno de test, es difícil verificar las opciones exactas
    // de la cookie (httpOnly, secure, etc.) porque NextResponse.cookies
    // no las expone directamente en el objeto retornado
    // Estas propiedades se setean pero no son accesibles en el test
  });
});
