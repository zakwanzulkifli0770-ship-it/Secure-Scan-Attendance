import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { employeesTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import {
  ListEmployeesQueryParams,
  CreateEmployeeBody,
  GetEmployeeParams,
  UpdateEmployeeParams,
  UpdateEmployeeBody,
  DeleteEmployeeParams,
} from "@workspace/api-zod";

const router = Router();

const safeEmployee = {
  id: employeesTable.id,
  employeeId: employeesTable.employeeId,
  name: employeesTable.name,
  email: employeesTable.email,
  role: employeesTable.role,
  createdAt: employeesTable.createdAt,
};

router.get("/employees", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = ListEmployeesQueryParams.safeParse(req.query);
  const search = parsed.success ? parsed.data.search : undefined;

  try {
    let query = db.select(safeEmployee).from(employeesTable);

    if (search) {
      const employees = await db
        .select(safeEmployee)
        .from(employeesTable)
        .where(
          or(
            ilike(employeesTable.name, `%${search}%`),
            ilike(employeesTable.email, `%${search}%`),
            ilike(employeesTable.employeeId, `%${search}%`)
          )
        )
        .orderBy(employeesTable.createdAt);
      res.json(employees);
      return;
    }

    const employees = await query.orderBy(employeesTable.createdAt);
    res.json(employees);
  } catch (err) {
    req.log.error({ err }, "List employees error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/employees", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { employeeId, name, email, password, role } = parsed.data;

  try {
    const existing = await db
      .select({ id: employeesTable.id })
      .from(employeesTable)
      .where(or(eq(employeesTable.email, email), eq(employeesTable.employeeId, employeeId)))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Employee with this email or ID already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [employee] = await db
      .insert(employeesTable)
      .values({ employeeId, name, email, passwordHash, role })
      .returning({
        id: employeesTable.id,
        employeeId: employeesTable.employeeId,
        name: employeesTable.name,
        email: employeesTable.email,
        role: employeesTable.role,
        createdAt: employeesTable.createdAt,
      });

    res.status(201).json(employee);
  } catch (err) {
    req.log.error({ err }, "Create employee error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/employees/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = GetEmployeeParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid employee ID" });
    return;
  }

  try {
    const [employee] = await db
      .select(safeEmployee)
      .from(employeesTable)
      .where(eq(employeesTable.id, parsed.data.id))
      .limit(1);

    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    res.json(employee);
  } catch (err) {
    req.log.error({ err }, "Get employee error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/employees/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const paramParsed = UpdateEmployeeParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid employee ID" });
    return;
  }

  const bodyParsed = UpdateEmployeeBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { name, email, role, password } = bodyParsed.data;

  try {
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (password !== undefined) updates.passwordHash = await bcrypt.hash(password, 10);

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [employee] = await db
      .update(employeesTable)
      .set(updates)
      .where(eq(employeesTable.id, paramParsed.data.id))
      .returning({
        id: employeesTable.id,
        employeeId: employeesTable.employeeId,
        name: employeesTable.name,
        email: employeesTable.email,
        role: employeesTable.role,
        createdAt: employeesTable.createdAt,
      });

    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    res.json(employee);
  } catch (err) {
    req.log.error({ err }, "Update employee error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/employees/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = DeleteEmployeeParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid employee ID" });
    return;
  }

  try {
    await db.delete(employeesTable).where(eq(employeesTable.id, parsed.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete employee error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
