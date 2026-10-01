import { getSupabase } from "./supabase/client";

export type Attachment = {
  url: string;
  type: "image" | "audio";
  name: string;
  size: number;
};

export async function uploadAttachment(
  file: File,
  userId: string,
): Promise<Attachment> {
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : file.type.split("/")[1] ?? "";
  const uuid =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${userId}/${uuid}${ext ? `.${ext}` : ""}`;

  const { error } = await getSupabase().storage
    .from("attachments")
    .upload(path, file, { contentType: file.type });

  if (error) {
    throw new Error("Failed to upload attachment.");
  }

  const {
    data: { publicUrl },
  } = getSupabase().storage.from("attachments").getPublicUrl(path);

  return {
    url: publicUrl,
    type: file.type.startsWith("image/") ? "image" : "audio",
    name: file.name,
    size: file.size,
  };
}
