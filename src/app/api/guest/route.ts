import { addGuest } from "@/core/services/guest/service";
import { guestSchema } from "@/schemas/guest.schema";

import { NextRequest, NextResponse } from "next/server";
import { safeParse } from "valibot";

//Create new guest
export const POST = async (req: NextRequest) => {
  const body = await req.json();
  console.log("body: ", body);
  const { eventId, ...data } = body;
  const result = safeParse(guestSchema, data);

  if (!result.success)
    return NextResponse.json(
      { message: "Bad Request", error: result.issues },
      { status: 400 }
    );

  const guest = {
    ...result.output,
    eventId,
  };

  try {
    console.log("entró al try");
    const newGuest = await addGuest(guest);

    if (!newGuest)
      return NextResponse.json(
        { message: "Guest Can Not Be Created" },
        { status: 400 }
      );
    return NextResponse.json(newGuest, {
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
