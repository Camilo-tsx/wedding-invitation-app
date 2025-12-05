import { NextRequest } from "next/server";
import * as valibot from "valibot";

// Mocks ANTES de los imports
jest.mock("valibot", () => ({
  ...jest.requireActual("valibot"),
  safeParse: jest.fn(),
}));

jest.mock("@/core/services/guest/service", () => ({
  addGuest: jest.fn(),
}));

// Imports DESPUÉS de los mocks
import { POST } from "@/app/api/guest/route";
import { addGuest } from "@/core/services/guest/service";

describe("POST /api/guest", () => {
  const mockEventId = "event-123";

  const validGuestData = {
    eventId: mockEventId,
    name: "Juan Pérez",
    email: "juan@mail.com",
    phone: "+598 99 123 456",
    confirmationStatus: "pending",
    plusOne: false,
  };

  const validGuestDataWithoutEventId = {
    name: "Juan Pérez",
    email: "juan@mail.com",
    phone: "+598 99 123 456",
    confirmationStatus: "pending",
    plusOne: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.log para evitar ruido en los tests
    jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Validación de datos", () => {
    it("devuelve 400 si el body no pasa la validación (falta name)", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: false,
        issues: [{ path: "name", message: "Name is required" }],
      });

      const req = {
        json: jest.fn().mockResolvedValue({
          eventId: mockEventId,
          email: "test@mail.com",
        }),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({
        message: "Bad Request",
        error: [{ path: "name", message: "Name is required" }],
      });
    });

    it("devuelve 400 si el email es inválido", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: false,
        issues: [{ path: "email", message: "Invalid email format" }],
      });

      const req = {
        json: jest.fn().mockResolvedValue({
          eventId: mockEventId,
          name: "Juan",
          email: "invalid-email",
        }),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("Bad Request");
      expect(json.error).toBeDefined();
    });

    it("devuelve 400 si falta el eventId", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validGuestDataWithoutEventId,
      });

      (addGuest as jest.Mock).mockResolvedValue(null);

      const req = {
        json: jest.fn().mockResolvedValue({
          name: "Juan Pérez",
          email: "juan@mail.com",
          // Falta eventId
        }),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Guest Can Not Be Created" });
    });

    it("devuelve 400 si confirmationStatus tiene valor inválido", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: false,
        issues: [
          {
            path: "confirmationStatus",
            message: "Invalid confirmation status",
          },
        ],
      });

      const req = {
        json: jest.fn().mockResolvedValue({
          eventId: mockEventId,
          name: "Juan",
          email: "juan@mail.com",
          confirmationStatus: "invalid-status",
        }),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("Bad Request");
    });

    it("devuelve 400 si plusOne no es booleano", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: false,
        issues: [{ path: "plusOne", message: "plusOne must be boolean" }],
      });

      const req = {
        json: jest.fn().mockResolvedValue({
          eventId: mockEventId,
          name: "Juan",
          email: "juan@mail.com",
          plusOne: "yes", // Debería ser boolean
        }),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("Bad Request");
    });
  });

  describe("Creación exitosa", () => {
    it("crea un invitado correctamente y devuelve 201", async () => {
      const mockCreatedGuest = {
        id: "guest-123",
        ...validGuestData,
        createdAt: new Date().toISOString(),
      };

      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validGuestDataWithoutEventId,
      });

      (addGuest as jest.Mock).mockResolvedValue(mockCreatedGuest);

      const req = {
        json: jest.fn().mockResolvedValue(validGuestData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json).toEqual(mockCreatedGuest);
      expect(addGuest).toHaveBeenCalledWith({
        ...validGuestDataWithoutEventId,
        eventId: mockEventId,
      });
      expect(addGuest).toHaveBeenCalledTimes(1);
    });

    it("incluye el header Content-Type correcto", async () => {
      const mockCreatedGuest = {
        id: "guest-123",
        ...validGuestData,
      };

      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validGuestDataWithoutEventId,
      });

      (addGuest as jest.Mock).mockResolvedValue(mockCreatedGuest);

      const req = {
        json: jest.fn().mockResolvedValue(validGuestData),
      } as unknown as NextRequest;

      const res = await POST(req);

      expect(res.headers.get("Content-Type")).toBe("application/json");
    });

    it("separa correctamente el eventId del resto de los datos", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validGuestDataWithoutEventId,
      });

      (addGuest as jest.Mock).mockResolvedValue({
        id: "guest-123",
        ...validGuestData,
      });

      const req = {
        json: jest.fn().mockResolvedValue(validGuestData),
      } as unknown as NextRequest;

      await POST(req);

      // Verificar que valibot.safeParse recibió los datos SIN eventId
      expect(valibot.safeParse).toHaveBeenCalledWith(
        expect.anything(),
        validGuestDataWithoutEventId
      );

      // Verificar que addGuest recibió los datos CON eventId
      expect(addGuest).toHaveBeenCalledWith({
        ...validGuestDataWithoutEventId,
        eventId: mockEventId,
      });
    });

    it("crea invitado con plusOne=true correctamente", async () => {
      const guestWithPlusOne = {
        ...validGuestData,
        plusOne: true,
      };

      const guestWithPlusOneWithoutEventId = {
        ...validGuestDataWithoutEventId,
        plusOne: true,
      };

      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: guestWithPlusOneWithoutEventId,
      });

      (addGuest as jest.Mock).mockResolvedValue({
        id: "guest-123",
        ...guestWithPlusOne,
      });

      const req = {
        json: jest.fn().mockResolvedValue(guestWithPlusOne),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.plusOne).toBe(true);
    });

    it("crea invitado con todos los campos opcionales", async () => {
      const completeGuestData = {
        eventId: mockEventId,
        name: "María González",
        email: "maria@mail.com",
        phone: "+598 99 987 654",
        confirmationStatus: "confirmed",
        plusOne: true,
        dietaryRestrictions: "Vegetariano",
        tableNumber: 5,
        notes: "Llegará tarde",
      };

      const { eventId, ...dataWithoutEventId } = completeGuestData;

      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: dataWithoutEventId,
      });

      (addGuest as jest.Mock).mockResolvedValue({
        id: "guest-456",
        ...completeGuestData,
      });

      const req = {
        json: jest.fn().mockResolvedValue(completeGuestData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json).toMatchObject({
        name: "María González",
        dietaryRestrictions: "Vegetariano",
        tableNumber: 5,
        notes: "Llegará tarde",
      });
    });
  });

  describe("Errores en la creación", () => {
    it("devuelve 400 si addGuest retorna null", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validGuestDataWithoutEventId,
      });

      (addGuest as jest.Mock).mockResolvedValue(null);

      const req = {
        json: jest.fn().mockResolvedValue(validGuestData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Guest Can Not Be Created" });
    });

    it("devuelve el mensaje de error si addGuest lanza un Error", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validGuestDataWithoutEventId,
      });

      (addGuest as jest.Mock).mockRejectedValue(
        new Error("Event does not exist")
      );

      const req = {
        json: jest.fn().mockResolvedValue(validGuestData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(json).toEqual({ message: "Event does not exist" });
    });

    it("devuelve 500 si addGuest lanza un error no-Error", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validGuestDataWithoutEventId,
      });

      (addGuest as jest.Mock).mockRejectedValue("Unknown error");

      const req = {
        json: jest.fn().mockResolvedValue(validGuestData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toEqual({ message: "Internal Server Error" });
    });

    it("devuelve error si el eventId no existe", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validGuestDataWithoutEventId,
      });

      (addGuest as jest.Mock).mockRejectedValue(
        new Error("Event with ID event-999 not found")
      );

      const invalidEventData = {
        ...validGuestData,
        eventId: "event-999",
      };

      const req = {
        json: jest.fn().mockResolvedValue(invalidEventData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(json.message).toContain("not found");
    });

    it("devuelve error si hay duplicado de email en el evento", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validGuestDataWithoutEventId,
      });

      (addGuest as jest.Mock).mockRejectedValue(
        new Error("Guest with this email already exists in this event")
      );

      const req = {
        json: jest.fn().mockResolvedValue(validGuestData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(json.message).toContain("already exists");
    });

    it("maneja errores de base de datos correctamente", async () => {
      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: validGuestDataWithoutEventId,
      });

      (addGuest as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const req = {
        json: jest.fn().mockResolvedValue(validGuestData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(json).toEqual({ message: "Database connection failed" });
    });
  });

  describe("Casos edge", () => {
    it("maneja correctamente nombres con caracteres especiales", async () => {
      const specialNameData = {
        ...validGuestData,
        name: "José María O'Connor-García",
      };

      const { eventId, ...dataWithoutEventId } = specialNameData;

      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: dataWithoutEventId,
      });

      (addGuest as jest.Mock).mockResolvedValue({
        id: "guest-123",
        ...specialNameData,
      });

      const req = {
        json: jest.fn().mockResolvedValue(specialNameData),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.name).toBe("José María O'Connor-García");
    });

    it("maneja correctamente teléfonos con diferentes formatos", async () => {
      const phoneFormats = [
        "+598 99 123 456",
        "099123456",
        "+1 (555) 123-4567",
      ];

      for (const phone of phoneFormats) {
        const guestData = {
          ...validGuestData,
          phone,
        };

        const { eventId, ...dataWithoutEventId } = guestData;

        (valibot.safeParse as jest.Mock).mockReturnValue({
          success: true,
          output: dataWithoutEventId,
        });

        (addGuest as jest.Mock).mockResolvedValue({
          id: `guest-${phone}`,
          ...guestData,
        });

        const req = {
          json: jest.fn().mockResolvedValue(guestData),
        } as unknown as NextRequest;

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(201);
        expect(json.phone).toBe(phone);
      }
    });

    it("permite crear invitado sin email si es opcional", async () => {
      const guestWithoutEmail = {
        eventId: mockEventId,
        name: "Juan Sin Email",
        phone: "+598 99 123 456",
        confirmationStatus: "pending",
        plusOne: false,
      };

      const { eventId, ...dataWithoutEventId } = guestWithoutEmail;

      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: dataWithoutEventId,
      });

      (addGuest as jest.Mock).mockResolvedValue({
        id: "guest-123",
        ...guestWithoutEmail,
      });

      const req = {
        json: jest.fn().mockResolvedValue(guestWithoutEmail),
      } as unknown as NextRequest;

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.email).toBeUndefined();
    });

    it("maneja correctamente espacios en blanco en el nombre", async () => {
      const guestWithSpaces = {
        ...validGuestData,
        name: "  Juan   Pérez  ",
      };

      const { eventId, ...dataWithoutEventId } = guestWithSpaces;

      (valibot.safeParse as jest.Mock).mockReturnValue({
        success: true,
        output: dataWithoutEventId,
      });

      (addGuest as jest.Mock).mockResolvedValue({
        id: "guest-123",
        ...guestWithSpaces,
      });

      const req = {
        json: jest.fn().mockResolvedValue(guestWithSpaces),
      } as unknown as NextRequest;

      await POST(req);

      expect(addGuest).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "  Juan   Pérez  ",
        })
      );
    });
  });
});
