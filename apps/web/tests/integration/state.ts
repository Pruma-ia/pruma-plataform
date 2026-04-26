// Mutable context populated by setup.ts beforeAll, read by all test files.
export const ctx = {
  orgId: "",
  n8nSlug: "",
  userId: "",
  _ownedOrg: true, // false when using INT_TEST_ORG_ID (real org, skip teardown)
}
