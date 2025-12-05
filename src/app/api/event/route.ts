"use server";
import { verifyAccessToken } from "@/core/services/auth/authenticateToken";
import { checkPermissions, createEvent } from "@/core/services/event/service";
import { eventSchema } from "@/schemas/event.schema";
import { NextRequest, NextResponse } from "next/server";
import { safeParse } from "valibot";
import { requireAuth } from "@/core/services/auth/requireAuth";
import { getAllEvents } from "@/core/services/event/service";

//Create new event

export const POST = async (req: NextRequest) => {
  const accessToken = req.cookies.get("accessToken")?.value;
  if (!accessToken)
    return NextResponse.json(
      {
        error: "Debes iniciar sesion para poder crear una invitación",
        field: "dressCode",
      },
      { status: 401 }
    );
  const payload = verifyAccessToken(accessToken);
  if (!payload)
    return NextResponse.json(
      { error: "Can not get the payload", field: "dressCode" },
      { status: 400 }
    );
  const userId = payload.id;
  const isAuthorized = await checkPermissions(userId);
  if (!isAuthorized)
    return NextResponse.json(
      {
        error: "Es necesario pagar el servicio para poder crear una invitación",
        field: "dressCode",
      },
      { status: 403 }
    );
  const body = await req.json();
  const result = safeParse(eventSchema, body);
  if (!result.success) {
    return NextResponse.json(
      { message: "Validation Error", errors: result.issues },
      { status: 400 }
    );
  }

  const event = result.output;

  try {
    const newEvent = await createEvent(userId, event);
    if (!newEvent)
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    return NextResponse.json(newEvent, {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message });
    } else {
      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }
};

//Get all events
export async function GET() {
  const { user, newAccessToken } = await requireAuth();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const events = await getAllEvents(user.id);

    if (!events) {
      return NextResponse.json({ message: "Not Found" }, { status: 404 });
    }

    const res = NextResponse.json({ events, userId: user.id }, { status: 200 });

    if (newAccessToken) {
      res.cookies.set("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "strict",
        maxAge: 60 * 30,
      });
    }

    return res;
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
