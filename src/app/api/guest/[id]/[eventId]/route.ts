import { updateGuest } from "@/core/services/guest/service";
import { guestFieldsPartial, partialGuestSchema } from "@/schemas/guest.schema";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/services/auth/requireAuth";
import { checkOwner } from "@/core/services/event/service";
import { getAllGuest } from "@/core/services/guest/service";
import { safeParse } from "valibot";
import { PartialGuest } from "@/core/services/guest/model";

interface Params {
  params: Record<string, string>;
}

//Edit a guest
export const PATCH = async (req: NextRequest, { params }: Params) => {
  const { eventId, id } = params;

  const body = await req.json();

  const result = safeParse(guestFieldsPartial, body);
  if (!result.success) {
    return NextResponse.json(
      { message: "Bad Request", error: result.issues },
      { status: 400 }
    );
  }

  try {
    const guest: PartialGuest = { ...result.output, id };
    const updatedGuest = await updateGuest(guest, eventId);
    if (!updatedGuest)
      return NextResponse.json({ message: "Guest not found" }, { status: 404 });
    return NextResponse.json(updatedGuest, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error: ", err.message);
      return NextResponse.json(
        { message: "An error has ocurred" },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }
};

//Get all guests
export const GET = async (
  _req: Request,
  { params }: { params: { eventId: string } }
) => {
  const { eventId } = params;

  const { user, newAccessToken } = await requireAuth();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const isOwner = await checkOwner(user.id, eventId);
  if (!isOwner) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const guests = await getAllGuest(eventId);

    if (!guests) {
      return NextResponse.json(
        { message: "Unable to retrieve guest or event not found" },
        { status: 404 }
      );
    }

    if (guests.length === 0) {
      return NextResponse.json(guests, { status: 200 });
    }

    const response = NextResponse.json(guests, { status: 200 });

    if (newAccessToken) {
      response.cookies.set("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60,
      });
    }

    return response;
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 500 });
    }
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
