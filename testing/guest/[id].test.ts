import { NextRequest } from "next/server";

// Mocks ANTES de los imports
jest.mock("@/core/services/guest/service", () => ({
  deleteGuest: jest.fn(),
}));

// Imports DESPUÉS de los mocks
import { DELETE } from "@/app/api/guest/[id]/route";
import { deleteGuest } from "@/core/services/guest/service";

describe("DELETE /api/guest/[id]", () => {
  const mockGuestId = "guest-123";
  const mockParams = {
    params: {
      id: mockGuestId,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Eliminación exitosa", () => {
    it("elimina el invitado correctamente y devuelve 200", async () => {
      (deleteGuest as jest.Mock).mockResolvedValue(undefined);

      const req = {} as NextRequest;
      const res = await DELETE(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ message: "Delete Succefull" });
      expect(deleteGuest).toHaveBeenCalledWith(mockGuestId);
      expect(deleteGuest).toHaveBeenCalledTimes(1);
    });

    it("usa correctamente el ID del parámetro de la URL", async () => {
      const customParams = {
        params: {
          id: "guest-999",
        },
      };

      (deleteGuest as jest.Mock).mockResolvedValue(undefined);

      const req = {} as NextRequest;
      await DELETE(req, customParams);

      expect(deleteGuest).toHaveBeenCalledWith("guest-999");
    });

    it("elimina invitado con ID en formato UUID", async () => {
      const uuidParams = {
        params: {
          id: "550e8400-e29b-41d4-a716-446655440000",
        },
      };

      (deleteGuest as jest.Mock).mockResolvedValue(undefined);

      const req = {} as NextRequest;
      const res = await DELETE(req, uuidParams);

      expect(res.status).toBe(200);
      expect(deleteGuest).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440000"
      );
    });
  });

  describe("Validación", () => {
    it("devuelve 400 si el ID está vacío", async () => {
      const emptyIdParams = {
        params: {
          id: "",
        },
      };

      const req = {} as NextRequest;
      const res = await DELETE(req, emptyIdParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Can not delete your guest" });
      expect(deleteGuest).not.toHaveBeenCalled();
    });

    it("devuelve 400 si el ID es undefined", async () => {
      const undefinedIdParams = {
        params: {
          id: undefined as any,
        },
      };

      const req = {} as NextRequest;
      const res = await DELETE(req, undefinedIdParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Can not delete your guest" });
      expect(deleteGuest).not.toHaveBeenCalled();
    });

    it("devuelve 400 si el ID es null", async () => {
      const nullIdParams = {
        params: {
          id: null as any,
        },
      };

      const req = {} as NextRequest;
      const res = await DELETE(req, nullIdParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Can not delete your guest" });
      expect(deleteGuest).not.toHaveBeenCalled();
    });
  });

  describe("Errores", () => {
    it("devuelve 400 si el invitado no existe", async () => {
      (deleteGuest as jest.Mock).mockRejectedValue(
        new Error("Guest not found")
      );

      const req = {} as NextRequest;
      const res = await DELETE(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Guest not found" });
      expect(deleteGuest).toHaveBeenCalledWith(mockGuestId);
    });

    it("devuelve 400 si deleteGuest lanza un Error", async () => {
      (deleteGuest as jest.Mock).mockRejectedValue(
        new Error("Unauthorized to delete this guest")
      );

      const req = {} as NextRequest;
      const res = await DELETE(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Unauthorized to delete this guest" });
    });

    it("devuelve 500 si deleteGuest lanza un error no-Error", async () => {
      (deleteGuest as jest.Mock).mockRejectedValue("Unknown error");

      const req = {} as NextRequest;
      const res = await DELETE(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toEqual({ message: "Internal Server Error" });
    });

    it("maneja correctamente errores de base de datos", async () => {
      (deleteGuest as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const req = {} as NextRequest;
      const res = await DELETE(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Database connection failed" });
    });

    it("maneja correctamente errores de foreign key constraint", async () => {
      (deleteGuest as jest.Mock).mockRejectedValue(
        new Error("Cannot delete guest with existing dependencies")
      );

      const req = {} as NextRequest;
      const res = await DELETE(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toContain("Cannot delete guest");
    });

    it("devuelve error si el invitado pertenece a otro usuario/evento", async () => {
      (deleteGuest as jest.Mock).mockRejectedValue(
        new Error("You do not have permission to delete this guest")
      );

      const req = {} as NextRequest;
      const res = await DELETE(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toContain("permission");
    });
  });

  describe("Casos edge", () => {
    it("maneja correctamente IDs con caracteres especiales", async () => {
      const specialParams = {
        params: {
          id: "guest-abc-123-xyz",
        },
      };

      (deleteGuest as jest.Mock).mockResolvedValue(undefined);

      const req = {} as NextRequest;
      await DELETE(req, specialParams);

      expect(deleteGuest).toHaveBeenCalledWith("guest-abc-123-xyz");
    });

    it("maneja correctamente IDs muy largos", async () => {
      const longIdParams = {
        params: {
          id: "guest-" + "a".repeat(100),
        },
      };

      (deleteGuest as jest.Mock).mockResolvedValue(undefined);

      const req = {} as NextRequest;
      const res = await DELETE(req, longIdParams);

      expect(res.status).toBe(200);
      expect(deleteGuest).toHaveBeenCalledWith(longIdParams.params.id);
    });

    it("maneja correctamente eliminación múltiple de invitados diferentes", async () => {
      (deleteGuest as jest.Mock).mockResolvedValue(undefined);

      const req = {} as NextRequest;

      // Primer invitado
      const params1 = { params: { id: "guest-1" } };
      await DELETE(req, params1);
      expect(deleteGuest).toHaveBeenCalledWith("guest-1");

      // Segundo invitado
      const params2 = { params: { id: "guest-2" } };
      await DELETE(req, params2);
      expect(deleteGuest).toHaveBeenCalledWith("guest-2");

      // Tercer invitado
      const params3 = { params: { id: "guest-3" } };
      await DELETE(req, params3);
      expect(deleteGuest).toHaveBeenCalledWith("guest-3");

      expect(deleteGuest).toHaveBeenCalledTimes(3);
    });

    it("maneja correctamente IDs numéricos en formato string", async () => {
      const numericParams = {
        params: {
          id: "123456",
        },
      };

      (deleteGuest as jest.Mock).mockResolvedValue(undefined);

      const req = {} as NextRequest;
      const res = await DELETE(req, numericParams);

      expect(res.status).toBe(200);
      expect(deleteGuest).toHaveBeenCalledWith("123456");
    });

    it("no elimina si deleteGuest es llamado pero falla silenciosamente", async () => {
      (deleteGuest as jest.Mock).mockResolvedValue(undefined);

      const req = {} as NextRequest;
      const res = await DELETE(req, mockParams);
      const json = await res.json();

      // Aunque deleteGuest no lance error, debería responder con éxito
      expect(res.status).toBe(200);
      expect(json).toEqual({ message: "Delete Succefull" });
    });
  });

  describe("Consistencia con otros endpoints", () => {
    it("usa el mismo formato de respuesta que otros endpoints DELETE", async () => {
      (deleteGuest as jest.Mock).mockResolvedValue(undefined);

      const req = {} as NextRequest;
      const res = await DELETE(req, mockParams);
      const json = await res.json();

      // Verificar estructura de respuesta consistente
      expect(json).toHaveProperty("message");
      expect(typeof json.message).toBe("string");
    });

    it("usa status codes consistentes con otros endpoints", async () => {
      (deleteGuest as jest.Mock).mockResolvedValue(undefined);

      const req = {} as NextRequest;
      const res = await DELETE(req, mockParams);

      // 200 para DELETE exitoso (consistente con otros endpoints)
      expect(res.status).toBe(200);
    });

    it("maneja errores de la misma forma que otros endpoints", async () => {
      (deleteGuest as jest.Mock).mockRejectedValue(new Error("Test error"));

      const req = {} as NextRequest;
      const res = await DELETE(req, mockParams);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: "Test error" });
    });
  });

  describe("Comportamiento de deleteGuest", () => {
    it("no pasa parámetros adicionales a deleteGuest", async () => {
      (deleteGuest as jest.Mock).mockResolvedValue(undefined);

      const req = {} as NextRequest;
      await DELETE(req, mockParams);

      // Verificar que solo se pasa el ID, nada más
      expect(deleteGuest).toHaveBeenCalledWith(mockGuestId);
      expect(deleteGuest).toHaveBeenCalledTimes(1);
    });

    it("llama a deleteGuest solo si la validación pasa", async () => {
      const emptyIdParams = {
        params: {
          id: "",
        },
      };

      const req = {} as NextRequest;
      await DELETE(req, emptyIdParams);

      // No debería llamar a deleteGuest si el ID está vacío
      expect(deleteGuest).not.toHaveBeenCalled();
    });

    it("espera a que deleteGuest termine antes de responder", async () => {
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });

      (deleteGuest as jest.Mock).mockReturnValue(deletePromise);

      const req = {} as NextRequest;
      const deleteRequest = DELETE(req, mockParams);

      // La respuesta no debería estar lista todavía
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve("timeout"), 10)
      );
      const result = await Promise.race([deleteRequest, timeoutPromise]);
      expect(result).toBe("timeout");

      // Ahora resolvemos el delete
      resolveDelete!();
      const res = await deleteRequest;

      expect(res.status).toBe(200);
    });
  });
});
