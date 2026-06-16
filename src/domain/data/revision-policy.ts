export type RevisionPolicy = {
  overwriteExistingRecords: false;
  preserveSupersededRecords: true;
  backtestUsesKnownAt: true;
};

export const PIT_REVISION_POLICY: RevisionPolicy = {
  overwriteExistingRecords: false,
  preserveSupersededRecords: true,
  backtestUsesKnownAt: true,
};
