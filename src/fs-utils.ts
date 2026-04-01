import fs from "fs";

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

export function writeText(filePath: string, value: string): void {
  fs.writeFileSync(filePath, value, "utf8");
}

export function appendText(filePath: string, value: string): void {
  fs.appendFileSync(filePath, value, "utf8");
}

export function exists(filePath: string): boolean {
  return fs.existsSync(filePath);
}
