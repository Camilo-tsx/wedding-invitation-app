import { NextRequest } from "next/server";
import * as valibot from "valibot";

// Mocks ANTES de los imports
jest.mock("valibot", () => ({
  ...jest.requireActual("valibot"),
  safeParse: jest.fn(),
}));

jest.mock("@/core/services/auth/authenticateToken", () => ({
  verifyAccessToken: jest.fn(),
}));

jest.mock("@/core/services/auth/requireAuth", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/core/services/event/service", () => ({
  checkPermissions: jest.fn(),
  createEvent: jest.fn(),
  getAllEvents: jest.fn(),
}));

// Imports DESPUÉS de los mocks
import { POST, GET } from "@/app/api/event/route";
import { verifyAccessToken } from "@/core/services/auth/authenticateToken";
import { requireAuth } from "@/core/services/auth/requireAuth";
import {
  checkPermissions,
  createEvent,
  getAllEvents,
} from "@/core/services/event/service";

describe("POST /api/event", () => {
  const mockUserId = "user-123";
  const mockAccessToken = "valid.access.token";
  const mockPayload = {
    id: mockUserId,
    email: "test@mail.com",
    roles: ["user"],
    userName: "testUser",
    isAllowed: true,
  };

  const validEventData = {
    title: "Boda de Juan y María",
    date: "2025-12-25T18:00:00Z",
    location: "Jardín Botánico",
    description: "Celebración de nuestra boda",
    dressCode: "Formal",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Autenticación", () => {
    it("devuelve 401 si no hay accessToken", async () => {
      const req = {
        cookies: {
          get: jest.fn().mockReturnValue(undefined),
        },
        json: jest.fn(),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toEqual({
        error: "Debes iniciar sesion para poder crear una invitación",
        field: "dressCode",
      });
    });

    it("devuelve 400 si el token no puede ser verificado", async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(null);

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn(),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({
        error: "Can not get the payload",
        field: "dressCode",
      });
      expect(verifyAccessToken).toHaveBeenCalledWith(mockAccessToken);
    });
  });

  describe("Autorización", () => {
    it("devuelve 403 si el usuario no tiene permisos (no ha pagado)", async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (checkPermissions as jest.Mock).mockResolvedValue(false);

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue(validEventData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json).toEqual({
        error: "Es necesario pagar el servicio para poder crear una invitación",
        field: "dressCode",
      });
      expect(checkPermissions).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe("Validación de datos", () => {
    it("devuelve 400 si el body no pasa la validación", async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (checkPermissions as jest.Mock).mockResolvedValue(true);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: false,
        issues: [
          { path: "title", message: "Title is required" },
          { path: "date", message: "Date must be valid" },
        ],
      });

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue({ title: "" }),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({
        message: "Validation Error",
        errors: [
          { path: "title", message: "Title is required" },
          { path: "date", message: "Date must be valid" },
        ],
      });
    });

    it("devuelve 400 si falta el título del evento", async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (checkPermissions as jest.Mock).mockResolvedValue(true);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: false,
        issues: [{ path: "title", message: "Title is required" }],
      });

      const invalidData = { ...validEventData, title: "" };

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue(invalidData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("Validation Error");
    });

    it("devuelve 400 si la fecha es inválida", async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (checkPermissions as jest.Mock).mockResolvedValue(true);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: false,
        issues: [{ path: "date", message: "Invalid date format" }],
      });

      const invalidData = { ...validEventData, date: "invalid-date" };

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue(invalidData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("Validation Error");
    });
  });

  describe("Creación exitosa", () => {
    it("crea un evento correctamente y devuelve 201", async () => {
      const mockCreatedEvent = {
        id: "event-123",
        userId: mockUserId,
        ...validEventData,
        createdAt: new Date().toISOString(),
      };

      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (checkPermissions as jest.Mock).mockResolvedValue(true);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validEventData,
      });
      (createEvent as jest.Mock).mockResolvedValue(mockCreatedEvent);

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue(validEventData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json).toEqual(mockCreatedEvent);
      expect(createEvent).toHaveBeenCalledWith(mockUserId, validEventData);
      expect(createEvent).toHaveBeenCalledTimes(1);
    });

    it("incluye el header Content-Type correcto", async () => {
      const mockCreatedEvent = {
        id: "event-123",
        userId: mockUserId,
        ...validEventData,
      };

      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (checkPermissions as jest.Mock).mockResolvedValue(true);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validEventData,
      });
      (createEvent as jest.Mock).mockResolvedValue(mockCreatedEvent);

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue(validEventData),
      } as unknown as NextRequest;

      const res = await POST(req);

      expect(res.headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("Errores en la creación", () => {
    it("devuelve 404 si createEvent retorna null", async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (checkPermissions as jest.Mock).mockResolvedValue(true);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validEventData,
      });
      (createEvent as jest.Mock).mockResolvedValue(null);

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue(validEventData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json).toEqual({ message: "Event not found" });
    });

    it("devuelve el mensaje de error si createEvent lanza un Error", async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (checkPermissions as jest.Mock).mockResolvedValue(true);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validEventData,
      });
      (createEvent as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue(validEventData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(json).toEqual({ message: "Database connection failed" });
    });

    it("devuelve 500 si createEvent lanza un error no-Error", async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (checkPermissions as jest.Mock).mockResolvedValue(true);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validEventData,
      });
      (createEvent as jest.Mock).mockRejectedValue("Unknown error");

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue(validEventData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toEqual({ message: "Internal Server Error" });
    });
  });
});

describe("GET /api/event", () => {
  const mockUserId = "user-123";
  const mockUser = {
    id: mockUserId,
    email: "test@mail.com",
    userName: "testUser",
    roles: ["user"],
    isAllowed: true,
  };

  const mockEvents = [
    {
      id: "event-1",
      userId: mockUserId,
      title: "Boda 1",
      date: "2025-12-25T18:00:00Z",
      location: "Lugar 1",
    },
    {
      id: "event-2",
      userId: mockUserId,
      title: "Boda 2",
      date: "2026-01-15T18:00:00Z",
      location: "Lugar 2",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Autenticación", () => {
    it("devuelve 401 si el usuario no está autenticado", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        user: null,
        newAccessToken: null,
      });

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toEqual({ message: "Unauthorized" });
    });
  });

  describe("Obtención exitosa", () => {
    it("devuelve todos los eventos del usuario con status 200", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        user: mockUser,
        newAccessToken: null,
      });
      (getAllEvents as jest.Mock).mockResolvedValue(mockEvents);

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({
        events: mockEvents,
        userId: mockUserId,
      });
      expect(getAllEvents).toHaveBeenCalledWith(mockUserId);
    });

    it("setea nueva cookie de accessToken si fue renovado", async () => {
      const newAccessToken = "new.access.token";

      (requireAuth as jest.Mock).mockResolvedValue({
        user: mockUser,
        newAccessToken,
      });
      (getAllEvents as jest.Mock).mockResolvedValue(mockEvents);

      const res = await GET();

      const accessCookie = res.cookies.get("accessToken");
      expect(accessCookie).toBeDefined();
      expect(accessCookie?.value).toBe(newAccessToken);
    });

    it("no setea cookie si no hay nuevo accessToken", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        user: mockUser,
        newAccessToken: null,
      });
      (getAllEvents as jest.Mock).mockResolvedValue(mockEvents);

      const res = await GET();

      const accessCookie = res.cookies.get("accessToken");
      expect(accessCookie).toBeUndefined();
    });

    it("devuelve array vacío si el usuario no tiene eventos", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        user: mockUser,
        newAccessToken: null,
      });
      (getAllEvents as jest.Mock).mockResolvedValue([]);

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.events).toEqual([]);
    });
  });

  describe("Errores", () => {
    it("devuelve 404 si getAllEvents retorna null", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        user: mockUser,
        newAccessToken: null,
      });
      (getAllEvents as jest.Mock).mockResolvedValue(null);

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json).toEqual({ message: "Not Found" });
    });

    it("devuelve 500 si getAllEvents lanza un Error", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        user: mockUser,
        newAccessToken: null,
      });
      (getAllEvents as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toEqual({ message: "Database error" });
    });

    it("devuelve 500 con mensaje genérico si el error no es instancia de Error", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        user: mockUser,
        newAccessToken: null,
      });
      (getAllEvents as jest.Mock).mockRejectedValue("Unknown error");

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toEqual({ message: "Internal Server Error" });
    });
  });
});
