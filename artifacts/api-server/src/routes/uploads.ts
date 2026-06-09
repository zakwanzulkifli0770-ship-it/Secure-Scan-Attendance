import { Router } from "express";
import path from "path";
import fs from "fs";

const router = Router();

function getWorkspaceRoot(): string {
  const cwd = process.cwd();
  return cwd.endsWith(path.join("artifacts", "api-server"))
    ? path.resolve(cwd, "../..")
    : cwd;
}

router.get("/uploads/:filename", (req, res): void => {
  const filename = path.basename(req.params.filename);
  const uploadsDir = path.resolve(getWorkspaceRoot(), "artifacts/api-server/uploads");
  const filepath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filepath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.sendFile(filepath);
});

export default router;
