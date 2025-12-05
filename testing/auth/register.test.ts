// __tests__/integration/api/auth/register.test.ts
import { NextRequest } from "next/server";
import * as valibot from "valibot";

// Mocks ANTES de los imports
jest.mock("valibot", () => ({
  ...jest.requireActual("valibot"),
  safeParse: jest.fn(),
}));

jest.mock("@/core/services/user/service", () => ({
  registerAndLogin: jest.fn(),
}));

// Imports DESPUÉS de los mocks
import { POST } from "@/app/api/auth/register/route";
import { registerAndLogin } from "@/core/services/user/service";
import { NextResponse } from "next/server";

describe("POST /api/auth/register", () => {
  const validUserData = {
    email: "newuser@mail.com",
    password: "SecurePass123!",
    userName: "newuser",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Validación de datos", () => {
    it("devuelve 400 si el body no pasa la validación (falta email)", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: false,
      });

      const req = {
        json: jest.fn().mockResolvedValue({
          password: "password123",
          userName: "user",
        }),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Bad Request" });
    });

    it("devuelve 400 si el body no pasa la validación (falta password)", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: false,
      });

      const req = {
        json: jest.fn().mockResolvedValue({
          email: "test@mail.com",
          userName: "user",
        }),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Bad Request" });
    });

    it("devuelve 400 si el body no pasa la validación (falta userName)", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: false,
      });

      const req = {
        json: jest.fn().mockResolvedValue({
          email: "test@mail.com",
          password: "password123",
        }),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Bad Request" });
    });

    it("devuelve 400 si el email es inválido", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: false,
      });

      const req = {
        json: jest.fn().mockResolvedValue({
          email: "invalid-email",
          password: "password123",
          userName: "user",
        }),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Bad Request" });
    });

    it("devuelve 400 si el password es muy corto", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: false,
      });

      const req = {
        json: jest.fn().mockResolvedValue({
          email: "test@mail.com",
          password: "123",
          userName: "user",
        }),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Bad Request" });
    });
  });

  describe("Registro exitoso", () => {
    it("devuelve la respuesta de registerAndLogin si el registro es exitoso", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validUserData,
      });

      const mockSuccessResponse = NextResponse.json(
        {
          message: "Usuario registrado exitosamente",
          user: {
            id: "1",
            email: validUserData.email,
            userName: validUserData.userName,
          },
        },
        { status: 201 }
      );

      (registerAndLogin as jest.Mock).mockResolvedValue(mockSuccessResponse);

      const req = {
        json: jest.fn().mockResolvedValue(validUserData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json).toEqual({
        message: "Usuario registrado exitosamente",
        user: {
          id: "1",
          email: validUserData.email,
          userName: validUserData.userName,
        },
      });

      // Verificar que se llamó registerAndLogin con los parámetros correctos
      expect(registerAndLogin).toHaveBeenCalledWith(
        validUserData.email,
        validUserData.password,
        validUserData.userName
      );
      expect(registerAndLogin).toHaveBeenCalledTimes(1);
    });

    it("setea las cookies de autenticación después del registro", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validUserData,
      });

      const mockResponseWithCookies = NextResponse.json(
        {
          message: "Usuario registrado exitosamente",
        },
        { status: 201 }
      );

      // Simular que se setearon cookies
      mockResponseWithCookies.cookies.set("accessToken", "mock.access.token", {
        httpOnly: true,
        secure: false,
        path: "/",
        sameSite: "strict",
        maxAge: 1800,
      });

      mockResponseWithCookies.cookies.set(
        "refreshToken",
        "mock.refresh.token",
        {
          httpOnly: true,
          secure: false,
          path: "/",
          sameSite: "strict",
          maxAge: 604800,
        }
      );

      (registerAndLogin as jest.Mock).mockResolvedValue(
        mockResponseWithCookies
      );

      const req = {
        json: jest.fn().mockResolvedValue(validUserData),
      } as unknown as NextRequest;

      const res = await POST(req);

      // Verificar que las cookies están presentes
      const accessCookie = res.cookies.get("accessToken");
      const refreshCookie = res.cookies.get("refreshToken");

      expect(accessCookie).toBeDefined();
      expect(refreshCookie).toBeDefined();
      expect(accessCookie?.value).toBe("mock.access.token");
      expect(refreshCookie?.value).toBe("mock.refresh.token");
    });
  });

  describe("Errores en el registro", () => {
    it("devuelve 500 si registerAndLogin lanza un error genérico", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validUserData,
      });

      (registerAndLogin as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const req = {
        json: jest.fn().mockResolvedValue(validUserData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toEqual({ message: "Error al registrar usuario" });
    });

    it("devuelve error si el email ya está registrado", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validUserData,
      });

      const mockErrorResponse = NextResponse.json(
        {
          error: "El email ya está registrado",
          field: "email",
        },
        { status: 409 }
      );

      (registerAndLogin as jest.Mock).mockResolvedValue(mockErrorResponse);

      const req = {
        json: jest.fn().mockResolvedValue(validUserData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json).toEqual({
        error: "El email ya está registrado",
        field: "email",
      });
    });

    it("devuelve error si el userName ya está en uso", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validUserData,
      });

      const mockErrorResponse = NextResponse.json(
        {
          error: "El nombre de usuario ya está en uso",
          field: "userName",
        },
        { status: 409 }
      );

      (registerAndLogin as jest.Mock).mockResolvedValue(mockErrorResponse);

      const req = {
        json: jest.fn().mockResolvedValue(validUserData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json).toEqual({
        error: "El nombre de usuario ya está en uso",
        field: "userName",
      });
    });

    it("maneja errores de conexión a la base de datos", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validUserData,
      });

      (registerAndLogin as jest.Mock).mockRejectedValue(
        new Error("ECONNREFUSED")
      );

      const req = {
        json: jest.fn().mockResolvedValue(validUserData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toEqual({ message: "Error al registrar usuario" });
    });
  });

  describe("Casos edge", () => {
    it("maneja correctamente espacios en blanco en userName", async () => {
      const dataWithSpaces = {
        ...validUserData,
        userName: "  newuser  ",
      };

      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: dataWithSpaces,
      });

      const mockSuccessResponse = NextResponse.json(
        { message: "Usuario registrado exitosamente" },
        { status: 201 }
      );

      (registerAndLogin as jest.Mock).mockResolvedValue(mockSuccessResponse);

      const req = {
        json: jest.fn().mockResolvedValue(dataWithSpaces),
      } as unknown as NextRequest;

      await POST(req);

      expect(registerAndLogin).toHaveBeenCalledWith(
        dataWithSpaces.email,
        dataWithSpaces.password,
        dataWithSpaces.userName
      );
    });

    it("maneja correctamente emails con mayúsculas", async () => {
      const dataWithUppercase = {
        ...validUserData,
        email: "NewUser@MAIL.COM",
      };

      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: dataWithUppercase,
      });

      const mockSuccessResponse = NextResponse.json(
        { message: "Usuario registrado exitosamente" },
        { status: 201 }
      );

      (registerAndLogin as jest.Mock).mockResolvedValue(mockSuccessResponse);

      const req = {
        json: jest.fn().mockResolvedValue(dataWithUppercase),
      } as unknown as NextRequest;

      await POST(req);

      expect(registerAndLogin).toHaveBeenCalledWith(
        dataWithUppercase.email,
        dataWithUppercase.password,
        dataWithUppercase.userName
      );
    });

    it("maneja correctamente passwords con caracteres especiales", async () => {
      const dataWithSpecialChars = {
        ...validUserData,
        password: "P@ssw0rd!#$%",
      };

      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: dataWithSpecialChars,
      });

      const mockSuccessResponse = NextResponse.json(
        { message: "Usuario registrado exitosamente" },
        { status: 201 }
      );

      (registerAndLogin as jest.Mock).mockResolvedValue(mockSuccessResponse);

      const req = {
        json: jest.fn().mockResolvedValue(dataWithSpecialChars),
      } as unknown as NextRequest;

      await POST(req);

      expect(registerAndLogin).toHaveBeenCalledWith(
        dataWithSpecialChars.email,
        dataWithSpecialChars.password,
        dataWithSpecialChars.userName
      );
    });
  });
});
