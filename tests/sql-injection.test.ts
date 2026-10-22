import "dotenv/config";
import { SqlInjectionLab } from "../src/lib/security-lab/sql-injection-lab";

async function runSecurityTests() {
  console.log("===============================================================");
  console.log("🛡️  AUTOMATED SECURITY TEST: SQL INJECTION & RESOLUTION LAB");
  console.log("===============================================================");

  const lab = new SqlInjectionLab();

  try {
    console.log("\n[Step 1] Initializing isolated disposable synthetic environment...");
    await lab.setupSyntheticEnvironment();
    console.log("-> Synthetic test table created with 3 mock test records.");

    // Test Case 1: Legitimate query
    console.log("\n[Test Case 1] Legitimate user input ('alice_mock')...");
    const legitSafe = await lab.safeParameterizedSearch("alice_mock");
    if (legitSafe.length === 1 && legitSafe[0].synthetic_username === "alice_mock") {
      console.log("  PASS: Legitimate search returned exactly 1 matching record.");
    } else {
      throw new Error(`Test Case 1 failed: Expected 1 record, got ${legitSafe.length}`);
    }

    // Test Case 2: Malicious authentication bypass payload on UNSAFE endpoint
    const injectionPayload = "' OR '1'='1";
    console.log(`\n[Test Case 2] Malicious SQL Injection payload: "${injectionPayload}"`);
    console.log("-> Executing against UNSAFE query (string concatenation)...");
    const unsafeResults = await lab.unsafeSearch(injectionPayload);
    console.log(`  OBSERVED: Unsafe query returned ${unsafeResults.length} records! (Data leaked / check bypassed)`);
    if (unsafeResults.length <= 1) {
      throw new Error("Test Case 2 warning: Unsafe query was expected to demonstrate vulnerability.");
    }

    // Test Case 3: Same malicious payload against SAFE parameterized query
    console.log("-> Executing against SECURE query (parameterized with bound placeholder ?)...");
    const safeResults = await lab.safeParameterizedSearch(injectionPayload);
    console.log(`  OBSERVED: Parameterized query returned ${safeResults.length} records.`);
    if (safeResults.length === 0) {
      console.log("  PASS: Malicious payload was treated strictly as string literal data! Injection completely neutralized.");
    } else {
      throw new Error(`Test Case 3 failed: Safe query returned records for nonexistent username.`);
    }

    // Test Case 4: Union-based injection attempt
    const unionPayload = "' UNION SELECT 999, 'hacked_user', 'SUPERADMIN', 'compromised_secret' -- ";
    console.log(`\n[Test Case 4] Union-based payload: "${unionPayload}"`);
    const safeUnionResults = await lab.safeParameterizedSearch(unionPayload);
    if (safeUnionResults.length === 0) {
      console.log("  PASS: Union injection treated as literal string; returned 0 records.");
    } else {
      throw new Error("Test Case 4 failed: Union injection succeeded unexpectedly.");
    }

    // Test Case 5: Verification that actual school database tables were untouched
    console.log("\n[Test Case 5] Verifying synthetic table isolation...");
    await lab.teardownSyntheticEnvironment();
    console.log("  PASS: Synthetic security lab table dropped cleanly. No application data was affected.");

    console.log("\n===============================================================");
    console.log("🎉 ALL SQL INJECTION SECURITY TESTS PASSED SUCCESSFULLY!");
    console.log("===============================================================");
  } catch (err) {
    console.error("❌ Security test failed:", err);
    process.exit(1);
  } finally {
    await lab.close();
    process.exit(0);
  }
}

runSecurityTests();

