import { NextRequest } from "next/server";
import { validateUser } from "@/core/services/user/service";
import { POST } from "@/app/api/auth/login/route";
import * as valibot from "valibot";

// Mock de dependencias externas
jest.mock("@/core/services/user/service", () => ({
  validateUser: jest.fn(),
}));

jest.mock("@/config/config", () => ({
  jwtConfig: {
    jwtAccessSecret: "ACCESS_SECRET",
    jwtRefreshSecret: "REFRESH_SECRET",
  },
}));

// Mock de valibot
jest.mock("valibot", () => ({
  ...jest.requireActual("valibot"),
  safeParse: jest.fn(),
}));

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("devuelve 400 si el body no pasa la validación", async () => {
    // Mock de validación fallida
    (valibot.safeParse as jest.Mock).mockReturnValue({
      success: false,
    });

    const req = {
      json: jest.fn().mockResolvedValue({ email: "invalido" }), // Falta password
    } as unknown as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ message: "Bad Request" });
  });

  it("devuelve 401 si el usuario no es válido", async () => {
    // Mock de validación exitosa
    (valibot.safeParse as jest.Mock).mockReturnValue({
      success: true,
      output: {
        email: "test@mail.com",
        password: "wrongpass",
      },
    });

    (validateUser as jest.Mock).mockResolvedValueOnce(null);

    const req = {
      json: jest.fn().mockResolvedValue({
        email: "test@mail.com",
        password: "wrongpass",
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({
      error: "Usuario o contraseña invalidos",
      field: "password",
    });
  });

  it("devuelve 200 y setea cookies si el login es exitoso", async () => {
    // Mock de validación exitosa
    (valibot.safeParse as jest.Mock).mockReturnValue({
      success: true,
      output: {
        email: "test@mail.com",
        password: "123456",
      },
    });

    (validateUser as jest.Mock).mockResolvedValueOnce({
      id: 1,
      email: "test@mail.com",
      roles: ["user"],
      userName: "testUser",
      isAllowed: true,
    });

    const req = {
      json: jest.fn().mockResolvedValue({
        email: "test@mail.com",
        password: "123456",
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ message: "Login successful" });

    const accessCookie = res.cookies.get("accessToken");
    const refreshCookie = res.cookies.get("refreshToken");

    expect(accessCookie).toBeDefined();
    expect(refreshCookie).toBeDefined();
    expect(accessCookie?.value.length).toBeGreaterThan(10);
    expect(refreshCookie?.value.length).toBeGreaterThan(10);
  });
});
