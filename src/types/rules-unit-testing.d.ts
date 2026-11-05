declare module "@firebase/rules-unit-testing" {
  export function initializeTestEnvironment(config: any): Promise<any>;
  export function assertFails(pr: any): Promise<any>;
  export function assertSucceeds(pr: any): Promise<any>;
  export type RulesTestEnvironment = any;
  export type RulesTestContext = any;
}
