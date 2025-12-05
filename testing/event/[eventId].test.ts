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

jest.mock("@/core/services/event/service", () => ({
  editEvent: jest.fn(),
}));

// Imports DESPUÉS de los mocks
import { PATCH } from "@/app/api/event/[eventId]/route";
import { verifyAccessToken } from "@/core/services/auth/authenticateToken";
import { editEvent } from "@/core/services/event/service";

describe("PATCH /api/event/[eventId]", () => {
  const mockEventId = "event-123";
  const mockUserId = "user-456";
  const mockAccessToken = "valid.access.token";
  const mockPayload = {
    id: mockUserId,
    email: "test@mail.com",
    roles: ["user"],
    userName: "testUser",
    isAllowed: true,
  };

  const validPartialEventData = {
    title: "Boda Actualizada",
    location: "Nueva Ubicación",
  };

  const mockParams = {
    params: {
      eventId: mockEventId,
    },
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

      const res = await PATCH(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toEqual({
        error: "No estas autorizado a realizar esta acción",
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

      const res = await PATCH(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Can not get the payload" });
      expect(verifyAccessToken).toHaveBeenCalledWith(mockAccessToken);
    });

    it("devuelve 401 si el token está expirado", async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(null);

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: "expired.token" }),
        },
        json: jest.fn(),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(400);
    });
  });

  describe("Validación de datos", () => {
    it("devuelve 400 si el body no pasa la validación", async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: false,
        issues: [{ path: "date", message: "Invalid date format" }],
      });

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue({ date: "invalid-date" }),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({
        message: "Validation Error",
        error: [{ path: "date", message: "Invalid date format" }],
      });
    });

    it("permite actualizar solo algunos campos (partial)", async () => {
      const mockUpdatedEvent = {
        id: mockEventId,
        userId: mockUserId,
        title: "Boda Actualizada",
        date: "2025-12-25T18:00:00Z",
        location: "Nueva Ubicación",
        description: "Descripción original",
        dressCode: "Formal",
      };

      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validPartialEventData,
      });
      (editEvent as jest.Mock).mockResolvedValue(mockUpdatedEvent);

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue(validPartialEventData),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual(mockUpdatedEvent);
      expect(editEvent).toHaveBeenCalledWith(
        mockEventId,
        validPartialEventData,
        mockUserId
      );
    });

    it("rechaza campos inválidos o no permitidos", async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: false,
        issues: [{ path: "invalidField", message: "Field not allowed" }],
      });

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest
          .fn()
          .mockResolvedValue({ invalidField: "some value", title: "Valid" }),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("Validation Error");
    });
  });

  describe("Edición exitosa", () => {
    it("edita un evento correctamente y devuelve 200", async () => {
      const mockUpdatedEvent = {
        id: mockEventId,
        userId: mockUserId,
        title: "Boda Actualizada",
        date: "2025-12-25T18:00:00Z",
        location: "Nueva Ubicación",
        description: "Nueva descripción",
        dressCode: "Semi-formal",
      };

      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: {
          title: "Boda Actualizada",
          location: "Nueva Ubicación",
          description: "Nueva descripción",
          dressCode: "Semi-formal",
        },
      });
      (editEvent as jest.Mock).mockResolvedValue(mockUpdatedEvent);

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue({
          title: "Boda Actualizada",
          location: "Nueva Ubicación",
          description: "Nueva descripción",
          dressCode: "Semi-formal",
        }),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual(mockUpdatedEvent);
      expect(editEvent).toHaveBeenCalledWith(
        mockEventId,
        expect.objectContaining({
          title: "Boda Actualizada",
          location: "Nueva Ubicación",
        }),
        mockUserId
      );
    });

    it("incluye el header Content-Type correcto", async () => {
      const mockUpdatedEvent = {
        id: mockEventId,
        userId: mockUserId,
        title: "Evento",
      };

      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: { title: "Evento" },
      });
      (editEvent as jest.Mock).mockResolvedValue(mockUpdatedEvent);

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue({ title: "Evento" }),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);

      expect(res.headers.get("Content-Type")).toBe("application/json");
    });

    it("usa el eventId de los params correctamente", async () => {
      const differentEventId = "event-999";
      const customParams = {
        params: {
          eventId: differentEventId,
        },
      };

      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: { title: "Updated" },
      });
      (editEvent as jest.Mock).mockResolvedValue({
        id: differentEventId,
        title: "Updated",
      });

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue({ title: "Updated" }),
      } as unknown as NextRequest;

      await PATCH(req, customParams);

      expect(editEvent).toHaveBeenCalledWith(
        differentEventId,
        expect.any(Object),
        mockUserId
      );
    });
  });

  describe("Errores en la edición", () => {
    it("devuelve 404 si el evento no existe", async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validPartialEventData,
      });
      (editEvent as jest.Mock).mockResolvedValue(null);

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue(validPartialEventData),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json).toEqual({
        error: "El evento que estas intentando editar no existe",
      });
    });

    it("devuelve 404 si el usuario no es dueño del evento", async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validPartialEventData,
      });
      // editEvent retorna null cuando el usuario no es dueño
      (editEvent as jest.Mock).mockResolvedValue(null);

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue(validPartialEventData),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(404);
    });

    it("devuelve el mensaje de error si editEvent lanza un Error", async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validPartialEventData,
      });
      (editEvent as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue(validPartialEventData),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);
      const json = await res.json();

      expect(json).toEqual({ message: "Database connection failed" });
    });

    it("devuelve 500 si editEvent lanza un error no-Error", async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validPartialEventData,
      });
      (editEvent as jest.Mock).mockRejectedValue("Unknown error");

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue(validPartialEventData),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toEqual({ message: "Internar Server Error" }); // Mantuve tu typo
    });
  });

  describe("Casos edge", () => {
    it("maneja correctamente eventId con caracteres especiales", async () => {
      const specialEventId = "event-abc-123-xyz";
      const specialParams = {
        params: {
          eventId: specialEventId,
        },
      };

      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: { title: "Test" },
      });
      (editEvent as jest.Mock).mockResolvedValue({
        id: specialEventId,
        title: "Test",
      });

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue({ title: "Test" }),
      } as unknown as NextRequest;

      await PATCH(req, specialParams);

      expect(editEvent).toHaveBeenCalledWith(
        specialEventId,
        expect.any(Object),
        mockUserId
      );
    });

    it("permite actualizar solo la fecha", async () => {
      const dateOnlyUpdate = { date: "2026-06-15T20:00:00Z" };

      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: dateOnlyUpdate,
      });
      (editEvent as jest.Mock).mockResolvedValue({
        id: mockEventId,
        ...dateOnlyUpdate,
      });

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue(dateOnlyUpdate),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);

      expect(res.status).toBe(200);
      expect(editEvent).toHaveBeenCalledWith(
        mockEventId,
        dateOnlyUpdate,
        mockUserId
      );
    });

    it("no permite cambiar el userId del evento", async () => {
      const maliciousData = {
        title: "Updated",
        userId: "different-user-id", // Intento de cambiar el dueño
      };

      (verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: false,
        issues: [{ path: "userId", message: "Cannot modify userId" }],
      });

      const req = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: mockAccessToken }),
        },
        json: jest.fn().mockResolvedValue(maliciousData),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);

      expect(res.status).toBe(400);
    });
  });
});
