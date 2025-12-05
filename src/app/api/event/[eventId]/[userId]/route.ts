import { deleteEvent, getEventById } from "@/core/services/event/service";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  params: {
    userId: string;
    eventId: string;
  };
}

//Get a specific event
export const GET = async (req: NextRequest, { params }: Params) => {
  const userId = params.userId;
  const eventId = params.eventId;
  try {
    const event = await getEventById(eventId, userId);
    if (!event)
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    return NextResponse.json(event, {
      status: 200,
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

// Delete event
export const DELETE = async (req: NextRequest, { params }: Params) => {
  const userId = params.userId;
  const eventId = params.eventId;
  if (!eventId)
    return NextResponse.json(
      { message: "Can not delete your event" },
      { status: 400 }
    );

  try {
    await deleteEvent(eventId, userId);
    return NextResponse.json(
      { message: "Event deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    } else {
      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }
};
