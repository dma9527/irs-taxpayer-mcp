import { readFileSync } from "node:fs";
import { z } from "zod";

const PackEntrySchema = z.object({
  filename: z.string().min(1),
  shasum: z.string().regex(/^[a-f0-9]{40}$/),
});

const input = JSON.parse(readFileSync(0, "utf8"));
const entries = Array.isArray(input) ? input : Object.values(input);
const entry = PackEntrySchema.parse(entries[0]);

console.log(JSON.stringify(entry));
