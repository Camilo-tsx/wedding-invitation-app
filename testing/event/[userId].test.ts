import { NextRequest } from "next/server";

// Mocks ANTES de los imports
jest.mock("@/core/services/event/service", () => ({
  getEventById: jest.fn(),
  deleteEvent: jest.fn(),
}));

// Imports DESPUÉS de los mocks
import { GET, DELETE } from "@/app/api/event/[eventId]/[userId]/route";
import { getEventById, deleteEvent } from "@/core/services/event/service";

describe("GET /api/event/[eventId]/[userId]", () => {
  const mockUserId = "user-123";
  const mockEventId = "event-456";
  const mockParams = {
    params: {
      userId: mockUserId,
      eventId: mockEventId,
    },
  };

  const mockEvent = {
    id: mockEventId,
    userId: mockUserId,
    title: "Boda de Juan y María",
    date: "2025-12-25T18:00:00Z",
    location: "Jardín Botánico",
    description: "Celebración de nuestra boda",
    dressCode: "Formal",
    createdAt: "2025-01-15T10:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Obtención exitosa", () => {
    it("devuelve el evento con status 200 si existe", async () => {
      (getEventById as jest.Mock).mockResolvedValue(mockEvent);

      const req = {} as NextRequest;
      const res = await GET(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual(mockEvent);
      expect(getEventById).toHaveBeenCalledWith(mockEventId, mockUserId);
      expect(getEventById).toHaveBeenCalledTimes(1);
    });

    it("incluye el header Content-Type correcto", async () => {
      (getEventById as jest.Mock).mockResolvedValue(mockEvent);

      const req = {} as NextRequest;
      const res = await GET(req, mockParams);

      expect(res.headers.get("Content-Type")).toBe("application/json");
    });

    it("devuelve evento con todos sus campos completos", async () => {
      const completeEvent = {
        ...mockEvent,
        guestCount: 150,
        confirmedGuests: 120,
        budget: 50000,
      };

      (getEventById as jest.Mock).mockResolvedValue(completeEvent);

      const req = {} as NextRequest;
      const res = await GET(req, mockParams);
      const json = await res.json();

      expect(json).toEqual(completeEvent);
      expect(json).toHaveProperty("guestCount");
      expect(json).toHaveProperty("confirmedGuests");
      expect(json).toHaveProperty("budget");
    });
  });

  describe("Errores", () => {
    it("devuelve 404 si el evento no existe", async () => {
      (getEventById as jest.Mock).mockResolvedValue(null);

      const req = {} as NextRequest;
      const res = await GET(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json).toEqual({ message: "Event not found" });
      expect(getEventById).toHaveBeenCalledWith(mockEventId, mockUserId);
    });

    it("devuelve 404 si el evento pertenece a otro usuario", async () => {
      (getEventById as jest.Mock).mockResolvedValue(null);

      const differentUserParams = {
        params: {
          userId: "different-user-id",
          eventId: mockEventId,
        },
      };

      const req = {} as NextRequest;
      const res = await GET(req, differentUserParams);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json).toEqual({ message: "Event not found" });
    });

    it("devuelve el mensaje de error si getEventById lanza un Error", async () => {
      (getEventById as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const req = {} as NextRequest;
      const res = await GET(req, mockParams);
      const json = await res.json();

      expect(json).toEqual({ message: "Database connection failed" });
    });

    it("devuelve 500 si getEventById lanza un error no-Error", async () => {
      (getEventById as jest.Mock).mockRejectedValue("Unknown error");

      const req = {} as NextRequest;
      const res = await GET(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toEqual({ message: "Internal Server Error" });
    });
  });

  describe("Validación de parámetros", () => {
    it("usa correctamente los parámetros de la URL", async () => {
      const customParams = {
        params: {
          userId: "user-999",
          eventId: "event-888",
        },
      };

      (getEventById as jest.Mock).mockResolvedValue({
        id: "event-888",
        userId: "user-999",
        title: "Test Event",
      });

      const req = {} as NextRequest;
      await GET(req, customParams);

      expect(getEventById).toHaveBeenCalledWith("event-888", "user-999");
    });

    it("maneja correctamente IDs con formato UUID", async () => {
      const uuidParams = {
        params: {
          userId: "550e8400-e29b-41d4-a716-446655440000",
          eventId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        },
      };

      (getEventById as jest.Mock).mockResolvedValue({
        id: uuidParams.params.eventId,
        userId: uuidParams.params.userId,
      });

      const req = {} as NextRequest;
      await GET(req, uuidParams);

      expect(getEventById).toHaveBeenCalledWith(
        uuidParams.params.eventId,
        uuidParams.params.userId
      );
    });
  });
});

describe("DELETE /api/event/[eventId]/[userId]", () => {
  const mockUserId = "user-123";
  const mockEventId = "event-456";
  const mockParams = {
    params: {
      userId: mockUserId,
      eventId: mockEventId,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Eliminación exitosa", () => {
    it("elimina el evento correctamente y devuelve 200", async () => {
      (deleteEvent as jest.Mock).mockResolvedValue(undefined);

      const req = {} as NextRequest;
      const res = await DELETE(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ message: "Event deleted successfully" });
      expect(deleteEvent).toHaveBeenCalledWith(mockEventId, mockUserId);
      expect(deleteEvent).toHaveBeenCalledTimes(1);
    });

    it("usa correctamente los parámetros de la URL", async () => {
      const customParams = {
        params: {
          userId: "user-999",
          eventId: "event-888",
        },
      };

      (deleteEvent as jest.Mock).mockResolvedValue(undefined);

      const req = {} as NextRequest;
      await DELETE(req, customParams);

      expect(deleteEvent).toHaveBeenCalledWith("event-888", "user-999");
    });
  });

  describe("Validación", () => {
    it("devuelve 400 si eventId está vacío", async () => {
      const emptyEventIdParams = {
        params: {
          userId: mockUserId,
          eventId: "",
        },
      };

      const req = {} as NextRequest;
      const res = await DELETE(req, emptyEventIdParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Can not delete your event" });
      expect(deleteEvent).not.toHaveBeenCalled();
    });

    it("devuelve 400 si eventId es undefined", async () => {
      const undefinedEventIdParams = {
        params: {
          userId: mockUserId,
          eventId: undefined as any,
        },
      };

      const req = {} as NextRequest;
      const res = await DELETE(req, undefinedEventIdParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Can not delete your event" });
      expect(deleteEvent).not.toHaveBeenCalled();
    });

    it("devuelve 400 si eventId es null", async () => {
      const nullEventIdParams = {
        params: {
          userId: mockUserId,
          eventId: null as any,
        },
      };

      const req = {} as NextRequest;
      const res = await DELETE(req, nullEventIdParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(deleteEvent).not.toHaveBeenCalled();
    });
  });

  describe("Errores", () => {
    it("devuelve 400 si deleteEvent lanza un Error", async () => {
      (deleteEvent as jest.Mock).mockRejectedValue(
        new Error("Event not found or unauthorized")
      );

      const req = {} as NextRequest;
      const res = await DELETE(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Event not found or unauthorized" });
    });

    it("devuelve 400 si el usuario no es dueño del evento", async () => {
      (deleteEvent as jest.Mock).mockRejectedValue(
        new Error("Unauthorized to delete this event")
      );

      const req = {} as NextRequest;
      const res = await DELETE(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toContain("Unauthorized");
    });

    it("devuelve 500 si deleteEvent lanza un error no-Error", async () => {
      (deleteEvent as jest.Mock).mockRejectedValue("Unknown error");

      const req = {} as NextRequest;
      const res = await DELETE(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toEqual({ message: "Internal Server Error" });
    });

    it("maneja correctamente errores de base de datos", async () => {
      (deleteEvent as jest.Mock).mockRejectedValue(
        new Error("Database connection lost")
      );

      const req = {} as NextRequest;
      const res = await DELETE(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Database connection lost" });
    });

    it("maneja correctamente errores de foreign key constraint", async () => {
      (deleteEvent as jest.Mock).mockRejectedValue(
        new Error("Cannot delete event with existing guests")
      );

      const req = {} as NextRequest;
      const res = await DELETE(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toContain("Cannot delete event");
    });
  });

  describe("Casos edge", () => {
    it("maneja correctamente IDs con caracteres especiales", async () => {
      const specialParams = {
        params: {
          userId: "user-abc-123",
          eventId: "event-xyz-789",
        },
      };

      (deleteEvent as jest.Mock).mockResolvedValue(undefined);

      const req = {} as NextRequest;
      await DELETE(req, specialParams);

      expect(deleteEvent).toHaveBeenCalledWith("event-xyz-789", "user-abc-123");
    });

    it("maneja correctamente eliminación de múltiples eventos del mismo usuario", async () => {
      (deleteEvent as jest.Mock).mockResolvedValue(undefined);

      const req = {} as NextRequest;

      // Primer evento
      await DELETE(req, mockParams);
      expect(deleteEvent).toHaveBeenCalledTimes(1);

      // Segundo evento del mismo usuario
      const secondParams = {
        params: {
          userId: mockUserId,
          eventId: "event-789",
        },
      };
      await DELETE(req, secondParams);
      expect(deleteEvent).toHaveBeenCalledTimes(2);
    });
  });
});
