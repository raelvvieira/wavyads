import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.join(
  __dirname,
  "../supabase/functions/social-extract-copy/FASE1-FIXTURES.json"
);

const fixtures = JSON.parse(fs.readFileSync(fixturesPath, "utf-8"));

interface TestResult {
  id: string;
  nome: string;
  passed: boolean;
  errors: string[];
}

const results: TestResult[] = [];

async function validateTestCase(testCase: any): Promise<TestResult> {
  const result: TestResult = {
    id: testCase.id,
    nome: testCase.nome,
    passed: true,
    errors: [],
  };

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      result.passed = false;
      result.errors.push(
        "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables"
      );
      return result;
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/social-extract-copy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ item: testCase.input }),
      }
    );

    if (!response.ok) {
      result.passed = false;
      result.errors.push(
        `HTTP error: ${response.status} ${response.statusText}`
      );
      return result;
    }

    const data = await response.json();

    // Validate response structure
    const requiredFields = ["tipo", "status", "copy_consolidada", "usage"];
    for (const field of requiredFields) {
      if (!(field in data)) {
        result.passed = false;
        result.errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate each validation rule
    for (const validation of testCase.validacoes) {
      const { campo, esperado, nao_deve_ser, esperado_um_de, descricao } =
        validation;
      const value = getNestedValue(data, campo);

      if (esperado !== undefined) {
        if (Array.isArray(esperado)) {
          if (!arraysEqual(value, esperado)) {
            result.passed = false;
            result.errors.push(
              `${descricao} (${campo}): expected ${JSON.stringify(esperado)}, got ${JSON.stringify(value)}`
            );
          }
        } else if (value !== esperado) {
          result.passed = false;
          result.errors.push(
            `${descricao} (${campo}): expected "${esperado}", got "${value}"`
          );
        }
      }

      if (nao_deve_ser !== undefined) {
        if (value === nao_deve_ser) {
          result.passed = false;
          result.errors.push(
            `${descricao} (${campo}): should not be "${nao_deve_ser}"`
          );
        }
      }

      if (esperado_um_de !== undefined) {
        if (!esperado_um_de.includes(value)) {
          result.passed = false;
          result.errors.push(
            `${descricao} (${campo}): expected one of ${JSON.stringify(esperado_um_de)}, got "${value}"`
          );
        }
      }
    }

    // Validate usage is present and numeric
    if (data.usage) {
      if (typeof data.usage.transcribe_calls !== "number") {
        result.passed = false;
        result.errors.push(
          `usage.transcribe_calls should be a number, got ${typeof data.usage.transcribe_calls}`
        );
      }
      if (typeof data.usage.ocr_calls !== "number") {
        result.passed = false;
        result.errors.push(
          `usage.ocr_calls should be a number, got ${typeof data.usage.ocr_calls}`
        );
      }
    }
  } catch (error) {
    result.passed = false;
    result.errors.push(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return result;
}

function getNestedValue(obj: any, path: string): any {
  if (path.includes("[*]")) {
    const [arrPath, ...rest] = path.split("[*]");
    const arr = getNestedValue(obj, arrPath);
    if (!Array.isArray(arr)) return undefined;
    const suffix = rest.join("[*]");
    return arr.map((item) => getNestedValue(item, suffix));
  }

  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

function arraysEqual(a: any, b: any): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return a === b;
  if (a.length !== b.length) return false;
  return a.every((val, idx) => {
    if (Array.isArray(val) && Array.isArray(b[idx])) {
      return arraysEqual(val, b[idx]);
    }
    return val === b[idx];
  });
}

async function runTests() {
  console.log(`\n📋 FASE 1 - Extração de Copy - Test Suite`);
  console.log(`${"=".repeat(60)}\n`);

  for (const testCase of fixtures.test_cases) {
    process.stdout.write(`Testing "${testCase.nome}"... `);
    const result = await validateTestCase(testCase);
    results.push(result);

    if (result.passed) {
      console.log("✅ PASS");
    } else {
      console.log("❌ FAIL");
      result.errors.forEach((error) => console.log(`  ❌ ${error}`));
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(
    `\n📊 Results: ${passed}/${total} passed ${passed === total ? "✅" : "❌"}\n`
  );

  if (passed !== total) {
    console.log("Failed tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.log(`  - ${r.id}: ${r.nome}`));
    process.exit(1);
  }

  process.exit(0);
}

runTests().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
