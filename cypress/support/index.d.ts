/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to login as admin
     */
    loginAdmin(username?: string, password?: string): Chainable<void>;
  }
}
