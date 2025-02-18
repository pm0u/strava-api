import { ClientConfig, ClientConstructorConfig } from "../types/config";
import { Scope } from "../types/scope";
import { URL } from "url";
import type { ParamObject } from "../types/token";
import axios from "axios";

import { defaultConfig } from "./config";
import { assertIsParamObj, assertValidTokenResponse } from "./helpers";
const { Token } = require("./token");

const RESPONSE_TYPE_CODE = "code";
const APPROVAL_PROMPT_AUTO = "auto";
const GRANT_TYPE_AUTHORIZATION_CODE = "authorization_code";
const CLIENT_ID = "client_id";
const REDIRECT_URI = "redirect_uri";
const RESPONSE_TYPE = "response_type";
const APPROVAL_PROMPT = "approval_prompt";
const SCOPE = "scope";
const STATE = "state";
const CODE = "code";
const PLACEHOLDER_URL = "http://localhost";

export class Client {
  private config: ClientConfig;

  constructor(config: ClientConstructorConfig) {
    this.validateConfig(config);
    // Prioritise supplied configuration over default
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Converts an array of scopes to a CSV format as mandated by the Strava API documentation
   * @param scopes an array of scopes e.g. ['read', 'activity:read_all']
   * @returns a string of the scopes in CSV format e.g. 'read,activity:read_all'
   * as required by the Strava API as a query string parameter.
   */
  scopesToString(scopes: Scope[]) {
    return scopes.join(",");
  }

  /**
   * Converts a CSV string of scopes to an array
   * @param {String} scope_string The string in format 'read,activity:read_all'
   * @returns Scopes array in the format ['read', 'activity:read_all']
   */
  stringToScopes(scope_string: string): Scope[] {
    return scope_string.split(",") as Scope[];
  }

  /**
   * Checks the supplied config to ensure it has a client_id and a
   * client_secret. Throws an error if these are not provided.
   * @param {Object} config The configuration object
   * @returns {Boolean} True if the config is valid, else throw exception
   * @todo make this an assertion?
   */
  validateConfig(config: ClientConstructorConfig) {
    if (!config.clientId) {
      throw new Error("client_id must be specified");
    }
    if (!config.clientSecret) {
      throw new Error("client_secret must be specified");
    }
    return true;
  }

  /**
   * Creates and returns a URI to redirect a client to for API OAuth authorization,
   * based on the supplied configuration object.
   * @returns {String} URI to redirect client.
   */
  getAuthorizationUri() {
    const uri = new URL(this.config.authorizationUri);
    uri.searchParams.append(CLIENT_ID, this.config.clientId.toString());
    uri.searchParams.append(REDIRECT_URI, this.config.redirectUri);
    uri.searchParams.append(RESPONSE_TYPE, RESPONSE_TYPE_CODE);
    uri.searchParams.append(APPROVAL_PROMPT, APPROVAL_PROMPT_AUTO);
    uri.searchParams.append(SCOPE, this.scopesToString(this.config.scopes));

    return uri.href;
  }

  /**
   * Takes a callback URL (redirected by Strava), extracts the code and scopes,
   * and exchanges them for an access token via the Strava OAuth token endpoint.
   * This function returns the associated Token object.
   *
   * This function asserts that the scopes authorized are equivalent to the scopes
   * requested in the configuration and will throw an exception if they are not.
   * @param {String} req_url The callback URL accessed by the user.
   * @returns {Token} A Token object containing an access token and refresh token for the
   * user.
   */
  async getToken(req_url: string) {
    // A base URL must be included when a relative URL is passed to this function
    const url = new URL(req_url, PLACEHOLDER_URL);

    const paramObject = {
      state: url.searchParams.get(STATE),
      code: url.searchParams.get(CODE),
      scope: url.searchParams.get(SCOPE),
    };

    assertIsParamObj(paramObject);

    return await this.getTokenFromObject(paramObject);
  }

  /**
   * Uses the request parameters provided by the Strava API and exchanges the
   * code for a Token object which is returned.
   *
   * This function asserts that the scopes authorized are equivalent to the scopes
   * requested in the configuration and will throw an exception if they are not.
   * @param param_object An object containing the keys: state, code and scope
   * as provided by the Strava API in the callback URL requestParameters.
   * @returns A Token object containing an access token and refresh token for the
   * user.
   */
  async getTokenFromObject(param_object: ParamObject) {
    // Check that scopes granted match scopes requested
    const scope_string = param_object.scope;
    const scopes = this.stringToScopes(scope_string);
    const e = new Error(
      `Requested scopes ${this.config.scopes} not granted. Got: ${scopes}`
    );
    if (scopes.length !== this.config.scopes.length) {
      throw e;
    }
    for (let scope of scopes) if (!this.config.scopes.includes(scope)) throw e;

    // Obtain access token
    const res = await axios.post(this.config.tokenUri, {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code: param_object.code,
      grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
    });

    assertValidTokenResponse(res.data);

    const token = new Token(
      res.data.token_type,
      res.data.expires_at,
      res.data.expires_in,
      res.data.refresh_token,
      res.data.access_token,
      res.data.athlete
    );

    return token;
  }
}
