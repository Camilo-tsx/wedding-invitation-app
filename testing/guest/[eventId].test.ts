import { NextRequest, NextResponse } from "next/server";

// Mocks ANTES de los imports
jest.mock("@/core/services/guest/service", () => ({
  updateGuest: jest.fn(),
  getAllGuest: jest.fn(),
}));

jest.mock("@/core/services/auth/requireAuth", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/core/services/event/service", () => ({
  checkOwner: jest.fn(),
}));

jest.mock("valibot", () => {
  const actual = jest.requireActual("valibot");
  return {
    ...actual,
    safeParse: jest.fn(),
  };
});

// Imports DESPUÉS de los mocks
import { PATCH, GET } from "@/app/api/guest/[id]/[eventId]/route";
import { updateGuest, getAllGuest } from "@/core/services/guest/service";
import { requireAuth } from "@/core/services/auth/requireAuth";
import { checkOwner } from "@/core/services/event/service";
import { safeParse } from "valibot";

describe("PATCH /api/guest/[id]/[eventId]", () => {
  const mockGuestId = "guest-123";
  const mockEventId = "event-456";
  const mockParams = {
    params: {
      id: mockGuestId,
      eventId: mockEventId,
    },
  };

  const mockGuestData = {
    name: "Juan Pérez",
    email: "juan@example.com",
    confirmed: true,
  };

  const mockUpdatedGuest = {
    id: mockGuestId,
    ...mockGuestData,
    eventId: mockEventId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Actualización exitosa", () => {
    it("actualiza el invitado correctamente y devuelve 200", async () => {
      (safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: mockGuestData,
      });
      (updateGuest as jest.Mock).mockResolvedValue(mockUpdatedGuest);

      const req = {
        json: jest.fn().mockResolvedValue(mockGuestData),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual(mockUpdatedGuest);
      expect(updateGuest).toHaveBeenCalledWith(
        { ...mockGuestData, id: mockGuestId },
        mockEventId
      );
      expect(updateGuest).toHaveBeenCalledTimes(1);
    });

    it("incluye el header Content-Type correcto en la respuesta", async () => {
      (safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: mockGuestData,
      });
      (updateGuest as jest.Mock).mockResolvedValue(mockUpdatedGuest);

      const req = {
        json: jest.fn().mockResolvedValue(mockGuestData),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);

      expect(res.headers.get("Content-Type")).toBe("application/json");
    });

    it("actualiza solo campos parciales del invitado", async () => {
      const partialData = { name: "Nuevo Nombre" };
      (safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: partialData,
      });
      (updateGuest as jest.Mock).mockResolvedValue({
        ...mockUpdatedGuest,
        name: "Nuevo Nombre",
      });

      const req = {
        json: jest.fn().mockResolvedValue(partialData),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);

      expect(res.status).toBe(200);
      expect(updateGuest).toHaveBeenCalledWith(
        { ...partialData, id: mockGuestId },
        mockEventId
      );
    });
  });

  describe("Validación", () => {
    it("devuelve 400 si el body no cumple con el schema", async () => {
      const invalidData = { invalidField: "value" };
      (safeParse as jest.Mock).mockReturnValue({
        success: false,
        issues: [{ message: "Invalid field" }],
      });

      const req = {
        json: jest.fn().mockResolvedValue(invalidData),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("Bad Request");
      expect(json.error).toEqual([{ message: "Invalid field" }]);
      expect(updateGuest).not.toHaveBeenCalled();
    });

    it("devuelve 400 con múltiples errores de validación", async () => {
      (safeParse as jest.Mock).mockReturnValue({
        success: false,
        issues: [
          { message: "Invalid email format" },
          { message: "Name is required" },
        ],
      });

      const req = {
        json: jest.fn().mockResolvedValue({}),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toHaveLength(2);
    });
  });

  describe("Casos de error", () => {
    it("devuelve 404 si el invitado no existe", async () => {
      (safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: mockGuestData,
      });
      (updateGuest as jest.Mock).mockResolvedValue(null);

      const req = {
        json: jest.fn().mockResolvedValue(mockGuestData),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json).toEqual({ message: "Guest not found" });
    });

    it("devuelve 500 si updateGuest lanza un Error", async () => {
      (safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: mockGuestData,
      });
      (updateGuest as jest.Mock).mockRejectedValue(new Error("Database error"));

      const req = {
        json: jest.fn().mockResolvedValue(mockGuestData),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toEqual({ message: "An error has ocurred" });
    });

    it("devuelve 500 si updateGuest lanza un error no-Error", async () => {
      (safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: mockGuestData,
      });
      (updateGuest as jest.Mock).mockRejectedValue("Unknown error");

      const req = {
        json: jest.fn().mockResolvedValue(mockGuestData),
      } as unknown as NextRequest;

      const res = await PATCH(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toEqual({ message: "Internal Server Error" });
    });

    it("maneja errores al parsear el JSON del body", async () => {
      const req = {
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      } as unknown as NextRequest;

      await expect(PATCH(req, mockParams)).rejects.toThrow("Invalid JSON");
    });
  });

  describe("Parámetros", () => {
    it("usa correctamente los IDs de los parámetros", async () => {
      const customParams = {
        params: {
          id: "guest-999",
          eventId: "event-888",
        },
      };

      (safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: mockGuestData,
      });
      (updateGuest as jest.Mock).mockResolvedValue(mockUpdatedGuest);

      const req = {
        json: jest.fn().mockResolvedValue(mockGuestData),
      } as unknown as NextRequest;

      await PATCH(req, customParams);

      expect(updateGuest).toHaveBeenCalledWith(
        { ...mockGuestData, id: "guest-999" },
        "event-888"
      );
    });
  });
});

describe("GET /api/guest/[id]/[eventId]", () => {
  const mockEventId = "event-456";
  const mockUserId = "user-123";
  const mockParams = {
    params: {
      eventId: mockEventId,
    },
  };

  const mockUser = {
    id: mockUserId,
    email: "user@example.com",
    name: "Test User",
  };

  const mockGuests = [
    {
      id: "guest-1",
      name: "Guest 1",
      email: "guest1@example.com",
      eventId: mockEventId,
    },
    {
      id: "guest-2",
      name: "Guest 2",
      email: "guest2@example.com",
      eventId: mockEventId,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Obtención exitosa", () => {
    it("devuelve todos los invitados correctamente con status 200", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        user: mockUser,
        newAccessToken: null,
      });
      (checkOwner as jest.Mock).mockResolvedValue(true);
      (getAllGuest as jest.Mock).mockResolvedValue(mockGuests);

      const req = {} as Request;
      const res = await GET(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual(mockGuests);
      expect(getAllGuest).toHaveBeenCalledWith(mockEventId);
      expect(checkOwner).toHaveBeenCalledWith(mockUserId, mockEventId);
    });

    it("devuelve array vacío cuando no hay invitados", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        user: mockUser,
        newAccessToken: null,
      });
      (checkOwner as jest.Mock).mockResolvedValue(true);
      (getAllGuest as jest.Mock).mockResolvedValue([]);

      const req = {} as Request;
      const res = await GET(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual([]);
      expect(getAllGuest).toHaveBeenCalledWith(mockEventId);
    });

    it("establece nueva cookie de accessToken si se proporciona", async () => {
      const newAccessToken = "new-token-123";
      (requireAuth as jest.Mock).mockResolvedValue({
        user: mockUser,
        newAccessToken,
      });
      (checkOwner as jest.Mock).mockResolvedValue(true);
      (getAllGuest as jest.Mock).mockResolvedValue(mockGuests);

      const req = {} as Request;
      const res = await GET(req, mockParams);

      const cookies = res.cookies.getAll();
      const accessTokenCookie = cookies.find((c) => c.name === "accessToken");

      expect(accessTokenCookie).toBeDefined();
      expect(accessTokenCookie?.value).toBe(newAccessToken);
    });
  });

  describe("Autenticación y autorización", () => {
    it("devuelve 401 si no hay usuario autenticado", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        user: null,
        newAccessToken: null,
      });

      const req = {} as Request;
      const res = await GET(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toEqual({ message: "Unauthorized" });
      expect(checkOwner).not.toHaveBeenCalled();
      expect(getAllGuest).not.toHaveBeenCalled();
    });

    it("devuelve 403 si el usuario no es propietario del evento", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        user: mockUser,
        newAccessToken: null,
      });
      (checkOwner as jest.Mock).mockResolvedValue(false);

      const req = {} as Request;
      const res = await GET(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json).toEqual({ message: "Forbidden" });
      expect(getAllGuest).not.toHaveBeenCalled();
    });
  });

  describe("Casos de error", () => {
    it("devuelve 404 si getAllGuest devuelve null", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        user: mockUser,
        newAccessToken: null,
      });
      (checkOwner as jest.Mock).mockResolvedValue(true);
      (getAllGuest as jest.Mock).mockResolvedValue(null);

      const req = {} as Request;
      const res = await GET(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json).toEqual({
        message: "Unable to retrieve guest or event not found",
      });
    });

    it("devuelve 500 si getAllGuest lanza un Error", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        user: mockUser,
        newAccessToken: null,
      });
      (checkOwner as jest.Mock).mockResolvedValue(true);
      (getAllGuest as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const req = {} as Request;
      const res = await GET(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toEqual({ message: "Database connection failed" });
    });

    it("devuelve 500 si getAllGuest lanza un error no-Error", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        user: mockUser,
        newAccessToken: null,
      });
      (checkOwner as jest.Mock).mockResolvedValue(true);
      (getAllGuest as jest.Mock).mockRejectedValue("Unknown error");

      const req = {} as Request;
      const res = await GET(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toEqual({ message: "Internal Server Error" });
      expect(res.headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("Casos edge", () => {
    it("maneja correctamente un array grande de invitados", async () => {
      const manyGuests = Array.from({ length: 100 }, (_, i) => ({
        id: `guest-${i}`,
        name: `Guest ${i}`,
        email: `guest${i}@example.com`,
        eventId: mockEventId,
      }));

      (requireAuth as jest.Mock).mockResolvedValue({
        user: mockUser,
        newAccessToken: null,
      });
      (checkOwner as jest.Mock).mockResolvedValue(true);
      (getAllGuest as jest.Mock).mockResolvedValue(manyGuests);

      const req = {} as Request;
      const res = await GET(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toHaveLength(100);
    });

    it("no establece cookie si newAccessToken es null", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        user: mockUser,
        newAccessToken: null,
      });
      (checkOwner as jest.Mock).mockResolvedValue(true);
      (getAllGuest as jest.Mock).mockResolvedValue(mockGuests);

      const req = {} as Request;
      const res = await GET(req, mockParams);

      const cookies = res.cookies.getAll();
      const accessTokenCookie = cookies.find((c) => c.name === "accessToken");

      expect(accessTokenCookie).toBeUndefined();
    });

    it("maneja correctamente eventId con diferentes formatos", async () => {
      const uuidEventId = "550e8400-e29b-41d4-a716-446655440000";
      const customParams = {
        params: {
          eventId: uuidEventId,
        },
      };

      (requireAuth as jest.Mock).mockResolvedValue({
        user: mockUser,
        newAccessToken: null,
      });
      (checkOwner as jest.Mock).mockResolvedValue(true);
      (getAllGuest as jest.Mock).mockResolvedValue(mockGuests);

      const req = {} as Request;
      await GET(req, customParams);

      expect(checkOwner).toHaveBeenCalledWith(mockUserId, uuidEventId);
      expect(getAllGuest).toHaveBeenCalledWith(uuidEventId);
    });
  });

  describe("Flujo completo", () => {
    it("ejecuta el flujo completo de autenticación, autorización y obtención de datos", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        user: mockUser,
        newAccessToken: "new-token",
      });
      (checkOwner as jest.Mock).mockResolvedValue(true);
      (getAllGuest as jest.Mock).mockResolvedValue(mockGuests);

      const req = {} as Request;
      const res = await GET(req, mockParams);
      const json = await res.json();

      expect(requireAuth).toHaveBeenCalledTimes(1);
      expect(checkOwner).toHaveBeenCalledTimes(1);
      expect(getAllGuest).toHaveBeenCalledTimes(1);

      expect(res.status).toBe(200);
      expect(json).toEqual(mockGuests);

      const cookies = res.cookies.getAll();
      expect(cookies.some((c) => c.name === "accessToken")).toBe(true);
    });
  });
});
