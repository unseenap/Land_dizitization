import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireActor } from "@/modules/identity/server/service";
import { AppError } from "./errors";
export async function pageAuth() {
  const token = (await cookies()).get("land_session")?.value;
  try {
    return { actor: await requireActor(token), token };
  } catch (error) {
    if (error instanceof AppError && error.status === 401) redirect("/login");
    throw error;
  }
}
