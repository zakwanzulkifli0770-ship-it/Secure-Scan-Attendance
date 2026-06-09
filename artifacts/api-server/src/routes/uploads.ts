import { Router } from "express";
import path from "path";
import fs from "fs";

const router = Router();

function getUploadsDir(): string {
  if (process.env.VERCEL) return "/tmp/uploads";
  const cwd = process.cwd();
  const root = cwd.endsWith(path.join("artifacts", "api-server"))
    ? path.resolve(cwd, "../..")
    : cwd;
  return path.resolve(root, "artifacts/api-server/uploads");
}

router.get("/uploads/:filename", (req, res): void => {
  const filename = path.basename(req.params.filename);
  const uploadsDir = getUploadsDir();
  const filepath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filepath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.sendFile(filepath);
});

export default router;
