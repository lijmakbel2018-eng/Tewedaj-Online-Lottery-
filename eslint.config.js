import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', '*.rules', '**/*.rules', 'DRAFT_firestore.rules']
  }
];
