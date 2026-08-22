import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return jsonResponse({ error: error.message }, error.status);
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  return jsonResponse({ error: message }, 500);
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError("Expected a JSON request body.", 400);
  }
}

export function assertString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(`${label} is required.`, 400);
  }

  return value.trim();
}

export function optionalDateTime(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ApiError(`${label} must be a valid date and time.`, 400);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(`${label} must be a valid date and time.`, 400);
  }

  return date.toISOString();
}
