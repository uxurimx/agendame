// src/app/api/uploadthing/core.ts
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@clerk/nextjs/server";

const f = createUploadthing();

export const ourFileRouter = {
  clientPhoto: f(
    { image: { maxFileSize: "8MB", maxFileCount: 4 } },
    { awaitServerData: false },
  )
    .middleware(async () => {
      const { userId } = await auth();
      if (!userId) throw new Error("No autorizado");
      return { userId };
    })
    .onUploadComplete(() => {}),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
