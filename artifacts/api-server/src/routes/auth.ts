import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, signToken } from "../middlewares/auth";
import { LoginBody } from "@workspace/api-zod";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const [employee] = await db
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.email, email))
      .limit(1);

    if (!employee) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, employee.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken({
      id: employee.id,
      email: employee.email,
      role: employee.role,
      employeeId: employee.employeeId,
    });

    const { passwordHash: _, ...safeEmployee } = employee;
    res.json({ token, employee: safeEmployee });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  try {
    const [employee] = await db
      .select({
        id: employeesTable.id,
        employeeId: employeesTable.employeeId,
        name: employeesTable.name,
        email: employeesTable.email,
        role: employeesTable.role,
        createdAt: employeesTable.createdAt,
      })
      .from(employeesTable)
      .where(eq(employeesTable.id, req.user!.id))
      .limit(1);

    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    res.json(employee);
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
