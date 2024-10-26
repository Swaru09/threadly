/* eslint-disable camelcase */
// Resource: https://clerk.com/docs/users/sync-data-to-your-backend
// Above article shows why we need webhooks i.e., to sync data to our backend

// Resource: https://docs.svix.com/receiving/verifying-payloads/why
// It's a good practice to verify webhooks. Above article shows why we should do it
import { Webhook, WebhookRequiredHeaders } from "svix";
import { headers } from "next/headers";

import { IncomingHttpHeaders } from "http";

import { NextResponse } from "next/server";
import {
  addMemberToCommunity,
  createCommunity,
  deleteCommunity,
  removeUserFromCommunity,
  updateCommunityInfo,
} from "@/lib/actions/community.actions";

// Resource: https://clerk.com/docs/integration/webhooks#supported-events
// Above document lists the supported events
type EventType =
  | "organization.created"
  | "organizationInvitation.created"
  | "organizationMembership.created"
  | "organizationMembership.deleted"
  | "organization.updated"
  | "organization.deleted";

type Event = {
  data: Record<string, string | number | Record<string, string>[]>;
  object: "event";
  type: EventType;
};

export const POST = async (request: Request) => {
  const payload = await request.json();
  const header = await headers();

  const heads = {
    "svix-id": header.get("svix-id"),
    "svix-timestamp": header.get("svix-timestamp"),
    "svix-signature": header.get("svix-signature"),
  };

  // Activate Webhook in the Clerk Dashboard.
  // After adding the endpoint, you'll see the secret on the right side.
  const wh = new Webhook(process.env.NEXT_CLERK_WEBHOOK_SECRET || "");

  let evnt: Event | null = null;

  try {
    evnt = wh.verify(
      JSON.stringify(payload),
      heads as IncomingHttpHeaders & WebhookRequiredHeaders
    ) as Event;
  } catch (err) {
    return NextResponse.json({ message: err }, { status: 400 });
  }

  const eventType: EventType = evnt?.type!;

  // Listen to organization creation event
  if (eventType === "organization.created") {
    const { id, name, slug, logo_url, image_url, created_by } =
      evnt?.data ?? {};

    // Ensure 'id' is a string before passing it to `createCommunity`
    if (typeof id === "string") {
      try {
        await createCommunity(
          id,
          name as string,
          slug as string,
          (logo_url || image_url) as string,
          "org bio",
          created_by as string
        );

        return NextResponse.json({ message: "User created" }, { status: 201 });
      } catch (err) {
        console.log(err);
        return NextResponse.json(
          { message: "Internal Server Error" },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { message: "Invalid ID type" },
        { status: 400 }
      );
    }
  }

  // Listen to organization invitation creation event
  if (eventType === "organizationInvitation.created") {
    try {
      console.log("Invitation created", evnt?.data);

      return NextResponse.json(
        { message: "Invitation created" },
        { status: 201 }
      );
    } catch (err) {
      console.log(err);

      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

  // Listen to organization membership (member invite & accepted) creation
  if (eventType === "organizationMembership.created") {
    const { organization, public_user_data } = evnt?.data;

    if (
      typeof organization === "object" &&
      typeof public_user_data === "object" &&
      "id" in organization &&
      "user_id" in public_user_data
    ) {
      try {
        await addMemberToCommunity(
          organization.id as string,
          public_user_data.user_id as string
        );

        return NextResponse.json(
          { message: "Invitation accepted" },
          { status: 201 }
        );
      } catch (err) {
        console.log(err);

        return NextResponse.json(
          { message: "Internal Server Error" },
          { status: 500 }
        );
      }
    }
  }

  // Listen to member deletion event
  if (eventType === "organizationMembership.deleted") {
    const { organization, public_user_data } = evnt?.data;

    if (
      typeof organization === "object" &&
      typeof public_user_data === "object" &&
      "id" in organization &&
      "user_id" in public_user_data
    ) {
      try {
        await removeUserFromCommunity(
          public_user_data.user_id as string,
          organization.id as string
        );

        return NextResponse.json({ message: "Member removed" }, { status: 201 });
      } catch (err) {
        console.log(err);

        return NextResponse.json(
          { message: "Internal Server Error" },
          { status: 500 }
        );
      }
    }
  }

  // Listen to organization update event
  if (eventType === "organization.updated") {
    const { id, logo_url, name, slug } = evnt?.data;

    if (typeof id === "string") {
      try {
        await updateCommunityInfo(id, name as string, slug as string, logo_url as string);

        return NextResponse.json({ message: "Member removed" }, { status: 201 });
      } catch (err) {
        console.log(err);

        return NextResponse.json(
          { message: "Internal Server Error" },
          { status: 500 }
        );
      }
    }
  }

  // Listen to organization deletion event
  if (eventType === "organization.deleted") {
    const { id } = evnt?.data;

    if (typeof id === "string") {
      try {
        await deleteCommunity(id);

        return NextResponse.json(
          { message: "Organization deleted" },
          { status: 201 }
        );
      } catch (err) {
        console.log(err);

        return NextResponse.json(
          { message: "Internal Server Error" },
          { status: 500 }
        );
      }
    }
  }
};
